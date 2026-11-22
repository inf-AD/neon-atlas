/* ФАЙЛ-КВЕСТ — ЗМЕЙКА.
   Собираем файлы своего расширения: свой — рост и очки, чужой — штраф и минус звено.
   Поле — сетка из данных, шаг змейки по таймеру. */
(function () {
    'use strict';

    var D = window.FQ;
    var GROUPS = D.groups;
    var LEVELS = D.levels;
    var SCORE = D.score;
    var GW = D.grid.w, GH = D.grid.h, CELL = D.grid.cell;
    var W = GW * CELL, H = GH * CELL;
    var LIVES_START = 3;
    var START_LEN = 3;
    var BITE_COOLDOWN = 700;

    var canvas = document.getElementById('stage');
    var ctx = canvas.getContext('2d');

    var state = {
        nick: '', klass: '', letter: '', shop: '', group: '',
        levelIndex: 0, lives: LIVES_START, totalScore: 0, results: [],
        level: null, running: false, paused: false, time: 0,
        levelStart: 0, levelScoreStart: 0,
        msgUntil: 0, particles: [], shakeUntil: 0
    };

    function $(id) { return document.getElementById(id); }

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function clock(ms) {
        var s = Math.max(0, Math.round(ms / 1000));
        var m = Math.floor(s / 60);
        var r = s % 60;
        return m + ':' + (r < 10 ? '0' : '') + r;
    }

    function hearts(n, max) {
        var out = '';
        for (var i = 0; i < max; i++) { out += i < n ? '♥' : '♡'; }
        return out;
    }

    function show(screenId) {
        ['screen-start', 'screen-brief', 'screen-game', 'screen-stats',
         'screen-final', 'screen-lose'].forEach(function (id) {
            var el = $(id);
            if (el) { el.hidden = (id !== screenId); }
        });
    }

    function say(text, ms) {
        var box = $('stage-msg');
        box.querySelector('span').textContent = text;
        box.hidden = false;
        state.msgUntil = performance.now() + (ms || 1400);
    }

    function hideSay() { $('stage-msg').hidden = true; }

    /* ---------------- Стартовая форма ---------------- */

    function readForm() {
        var nick = $('f-nick').value.trim();
        var klass = $('f-class').value;
        var letter = $('f-letter').value;
        var shop = $('f-shop').value;
        if (!nick || !klass || !letter || !shop) { return null; }
        return { nick: nick, klass: klass, letter: letter, shop: shop };
    }

    $('start-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var data = readForm();
        if (!data) { return; }
        state.nick = data.nick;
        state.klass = data.klass;
        state.letter = data.letter;
        state.shop = data.shop;
        state.group = LEVELS[0].group;
        state.levelIndex = 0;
        state.lives = LIVES_START;
        state.totalScore = 0;
        state.results = [];

        $('chip-player').hidden = false;
        $('chip-player').textContent = data.nick + ' · ' + data.klass + data.letter + ' · ' + data.shop;
        $('chip-target').hidden = false;
        $('chip-target').textContent = GROUPS[LEVELS[0].group].label;

        openBrief();
    });

    /* ---------------- Брифинг ---------------- */

    function speedWord(ms) {
        if (ms >= 300) { return 'Спокойная'; }
        if (ms >= 250) { return 'Бодрая'; }
        if (ms >= 215) { return 'Быстрая'; }
        return 'Очень быстрая';
    }

    function openBrief() {
        state.lives = LIVES_START;
        var lv = LEVELS[state.levelIndex];
        state.group = lv.group;
        var g = GROUPS[lv.group];
        $('brief-eyebrow').textContent = 'Уровень ' + lv.n + ' из ' + LEVELS.length;
        $('brief-name').textContent = lv.name;
        $('brief-tip').textContent = lv.tip;
        $('brief-target').textContent = g.label;
        $('brief-exts').textContent = g.exts.map(function (e) { return '.' + e; }).join(' ');
        $('brief-need').textContent = lv.need;
        $('brief-speed').textContent = speedWord(lv.speed);
        $('brief-speed-num').textContent = lv.speed + ' мс на шаг';
        $('brief-lives').textContent = hearts(state.lives, LIVES_START);
        $('brief-boss').textContent = lv.boss.hp + ' ' +
            (lv.boss.hp === 1 ? 'укус' : (lv.boss.hp < 5 ? 'укуса' : 'укусов'));
        $('brief-walls').textContent = lv.walls.length ? lv.walls.length : 'нет';
        $('chip-target').hidden = false;
        $('chip-target').textContent = g.label;
        show('screen-brief');
    }

    $('btn-brief-go').addEventListener('click', startLevel);

    /* ---------------- Уровень: поле, змейка, файлы ---------------- */

    function cellFree(x, y, ignoreBoss) {
        if (x < 0 || y < 0 || x >= GW || y >= GH) { return false; }
        var lv = state.level;
        for (var i = 0; i < lv.walls.length; i++) {
            var w = lv.walls[i];
            if (x >= w[0] && x < w[0] + w[2] && y >= w[1] && y < w[1] + w[3]) { return false; }
        }
        for (var s = 0; s < state.snake.length; s++) {
            if (state.snake[s].x === x && state.snake[s].y === y) { return false; }
        }
        for (var f = 0; f < state.files.length; f++) {
            if (state.files[f].x === x && state.files[f].y === y) { return false; }
        }
        if (!ignoreBoss && state.boss && state.boss.alive) {
            var b = state.boss;
            if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) { return false; }
        }
        return true;
    }

    function randomFree(ignoreBoss) {
        for (var t = 0; t < 400; t++) {
            var x = Math.floor(Math.random() * GW);
            var y = Math.floor(Math.random() * GH);
            if (cellFree(x, y, ignoreBoss)) { return { x: x, y: y }; }
        }
        return null;
    }

    function allExts() {
        var out = [];
        Object.keys(GROUPS).forEach(function (k) {
            GROUPS[k].exts.forEach(function (e) { out.push({ ext: e, g: k }); });
        });
        return out;
    }

    function spawnFile() {
        var spot = randomFree(false);
        if (!spot) { return; }
        var mine = 0;
        state.files.forEach(function (f) { if (f.g === state.group) { mine++; } });
        var wantMine = Math.ceil(state.files.length * 0.45);
        var pool = allExts();
        var pick;
        if (mine < wantMine) {
            var own = GROUPS[state.group].exts;
            var ext = own[Math.floor(Math.random() * own.length)];
            pick = { ext: ext, g: state.group };
        } else {
            pick = pool[Math.floor(Math.random() * pool.length)];
        }
        state.files.push({ x: spot.x, y: spot.y, ext: pick.ext, g: pick.g, born: performance.now() });
    }

    function refillFiles() {
        var limit = state.level.onField;
        var guard = 0;
        while (state.files.length < limit && guard < 120) {
            spawnFile();
            guard++;
        }
    }

    function startLevel() {
        var lv = LEVELS[state.levelIndex];
        state.level = lv;
        state.group = lv.group;
        state.lives = LIVES_START;
        state.paused = false;
        state.running = true;
        state.files = [];
        state.collected = 0;
        state.wrong = 0;
        state.boss = null;
        state.levelStart = performance.now();
        state.levelScoreStart = state.totalScore;
        state.shakeUntil = 0;
        state.particles = [];
        state.acc = 0;
        state.lastStep = 0;

        var midY = Math.floor(GH / 2);
        state.snake = [
            { x: 3, y: midY }, { x: 2, y: midY }, { x: 1, y: midY }
        ];
        state.dir = { x: 1, y: 0 };
        state.queue = [];
        state.grow = 0;

        refillFiles();
        updateHud();
        show('screen-game');
        hideSay();
        say('Соберите ' + lv.need + ' файлов: ' + GROUPS[state.group].label, 2000);
    }

    /* ---------------- Шаг змейки ---------------- */

    function turn(nx, ny) {
        if (!state.running || state.paused) { return; }
        var last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
        if (last.x === -nx && last.y === -ny) { return; }
        if (last.x === nx && last.y === ny) { return; }
        if (state.queue.length < 2) { state.queue.push({ x: nx, y: ny }); }
    }

    function fileAt(x, y) {
        for (var i = 0; i < state.files.length; i++) {
            if (state.files[i].x === x && state.files[i].y === y) { return i; }
        }
        return -1;
    }

    function bossHitAt(x, y) {
        var b = state.boss;
        if (!b || !b.alive) { return false; }
        return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
    }

    function burst(cx, cy, color, n) {
        for (var i = 0; i < (n || 10); i++) {
            var a = Math.random() * Math.PI * 2;
            var sp = 0.6 + Math.random() * 2.4;
            state.particles.push({
                x: cx, y: cy,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6,
                life: 1, color: color, size: 2 + Math.random() * 3
            });
        }
    }

    function step() {
        if (state.queue.length) { state.dir = state.queue.shift(); }
        var head = state.snake[0];
        var nx = head.x + state.dir.x;
        var ny = head.y + state.dir.y;

        // стены поля
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) { die('Врезались в край поля'); return; }

        // стены-блоки
        for (var w = 0; w < state.level.walls.length; w++) {
            var wl = state.level.walls[w];
            if (nx >= wl[0] && nx < wl[0] + wl[2] && ny >= wl[1] && ny < wl[1] + wl[3]) {
                die('Врезались в стену'); return;
            }
        }

        // собственный хвост (последнее звено уйдёт, если не растём)
        var limit = state.grow > 0 ? state.snake.length : state.snake.length - 1;
        for (var s = 0; s < limit; s++) {
            if (state.snake[s].x === nx && state.snake[s].y === ny) {
                die('Укусили свой хвост'); return;
            }
        }

        // босс
        if (bossHitAt(nx, ny)) { biteBoss(); return; }

        state.snake.unshift({ x: nx, y: ny });

        var fi = fileAt(nx, ny);
        if (fi >= 0) {
            var f = state.files[fi];
            state.files.splice(fi, 1);
            if (f.g === state.group) { eatRight(nx, ny, f); }
            else { eatWrong(nx, ny, f); }
        }

        if (state.grow > 0) { state.grow--; }
        else { state.snake.pop(); }

        refillFiles();
        updateHud();
    }

    function eatRight(cx, cy, f) {
        state.collected++;
        state.totalScore += SCORE.correct;
        state.grow += 1;
        burst(cx * CELL + CELL / 2, cy * CELL + CELL / 2, GROUPS[f.g].light, 14);
        say('.' + f.ext + ' — верно! +' + SCORE.correct, 900);

        if (state.collected >= state.level.need) { summonBoss(); }
    }

    function eatWrong(cx, cy, f) {
        state.wrong++;
        state.totalScore = Math.max(0, state.totalScore + SCORE.wrong);
        if (state.snake.length > 2) { state.snake.pop(); }
        burst(cx * CELL + CELL / 2, cy * CELL + CELL / 2, '#8a8aa8', 12);
        state.shakeUntil = performance.now() + 260;
        say('.' + f.ext + ' — чужой файл. ' + SCORE.wrong, 1100);
    }

    /* ---------------- Босс-папка ---------------- */

    function summonBoss() {
        var b = state.level.boss;
        state.boss = {
            x: b.x, y: b.y, w: b.w, h: b.h,
            hp: b.hp, maxHp: b.hp, alive: true,
            speed: b.speed, lastMove: performance.now(),
            vx: 1, vy: 1
        };
        state.lastBite = 0;
        $('hud-boss-box').hidden = false;
        say('Босс-папка! Укусите её ' + b.hp + (b.hp < 5 ? ' раза' : ' раз'), 1800);
        updateHud();
    }

    function biteBoss() {
        var now = performance.now();
        if (now - state.lastBite < BITE_COOLDOWN) { return; }
        state.lastBite = now;
        var b = state.boss;
        b.hp--;
        state.totalScore += SCORE.bossHit;
        var cx = (b.x + b.w / 2) * CELL, cy = (b.y + b.h / 2) * CELL;
        burst(cx, cy, '#ffd34d', 18);
        state.shakeUntil = now + 220;

        if (b.hp <= 0) {
            b.alive = false;
            state.totalScore += SCORE.bossKill;
            burst(cx, cy, '#ff5ea8', 30);
            say('Босс повержен!', 1500);
            $('hud-boss-box').hidden = true;
            setTimeout(finishLevel, 700);
        } else {
            say('Укус! Осталось ' + b.hp, 900);
            // босс отпрыгивает, чтобы не прилипнуть к змейке
            var spot = randomFree(false);
            if (spot) { b.x = clamp(spot.x, 1, GW - b.w - 1); b.y = clamp(spot.y, 1, GH - b.h - 1); }
        }
        updateHud();
    }

    function moveBoss(now) {
        var b = state.boss;
        if (!b || !b.alive) { return; }
        if (now - b.lastMove < b.speed) { return; }
        b.lastMove = now;

        var head = state.snake[0];
        var dx = head.x < b.x ? -1 : (head.x > b.x + b.w - 1 ? 1 : 0);
        var dy = head.y < b.y ? -1 : (head.y > b.y + b.h - 1 ? 1 : 0);

        function blocked(px, py) {
            if (px < 0 || py < 0 || px + b.w > GW || py + b.h > GH) { return true; }
            for (var i = 0; i < state.level.walls.length; i++) {
                var w = state.level.walls[i];
                if (px < w[0] + w[2] && px + b.w > w[0] &&
                    py < w[1] + w[3] && py + b.h > w[1]) { return true; }
            }
            return false;
        }

        var tries = [[dx, 0], [0, dy], [dx, dy]];
        for (var i = 0; i < tries.length; i++) {
            var tx = b.x + tries[i][0], ty = b.y + tries[i][1];
            if ((tries[i][0] || tries[i][1]) && !blocked(tx, ty)) { b.x = tx; b.y = ty; return; }
        }
    }

    /* ---------------- Смерть и итоги уровня ---------------- */

    function die(reason) {
        if (!state.running) { return; }
        state.lives--;
        state.shakeUntil = performance.now() + 320;
        var head = state.snake[0];
        burst(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, '#ff4d4d', 18);
        updateHud();

        if (state.lives <= 0) {
            state.running = false;
            showLose(reason);
            return;
        }
        say(reason + '. Жизней: ' + state.lives, 1300);
        respawn();
    }

    function respawn() {
        var midY = Math.floor(GH / 2);
        state.snake = [{ x: 3, y: midY }, { x: 2, y: midY }, { x: 1, y: midY }];
        state.dir = { x: 1, y: 0 };
        state.queue = [];
        state.grow = 0;
        state.lastStep = performance.now();
        state.files = [];
        refillFiles();
        updateHud();
    }

    function finishLevel() {
        state.running = false;
        var gained = state.totalScore - state.levelScoreStart;
        state.results.push({
            n: state.level.n,
            name: state.level.name,
            collected: state.collected,
            need: state.level.need,
            wrong: state.wrong,
            len: state.snake.length,
            time: performance.now() - state.levelStart,
            score: gained
        });
        state.totalScore += SCORE.levelEnd;

        $('stats-eyebrow').textContent = 'Уровень ' + state.level.n + ' пройден';
        $('stats-title').textContent = state.level.n === LEVELS.length ? 'Финиш!' : 'Отлично!';
        $('stats-files').textContent = state.collected + ' из ' + state.level.need;
        $('stats-miss').textContent = state.wrong;
        $('stats-len').textContent = state.snake.length;
        $('stats-time').textContent = clock(performance.now() - state.levelStart);
        $('stats-score').textContent = gained + SCORE.levelEnd;
        $('stats-total').textContent = state.totalScore;

        var last = state.levelIndex >= LEVELS.length - 1;
        $('btn-next-level').hidden = last;
        $('btn-next-level').textContent = 'СЛЕДУЮЩИЙ УРОВЕНЬ';
        $('btn-replay-level').hidden = true;
        if (last) {
            $('btn-next-level').hidden = false;
            $('btn-next-level').textContent = 'ИТОГИ ИГРЫ';
        }
        show('screen-stats');
    }

    function showLose(reason) {
        var gained = state.totalScore - state.levelScoreStart;
        state.results.push({
            n: state.level.n,
            name: state.level.name,
            collected: state.collected,
            need: state.level.need,
            wrong: state.wrong,
            len: state.snake.length,
            time: performance.now() - state.levelStart,
            score: gained,
            failed: true
        });

        $('lose-sub').textContent = reason + '. Попробуйте ещё раз: не спешите и следите за хвостом.';
        $('lose-level').textContent = state.level.n + ' из ' + LEVELS.length;
        $('lose-files').textContent = state.collected + ' из ' + state.level.need;
        $('lose-miss').textContent = state.wrong;
        $('lose-len').textContent = state.snake.length;
        $('lose-score').textContent = gained;
        $('lose-total').textContent = state.totalScore;
        show('screen-lose');
    }

    function showFinal() {
        var totalFiles = 0, totalWrong = 0, totalTime = 0;
        var rows = '';
        state.results.forEach(function (r) {
            if (!r.failed) { totalFiles += r.collected; totalWrong += r.wrong; }
            totalTime += r.time;
            rows += '<tr><td>' + r.n + '. ' + r.name + '</td>' +
                '<td>' + r.collected + '/' + r.need + '</td>' +
                '<td>' + r.wrong + '</td>' +
                '<td>' + r.len + '</td>' +
                '<td>' + clock(r.time) + '</td>' +
                '<td>' + r.score + '</td></tr>';
        });
        $('final-rows').innerHTML = rows;
        $('final-sub').textContent = state.nick + ' · ' + state.klass + state.letter +
            ' · ' + state.shop + ' · ' + GROUPS[state.group].label;
        $('final-score').textContent = state.totalScore;
        $('final-files').textContent = totalFiles;
        $('final-miss').textContent = totalWrong;
        $('final-len').textContent = state.snake ? state.snake.length : 0;
        $('final-time').textContent = clock(totalTime);
        show('screen-final');
    }

    /* ---------------- Кнопки ---------------- */

    $('btn-next-level').addEventListener('click', function () {
        if (state.levelIndex >= LEVELS.length - 1) { showFinal(); return; }
        state.levelIndex++;
        openBrief();
    });

    $('btn-replay-level').addEventListener('click', function () { openBrief(); });

    $('btn-retry').addEventListener('click', function () {
        state.results.pop();
        openBrief();
    });

    $('btn-lose-restart').addEventListener('click', restartAll);
    $('btn-restart').addEventListener('click', restartAll);

    function restartAll() {
        state.levelIndex = 0;
        state.lives = LIVES_START;
        state.totalScore = 0;
        state.results = [];
        show('screen-start');
    }

    $('btn-pause').addEventListener('click', togglePause);
    $('btn-resume').addEventListener('click', togglePause);

    function togglePause() {
        if (!state.running) { return; }
        state.paused = !state.paused;
        $('pause-box').hidden = !state.paused;
        if (!state.paused) { state.lastStep = performance.now(); }
    }

    /* ---------------- HUD ---------------- */

    function updateHud() {
        var lv = state.level;
        if (!lv) { return; }
        $('hud-level').textContent = lv.n + '/' + LEVELS.length;
        $('hud-files').textContent = state.collected + '/' + lv.need;
        $('hud-len').textContent = state.snake ? state.snake.length : START_LEN;
        $('hud-score').textContent = state.totalScore;
        $('hud-lives').textContent = hearts(state.lives, LIVES_START);
        if (state.boss && state.boss.alive) {
            $('hud-boss-box').hidden = false;
            $('hud-boss').textContent = hearts(state.boss.hp, state.boss.maxHp);
        } else {
            $('hud-boss-box').hidden = true;
        }
    }

    /* ---------------- Отрисовка ---------------- */

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    /* Значок файла: белый лист с загнутым углом и цветной плашкой расширения. */
    function drawFileIcon(cx, cy, size, ext, gkey, dim) {
        var g = GROUPS[gkey];
        var w = size * 0.74, h = size;
        var x = cx - w / 2, y = cy - h / 2;
        var fold = size * 0.26;

        ctx.save();
        if (dim) { ctx.globalAlpha = 0.55; }

        // тень
        ctx.fillStyle = 'rgba(8, 10, 26, 0.35)';
        roundRect(x + 2, y + 3, w, h, 3);
        ctx.fill();

        // лист
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w - fold, y);
        ctx.lineTo(x + w, y + fold);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();

        // загнутый угол
        ctx.fillStyle = '#c9d3e8';
        ctx.beginPath();
        ctx.moveTo(x + w - fold, y);
        ctx.lineTo(x + w, y + fold);
        ctx.lineTo(x + w - fold, y + fold);
        ctx.closePath();
        ctx.fill();

        // цветная полоса-расширение
        ctx.fillStyle = g.color;
        roundRect(x + 3, y + h * 0.5, w - 6, h * 0.36, 2);
        ctx.fill();

        // подпись расширения
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.max(8, Math.round(size * 0.26)) + 'px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('.' + ext, x + w / 2, y + h * 0.68);

        // строки «текста» сверху
        ctx.fillStyle = '#b9c4d8';
        ctx.fillRect(x + 4, y + h * 0.18, w - 12, 1.6);
        ctx.fillRect(x + 4, y + h * 0.28, w - 16, 1.6);
        ctx.fillRect(x + 4, y + h * 0.38, w - 10, 1.6);

        ctx.restore();
    }

    function drawWalls() {
        var lv = state.level;
        for (var i = 0; i < lv.walls.length; i++) {
            var w = lv.walls[i];
            var x = w[0] * CELL, y = w[1] * CELL;
            var ww = w[2] * CELL, wh = w[3] * CELL;
            ctx.fillStyle = '#2a2f52';
            ctx.fillRect(x, y, ww, wh);
            ctx.fillStyle = '#3b4270';
            for (var bx = 0; bx < w[2]; bx++) {
                for (var by = 0; by < w[3]; by++) {
                    ctx.fillRect(x + bx * CELL + 2, y + by * CELL + 2, CELL - 4, CELL - 4);
                }
            }
            ctx.strokeStyle = '#22f0ff';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.5;
            ctx.strokeRect(x + 1, y + 1, ww - 2, wh - 2);
            ctx.globalAlpha = 1;
        }
    }

    function drawSnake(now) {
        var g = GROUPS[state.group];
        for (var i = state.snake.length - 1; i >= 0; i--) {
            var s = state.snake[i];
            var x = s.x * CELL, y = s.y * CELL;
            var pad = i === 0 ? 2 : 3;
            var pulse = i === 0 ? (1 + Math.sin(now / 220) * 0.03) : 1;
            var size = (CELL - pad * 2) * pulse;
            var ox = x + (CELL - size) / 2, oy = y + (CELL - size) / 2;

            ctx.fillStyle = i === 0 ? g.color : g.light;
            ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i * 0.03);
            roundRect(ox, oy, size, size, i === 0 ? 9 : 7);
            ctx.fill();
            ctx.globalAlpha = 1;

            if (i === 0) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                roundRect(ox, oy, size, size, 9);
                ctx.stroke();

                // глаза смотрят по направлению движения
                var ex = state.dir.x * 4, ey = state.dir.y * 4;
                ctx.fillStyle = '#ffffff';
                var e1x = ox + size * 0.32 + ex, e2x = ox + size * 0.68 + ex;
                var eyy = oy + size * 0.34 + ey;
                ctx.beginPath();
                ctx.arc(e1x, eyy, 3.2, 0, Math.PI * 2);
                ctx.arc(e2x, eyy, 3.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#12142b';
                ctx.beginPath();
                ctx.arc(e1x + ex * 0.4, eyy + ey * 0.4, 1.6, 0, Math.PI * 2);
                ctx.arc(e2x + ex * 0.4, eyy + ey * 0.4, 1.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (i === state.snake.length - 1) {
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                roundRect(ox + size * 0.3, oy + size * 0.3, size * 0.4, size * 0.4, 3);
                ctx.fill();
            }
        }
    }

    function drawFiles(now) {
        for (var i = 0; i < state.files.length; i++) {
            var f = state.files[i];
            var cx = f.x * CELL + CELL / 2;
            var cy = f.y * CELL + CELL / 2;
            var bob = Math.sin(now / 320 + f.x) * 1.6;
            var mine = f.g === state.group;

            // ореол: у своих — цвет группы, у чужих — приглушённый
            var grd = ctx.createRadialGradient(cx, cy + bob, 2, cx, cy + bob, CELL * 0.62);
            grd.addColorStop(0, mine ? hexA(GROUPS[f.g].light, 0.5) : 'rgba(140,146,180,0.22)');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy + bob, CELL * 0.62, 0, Math.PI * 2);
            ctx.fill();

            drawFileIcon(cx, cy + bob, CELL * 0.86, f.ext, f.g, !mine);
        }
    }

    function hexA(hex, a) {
        var h = hex.replace('#', '');
        var r = parseInt(h.substring(0, 2), 16);
        var g = parseInt(h.substring(2, 4), 16);
        var b = parseInt(h.substring(4, 6), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function drawBoss(now) {
        var b = state.boss;
        if (!b || !b.alive) { return; }
        var x = b.x * CELL, y = b.y * CELL;
        var w = b.w * CELL, h = b.h * CELL;
        var shake = Math.sin(now / 90) * 1.5;

        // папка
        ctx.fillStyle = '#f0b429';
        roundRect(x + 2 + shake, y + 12, w - 4, h - 14, 5);
        ctx.fill();
        ctx.fillStyle = '#ffd34d';
        roundRect(x + 6 + shake, y + 4, w * 0.45, 14, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        roundRect(x + 8 + shake, y + 20, w - 16, 4, 2);
        ctx.fill();

        // злые глаза
        ctx.fillStyle = '#12142b';
        var eyy = y + h * 0.52;
        ctx.beginPath();
        ctx.arc(x + w * 0.32 + shake, eyy, 4.5, 0, Math.PI * 2);
        ctx.arc(x + w * 0.68 + shake, eyy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#12142b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.22 + shake, eyy - 11);
        ctx.lineTo(x + w * 0.42 + shake, eyy - 6);
        ctx.moveTo(x + w * 0.78 + shake, eyy - 11);
        ctx.lineTo(x + w * 0.58 + shake, eyy - 6);
        ctx.stroke();

        // HP над боссом
        var barW = w - 8;
        ctx.fillStyle = 'rgba(8,10,26,0.7)';
        roundRect(x + 4, y - 12, barW, 7, 3);
        ctx.fill();
        ctx.fillStyle = '#ff5ea8';
        roundRect(x + 4, y - 12, barW * (b.hp / b.maxHp), 7, 3);
        ctx.fill();
    }

    function drawBoard(now) {
        // фон поля
        var grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#121636');
        grd.addColorStop(1, '#0b0d22');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        // сетка
        ctx.strokeStyle = 'rgba(34, 240, 255, 0.07)';
        ctx.lineWidth = 1;
        for (var gx = 0; gx <= GW; gx++) {
            ctx.beginPath();
            ctx.moveTo(gx * CELL + 0.5, 0);
            ctx.lineTo(gx * CELL + 0.5, H);
            ctx.stroke();
        }
        for (var gy = 0; gy <= GH; gy++) {
            ctx.beginPath();
            ctx.moveTo(0, gy * CELL + 0.5);
            ctx.lineTo(W, gy * CELL + 0.5);
            ctx.stroke();
        }

        // рамка
        ctx.strokeStyle = 'rgba(34, 240, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, W - 2, H - 2);
    }

    function drawParticles(dt) {
        for (var i = state.particles.length - 1; i >= 0; i--) {
            var p = state.particles[i];
            p.x += p.vx * dt * 0.06;
            p.y += p.vy * dt * 0.06;
            p.vy += 0.05;
            p.life -= dt * 0.0016;
            if (p.life <= 0) { state.particles.splice(i, 1); continue; }
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.globalAlpha = 1;
        }
    }

    function render(now) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, W, H);

        var shake = 0;
        if (now < state.shakeUntil) {
            shake = (state.shakeUntil - now) / 260 * 3;
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        drawBoard(now);
        if (state.level) {
            drawWalls();
            drawFiles(now);
            if (state.boss && state.boss.alive) { drawBoss(now); }
            if (state.snake) { drawSnake(now); }
        }
        drawParticles(16);

        if (state.msgUntil && now > state.msgUntil) { hideSay(); }
    }

    /* ---------------- Игровой цикл ---------------- */

    var lastFrame = 0;

    function loop(now) {
        if (!lastFrame) { lastFrame = now; }
        var dt = Math.min(64, now - lastFrame);
        lastFrame = now;

        if (state.running && !state.paused) {
            state.time += dt;
            var interval = state.level.speed;
            if (now - state.lastStep >= interval) {
                state.lastStep = now;
                step();
            }
            moveBoss(now);
        }
        render(now);
        requestAnimationFrame(loop);
    }

    /* ---------------- Управление ---------------- */

    var KEYS = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
        W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
        ц: [0, -1], ы: [0, 1], ф: [-1, 0], в: [1, 0],
        Ц: [0, -1], Ы: [0, 1], Ф: [-1, 0], В: [1, 0]
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { togglePause(); return; }
        var k = KEYS[e.key];
        if (!k) { return; }
        if (!state.running) { return; }
        e.preventDefault();
        turn(k[0], k[1]);
    });

    document.querySelectorAll('.dbtn').forEach(function (btn) {
        var map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        var dir = map[btn.getAttribute('data-move')];
        var fire = function (ev) {
            ev.preventDefault();
            turn(dir[0], dir[1]);
        };
        btn.addEventListener('click', fire);
        btn.addEventListener('touchstart', fire, { passive: false });
    });

    // свайпы по полю — удобно на планшете
    var touchStart = null;
    canvas.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        touchStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });

    canvas.addEventListener('touchend', function (e) {
        if (!touchStart) { return; }
        var t = e.changedTouches[0];
        var dx = t.clientX - touchStart.x;
        var dy = t.clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { return; }
        if (Math.abs(dx) > Math.abs(dy)) { turn(dx > 0 ? 1 : -1, 0); }
        else { turn(0, dy > 0 ? 1 : -1); }
    }, { passive: true });

    /* ---------------- Старт ---------------- */

    show('screen-start');
    requestAnimationFrame(loop);

})();
