<?php

declare(strict_types=1);

namespace Lucent\Translate\Transport;

use Lucent\Translate\Exception\TranslateException;

/** Dependency-free transport using PHP's HTTP stream wrapper. */
final class StreamTransport implements Transport
{
    public function __construct(private readonly float $timeout = 5.0)
    {
    }

    public function get(string $url, array $headers): Response
    {
        $lines = [];
        foreach ($headers as $name => $value) {
            $lines[] = "{$name}: {$value}";
        }
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $lines),
                'timeout' => $this->timeout,
                'ignore_errors' => true, // return 4xx/5xx bodies instead of failing
            ],
        ]);

        $body = @file_get_contents($url, false, $context);
        $raw = function_exists('http_get_last_response_headers')
            ? http_get_last_response_headers()
            : ($http_response_header ?? null);
        if ($body === false || !is_array($raw) || $raw === []) {
            $error = error_get_last()['message'] ?? 'unknown error';
            throw new TranslateException("Request to {$url} failed: {$error}");
        }

        // With redirects there are several header blocks; the last one wins.
        $status = 0;
        $parsed = [];
        foreach ($raw as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                $status = (int) $m[1];
                $parsed = [];
            } elseif (str_contains($line, ':')) {
                [$name, $value] = explode(':', $line, 2);
                $parsed[strtolower(trim($name))] = trim($value);
            }
        }

        return new Response($status, $parsed, $body);
    }
}
