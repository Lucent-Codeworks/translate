<?php

declare(strict_types=1);

namespace Lucent\Translate\Transport;

use Lucent\Translate\Exception\TranslateException;

/** Performs the HTTP GET requests the client needs. */
interface Transport
{
    /**
     * @param array<string, string> $headers
     *
     * @throws TranslateException on network failure (not on HTTP error statuses)
     */
    public function get(string $url, array $headers): Response;
}
