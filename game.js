/* NEON ATLAS — игра «страна ↔ столица»: 4 раунда по 5 пар, статистика, Excel */
(function () {
    'use strict';

    var DATA = window.NEON || {};
    var ALL = DATA.pairs || [];
    var SIZE = DATA.size || 5;
    var ROUNDS = DATA.rounds || 4;
    var MAX_MISS = DATA.maxMiss || 2;
    var PLAN = DATA.plan || [];

    var FACTS = {};
    var BY_KEY = {};
    ALL.forEach(function (row) {
        FACTS[row.key] = row.country + ' — ' + row.capital + '. ' + row.fact;
        BY_KEY[row.key] = row;
    });

    var ROUND_LABEL = ['Разминка', 'Уверенный уровень', 'Сложнее', 'Знатоки'];

    /* ---------- элементы ---------- */
    var colC = document.getElementById('col-country');
    var colK = document.getElementById('col-capital');
    var flash = document.getElementById('flash');
    var sendFlash = document.getElementById('send-flash');

    var screenStart = document.getElementById('screen-start');
    var screenGame = document.getElementById('screen-game');
    var screenFinal = document.getElementById('screen-final');

    var hudRound = document.getElementById('hud-round');
    var hudPairs = document.getElementById('hud-pairs');
    var hudMiss = document.getElementById('hud-miss');
    var hudTime = document.getElementById('hud-time');

    var roundNow = document.getElementById('round-now');
    var roundSub = document.getElementById('round-sub');

    var overlay = document.getElementById('round-over');
    var roKicker = document.getElementById('ro-kicker');
    var roTitle = document.getElementById('ro-title');
    var roSub = document.getElementById('ro-sub');
    var roList = document.getElementById('ro-list');

    var finalTitle = document.getElementById('final-title');
    var finalVerdict = document.getElementById('final-verdict');
    var finalGrid = document.getElementById('final-grid');
    var finalBody = document.getElementById('final-body');

    var sendForm = document.getElementById('send-form');

    /* ---------- состояние ---------- */
    var state = {
        name: '',
        roundIndex: 0,
        results: [],
        picked: null,
        solved: {},
        miss: 0,
        roundRows: [],
        platesByKey: {},
        plates: [],
        roundStart: 0,
        timer: null,
        totalMs: 0,
        busy: false,
        finished: false
    };

    /* ---------- вспомогательное ---------- */

    function shuffle(a) {
        var i, j, t;
        for (i = a.length - 1; i > 0; i -= 1) {
            j = Math.floor(Math.random() * (i + 1));
            t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function say(text, kind) {
        flash.textContent = text || '';
        flash.className = 'flash' + (kind ? ' ' + kind : '');
    }

    function clock(ms) {
        var s = Math.max(0, Math.round(ms / 1000));
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    function solvedCount() {
        return Object.keys(state.solved).length;
    }

    function liveCount() {
        return state.plates.filter(function (el) {
            return !el.classList.contains('dead') && !el.classList.contains('locked');
        }).length;
    }

    function showScreen(which) {
        screenStart.hidden = which !== 'start';
        screenGame.hidden = which !== 'game';
        screenFinal.hidden = which !== 'final';
    }

    function rowsForRound(i) {
        var keys = PLAN[i] || [];
        var rows = keys.map(function (k) { return BY_KEY[k]; }).filter(Boolean);
        if (rows.length < SIZE) {
            var used = {};
            PLAN.forEach(function (list) {
                (list || []).forEach(function (k) { used[k] = 1; });
            });
            var pool = shuffle(ALL.filter(function (r) { return !used[r.key]; }));
            while (rows.length < SIZE && pool.length) { rows.push(pool.shift()); }
        }
        return rows;
    }

    /* ---------- плашки ---------- */

    function makePlate(row, side) {
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'plate reveal';
        el.setAttribute('data-side', side);
        el.setAttribute('data-key', row.key);
        var art;
        if (side === 'country') {
            art = '<img class="ph flag" src="' + row.flag + '" alt="Флаг: ' + row.country
                + '" loading="lazy" width="320" height="220">';
        } else {
            art = '<img class="ph" src="' + row.photo + '" alt="' + row.landmark
                + '" loading="lazy" width="480" height="300">';
        }
        el.innerHTML =
            '<span class="pic' + (side === 'country' ? ' pic-flag' : ' pic-photo') + '">' + art + '</span>'
            + '<span class="txt"><b></b><small></small></span>'
            + '<span class="tag" aria-hidden="true"></span>';
        el.querySelector('.txt b').textContent = side === 'country' ? row.country : row.capital;
        el.querySelector('.txt small').textContent = side === 'country' ? 'найдите столицу' : row.landmark;
        el.querySelector('.tag').textContent = side === 'country' ? row.code : '?';
        return el;
    }

    function clearBoard() {
        state.roundRows.forEach(function (row) {
            var pair = state.platesByKey[row.key] || {};
            if (pair.country) { pair.country.remove(); }
            if (pair.capital) { pair.capital.remove(); }
        });
        state.platesByKey = {};
        state.plates = [];
    }

    function buildRound(i) {
        clearBoard();
        stopTimer();

        state.roundIndex = i;
        state.picked = null;
        state.solved = {};
        state.miss = 0;
        state.busy = false;
        state.finished = false;
        state.roundStart = Date.now();
        state.roundRows = rowsForRound(i);

        var countries = shuffle(state.roundRows.slice());
        var capitals = shuffle(state.roundRows.slice());

        countries.forEach(function (row, n) {
            var el = makePlate(row, 'country');
            el.style.animationDelay = (n * 45) + 'ms';
            el.addEventListener('click', function () { pick(el); });
            colC.appendChild(el);
            state.platesByKey[row.key] = state.platesByKey[row.key] || {};
            state.platesByKey[row.key].country = el;
            state.plates.push(el);
        });

        capitals.forEach(function (row, n) {
            var el = makePlate(row, 'capital');
            el.style.animationDelay = (120 + n * 45) + 'ms';
            el.addEventListener('click', function () { pick(el); });
            colK.appendChild(el);
            state.platesByKey[row.key] = state.platesByKey[row.key] || {};
            state.platesByKey[row.key].capital = el;
            state.plates.push(el);
        });

        hudRound.textContent = (i + 1) + '/' + ROUNDS;
        hudPairs.textContent = '0/' + SIZE;
        hudMiss.textContent = '0/' + MAX_MISS;
        hudTime.textContent = '0:00';
        roundNow.textContent = String(i + 1);
        roundSub.textContent = ROUND_LABEL[i] || '';

        say('Раунд ' + (i + 1) + ': ' + (ROUND_LABEL[i] || '') + '. Найдите столицу для каждой страны.');
        startTimer();
    }

    /* ---------- таймер ---------- */

    function startTimer() {
        if (state.timer) { return; }
        state.timer = setInterval(function () {
            hudTime.textContent = clock(Date.now() - state.roundStart);
        }, 250);
    }

    function stopTimer() {
        if (state.timer) {
            clearInterval(state.timer);
            state.timer = null;
        }
    }

    function clearSel() {
        state.plates.forEach(function (el) { el.classList.remove('sel'); });
        state.picked = null;
    }

    /* ---------- выбор ---------- */

    function pick(el) {
        if (state.busy || state.finished) { return; }
        if (el.classList.contains('locked') || el.classList.contains('dead')) { return; }

        var side = el.getAttribute('data-side');
        var key = el.getAttribute('data-key');

        if (!state.picked) {
            clearSel();
            el.classList.add('sel');
            state.picked = { el: el, side: side, key: key };
            say(side === 'country'
                ? 'Страна выбрана. Теперь нажмите столицу справа.'
                : 'Столица выбрана. Теперь нажмите страну слева.');
            return;
        }

        if (state.picked.el === el) {
            clearSel();
            say('');
            return;
        }

        if (state.picked.side === side) {
            clearSel();
            el.classList.add('sel');
            state.picked = { el: el, side: side, key: key };
            return;
        }

        check(state.picked, { el: el, side: side, key: key });
    }

    function killPair(a, b) {
        [a, b].forEach(function (el) {
            if (!el) { return; }
            el.classList.remove('sel', 'hint', 'wrong');
            el.classList.add('dead');
            el.setAttribute('aria-disabled', 'true');
            el.setAttribute('tabindex', '-1');
        });
    }

    function check(a, b) {
        var countryEl = a.side === 'country' ? a.el : b.el;
        var capitalEl = a.side === 'capital' ? a.el : b.el;
        var key = a.key;

        clearSel();

        if (a.key === b.key) {
            state.busy = true;
            countryEl.classList.add('locked');
            capitalEl.classList.add('locked');
            state.solved[key] = true;
            hudPairs.textContent = solvedCount() + '/' + SIZE;
            say('Совпало. ' + (FACTS[key] || ''), 'ok');

            setTimeout(function () {
                state.busy = false;
                if (solvedCount() >= SIZE) { endRound(false); }
                else if (liveCount() === 0) { endRound(true); }
            }, 340);
            return;
        }

        state.miss += 1;
        hudMiss.textContent = state.miss + '/' + MAX_MISS;
        state.busy = true;
        [countryEl, capitalEl].forEach(function (el) { el.classList.add('wrong'); });
        say('Не совпало. Ошибка ' + state.miss + ' из ' + MAX_MISS + '.', 'err');

        setTimeout(function () {
            killPair(countryEl, capitalEl);
            state.busy = false;
            if (state.miss >= MAX_MISS) { endRound(true); }
            else if (liveCount() === 0) { endRound(true); }
        }, 460);
    }

    /* ---------- подсказка ---------- */

    function hint() {
        if (state.finished) { return; }
        var left = state.roundRows.filter(function (row) { return !state.solved[row.key]; });
        if (!left.length) { return; }

        var row = left[Math.floor(Math.random() * left.length)];
        [state.platesByKey[row.key].country, state.platesByKey[row.key].capital].forEach(function (el) {
            el.classList.add('hint');
            setTimeout(function () { el.classList.remove('hint'); }, 2400);
        });
        say('Подсказка: ' + row.capital + ' — столица этой страны.', 'hint');
    }

    /* ---------- конец раунда ---------- */

    function endRound(failed) {
        if (state.finished) { return; }
        state.finished = true;
        state.busy = true;
        stopTimer();

        var ms = Date.now() - state.roundStart;
        var got = solvedCount();

        state.results.push({
            round: state.roundIndex + 1,
            solved: got,
            miss: state.miss,
            ms: ms,
            failed: failed
        });
        state.totalMs += ms;

        roKicker.textContent = 'Раунд ' + (state.roundIndex + 1) + ' из ' + ROUNDS;
        roTitle.textContent = failed
            ? 'Жаль, но вам пока еще рано отправляться в кругосветное путешествие!'
            : 'Раунд пройден: ' + got + ' из ' + SIZE;
        roSub.textContent = failed
            ? 'Две ошибки — раунд закрыт. Дальше пары сложнее.'
            : 'Все пары собраны. Дальше пары сложнее.';

        var html = '';
        state.roundRows.forEach(function (row) {
            var pair = state.platesByKey[row.key] || {};
            var lost = pair.country && pair.country.classList.contains('dead');
            html += '<li' + (lost ? ' class="miss"' : '') + '><b>' + row.country + '</b>'
                + ' — ' + row.capital + '</li>';
        });
        roList.innerHTML = html;

        overlay.hidden = false;

        setTimeout(function () {
            overlay.hidden = true;
            if (state.roundIndex + 1 >= ROUNDS) { finishGame(); }
            else { buildRound(state.roundIndex + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        }, 3000);
    }

    /* ---------- итоги ---------- */

    function totalSolved() {
        return state.results.reduce(function (s, r) { return s + r.solved; }, 0);
    }

    function totalMiss() {
        return state.results.reduce(function (s, r) { return s + r.miss; }, 0);
    }

    function passedRounds() {
        return state.results.filter(function (r) { return !r.failed; }).length;
    }

    function finishGame() {
        stopTimer();
        showScreen('final');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        var solved = totalSolved();
        var passed = passedRounds();

        finalTitle.innerHTML = 'Игра <em>завершена</em>';
        finalVerdict.textContent = passed === ROUNDS
            ? 'Все четыре раунда пройдены. Кругосветное путешествие состоялось!'
            : passed === 0
                ? 'Пока ни одного раунда без двух ошибок. Пары те же — попробуйте ещё раз.'
                : 'Пройдено раундов: ' + passed + ' из ' + ROUNDS + '. Есть куда расти.';

        finalGrid.innerHTML =
            '<div class="final-card"><small>Игрок</small><b>' + esc(state.name) + '</b></div>'
            + '<div class="final-card"><small>Верно собрано пар</small><b>' + solved + ' из ' + (SIZE * ROUNDS) + '</b></div>'
            + '<div class="final-card"><small>Раундов пройдено</small><b>' + passed + ' из ' + ROUNDS + '</b></div>'
            + '<div class="final-card hot"><small>Общее время</small><b>' + clock(state.totalMs) + '</b></div>';

        var html = '';
        state.results.forEach(function (r) {
            html += '<tr' + (r.failed ? ' class="miss"' : '') + '>'
                + '<td>' + r.round + '</td>'
                + '<td>' + r.solved + ' из ' + SIZE + '</td>'
                + '<td>' + r.miss + '</td>'
                + '<td>' + clock(r.ms) + '</td>'
                + '<td>' + (r.failed ? 'закрыт двумя ошибками' : 'пройден') + '</td>'
                + '</tr>';
        });
        html += '<tr class="total"><td>Всего</td><td>' + solved + ' из ' + (SIZE * ROUNDS) + '</td>'
            + '<td>' + totalMiss() + '</td><td>' + clock(state.totalMs) + '</td>'
            + '<td>' + passed + ' из ' + ROUNDS + '</td></tr>';
        finalBody.innerHTML = html;

        sendFlash.textContent = '';
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ---------- Excel (.xlsx) ---------- */

    function xmlEsc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function colName(n) {
        var s = '';
        while (n > 0) {
            var m = (n - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    }

    function sheetXml(rows) {
        var out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            + '<cols><col min="1" max="1" width="30" customWidth="1"/>'
            + '<col min="2" max="2" width="26" customWidth="1"/>'
            + '<col min="3" max="3" width="14" customWidth="1"/>'
            + '<col min="4" max="4" width="12" customWidth="1"/>'
            + '<col min="5" max="5" width="26" customWidth="1"/></cols>'
            + '<sheetData>';

        rows.forEach(function (row, r) {
            out += '<row r="' + (r + 1) + '">';
            row.forEach(function (cell, c) {
                if (cell === null || cell === undefined || cell === '') { return; }
                var ref = colName(c + 1) + (r + 1);
                if (typeof cell === 'number') {
                    out += '<c r="' + ref + '"><v>' + cell + '</v></c>';
                } else {
                    out += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">'
                        + xmlEsc(cell) + '</t></is></c>';
                }
            });
            out += '</row>';
        });

        out += '</sheetData></worksheet>';
        return out;
    }

    function utf8(s) {
        return new TextEncoder().encode(s);
    }

    var CRC_TABLE = (function () {
        var t = new Uint32Array(256);
        for (var n = 0; n < 256; n += 1) {
            var c = n;
            for (var k = 0; k < 8; k += 1) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            t[n] = c >>> 0;
        }
        return t;
    }());

    function crc32(buf) {
        var c = 0xFFFFFFFF;
        for (var i = 0; i < buf.length; i += 1) {
            c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
        }
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function zipStore(files) {
        var now = new Date();
        var time = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5)
            | ((Math.floor(now.getSeconds() / 2)) & 31);
        var date = (((now.getFullYear() - 1980) & 127) << 9)
            | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31);

        var chunks = [];
        var central = [];
        var offset = 0;

        files.forEach(function (f) {
            var name = utf8(f.name);
            var data = f.data;
            var crc = crc32(data);

            var lh = new Uint8Array(30 + name.length);
            var dv = new DataView(lh.buffer);
            dv.setUint32(0, 0x04034b50, true);
            dv.setUint16(4, 20, true);
            dv.setUint16(6, 0x0800, true);
            dv.setUint16(8, 0, true);
            dv.setUint16(10, time, true);
            dv.setUint16(12, date, true);
            dv.setUint32(14, crc, true);
            dv.setUint32(18, data.length, true);
            dv.setUint32(22, data.length, true);
            dv.setUint16(26, name.length, true);
            dv.setUint16(28, 0, true);
            lh.set(name, 30);

            chunks.push(lh, data);

            var ch = new Uint8Array(46 + name.length);
            var cv = new DataView(ch.buffer);
            cv.setUint32(0, 0x02014b50, true);
            cv.setUint16(4, 20, true);
            cv.setUint16(6, 20, true);
            cv.setUint16(8, 0x0800, true);
            cv.setUint16(10, 0, true);
            cv.setUint16(12, time, true);
            cv.setUint16(14, date, true);
            cv.setUint32(16, crc, true);
            cv.setUint32(20, data.length, true);
            cv.setUint32(24, data.length, true);
            cv.setUint16(28, name.length, true);
            cv.setUint16(30, 0, true);
            cv.setUint16(32, 0, true);
            cv.setUint16(34, 0, true);
            cv.setUint16(36, 0, true);
            cv.setUint32(38, 0, true);
            cv.setUint32(42, offset, true);
            ch.set(name, 46);
            central.push(ch);

            offset += lh.length + data.length;
        });

        var cdSize = central.reduce(function (s, c) { return s + c.length; }, 0);
        var eocd = new Uint8Array(22);
        var ev = new DataView(eocd.buffer);
        ev.setUint32(0, 0x06054b50, true);
        ev.setUint16(4, 0, true);
        ev.setUint16(6, 0, true);
        ev.setUint16(8, files.length, true);
        ev.setUint16(10, files.length, true);
        ev.setUint32(12, cdSize, true);
        ev.setUint32(16, offset, true);
        ev.setUint16(20, 0, true);

        var all = chunks.concat(central, [eocd]);
        var total = all.reduce(function (s, c) { return s + c.length; }, 0);
        var out = new Uint8Array(total);
        var pos = 0;
        all.forEach(function (c) { out.set(c, pos); pos += c.length; });
        return out;
    }

    function xlsxBytes() {
        var rows = [
            ['NEON ATLAS — статистика прохождения', '', '', '', ''],
            ['Игрок / команда', state.name],
            ['Дата', new Date().toLocaleString('ru-RU')],
            ['Верно собрано пар', totalSolved() + ' из ' + (SIZE * ROUNDS)],
            ['Общее время', clock(state.totalMs)],
            ['Раундов пройдено', passedRounds() + ' из ' + ROUNDS],
            [],
            ['Раунд', 'Пар собрано', 'Ошибок', 'Время', 'Итог раунда']
        ];

        state.results.forEach(function (r) {
            rows.push([
                'Раунд ' + r.round,
                r.solved + ' из ' + SIZE,
                r.miss,
                clock(r.ms),
                r.failed ? 'закрыт двумя ошибками' : 'пройден'
            ]);
        });

        rows.push([
            'Всего',
            totalSolved() + ' из ' + (SIZE * ROUNDS),
            totalMiss(),
            clock(state.totalMs),
            passedRounds() + ' из ' + ROUNDS
        ]);

        var files = [
            {
                name: '[Content_Types].xml',
                data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                    + '<Default Extension="xml" ContentType="application/xml"/>'
                    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                    + '</Types>')
            },
            {
                name: '_rels/.rels',
                data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                    + '</Relationships>')
            },
            {
                name: 'xl/workbook.xml',
                data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
                    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                    + '<sheets><sheet name="Статистика" sheetId="1" r:id="rId1"/></sheets>'
                    + '</workbook>')
            },
            {
                name: 'xl/_rels/workbook.xml.rels',
                data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
                    + '</Relationships>')
            },
            { name: 'xl/worksheets/sheet1.xml', data: utf8(sheetXml(rows)) }
        ];

        return zipStore(files);
    }

    function safeName() {
        var base = (state.name || 'игрок').replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 40);
        var d = new Date();
        var stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
            + '-' + String(d.getDate()).padStart(2, '0');
        return 'neon-atlas_' + base + '_' + stamp + '.xlsx';
    }

    function downloadXlsx() {
        var bytes = xlsxBytes();
        var blob = new Blob([bytes], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = safeName();
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        sendFlash.textContent = 'Файл Excel сохранён. Прикрепите его к письму, если нужен именно вложением.';
    }

    /* ---------- отправка на почту ---------- */

    function fillSendForm() {
        document.getElementById('f-player').value = state.name;
        document.getElementById('f-solved').value = totalSolved() + ' из ' + (SIZE * ROUNDS);
        document.getElementById('f-total').value = clock(state.totalMs);

        var box = document.getElementById('f-rounds');
        box.innerHTML = '';
        state.results.forEach(function (r) {
            [
                ['Раунд ' + r.round + ': пар собрано', r.solved + ' из ' + SIZE],
                ['Раунд ' + r.round + ': ошибок', String(r.miss)],
                ['Раунд ' + r.round + ': время', clock(r.ms)],
                ['Раунд ' + r.round + ': итог', r.failed ? 'закрыт двумя ошибками' : 'пройден']
            ].forEach(function (pair) {
                var input = document.createElement('input');
                input.type = 'hidden';
                input.name = pair[0];
                input.value = pair[1];
                box.appendChild(input);
            });
        });

        var subj = sendForm.querySelector('input[name="_subject"]');
        if (subj) { subj.value = 'Neon Atlas — статистика: ' + state.name; }
    }

    function sendMail() {
        if (!state.results.length) { return; }
        fillSendForm();
        sendFlash.textContent = 'Открываем форму отправки. Первое письмо с этого адреса '
            + 'сервис попросит подтвердить ссылкой из него.';
        sendForm.removeAttribute('hidden');
        sendForm.submit();
    }

    /* ---------- запуск и перезапуск ---------- */

    function startGame(name) {
        state.name = name;
        state.results = [];
        state.totalMs = 0;
        showScreen('game');
        buildRound(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function restart() {
        stopTimer();
        clearBoard();
        state.results = [];
        state.totalMs = 0;
        state.finished = false;
        showScreen('start');
        overlay.hidden = true;
        document.getElementById('player-name').focus();
    }

    /* ---------- обработчики ---------- */

    document.getElementById('start-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var input = document.getElementById('player-name');
        var name = (input.value || '').trim();
        if (!name) {
            input.focus();
            input.classList.add('shake');
            setTimeout(function () { input.classList.remove('shake'); }, 500);
            return;
        }
        startGame(name);
    });

    document.getElementById('btn-hint').addEventListener('click', hint);
    document.getElementById('btn-xlsx').addEventListener('click', downloadXlsx);
    document.getElementById('btn-send').addEventListener('click', sendMail);
    document.getElementById('btn-restart').addEventListener('click', restart);

    document.addEventListener('keydown', function (e) {
        if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { return; }
        var k = e.key.toLowerCase();
        if (k === 'h' || k === 'р') { e.preventDefault(); hint(); }
        else if (k === 'escape') { clearSel(); say(''); }
    });

    showScreen('start');
    document.getElementById('player-name').focus();
}());
