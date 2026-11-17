/* NEON ATLAS — механика квиза «страна ↔ столица» */
(function () {
    'use strict';

    var DATA = window.NEON || { pairs: [], size: 6 };
    var ALL = DATA.pairs || [];
    var SIZE = Math.min(DATA.size || 6, ALL.length);

    var FACTS = {};
    ALL.forEach(function (row) {
        FACTS[row.key] = row.country + ' — ' + row.capital + '. ' + row.fact;
    });

    var colC = document.getElementById('col-country');
    var colK = document.getElementById('col-capital');
    var flash = document.getElementById('flash');
    var result = document.getElementById('result');
    var resultScore = document.getElementById('result-score');
    var resultBody = document.getElementById('result-body');
    var hudPairs = document.getElementById('hud-pairs');
    var hudMiss = document.getElementById('hud-miss');
    var hudStreak = document.getElementById('hud-streak');
    var hudTime = document.getElementById('hud-time');

    var state = {
        picked: null,
        solved: {},
        round: [],
        byKey: {},
        plates: [],
        miss: 0,
        streak: 0,
        best: 0,
        hints: 0,
        started: 0,
        timer: null,
        busy: false
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
        var s = Math.floor(ms / 1000);
        return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }

    function solvedCount() {
        return Object.keys(state.solved).length;
    }

    function updateHud() {
        hudPairs.textContent = solvedCount() + '/' + SIZE;
        hudMiss.textContent = String(state.miss);
        hudStreak.textContent = String(state.streak);
    }

    /* ---------- раунд ---------- */

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
        state.round.forEach(function (row) {
            var c = state.byKey[row.key].country;
            var k = state.byKey[row.key].capital;
            if (c) { c.remove(); }
            if (k) { k.remove(); }
        });
        state.byKey = {};
        state.plates = [];
    }

    function buildRound() {
        clearBoard();
        stopTimer();

        state.picked = null;
        state.solved = {};
        state.miss = 0;
        state.streak = 0;
        state.best = 0;
        state.hints = 0;
        state.started = 0;
        state.busy = false;

        result.classList.remove('show');
        resultBody.innerHTML = '';
        hudTime.textContent = '0:00';

        state.round = shuffle(ALL.slice()).slice(0, SIZE);
        var capitals = shuffle(state.round.slice());

        state.round.forEach(function (row, i) {
            var el = makePlate(row, 'country');
            el.style.animationDelay = (i * 45) + 'ms';
            el.addEventListener('click', function () { pick(el); });
            colC.appendChild(el);
            state.byKey[row.key] = state.byKey[row.key] || {};
            state.byKey[row.key].country = el;
            state.plates.push(el);
        });

        capitals.forEach(function (row, i) {
            var el = makePlate(row, 'capital');
            el.style.animationDelay = (120 + i * 45) + 'ms';
            el.addEventListener('click', function () { pick(el); });
            colK.appendChild(el);
            state.byKey[row.key] = state.byKey[row.key] || {};
            state.byKey[row.key].capital = el;
            state.plates.push(el);
        });

        updateHud();
    }

    /* ---------- таймер ---------- */

    function startTimer() {
        if (state.timer) { return; }
        state.started = state.started || Date.now();
        state.timer = setInterval(function () {
            hudTime.textContent = clock(Date.now() - state.started);
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

    /* ---------- выбор и проверка ---------- */

    function pick(el) {
        var side = el.getAttribute('data-side');
        var key = el.getAttribute('data-key');

        if (el.classList.contains('locked') || state.busy) { return; }
        startTimer();

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

    function check(a, b) {
        var countryEl = a.side === 'country' ? a.el : b.el;
        var capitalEl = a.side === 'capital' ? a.el : b.el;
        var key = a.key;
        var otherKey = b.key;

        clearSel();

        if (key === otherKey) {
            state.busy = true;
            countryEl.classList.add('locked');
            capitalEl.classList.add('locked');
            state.solved[key] = true;
            state.streak += 1;
            state.best = Math.max(state.best, state.streak);
            updateHud();
            say('Совпало. ' + (FACTS[key] || ''), 'ok');

            setTimeout(function () {
                state.busy = false;
                if (solvedCount() === SIZE) { finish(); }
            }, 340);
            return;
        }

        state.miss += 1;
        state.streak = 0;
        updateHud();

        [countryEl, capitalEl].forEach(function (el) {
            el.classList.add('wrong');
            setTimeout(function () { el.classList.remove('wrong'); }, 420);
        });

        say('Не совпало. Посмотрите на достопримечательность на плашке.', 'err');
    }

    /* ---------- подсказка ---------- */

    function hint() {
        startTimer();
        var left = state.round.filter(function (row) { return !state.solved[row.key]; });
        if (!left.length) { return; }

        var row = left[Math.floor(Math.random() * left.length)];
        state.hints += 1;
        state.streak = 0;
        updateHud();

        [state.byKey[row.key].country, state.byKey[row.key].capital].forEach(function (el) {
            el.classList.add('hint');
            setTimeout(function () { el.classList.remove('hint'); }, 2400);
        });

        say('Подсказка: ' + row.capital + ' — столица этой страны.', 'hint');
    }

    /* ---------- завершение ---------- */

    function finish() {
        stopTimer();
        var ms = Date.now() - state.started;
        var score = Math.max(0, SIZE * 100 - state.miss * 25 - state.hints * 15);
        var rank = score >= SIZE * 95 ? 'Идеально. Даже спутник не подкопается.'
            : score >= SIZE * 75 ? 'Уверенный результат: почти все пары с первой попытки.'
                : score >= SIZE * 50 ? 'Нормально. Ошибки — это тоже данные.'
                    : 'Разминка засчитана. Попробуйте ещё раунд.';

        resultScore.innerHTML = 'Пар: <b>' + SIZE + '/' + SIZE + '</b> · '
            + 'Ошибок: <b>' + state.miss + '</b> · '
            + 'Подсказок: <b>' + state.hints + '</b> · '
            + 'Время: <b>' + clock(ms) + '</b> · '
            + 'Лучшая серия: <b>' + state.best + '</b><br>' + rank;

        var html = '';
        state.round.forEach(function (row) {
            html += '<tr><td>' + row.country + '</td>'
                + '<td class="c">' + row.capital + '</td>'
                + '<td class="f">' + row.landmark + '. ' + row.fact + '</td></tr>';
        });
        resultBody.innerHTML = html;

        result.classList.add('show');
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        say('Раунд закрыт. Разберите пары в таблице ниже.', 'ok');
    }

    /* ---------- сброс ---------- */

    function reset() {
        stopTimer();
        state.picked = null;
        state.solved = {};
        state.miss = 0;
        state.streak = 0;
        state.best = 0;
        state.hints = 0;
        state.started = 0;
        state.busy = false;

        state.plates.forEach(function (el) {
            el.classList.remove('sel', 'locked', 'wrong', 'hint');
        });

        result.classList.remove('show');
        resultBody.innerHTML = '';
        hudTime.textContent = '0:00';
        updateHud();
        say('Поле очищено. Раунд начинается заново.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ---------- обработчики ---------- */

    document.getElementById('btn-hint').addEventListener('click', hint);
    document.getElementById('btn-reset').addEventListener('click', reset);
    document.getElementById('btn-shuffle').addEventListener('click', function () {
        buildRound();
        say('Новый раунд: шесть других пар.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('btn-again').addEventListener('click', function () {
        buildRound();
        say('Новый раунд: шесть других пар.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.addEventListener('keydown', function (e) {
        if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { return; }
        var k = e.key.toLowerCase();
        if (k === 'h' || k === 'р') { e.preventDefault(); hint(); }
        else if (k === 'r' || k === 'к') { e.preventDefault(); reset(); }
        else if (k === 'escape') { clearSel(); say(''); }
        else if (k === 'n' || k === 'т') { e.preventDefault(); buildRound(); say('Новый раунд: шесть других пар.'); }
    });

    buildRound();
})();
