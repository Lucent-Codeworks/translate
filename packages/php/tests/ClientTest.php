<?php

declare(strict_types=1);

namespace Lucent\Translate\Tests;

use Lucent\Translate\Cache\ArrayCache;
use Lucent\Translate\Cache\FileCache;
use Lucent\Translate\Client;
use Lucent\Translate\Exception\TranslateException;
use Lucent\Translate\Tests\Fixtures\FakeTransport;
use PHPUnit\Framework\TestCase;
use Psr\SimpleCache\CacheInterface;

final class ClientTest extends TestCase
{
    private function client(FakeTransport $transport, ?CacheInterface $cache = null, int $ttl = 60, ?callable $onError = null, ?string $fallback = 'en'): Client
    {
        return new Client(
            baseUrl: 'https://translate.example.com/',
            project: 'demo app',
            apiKey: 'lt_test',
            fallbackLocale: $fallback,
            cache: $cache,
            ttl: $ttl,
            transport: $transport,
            onError: $onError,
        );
    }

    public function testTranslatesLazilyWithInterpolation(): void
    {
        $transport = new FakeTransport(['de' => ['greeting' => 'Hallo {name}, {missing}']]);
        $client = $this->client($transport, fallback: null);

        self::assertSame([], $transport->requests, 'nothing is fetched until needed');
        self::assertSame('Hallo Ada, {missing}', $client->t('de', 'greeting', ['name' => 'Ada']));
        self::assertSame('Hallo {name}, {missing}', $client->t('de', 'greeting'));
        self::assertCount(1, $transport->requests, 'one fetch per locale per request');

        $request = $transport->requests[0];
        self::assertSame('https://translate.example.com/api/v1/projects/demo%20app/locales/de', $request['url']);
        self::assertSame('Bearer lt_test', $request['headers']['Authorization']);
    }

    public function testFallsBackToFallbackLocaleThenKey(): void
    {
        $transport = new FakeTransport([
            'de' => ['title' => 'Willkommen'],
            'en' => ['title' => 'Welcome', 'subtitle' => 'Hello {name}'],
        ]);
        $client = $this->client($transport);

        self::assertSame('Willkommen', $client->t('de', 'title'));
        self::assertSame('Hello Ada', $client->t('de', 'subtitle', ['name' => 'Ada']));
        self::assertSame('nope', $client->t('de', 'nope'));
        self::assertSame(['de', 'en'], $transport->locales());
    }

    public function testTranslatorIsBoundToALocaleAndCallable(): void
    {
        $client = $this->client(new FakeTransport(['fr' => ['title' => 'Bienvenue {name}']]));
        $t = $client->translator('fr');

        self::assertSame('fr', $t->locale());
        self::assertSame('Bienvenue Ada', $t('title', ['name' => 'Ada']));
        self::assertSame('Bienvenue Ada', $t->t('title', ['name' => 'Ada']));
    }

    public function testSharedCacheAvoidsRefetchingWithinTtl(): void
    {
        $transport = new FakeTransport(['de' => ['title' => 'Willkommen']]);
        $cache = new ArrayCache();

        $this->client($transport, $cache)->t('de', 'title');
        // A later request (new Client, same cache) within the TTL doesn't hit the server.
        self::assertSame('Willkommen', $this->client($transport, $cache)->t('de', 'title'));
        self::assertCount(1, $transport->requests);
    }

    public function testRevalidatesWithEtagAfterTtl(): void
    {
        $transport = new FakeTransport(['de' => ['title' => 'Willkommen']]);
        $cache = new ArrayCache();

        $this->client($transport, $cache, ttl: 0)->load('de');
        self::assertSame('Willkommen', $this->client($transport, $cache, ttl: 0)->t('de', 'title'));
        self::assertArrayHasKey('If-None-Match', $transport->requests[1]['headers']);

        $transport->data['de'] = ['title' => 'Hallo'];
        self::assertSame('Hallo', $this->client($transport, $cache, ttl: 0)->t('de', 'title'));
        self::assertCount(3, $transport->requests);
    }

