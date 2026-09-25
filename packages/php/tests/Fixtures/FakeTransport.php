<?php

declare(strict_types=1);

namespace Lucent\Translate\Tests\Fixtures;

use Lucent\Translate\Exception\TranslateException;
use Lucent\Translate\Transport\Response;
use Lucent\Translate\Transport\Transport;

/** In-memory stand-in for the delivery endpoint, recording every request. */
final class FakeTransport implements Transport
{
    /** @var list<array{url: string, headers: array<string, string>}> */
    public array $requests = [];
    public bool $down = false;
    public int $status = 200;

    /** @param array<string, array<string, mixed>> $data */
    public function __construct(public array $data)
    {
    }

    public function get(string $url, array $headers): Response
    {
        $this->requests[] = ['url' => $url, 'headers' => $headers];
        if ($this->down) {
            throw new TranslateException('Connection refused');
        }
        if ($this->status !== 200) {
            return new Response($this->status, [], '');
        }
        $locale = rawurldecode(basename(parse_url($url, PHP_URL_PATH)));
        if (!isset($this->data[$locale])) {
            return new Response(404, [], '{"error":"Unknown locale"}');
        }
        $body = json_encode($this->data[$locale], JSON_THROW_ON_ERROR);
        $etag = '"' . sha1($body) . '"';
        if (($headers['If-None-Match'] ?? null) === $etag) {
            return new Response(304, ['etag' => $etag], '');
        }
        return new Response(200, ['etag' => $etag, 'content-type' => 'application/json'], $body);
    }

    /** @return list<string> */
    public function locales(): array
    {
        return array_map(static fn ($r) => rawurldecode(basename(parse_url($r['url'], PHP_URL_PATH))), $this->requests);
    }
}
