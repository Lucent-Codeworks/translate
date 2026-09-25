<?php

declare(strict_types=1);

namespace Lucent\Translate\Transport;

use Lucent\Translate\Exception\TranslateException;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;

/** Adapter for any PSR-18 HTTP client (Guzzle, Symfony HttpClient, ...). */
final class Psr18Transport implements Transport
{
    public function __construct(
        private readonly ClientInterface $client,
        private readonly RequestFactoryInterface $requestFactory,
    ) {
    }

    public function get(string $url, array $headers): Response
    {
        $request = $this->requestFactory->createRequest('GET', $url);
        foreach ($headers as $name => $value) {
            $request = $request->withHeader($name, $value);
        }

        try {
            $response = $this->client->sendRequest($request);
        } catch (ClientExceptionInterface $e) {
            throw new TranslateException("Request to {$url} failed: {$e->getMessage()}", 0, $e);
        }

        $parsed = [];
        foreach ($response->getHeaders() as $name => $values) {
            $parsed[strtolower($name)] = implode(', ', $values);
        }

        return new Response($response->getStatusCode(), $parsed, (string) $response->getBody());
    }
}
