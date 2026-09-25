<?php

// Router for `php -S`, mimicking Lucent Translate's delivery endpoint.
$data = ['de' => ['title' => 'Willkommen', 'umlaut' => 'Grüße']];

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (!preg_match('#^/api/v1/projects/demo/locales/([^/]+)$#', $path, $m)) {
    http_response_code(404);
    return;
}
if (($_SERVER['HTTP_AUTHORIZATION'] ?? '') !== 'Bearer lt_test') {
    http_response_code(401);
    echo '{"error":"Invalid API key"}';
    return;
}
$locale = rawurldecode($m[1]);
if (!isset($data[$locale])) {
    http_response_code(404);
    echo '{"error":"Unknown locale"}';
    return;
}
$body = json_encode($data[$locale], JSON_UNESCAPED_UNICODE);
$etag = '"' . sha1($body) . '"';
header("ETag: {$etag}");
if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? null) === $etag) {
    http_response_code(304);
    return;
}
header('Content-Type: application/json');
echo $body;
