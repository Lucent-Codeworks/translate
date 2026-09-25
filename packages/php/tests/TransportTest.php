<?php

declare(strict_types=1);

namespace Lucent\Translate\Tests;

use Lucent\Translate\Cache\ArrayCache;
use Lucent\Translate\Client;
use Lucent\Translate\Exception\TranslateException;
use Lucent\Translate\Transport\Psr18Transport;
use Lucent\Translate\Transport\StreamTransport;
use Lucent\Translate\Transport\Transport;
use Nyholm\Psr7\Factory\Psr17Factory;
use Nyholm\Psr7\Response as Psr7Response;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;

/** Runs both transports against a real HTTP server (PHP's built-in one). */
final class TransportTest extends TestCase
{
    /** @var resource|null */
    private static $server = null;
    private static string $baseUrl;

    public static function setUpBeforeClass(): void
    {
        $socket = stream_socket_server('tcp://127.0.0.1:0');
        $port = (int) substr(strrchr(stream_socket_get_name($socket, false), ':'), 1);
        fclose($socket);
        self::$baseUrl = "http://127.0.0.1:{$port}";
        self::$server = proc_open(
            [PHP_BINARY, '-S', "127.0.0.1:{$port}", __DIR__ . '/Fixtures/server.php'],
            [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']],
            $pipes,
        );
        for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) {
            usleep(100_000);
        }
    }

    public static function tearDownAfterClass(): void
    {
        if (self::$server) {
            proc_terminate(self::$server);
        }
    }

    /** A minimal PSR-18 client built on streams, standing in for Guzzle & co. */
    private static function psr18(): Transport
    {
        $http = new class () implements ClientInterface {
            public function sendRequest(RequestInterface $request): ResponseInterface
            {
                $response = (new StreamTransport())->get(
                    (string) $request->getUri(),
                    array_map(static fn ($v) => implode(', ', $v), $request->getHeaders()),
                );
                return new Psr7Response($response->status, $response->headers, $response->body);
            }
        };
        return new Psr18Transport($http, new Psr17Factory());
    }

    /** @return iterable<string, array{\Closure(): Transport}> */
    public static function transports(): iterable
    {
        yield 'stream' => [static fn () => new StreamTransport()];
        yield 'psr-18' => [static fn () => self::psr18()];
    }

    #[DataProvider('transports')]
    public function testFetchesAndRevalidatesOverHttp(\Closure $makeTransport): void
    {
        $cache = new ArrayCache();
        $make = fn () => new Client(self::$baseUrl, 'demo', 'lt_test', cache: $cache, ttl: 0, transport: $makeTransport());

        self::assertSame(['title' => 'Willkommen', 'umlaut' => 'Grüße'], $make()->load('de'));
        // Second request revalidates via ETag (server answers 304) and keeps the messages.
        self::assertSame('Grüße', $make()->t('de', 'umlaut'));
    }

    #[DataProvider('transports')]
    public function testSurfacesAuthErrors(\Closure $makeTransport): void
    {
        $this->expectException(TranslateException::class);
        $this->expectExceptionMessage('401');
        (new Client(self::$baseUrl, 'demo', 'lt_wrong', transport: $makeTransport()))->load('de');
    }

    public function testStreamTransportReportsConnectionFailures(): void
    {
        $this->expectException(TranslateException::class);
        (new StreamTransport(timeout: 1))->get('http://127.0.0.1:1/nothing', []);
    }
}
