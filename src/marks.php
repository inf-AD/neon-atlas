<?php
declare(strict_types=1);

/**
 * Неоновые SVG-иллюстрации.
 * capital_mark() — достопримечательность столицы.
 * country_badge() — эмблема страны.
 * Оба возвращают готовый <svg> без внешних файлов: страница работает офлайн.
 */

function _svg_open(string $cls, string $label): string
{
    return '<svg class="art ' . $cls . '" viewBox="0 0 200 120" role="img" aria-label="'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '">';
}

/** Общие градиенты и свечение — вставляются в документ один раз. */
function svg_defs(): string
{
    return <<<SVG
<svg class="svg-defs" aria-hidden="true" focusable="false" width="0" height="0">
  <defs>
    <filter id="nglow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="nglow-strong" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="g-cyan" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22f0ff"/><stop offset="1" stop-color="#0af0c8"/>
    </linearGradient>
    <linearGradient id="g-magenta" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff3ea5"/><stop offset="1" stop-color="#b16cff"/>
    </linearGradient>
    <linearGradient id="g-amber" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ff8a3d"/>
    </linearGradient>
    <linearGradient id="g-violet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a06bff"/><stop offset="1" stop-color="#4b6bff"/>
    </linearGradient>
  </defs>
</svg>
SVG;
}

/** Рисунок достопримечательности по ключу. */
function capital_mark(string $key, string $label): string
{
    $stroke = 'fill="none" stroke="url(#g-cyan)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#nglow)"';

    $shapes = [
        'eiffel' => <<<S
<g {$stroke}>
  <path d="M100 16 L88 100 M100 16 L112 100"/>
  <path d="M92 62 H108 M86 80 H114"/>
  <path d="M72 104 H128"/>
  <path d="M84 100 Q100 88 116 100"/>
  <path d="M100 16 V8"/>
</g>
<circle cx="100" cy="6" r="2.4" fill="#ff3ea5" filter="url(#nglow)"/>
S,
        'bigben' => <<<S
<g {$stroke}>
  <rect x="88" y="26" width="24" height="74" rx="2"/>
  <path d="M100 8 L86 26 H114 Z"/>
  <circle cx="100" cy="44" r="7"/>
  <path d="M100 44 V39 M100 44 H105"/>
  <path d="M92 66 H108 M92 80 H108"/>
  <path d="M70 102 H130"/>
  <path d="M120 102 V60 H136 V102"/>
</g>
S,
        'colosseum' => <<<S
<g {$stroke}>
  <path d="M46 96 V52 Q100 26 154 52 V96"/>
  <path d="M46 66 Q100 42 154 66"/>
  <path d="M46 82 Q100 58 154 82"/>
  <path d="M60 96 V82 M78 96 V82 M100 96 V82 M122 96 V82 M140 96 V82"/>
  <path d="M60 82 V66 M80 82 V66 M120 82 V66 M140 82 V66"/>
  <path d="M38 100 H162"/>
</g>
S,
        'parthenon' => <<<S
<g {$stroke}>
  <path d="M40 50 L100 24 L160 50"/>
  <path d="M48 50 H152 V58 H48 Z"/>
  <path d="M56 58 V92 M76 58 V92 M100 58 V92 M124 58 V92 M144 58 V92"/>
  <path d="M44 92 H156 M40 100 H160"/>
</g>
S,
        'brandenburg' => <<<S
<g {$stroke}>
  <path d="M44 96 V44 H156 V96"/>
  <path d="M44 44 L54 32 H146 L156 44"/>
  <path d="M64 96 V56 M84 96 V56 M100 96 V56 M116 96 V56 M136 96 V56"/>
  <path d="M36 100 H164"/>
  <path d="M60 44 V34 M140 44 V34"/>
</g>
<g fill="#ffd166" filter="url(#nglow)">
  <rect x="70" y="38" width="4" height="4"/><rect x="90" y="38" width="4" height="4"/>
  <rect x="110" y="38" width="4" height="4"/><rect x="130" y="38" width="4" height="4"/>
</g>
S,
        'alcala' => <<<S
<g {$stroke}>
  <path d="M50 96 V46 H150 V96"/>
  <path d="M50 46 L62 34 H138 L150 46"/>
  <path d="M70 96 V62 Q100 46 130 62 V96"/>
  <path d="M84 96 V76 H116 V96"/>
  <circle cx="100" cy="30" r="5"/>
  <path d="M42 100 H158"/>
</g>
<g stroke="#ff3ea5" stroke-width="2" fill="none" filter="url(#nglow)">
  <path d="M58 52 H70 M130 52 H142"/>
</g>
S,
        'saintbasil' => <<<S
<g {$stroke}>
  <path d="M100 10 L100 26"/>
  <path d="M100 26 Q118 40 100 56 Q82 40 100 26"/>
  <path d="M74 34 L74 46"/>
  <path d="M74 46 Q88 56 74 68 Q60 56 74 46"/>
  <path d="M126 34 L126 46"/>
  <path d="M126 46 Q140 56 126 68 Q112 56 126 46"/>
  <rect x="84" y="70" width="32" height="26"/>
  <path d="M84 96 H116 M76 100 H124"/>
  <path d="M92 96 V82 H108 V96"/>
</g>
S,
        'canals' => <<<S
<g {$stroke}>
  <path d="M50 96 V46 L62 30 L74 46 V96"/>
  <path d="M86 96 V38 L98 22 L110 38 V96"/>
  <path d="M122 96 V50 L134 34 L146 50 V96"/>
  <path d="M60 60 H64 M96 54 H100 M132 66 H136"/>
  <path d="M40 96 H160"/>
  <path d="M36 104 Q60 98 84 104 T132 104 T168 104"/>
</g>
<circle cx="100" cy="12" r="3" fill="#22f0ff" filter="url(#nglow)"/>
S,
        'tokyotower' => <<<S
<g {$stroke}>
  <path d="M100 18 L78 96 M100 18 L122 96"/>
  <path d="M86 58 H114 M82 78 H118"/>
  <path d="M70 100 H130"/>
  <path d="M100 18 V10"/>
</g>
<g stroke="#ff3ea5" stroke-width="2.4" fill="none" filter="url(#nglow)">
  <path d="M96 96 H104 M94 88 H106 M92 80 H108"/>
</g>
<path d="M24 84 Q40 64 58 84 Z" fill="none" stroke="url(#g-magenta)" stroke-width="2" filter="url(#nglow)"/>
S,
        'forbidden' => <<<S
<g {$stroke}>
  <path d="M40 96 V40 H160 V96"/>
  <path d="M34 40 H166 L156 28 H44 Z"/>
  <path d="M70 96 V56 H90 V96 M110 96 V56 H130 V96"/>
  <path d="M100 40 V48"/>
  <path d="M32 100 H168"/>
</g>
<g fill="#ff3ea5" filter="url(#nglow)">
  <circle cx="52" cy="52" r="2.6"/><circle cx="148" cy="52" r="2.6"/>
</g>
S,
        'indiagate' => <<<S
<g {$stroke}>
  <rect x="82" y="42" width="36" height="54" rx="18"/>
  <path d="M82 60 H118"/>
  <path d="M74 96 V50 H126 V96"/>
  <path d="M64 96 H136 M60 102 H140"/>
  <path d="M100 26 V16"/>
</g>
<g stroke="#ffd166" stroke-width="2" fill="none" filter="url(#nglow)">
  <path d="M88 74 Q100 66 112 74"/>
</g>
S,
        'mosque' => <<<S
<g {$stroke}>
  <path d="M100 20 Q128 40 128 66 Q128 84 100 88 Q72 84 72 66 Q72 40 100 20 Z"/>
  <path d="M100 20 V10"/>
  <path d="M52 96 V58 Q52 48 60 44 V96"/>
  <path d="M148 96 V58 Q148 48 140 44 V96"/>
  <path d="M44 96 H156 M40 102 H160"/>
  <path d="M92 88 V74 H108 V88"/>
</g>
<circle cx="60" cy="36" r="2.6" fill="#22f0ff" filter="url(#nglow)"/>
<circle cx="140" cy="36" r="2.6" fill="#22f0ff" filter="url(#nglow)"/>
S,
        'pyramids' => <<<S
<g {$stroke}>
  <path d="M38 96 L86 30 L134 96 Z"/>
  <path d="M104 96 L140 48 L176 96 Z"/>
  <path d="M86 30 L98 96"/>
  <path d="M30 100 H180"/>
</g>
<circle cx="60" cy="22" r="3" fill="#ffd166" filter="url(#nglow)"/>
S,
        'capitol' => <<<S
<g {$stroke}>
  <path d="M100 18 Q118 30 118 46 H82 Q82 30 100 18 Z"/>
  <path d="M100 18 V10"/>
  <path d="M74 46 H126 V58 H74 Z"/>
  <path d="M60 96 V58 H140 V96"/>
  <path d="M84 96 V74 H116 V96"/>
  <path d="M52 100 H148"/>
</g>
S,
        'ottawa' => <<<S
<g {$stroke}>
  <rect x="92" y="24" width="30" height="72"/>
  <path d="M107 24 L107 12"/>
  <path d="M92 38 H122 M92 52 H122 M92 66 H122"/>
  <path d="M60 96 V56 H86 V96 M128 96 V56 H154 V96"/>
  <path d="M52 100 H162"/>
  <circle cx="107" cy="44" r="6"/>
</g>
<g stroke="#ffd166" stroke-width="2" fill="none" filter="url(#nglow)">
  <path d="M66 66 H80 M134 66 H148"/>
</g>
S,
        'canberra' => <<<S
<g {$stroke}>
  <path d="M28 96 L100 46 L172 96 Z"/>
  <path d="M62 96 L100 72 L138 96"/>
  <path d="M100 46 V28"/>
  <path d="M100 28 L118 22 L100 16 Z"/>
  <path d="M22 100 H178"/>
</g>
S,
    ];

    if (!isset($shapes[$key])) {
        $key = 'capitol';
    }

    return _svg_open('mark', $label) . $shapes[$key] . '</svg>';
}

