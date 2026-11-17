<?php
declare(strict_types=1);

/**
 * NEON ATLAS — мини-игра «страна ↔ столица».
 * PHP отдаёт данные и разметку, JS ведёт раунд.
 */

require __DIR__ . '/view.php';

header('Content-Type: text/html; charset=utf-8');
echo render_page(neon_payload(), false);
