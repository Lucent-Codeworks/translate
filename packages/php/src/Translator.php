<?php

declare(strict_types=1);

namespace Lucent\Translate;

/**
 * Translations for a single locale. Callable, so it works as a view helper:
 * `$t('home.title')`.
 */
final class Translator
{
    public function __construct(private readonly Client $client, private readonly string $locale)
    {
    }

    public function locale(): string
    {
        return $this->locale;
    }

    /** @param array<string, string|int|float> $params */
    public function t(string $key, array $params = []): string
    {
        return $this->client->t($this->locale, $key, $params);
    }

    /** @param array<string, string|int|float> $params */
    public function __invoke(string $key, array $params = []): string
    {
        return $this->t($key, $params);
    }
}