/** Эмблема страны: шестиугольник с кодом и уникальным оттенком. */
function country_badge(string $code, string $country, int $hue): string
{
    $c1 = 'hsl(' . $hue . ' 100% 62%)';
    $c2 = 'hsl(' . (($hue + 40) % 360) . ' 100% 68%)';

    return _svg_open('badge-art', $country)
        . '<g fill="none" stroke="' . $c1 . '" stroke-width="2.4" filter="url(#nglow)" opacity=".9">'
        . '<path d="M100 18 L142 42 V78 L100 102 L58 78 V42 Z"/>'
        . '</g>'
        . '<g fill="none" stroke="' . $c2 . '" stroke-width="1.4" opacity=".55">'
        . '<path d="M100 28 L132 46 V74 L100 92 L68 74 V46 Z"/>'
        . '</g>'
        . '<text x="100" y="72" text-anchor="middle" font-family="Rajdhani, Segoe UI, sans-serif"'
        . ' font-size="30" font-weight="700" letter-spacing="2" fill="' . $c2 . '"'
        . ' filter="url(#nglow)">' . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') . '</text>'
        . '<g stroke="' . $c1 . '" stroke-width="1.6" opacity=".6">'
        . '<path d="M40 60 H50 M150 60 H160"/></g>'
        . '</svg>';
}
