<?php
declare(strict_types=1);

/**
 * Сборка статической версии для GitHub Pages.
 * PHP на Pages не исполняется, поэтому страница рендерится один раз
 * и сохраняется как index.html. Вся механика — в game.js.
 */

require __DIR__ . '/view.php';

$html = render_page(neon_payload(), true);
file_put_contents(__DIR__ . '/index.html', $html);
echo 'OK ' . strlen($html) . PHP_EOL;
