# lucent-codeworks/translate

PHP client for Lucent Translate. Fetches a project's translations, caches them
with any PSR-16 cache, and picks up edits from the server within a TTL.

```bash
composer require lucent-codeworks/translate
```

Requires PHP 8.1+. No HTTP library needed.

## Usage

```php
use Lucent\Translate\Cache\FileCache;
use Lucent\Translate\Client;

$client = new Client(
    baseUrl: 'https://translate.example.com',
    project: 'my-app',
    apiKey: 'lt_…',
    fallbackLocale: 'en',
    cache: new FileCache(__DIR__ . '/cache'),   // or any PSR-16 cache
    ttl: 60,
    onError: fn (Throwable $e) => error_log($e->getMessage()),
);

$client->t('de', 'checkout.pay');                     // "Jetzt bezahlen"
$client->t('de', 'greeting', ['name' => 'Ada']);      // "Hallo {name}" → "Hallo Ada"

$t = $client->translator('de');                       // bound to a locale, callable
echo $t('home.title');
```

Missing keys fall back to `fallbackLocale`, then to the key itself. Locales
are fetched lazily, the first time they're used.

## Caching and updates

- Messages are cached for `ttl` seconds (default 60), shared across requests
  through the cache you pass. Without one, an in-memory cache lasts a single
  request.
- After the TTL, the next request revalidates with the server using an ETag.
  Unchanged translations cost an empty `304`. Edits in Lucent Translate
  therefore reach your app within about `ttl` seconds.
- `refresh($locale)` revalidates immediately, e.g. from a webhook or cron.

## When things go wrong

`t()` never throws, so a translation problem can't break a page.

- If a fetch fails (network error, 5xx, revoked key, removed locale) and a
  cached copy exists, that copy keeps being served for another TTL, and the
  error goes to `onError`.
- With nothing cached, `t()` returns the key and reports the error once per
  request. `load()` throws `TranslateException` instead, if you'd rather fail
  loudly.

## Frameworks

Any PSR-16 cache works.

```php
// Laravel (e.g. in a service provider)
$this->app->singleton(Client::class, fn () => new Client(
    baseUrl: config('services.translate.url'),
    project: config('services.translate.project'),
    apiKey: config('services.translate.key'),
    fallbackLocale: 'en',
    cache: cache()->store(),
    onError: fn (Throwable $e) => report($e),
));

// Symfony: wrap a PSR-6 pool with Symfony\Component\Cache\Psr16Cache.
```

To use your own HTTP client (Guzzle, Symfony HttpClient, …), pass
`transport: new Psr18Transport($psr18Client, $psr17RequestFactory)`.

See [`examples/php`](../../examples/php) for a runnable page.
