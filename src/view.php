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
const ROUND_COUNT = 5;

/**
 * План раундов: от простых пар к сложным.
 * Раунд 1 — страны, которые знают все; раунд 5 — те, где столица
 * не совпадает с очевидным ответом.
 * @var list<list<string>>
 */
const ROUND_PLAN = [
    ['fr', 'gb', 'it', 'es', 'de', 'eg'],
    ['ru', 'cn', 'jp', 'us', 'tr', 'gr'],
    ['ca', 'au', 'br', 'pt', 'nl', 'in'],
    ['ch', 'cz', 'at', 'hu', 'kr', 'mx'],
    ['th', 'ar', 'ng', 'za', 'ae', 'ma'],
];

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
        [
            'pairs'    => array_values($payload),
            'size'     => ROUND_SIZE,
            'rounds'   => ROUND_COUNT,
            'plan'     => ROUND_PLAN,
            'mail'     => 'kovalenko_09@mail.ru',
        ],
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
<title>Гео-спринт · страна и столица</title>
<meta name="description" content="Мини-игра: соотнесите страну и её столицу. Пять раундов по шесть пар, очки за пары, неон, таймер.">
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
                <b>Гео-спринт</b>
                <span>страна · столица</span>
            </span>
        </a>

        <div class="hud" aria-live="polite">
            <div class="hud-item">
                <small>Раунд</small>
                <b id="hud-round">1/<?= ROUND_COUNT ?></b>
            </div>
            <div class="hud-item">
                <small>Пары</small>
                <b id="hud-pairs">0/<?= ROUND_SIZE ?></b>
            </div>
            <div class="hud-item hot">
                <small>Очки</small>
                <b id="hud-score">0</b>
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
            Пять раундов по шесть пар — от самых известных стран к тем,
            где столица не совпадает с очевидным ответом.
            Нажмите плашку слева, затем плашку справа. Правильная пара загорается зелёным.
            Неверная гаснет, а вы теряете очки.
        </p>
        <div class="rules">
            <span class="chip">Раундов <b><?= ROUND_COUNT ?></b></span>
            <span class="chip">В раунде <b><?= ROUND_SIZE ?></b> пар</span>
            <span class="chip">С первой попытки <b>3</b> очка</span>
        </div>
    </section>

    <section class="screen screen-start" id="screen-start">
        <h2 class="screen-title">Как вас <em>зовут</em>?</h2>
        <p class="screen-note">
            Имя или название команды попадёт в статистику прохождения.
        </p>
        <form class="start-form" id="start-form" autocomplete="off">
            <label class="field">
                <span>Имя игрока или команды</span>
                <input type="text" id="player-name" name="player" maxlength="60"
                       placeholder="Например: 9 «Б» или Команда «Меридиан»" required>
            </label>
            <button type="submit" class="btn primary big" id="btn-start">Начать игру</button>
        </form>
        <p class="screen-hint">
            Пять раундов по шесть пар. За пару с первой попытки — 3 очка,
            с одной ошибкой — 2, в остальных случаях — 1.
        </p>
    </section>

    <section class="screen screen-game" id="screen-game" hidden>
        <div class="round-bar">
            <span class="round-label">Раунд <b id="round-now">1</b> из <?= ROUND_COUNT ?></span>
            <span class="round-sub" id="round-sub"></span>
        </div>

        <div class="board" id="board">
            <div class="col" id="col-country">
                <div class="col-head"><span>Страна</span></div>
            </div>
            <div class="col" id="col-capital">
                <div class="col-head b"><span>Столица</span></div>
            </div>
        </div>

        <div class="actions">
            <button type="button" class="btn" id="btn-hint">Подсказка</button>
        </div>

        <p class="flash" id="flash" role="status" aria-live="polite"></p>
    </section>

    <div class="round-over" id="round-over" hidden>
        <div class="round-over-card">
            <p class="ro-kicker" id="ro-kicker"></p>
            <h2 class="ro-title" id="ro-title"></h2>
            <p class="ro-sub" id="ro-sub"></p>
            <ul class="ro-list" id="ro-list"></ul>
        </div>
    </div>

    <section class="screen screen-final" id="screen-final" hidden aria-live="polite">
        <h2 class="screen-title" id="final-title">Игра <em>завершена</em></h2>
        <p class="final-verdict" id="final-verdict"></p>

        <div class="final-grid" id="final-grid"></div>

        <h3 class="final-sub">Статистика по раундам</h3>
        <div class="table-scroll">
            <table class="final-table">
                <thead>
                    <tr>
                        <th>Раунд</th>
                        <th>Пар собрано</th>
                        <th>Ошибок</th>
                        <th>Время</th>
                        <th>Очки</th>
                        <th>Итог раунда</th>
                    </tr>
                </thead>
                <tbody id="final-body"></tbody>
            </table>
        </div>

        <div class="actions final-actions">
            <button type="button" class="btn primary" id="btn-xlsx">Скачать Excel</button>
            <button type="button" class="btn" id="btn-send">Отправить на почту</button>
            <button type="button" class="btn" id="btn-restart">Играть снова</button>
        </div>

        <p class="flash" id="send-flash" role="status" aria-live="polite"></p>

        <form class="send-form" id="send-form" hidden
              action="https://formsubmit.co/kovalenko_09@mail.ru" method="POST">
            <input type="hidden" name="_subject" value="Гео-спринт — статистика игрока">
            <input type="hidden" name="_template" value="table">
            <input type="hidden" name="_captcha" value="false">
            <input type="hidden" name="Игрок" id="f-player" value="">
            <input type="hidden" name="Очки" id="f-score" value="">
            <input type="hidden" name="Верно собрано пар" id="f-solved" value="">
            <input type="hidden" name="Общее время" id="f-total" value="">
            <div id="f-rounds"></div>
            <button type="submit" class="btn primary" id="btn-send-go">Отправить письмо</button>
        </form>
    </section>

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
        <span>Гео-спринт · PHP + HTML</span>
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
