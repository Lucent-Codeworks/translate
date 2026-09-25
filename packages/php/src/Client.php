<?php

declare(strict_types=1);

namespace Lucent\Translate;

use Lucent\Translate\Cache\ArrayCache;
use Lucent\Translate\Exception\TranslateException;
use Lucent\Translate\Transport\StreamTransport;
use Lucent\Translate\Transport\Transport;
use Psr\SimpleCache\CacheInterface;
use Throwable;

/**
 * Fetches a project's translations from Lucent Translate and caches them.
 *
 * Messages are cached for `$ttl` seconds. After that, the next request
 * revalidates with the server using the ETag (a cheap 304 when unchanged), so
 * edits made in Lucent Translate reach the app within roughly `$ttl` seconds.
 *
 * Whenever a fetch fails (network, 5xx, revoked key, removed locale) and a
 * cached copy exists, that copy keeps being served and the error goes to
 * `onError`. Errors are only thrown when there is nothing cached to fall back on.
 */
final class Client
{
    private readonly CacheInterface $cache;
    private readonly Transport $transport;
    /** @var \Closure(Throwable): void|null */
    private readonly ?\Closure $onError;
    /** @var array<string, array<string, string>> Messages already resolved in this process. */
    private array $loaded = [];

    /**
     * @param string $baseUrl Your Lucent Translate instance, e.g. https://translate.example.com
     * @param string $project Project slug.
     * @param string $apiKey Project API key.
     * @param string|null $fallbackLocale Locale used for keys missing in the requested one.
     * @param CacheInterface|null $cache Any PSR-16 cache (Laravel, Symfony, FileCache, ...).
     *                                   Defaults to an in-memory cache for this request only.
     * @param int $ttl Seconds before cached messages are revalidated with the server.
     * @param Transport|null $transport HTTP transport; defaults to PHP streams.
     * @param callable(Throwable): void|null $onError Called when a fetch fails but t() keeps going
     *                                               (stale cache or key fallback), e.g. to log it.
     */
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $project,
        private readonly string $apiKey,
        private readonly ?string $fallbackLocale = null,
        ?CacheInterface $cache = null,
        private readonly int $ttl = 60,
        ?Transport $transport = null,
        ?callable $onError = null,
    ) {
        $this->cache = $cache ?? new ArrayCache();
        $this->transport = $transport ?? new StreamTransport();
        $this->onError = $onError === null ? null : \Closure::fromCallable($onError);
    }

    /**
     * Returns a locale's messages, from cache when fresh, otherwise from the server.
     *
     * @return array<string, string>
     *
     * @throws TranslateException if the locale can't be fetched and nothing is cached.
     */
    public function load(string $locale): array
    {
        if (isset($this->loaded[$locale])) {
            return $this->loaded[$locale];
        }

        $cacheKey = $this->cacheKey($locale);
        $entry = $this->readEntry($cacheKey);
        if ($entry !== null && time() - $entry['fetchedAt'] < $this->ttl) {
            return $this->loaded[$locale] = $entry['messages'];
        }

        return $this->loaded[$locale] = $this->fetch($locale, $cacheKey, $entry);
    }

    /**
     * Ignores the TTL and revalidates a locale with the server now.
     *
     * @return array<string, string>
     */
    public function refresh(string $locale): array
    {
        unset($this->loaded[$locale]);
        $cacheKey = $this->cacheKey($locale);
        return $this->loaded[$locale] = $this->fetch($locale, $cacheKey, $this->readEntry($cacheKey));
    }

    /**
     * Translates `$key` in `$locale`, falling back to the fallback locale and
     * then to the key itself. Interpolates `{name}` placeholders from `$params`.
     * Never throws: fetch problems go to `onError`.
     *
     * @param array<string, string|int|float> $params
     */
    public function t(string $locale, string $key, array $params = []): string
    {
        $template = $this->lookup($locale, $key);
        if ($template === null && $this->fallbackLocale !== null && $this->fallbackLocale !== $locale) {
            $template = $this->lookup($this->fallbackLocale, $key);
        }
        return self::interpolate($template ?? $key, $params);
    }

    /** A translator bound to one locale, handy to pass to views. */
    public function translator(string $locale): Translator
    {
        return new Translator($this, $locale);
    }

    /** @param array<string, string|int|float> $params */
    public static function interpolate(string $template, array $params): string
    {
        if ($params === []) {
            return $template;
        }
        return preg_replace_callback(
            '/\{(\w+)\}/',
            static fn (array $m): string => array_key_exists($m[1], $params) ? (string) $params[$m[1]] : $m[0],
            $template,
        ) ?? $template;
    }

    private function lookup(string $locale, string $key): ?string
    {
        try {
            return $this->load($locale)[$key] ?? null;
        } catch (Throwable $e) {
            $this->loaded[$locale] = []; // don't retry on every t() in this request
            $this->report($e);
            return null;
        }
    }

    /**
     * @param array{messages: array<string, string>, etag: ?string, fetchedAt: int}|null $entry
     *
     * @return array<string, string>
     */
    private function fetch(string $locale, string $cacheKey, ?array $entry): array
    {
        $url = sprintf(
            '%s/api/v1/projects/%s/locales/%s',
            rtrim($this->baseUrl, '/'),
            rawurlencode($this->project),
            rawurlencode($locale),
        );
        $headers = ['Authorization' => "Bearer {$this->apiKey}", 'Accept' => 'application/json'];
        if ($entry !== null && $entry['etag'] !== null) {
            $headers['If-None-Match'] = $entry['etag'];
        }

        try {
            $response = $this->transport->get($url, $headers);
        } catch (TranslateException $e) {
            return $this->serveStale($cacheKey, $entry, $e);
        }

        if ($response->status === 304 && $entry !== null) {
            $this->writeEntry($cacheKey, $entry['messages'], $entry['etag']);
            return $entry['messages'];
        }
        if ($response->status !== 200) {
            $error = match ($response->status) {
                401 => 'Lucent Translate rejected the API key (401). Check it hasn\'t been revoked.',
                404 => "Locale \"{$locale}\" not found in project \"{$this->project}\" (404).",
                default => "Unexpected response {$response->status} for locale \"{$locale}\".",
            };
            return $this->serveStale($cacheKey, $entry, new TranslateException($error));
        }

        $messages = json_decode($response->body, true);
        if (!is_array($messages)) {
            return $this->serveStale($cacheKey, $entry, new TranslateException("Invalid JSON for locale \"{$locale}\"."));
        }
        $messages = array_filter($messages, 'is_string');

        $this->writeEntry($cacheKey, $messages, $response->header('etag'));
        return $messages;
    }

    /**
     * @param array{messages: array<string, string>, etag: ?string, fetchedAt: int}|null $entry
     *
     * @return array<string, string>
     */
    private function serveStale(string $cacheKey, ?array $entry, TranslateException $error): array
    {
        if ($entry === null) {
            throw $error;
        }
        $this->report($error);
        // Treat the stale copy as fresh for another TTL, so an outage doesn't
        // cause a slow failing request on every page view.
        $this->writeEntry($cacheKey, $entry['messages'], $entry['etag']);
        return $entry['messages'];
    }

    /** @return array{messages: array<string, string>, etag: ?string, fetchedAt: int}|null */
    private function readEntry(string $cacheKey): ?array
    {
        try {
            $entry = $this->cache->get($cacheKey);
        } catch (Throwable $e) {
            $this->report($e);
            return null;
        }
        return is_array($entry) && isset($entry['messages'], $entry['fetchedAt']) ? $entry : null;
    }

    /** @param array<string, string> $messages */
    private function writeEntry(string $cacheKey, array $messages, ?string $etag): void
    {
        try {
            // No cache expiry: stale entries are what keep the app translated
            // during an outage. Freshness is tracked with `fetchedAt`.
            $this->cache->set($cacheKey, ['messages' => $messages, 'etag' => $etag, 'fetchedAt' => time()]);
        } catch (Throwable $e) {
            $this->report($e);
        }
    }

    private function cacheKey(string $locale): string
    {
        // PSR-16 restricts key characters; a hash is always valid.
        return 'lucent_translate.' . sha1("{$this->baseUrl}|{$this->project}|{$locale}");
    }

    private function report(Throwable $e): void
    {
        if ($this->onError !== null) {
            ($this->onError)($e);
        }
    }
}
