<?php

declare(strict_types=1);

namespace Lucent\Translate\Exception;

use RuntimeException;

/** Thrown when translations can't be fetched and none are cached. */
class TranslateException extends RuntimeException
{
}
