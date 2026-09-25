<?php

declare(strict_types=1);

use Lucent\Translate\Cache\FileCache;
use Lucent\Translate\Client;

require __DIR__ . '/../vendor/autoload.php';

// Config from the environment (or a .env file next to composer.json).
$env = is_file(__DIR__ . '/../.env') ? parse_ini_file(__DIR__ . '/../.env') : [];
$config = static fn (string $name): string => getenv($name) ?: ($env[$name] ?? '')
    ?: throw new RuntimeException("{$name} is not set. Copy .env.example to .env and fill it in.");

$client = new Client(
    baseUrl: $config('TRANSLATE_URL'),
    project: $config('TRANSLATE_PROJECT'),
    apiKey: $config('TRANSLATE_KEY'),
    fallbackLocale: 'en',
    cache: new FileCache(__DIR__ . '/../cache'),
    ttl: (int) (getenv('TRANSLATE_TTL') ?: 60),
    onError: static fn (Throwable $e) => error_log('[lucent-translate] ' . $e->getMessage()),
);

$languages = ['en', 'de', 'fr'];
$lang = $_GET['lang'] ?? $_COOKIE['lang'] ?? 'en';
if (!in_array($lang, $languages, true)) {
    $lang = 'en';
}
if (isset($_GET['lang'])) {
    setcookie('lang', $lang, ['expires' => time() + 31536000, 'path' => '/', 'samesite' => 'Lax']);
}

$t = $client->translator($lang);
$e = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES);
?>
<!doctype html>
<html lang="<?= $e($lang) ?>">
<head>
    <meta charset="utf-8">
    <title><?= $e($t('home.title')) ?></title>
</head>
<body>
    <h1><?= $e($t('home.title')) ?></h1>
    <p><?= $e($t('home.subtitle', ['name' => 'Ada'])) ?></p>
    <nav>
        <?php foreach ($languages as $code): ?>
            <?php if ($code === $lang): ?>
                <strong><?= $e($code) ?></strong>
            <?php else: ?>
                <a href="?lang=<?= $e($code) ?>"><?= $e($code) ?></a>
            <?php endif ?>
        <?php endforeach ?>
    </nav>
</body>
</html>
