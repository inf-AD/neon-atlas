<?php
declare(strict_types=1);

/**
 * Общая отрисовка страницы: её используют и index.php (PHP на сервере),
 * и build_static.php (статическая сборка). Разметка одна и та же.
 * Плашки строит game.js из данных window.NEON — так «Новый раунд»
 * перемешивает пары без перезагрузки страницы.
 */

require_once __DIR__ . '/marks.php';

const ROUND_SIZE = 6;

/**
 * Все пары с готовыми SVG-иллюстрациями.
 * @return array<string, array<string, string>>
 */
function neon_payload(): array
{
    $all  = require __DIR__ . '/data.php';
    $hues = [186, 320, 268, 42, 150, 210, 330, 96, 250, 12, 286, 168, 60, 288, 340, 128];

    $out = [];
    $i = 0;
    foreach ($all as $key => $row) {
        $code = strtoupper(substr($key, 0, 2));
        $out[$key] = [
            'key'      => $key,
            'country'  => $row['country'],
            'capital'  => $row['capital'],
            'landmark' => $row['landmark'],
            'fact'     => $row['fact'],
            'code'     => $code,
            'flag'     => 'img/flag_' . $key . '.png',
            'photo'    => 'img/' . $key . '.jpg',
            'artC'     => country_badge($code, $row['country'], $hues[$i % count($hues)]),
            'artK'     => capital_mark($row['mark'], $row['landmark']),
        ];
        $i++;
    }

    return $out;
}

/**
 * Авторы фотографий и флагов — по данным credits.json.
 * Лицензии CC BY и CC BY-SA требуют указания автора, поэтому блок
 * с титрами выводится внизу страницы.
 * @return list<array<string, string>>
 */
function neon_credits(): array
{
    $path = __DIR__ . '/credits.json';
    if (!is_file($path)) {
        return [];
    }
    $raw = json_decode((string) file_get_contents($path), true);
    if (!is_array($raw)) {
        return [];
    }

    $out = [];
    foreach ($raw as $item) {
        if (!is_array($item) || !isset($item['title'])) {
            continue;
        }
        $out[] = [
            'title'   => (string) $item['title'],
            'author'  => (string) ($item['author'] ?? 'Wikimedia Commons'),
            'license' => (string) ($item['license'] ?? ''),
            'page'    => (string) ($item['page'] ?? ''),
            'kind'    => (string) ($item['kind'] ?? 'photo'),
        ];
    }
    usort($out, static fn (array $a, array $b): int => strcmp($a['title'], $b['title']));
    return $out;
}

function render_page(array $payload, bool $static = false): string
{
    $credits = neon_credits();
    $json = json_encode(
        ['pairs' => array_values($payload), 'size' => ROUND_SIZE],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
    );

    $foot = $static
        ? 'Статическая сборка · PHP не нужен'
        : 'PHP ' . PHP_VERSION . ' · сервер';

    ob_start();
    ?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NEON ATLAS · страна и столица</title>
<meta name="description" content="Мини-игра: соотнесите страну и её столицу. Шесть пар, неон, таймер.">
<link rel="stylesheet" href="style.css">
</head>
<body>
<?= svg_defs() ?>

<div class="wrap">

    <div class="topbar">
        <a class="brand" href="./">
            <span class="logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none"
                     stroke="#22f0ff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18"/>
                </svg>
            </span>
            <span>
                <b>Neon Atlas</b>
                <span>страна · столица</span>
            </span>
        </a>

        <div class="hud" aria-live="polite">
            <div class="hud-item">
                <small>Пары</small>
                <b id="hud-pairs">0/<?= ROUND_SIZE ?></b>
            </div>
            <div class="hud-item hot">
                <small>Ошибки</small>
                <b id="hud-miss">0</b>
            </div>
            <div class="hud-item good">
                <small>Серия</small>
                <b id="hud-streak">0</b>
            </div>
            <div class="hud-item">
                <small>Время</small>
                <b id="hud-time">0:00</b>
            </div>
        </div>
    </div>

    <section class="intro">
        <h1>Соедините <em>страну</em> и её <em>столицу</em></h1>
        <p>
            Нажмите плашку слева, затем плашку справа. Правильная пара загорается зелёным
            и больше не двигается. Ошибка стоит одну попытку — но не отнимает пару.
        </p>
        <div class="rules">
            <span class="chip">Раунд <b><?= ROUND_SIZE ?></b> пар</span>
            <span class="chip">Подсказка <b>H</b></span>
            <span class="chip">Новый раунд <b>N</b></span>
            <span class="chip">Сброс <b>R</b></span>
        </div>
    </section>

    <div class="board" id="board">
        <div class="col" id="col-country">
            <div class="col-head"><span>Страна</span></div>
        </div>
        <div class="col" id="col-capital">
            <div class="col-head b"><span>Столица</span></div>
        </div>
    </div>

    <div class="actions">
        <button type="button" class="btn primary" id="btn-hint">Подсказка</button>
        <button type="button" class="btn" id="btn-shuffle">Новый раунд</button>
        <button type="button" class="btn" id="btn-reset">Сброс</button>
    </div>

    <p class="flash" id="flash" role="status" aria-live="polite"></p>

    <section class="result" id="result" aria-live="polite">
        <h2>Раунд <em>закрыт</em></h2>
        <p class="score" id="result-score"></p>
        <table>
            <thead>
                <tr><th>Страна</th><th>Столица</th><th>Подсказка</th></tr>
            </thead>
            <tbody id="result-body"></tbody>
        </table>
    </section>

    <div class="actions">
        <button type="button" class="btn primary" id="btn-again">Ещё раунд</button>
    </div>

    <?php if ($credits !== []): ?>
    <details class="credits">
        <summary>Фотографии и флаги: авторы и лицензии</summary>
        <p class="credits-note">
            Все снимки взяты с Wikimedia Commons. Лицензии CC BY и CC BY-SA требуют
            указывать автора — это и есть назначение списка.
        </p>
        <ul>
            <?php foreach ($credits as $c): ?>
                <li>
                    <?php if ($c['page'] !== ''): ?>
                        <a href="<?= htmlspecialchars($c['page'], ENT_QUOTES, 'UTF-8') ?>"
                           target="_blank" rel="noopener noreferrer"><?= htmlspecialchars($c['title'], ENT_QUOTES, 'UTF-8') ?></a>
                    <?php else: ?>
                        <?= htmlspecialchars($c['title'], ENT_QUOTES, 'UTF-8') ?>
                    <?php endif; ?>
                    — <?= htmlspecialchars($c['author'], ENT_QUOTES, 'UTF-8') ?>
                    <span class="lic"><?= htmlspecialchars($c['license'], ENT_QUOTES, 'UTF-8') ?></span>
                </li>
            <?php endforeach; ?>
        </ul>
    </details>
    <?php endif; ?>

    <div class="foot">
        <span>Neon Atlas · PHP + HTML</span>
        <span><?= htmlspecialchars($foot, ENT_QUOTES, 'UTF-8') ?></span>
    </div>

</div>

<script>
window.NEON = <?= $json ?>;
</script>
<script src="game.js"></script>
</body>
</html>
    <?php
    return (string) ob_get_clean();
}