    public function testServesStaleMessagesWhenTheServerIsDownAndBacksOff(): void
    {
        $transport = new FakeTransport(['de' => ['title' => 'Willkommen']]);
        $cache = new ArrayCache();
        $this->client($transport, $cache)->load('de');

        // TTL 0: the cached entry is expired, so this request tries the server.
        $transport->down = true;
        $errors = [];
        $client = $this->client($transport, $cache, ttl: 0, onError: function (\Throwable $e) use (&$errors) {
            $errors[] = $e->getMessage();
        });
        self::assertSame('Willkommen', $client->t('de', 'title'));
        self::assertSame(['Connection refused'], $errors);
        self::assertCount(2, $transport->requests);

        // The stale copy now counts as fresh for another TTL: no retry storm.
        self::assertSame('Willkommen', $this->client($transport, $cache, ttl: 60)->t('de', 'title'));
        self::assertCount(2, $transport->requests);
    }

    public function testUnreachableServerWithoutCacheFallsBackToKeysOnce(): void
    {
        $transport = new FakeTransport([]);
        $transport->down = true;
        $errors = 0;
        $client = $this->client($transport, fallback: null, onError: function () use (&$errors) {
            $errors++;
        });

        self::assertSame('home.title', $client->t('de', 'home.title'));
        self::assertSame('home.subtitle', $client->t('de', 'home.subtitle'));
        self::assertSame(1, $errors);
        self::assertCount(1, $transport->requests, "a failing locale isn't retried within one request");

        $this->expectException(TranslateException::class);
        $this->client($transport)->load('de');
    }

    public function testRejectsRevokedKeysAndUnknownLocales(): void
    {
        $transport = new FakeTransport(['de' => []]);
        try {
            $this->client($transport)->load('xx');
            self::fail('expected exception');
        } catch (TranslateException $e) {
            self::assertStringContainsString('"xx" not found', $e->getMessage());
        }

        $transport->status = 401;
        $this->expectExceptionMessage('rejected the API key');
        $this->client($transport)->load('de');
    }

    public function testKeepsServingCachedMessagesAfterTheKeyIsRevoked(): void
    {
        $transport = new FakeTransport(['de' => ['title' => 'Willkommen']]);
        $cache = new ArrayCache();
        $this->client($transport, $cache)->load('de');

        $transport->status = 401;
        $errors = [];
        $client = $this->client($transport, $cache, ttl: 0, onError: function (\Throwable $e) use (&$errors) {
            $errors[] = $e->getMessage();
        });
        self::assertSame(['title' => 'Willkommen'], $client->load('de'));
        self::assertCount(1, $errors);
        self::assertStringContainsString('401', $errors[0]);
    }

    public function testRefreshIgnoresTheTtl(): void
    {
        $transport = new FakeTransport(['de' => ['title' => 'Willkommen']]);
        $client = $this->client($transport);
        $client->load('de');
        $transport->data['de'] = ['title' => 'Hallo'];

        self::assertSame(['title' => 'Hallo'], $client->refresh('de'));
        self::assertSame('Hallo', $client->t('de', 'title'));
    }

    public function testFileCachePersistsAcrossClients(): void
    {
        $dir = sys_get_temp_dir() . '/lucent-translate-test-' . bin2hex(random_bytes(4));
        $transport = new FakeTransport(['de' => ['title' => 'Willkommen']]);

        $this->client($transport, new FileCache($dir))->t('de', 'title');
        self::assertSame('Willkommen', $this->client($transport, new FileCache($dir))->t('de', 'title'));
        self::assertCount(1, $transport->requests);

        $cache = new FileCache($dir);
        self::assertTrue($cache->clear());
        self::assertSame([], glob("{$dir}/*"));
        rmdir($dir);
    }
}
