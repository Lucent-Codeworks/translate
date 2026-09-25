<?php

declare(strict_types=1);

namespace Lucent\Translate\Cache;

use DateInterval;
use Psr\SimpleCache\CacheInterface;

/**
 * Minimal file-backed PSR-16 cache for apps without a framework cache.
 * Writes are atomic (temp file + rename), so concurrent requests never read
 * a half-written entry.
 */
final class FileCache implements CacheInterface
{
    public function __construct(private readonly string $directory)
    {
        if (!is_dir($directory) && !@mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException("Cannot create cache directory {$directory}");
        }
    }

    public function get(string $key, mixed $default = null): mixed
    {
        $raw = @file_get_contents($this->path($key));
        if ($raw === false) {
            return $default;
        }
        $item = @unserialize($raw, ['allowed_classes' => false]);
        if (!is_array($item) || ($item['expires'] !== null && $item['expires'] <= time())) {
            return $default;
        }
        return $item['value'];
    }

    public function set(string $key, mixed $value, null|int|DateInterval $ttl = null): bool
    {
        $path = $this->path($key);
        $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
        $data = serialize(['value' => $value, 'expires' => ArrayCache::expiry($ttl)]);
        if (@file_put_contents($tmp, $data) === false) {
            return false;
        }
        return @rename($tmp, $path);
    }

    public function delete(string $key): bool
    {
        $path = $this->path($key);
        return !file_exists($path) || @unlink($path);
    }

    public function clear(): bool
    {
        $ok = true;
        foreach (glob($this->directory . '/*.cache') ?: [] as $file) {
            $ok = @unlink($file) && $ok;
        }
        return $ok;
    }

    public function getMultiple(iterable $keys, mixed $default = null): iterable
    {
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $this->get($key, $default);
        }
        return $result;
    }

    /** @param iterable<string, mixed> $values */
    public function setMultiple(iterable $values, null|int|DateInterval $ttl = null): bool
    {
        $ok = true;
        foreach ($values as $key => $value) {
            $ok = $this->set($key, $value, $ttl) && $ok;
        }
        return $ok;
    }

    public function deleteMultiple(iterable $keys): bool
    {
        $ok = true;
        foreach ($keys as $key) {
            $ok = $this->delete($key) && $ok;
        }
        return $ok;
    }

    public function has(string $key): bool
    {
        return $this->get($key, $this) !== $this;
    }

    private function path(string $key): string
    {
        return $this->directory . '/' . sha1($key) . '.cache';
    }
}
