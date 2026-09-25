# PHP example

A plain PHP page using `lucent-codeworks/translate` with a file cache.

```bash
cp .env.example .env   # fill in your instance URL, project slug and API key
composer install
php -S localhost:8080 -t public
```

Translations are cached in `cache/` for 60 seconds (`TRANSLATE_TTL`), then
revalidated with the server. If Lucent Translate is unreachable, the page keeps
rendering from the last cached copy.
