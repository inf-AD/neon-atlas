/* ФАЙЛ-КВЕСТ — платформер: собери файлы своего расширения, победи босса.
   Логический кадр 960x540, земля на y = 470. */
(function () {
    'use strict';

    var D = window.FQ;
    var GROUPS = D.groups;
    var LEVELS = D.levels;
    var SCORE = D.score;

    var W = 960, H = 540, GROUND_Y = 470;
    var GRAV = 0.155, JUMP_V = -6.3, RUN = 2.35, MAX_FALL = 7.5;
    var PW = 30, PH = 42;
    var LIVES_START = 3;

    var canvas = document.getElementById('stage');
    var ctx = canvas.getContext('2d');

    var state = {
        player: null,
        group: null,
        nick: '',
        klass: '',
        letter: '',
        shop: '',
        levelIndex: 0,
        lives: LIVES_START,
        totalScore: 0,
        results: [],
        level: null,
        levelScoreStart: 0,
        collected: 0,
        need: 0,
        misses: 0,
        levelStart: 0,
        boss: null,
        bossActive: false,
        running: false,
        paused: false,
        finished: false,
        keys: { left: false, right: false, jump: false },
        camX: 0,
        msg: null,
        msgUntil: 0,
        particles: [],
        time: 0
    };

    /* ---------------- Утилиты ---------------- */

    function $(id) { return document.getElementById(id); }

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

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

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

    function hideSay() {
        $('stage-msg').hidden = true;
    }

    /* ---------------- Стартовая форма ---------------- */

    function readForm() {
        var nick = $('f-nick').value.trim();
        var klass = $('f-class').value;
        var letter = $('f-letter').value;
        var shop = $('f-shop').value;
        var picked = document.querySelector('input[name="group"]:checked');
        if (!nick || !klass || !letter || !shop || !picked) {
            return null;
        }
        return { nick: nick, klass: klass, letter: letter, shop: shop, group: picked.value };
    }

    $('start-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var data = readForm();
        if (!data) { return; }
        state.nick = data.nick;
        state.klass = data.klass;
        state.letter = data.letter;
        state.shop = data.shop;
        state.group = data.group;
        state.levelIndex = 0;
        state.lives = LIVES_START;
        state.totalScore = 0;
        state.results = [];

        $('chip-player').hidden = false;
        $('chip-player').textContent = data.nick + ' · ' + data.klass + data.letter + ' · ' + data.shop;
        $('chip-target').hidden = false;
        $('chip-target').textContent = GROUPS[data.group].label;

        openBrief();
    });

    /* ---------------- Брифинг ---------------- */

    function openBrief() {
        state.lives = LIVES_START;
        var lv = LEVELS[state.levelIndex];
        var g = GROUPS[state.group];
        $('brief-eyebrow').textContent = 'Уровень ' + lv.n + ' из ' + LEVELS.length;
        $('brief-name').textContent = lv.name;
        $('brief-tip').textContent = lv.tip;
        $('brief-target').textContent = g.label;
        $('brief-exts').textContent = g.exts.map(function (e) { return '.' + e; }).join(' ');
        $('brief-total').textContent = lv.files.length;
        $('brief-need').textContent = lv.perGroup;
        $('brief-lives').textContent = hearts(state.lives, LIVES_START);
        $('brief-boss').textContent = lv.boss.hp + ' ' + (lv.boss.hp === 1 ? 'удар' : 'удара');
        show('screen-brief');
    }

    $('btn-brief-go').addEventListener('click', startLevel);

    /* ---------------- Уровень ---------------- */

    function startLevel() {
        var lv = LEVELS[state.levelIndex];
        state.lives = LIVES_START;
        state.level = {
            def: lv,
            files: lv.files.map(function (f, i) {
                return { x: f.x, y: f.y, ext: f.ext, g: f.g, taken: false, i: i, phase: i * 0.7 };
            }),
            enemies: lv.enemies.map(function (e) {
                return { x: e[0], x1: e[1], x2: e[2], y: GROUND_Y - 30, dead: false, vx: 0.75, phase: e[0] };
            }),
            boss: null
        };
        state.player = { x: 60, y: GROUND_Y - PH, vx: 0, vy: 0, onGround: false, face: 1, invuln: 0 };
        state.collected = 0;
        state.misses = 0;
        state.need = lv.perGroup;
        state.boss = null;
        state.bossActive = false;
        state.finished = false;
        state.paused = false;
        state.running = true;
        state.camX = 0;
        state.particles = [];
        state.levelStart = performance.now();
        state.levelScoreStart = state.totalScore;
        $('hud-boss-box').hidden = true;
        $('pause-box').hidden = true;
        hideSay();
        syncHud();
        show('screen-game');
        requestAnimationFrame(frame);
        say('Соберите ' + state.need + ' файлов «' + GROUPS[state.group].label.toLowerCase() + '»', 1800);
    }

    function syncHud() {
        var lv = LEVELS[state.levelIndex];
        $('hud-level').textContent = lv.n + '/' + LEVELS.length;
        $('hud-files').textContent = state.collected + '/' + state.need;
        $('hud-score').textContent = state.totalScore;
        $('hud-lives').textContent = hearts(state.lives, LIVES_START);
        if (state.boss) {
            $('hud-boss-box').hidden = false;
            $('hud-boss').textContent = hearts(state.boss.hp, state.boss.hpMax);
        }
    }

    /* ---------------- Рисование: значки файлов как в Windows ---------------- */

    function fileBadge(g, x, y, w, h) {
        var meta = GROUPS[g];
        ctx.save();
        // тело листа с загнутым углом
        ctx.fillStyle = meta.color;
        ctx.strokeStyle = 'rgba(20, 24, 40, .55)';
        ctx.lineWidth = 2;
        var fold = Math.round(w * 0.34);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w - fold, y);
        ctx.lineTo(x + w, y + fold);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // загнутый уголок
        ctx.fillStyle = meta.light;
        ctx.beginPath();
        ctx.moveTo(x + w - fold, y);
        ctx.lineTo(x + w, y + fold);
        ctx.lineTo(x + w - fold, y + fold);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // белое поле
        ctx.fillStyle = 'rgba(255, 255, 255, .95)';
        ctx.fillRect(x + 5, y + h * 0.42, w - 10, h * 0.44);
        ctx.restore();
    }

    function drawGlyph(g, cx, cy, s) {
        ctx.save();
        ctx.strokeStyle = GROUPS[g].color;
        ctx.fillStyle = GROUPS[g].color;
        ctx.lineWidth = Math.max(1.6, s * 0.14);
        ctx.lineCap = 'round';
        if (g === 'text') {
            for (var i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.34, cy - s * 0.22 + i * s * 0.22);
                ctx.lineTo(cx + (i === 2 ? 0 : s * 0.34), cy - s * 0.22 + i * s * 0.22);
                ctx.stroke();
            }
        } else if (g === 'image') {
            ctx.beginPath();
            ctx.rect(cx - s * 0.34, cy - s * 0.28, s * 0.68, s * 0.56);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.3, cy + s * 0.22);
            ctx.lineTo(cx - s * 0.08, cy - s * 0.06);
            ctx.lineTo(cx + s * 0.1, cy + s * 0.14);
            ctx.lineTo(cx + s * 0.22, cy);
            ctx.lineTo(cx + s * 0.32, cy + s * 0.22);
            ctx.stroke();
        } else if (g === 'audio') {
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.1, cy + s * 0.18);
            ctx.lineTo(cx - s * 0.1, cy - s * 0.24);
            ctx.lineTo(cx + s * 0.3, cy - s * 0.34);
            ctx.lineTo(cx + s * 0.3, cy + s * 0.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx - s * 0.2, cy + s * 0.2, s * 0.13, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + s * 0.2, cy + s * 0.12, s * 0.13, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.2, cy - s * 0.26);
            ctx.lineTo(cx + s * 0.34, cy);
            ctx.lineTo(cx - s * 0.2, cy + s * 0.26);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function drawFile(f, t) {
        if (f.taken) { return; }
        var bob = Math.sin(t / 380 + f.phase) * 5;
        var x = f.x;
        var y = f.y + bob;
        var w = 40, h = 50;
        // неоновое свечение
        ctx.save();
        ctx.shadowColor = GROUPS[f.g].light;
        ctx.shadowBlur = 16;
        fileBadge(f.g, x, y, w, h);
        ctx.restore();
        drawGlyph(f.g, x + w / 2, y + h * 0.63, 18);
        // подпись расширения
        ctx.save();
        ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var label = '.' + f.ext;
        var tw = ctx.measureText(label).width;
        var bx = x + w / 2 - tw / 2 - 5;
        var by = y + h + 5;
        ctx.fillStyle = 'rgba(20, 24, 40, .82)';
        ctx.beginPath();
        ctx.roundRect(bx, by, tw + 10, 18, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(label, x + w / 2, by + 9.5);
        ctx.restore();
    }

    /* ---------------- Мир: земля и платформы ---------------- */

    function solidRects(lv) {
        var rects = [];
        lv.def.ground.forEach(function (g) {
            rects.push({ x: g[0], y: GROUND_Y, w: g[1] - g[0], h: H - GROUND_Y, ground: true });
        });
        lv.def.plats.forEach(function (p) {
            rects.push({ x: p[0], y: p[1], w: p[2], h: 18, ground: false });
        });
        return rects;
    }

    function drawWorld(lv, t) {
        var cam = state.camX;
        // небо
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#3d8ff0');
        sky.addColorStop(0.55, '#8fd0ff');
        sky.addColorStop(1, '#d6efff');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // облака
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, .88)';
        for (var c = 0; c < 14; c++) {
            var cx = (c * 420 + 120 - cam * 0.35) % (lv.def.width + 900) - 200;
            var cy = 60 + (c % 3) * 54;
            cloud(cx, cy, 0.8 + (c % 3) * 0.16);
        }
        ctx.restore();

        // дальние холмы
        ctx.save();
        ctx.fillStyle = 'rgba(94, 200, 130, .55)';
        for (var h = 0; h < 10; h++) {
            var hx = h * 520 - cam * 0.5;
            ctx.beginPath();
            ctx.arc(hx, GROUND_Y + 40, 150, Math.PI, 0);
            ctx.fill();
        }
        ctx.restore();

        // земля: кирпичи
        var rects = solidRects(lv);
        rects.forEach(function (r) {
            if (r.x + r.w < cam - 80 || r.x > cam + W + 80) { return; }
            drawBricks(r, cam);
        });
    }

    function cloud(x, y, s) {
        ctx.beginPath();
        ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
        ctx.arc(x + 28 * s, y - 10 * s, 30 * s, 0, Math.PI * 2);
        ctx.arc(x + 62 * s, y, 24 * s, 0, Math.PI * 2);
        ctx.rect(x - 2 * s, y, 66 * s, 24 * s);
        ctx.fill();
    }

    function drawBricks(r, cam) {
        var x = r.x - cam;
        var top = r.y;
        if (r.ground) {
            // трава сверху
            ctx.fillStyle = '#3fbf63';
            ctx.fillRect(x, top, r.w, 14);
            ctx.fillStyle = '#7ee89b';
            ctx.fillRect(x, top, r.w, 5);
            // земля
            var bh = 28, bw = 48;
            for (var by = top + 14; by < H; by += bh) {
                for (var bx = x - ((cam + r.x) % bw); bx < x + r.w; bx += bw) {
                    ctx.fillStyle = ((bx / bw) | 0) % 2 ? '#c1502e' : '#b04426';
                    ctx.fillRect(bx, by, bw - 2, bh - 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, .16)';
                    ctx.fillRect(bx, by, bw - 2, 2);
                }
            }
        } else {
            // кирпичная платформа с неоновой кромкой
            var bw2 = 40, bh2 = 18;
            for (var px = 0; px < r.w; px += bw2) {
                ctx.fillStyle = ((px / bw2) | 0) % 2 ? '#c1502e' : '#a94326';
                ctx.fillRect(x + px, top, Math.min(bw2 - 2, r.w - px), bh2);
                ctx.fillStyle = 'rgba(255, 255, 255, .2)';
                ctx.fillRect(x + px, top, Math.min(bw2 - 2, r.w - px), 2);
            }
            ctx.save();
            ctx.shadowColor = '#22f0ff';
            ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(34, 240, 255, .85)';
            ctx.fillRect(x, top - 2, r.w, 3);
            ctx.restore();
        }
    }

    /* ---------------- Игрок ---------------- */

    function hit(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function updatePlayer(dt) {
        var p = state.player;
        var lv = state.level;
        var accel = 0.45, friction = 0.9;

        if (state.keys.left) { p.vx -= accel; p.face = -1; }
        if (state.keys.right) { p.vx += accel; p.face = 1; }
        if (!state.keys.left && !state.keys.right) { p.vx *= friction; }
        p.vx = clamp(p.vx, -RUN, RUN);

        if (state.keys.jump && p.onGround) {
            p.vy = JUMP_V;
            p.onGround = false;
        }

        p.vy = Math.min(p.vy + GRAV, MAX_FALL);
        p.x += p.vx;

        var rects = solidRects(lv);
        // горизонтальные столкновения
        for (var i = 0; i < rects.length; i++) {
            var r = rects[i];
            if (hit({ x: p.x, y: p.y + 4, w: PW, h: PH - 8 }, r)) {
                if (p.vx > 0) { p.x = r.x - PW; }
                else if (p.vx < 0) { p.x = r.x + r.w; }
                p.vx = 0;
            }
        }
        p.x = clamp(p.x, 0, lv.def.width - PW);

        p.y += p.vy;
        p.onGround = false;
        for (var j = 0; j < rects.length; j++) {
            var r2 = rects[j];
            if (hit({ x: p.x, y: p.y, w: PW, h: PH }, r2)) {
                if (p.vy > 0) {
                    p.y = r2.y - PH;
                    p.vy = 0;
                    p.onGround = true;
                } else if (p.vy < 0) {
                    p.y = r2.y + r2.h;
                    p.vy = 0;
                }
            }
        }

        if (p.invuln > 0) { p.invuln -= dt; }

        // упал в пропасть
        if (p.y > H + 90) { loseLife('Провал! Прыгайте точнее.'); }
    }

    function drawPlayer(t) {
        var p = state.player;
        var x = p.x - state.camX;
        var y = p.y;
        if (p.invuln > 0 && Math.floor(t / 90) % 2 === 0) { return; }

        ctx.save();
        // тень
        ctx.fillStyle = 'rgba(20, 24, 40, .22)';
        ctx.beginPath();
        ctx.ellipse(x + PW / 2, y + PH + 4, PW * 0.52, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // тело — бейсболка и комбинезон, как у водопроводчика
        ctx.fillStyle = '#2f6fd0';
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 20, PW - 6, PH - 20, 6);
        ctx.fill();
        // голова
        ctx.fillStyle = '#f7c9a3';
        ctx.beginPath();
        ctx.roundRect(x + 6, y + 4, PW - 12, 18, 7);
        ctx.fill();
        // кепка
        ctx.fillStyle = '#e23b3b';
        ctx.beginPath();
        ctx.roundRect(x + 4, y, PW - 8, 9, 5);
        ctx.fill();
        ctx.fillRect(p.face > 0 ? x + PW - 10 : x - 2, y + 6, 12, 4);
        // глаза
        ctx.fillStyle = '#17203a';
        ctx.fillRect(x + (p.face > 0 ? PW - 14 : 9), y + 12, 3, 4);
        ctx.fillRect(x + (p.face > 0 ? PW - 21 : 16), y + 12, 3, 4);
        // пуговицы
        ctx.fillStyle = '#ffc61a';
        ctx.fillRect(x + PW / 2 - 5, y + 26, 3, 3);
        ctx.fillRect(x + PW / 2 + 3, y + 26, 3, 3);
        // ноги
        ctx.fillStyle = '#17203a';
        var step = p.onGround && Math.abs(p.vx) > 0.6 ? Math.sin(t / 70) * 4 : 0;
        ctx.fillRect(x + 6, y + PH - 6 + step, 8, 7);
        ctx.fillRect(x + PW - 14, y + PH - 6 - step, 8, 7);
        ctx.restore();
    }

    /* ---------------- Сбор файлов ---------------- */

    function collectFiles() {
        var p = state.player;
        var box = { x: p.x - 4, y: p.y - 4, w: PW + 8, h: PH + 8 };
        state.level.files.forEach(function (f) {
            if (f.taken) { return; }
            var bob = Math.sin(state.time / 380 + f.phase) * 5;
            if (hit(box, { x: f.x, y: f.y + bob, w: 40, h: 50 })) {
                f.taken = true;
                if (f.g === state.group) {
                    state.collected++;
                    state.totalScore += SCORE.correct;
                    burst(f.x + 20, f.y + 25, GROUPS[f.g].light, '+100');
                    syncHud();
                    if (state.collected >= state.need) { openBoss(); }
                } else {
                    state.misses++;
                    state.totalScore = Math.max(0, state.totalScore + SCORE.wrong);
                    burst(f.x + 20, f.y + 25, '#ff3ea5', '−60');
                    flash();
                    syncHud();
                }
            }
        });
    }

    function burst(x, y, color, text) {
        for (var i = 0; i < 12; i++) {
            state.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 4 - 1,
                life: 46, color: color
            });
        }
        state.particles.push({ x: x, y: y - 18, vx: 0, vy: -0.9, life: 62, color: color, text: text });
    }

    function flash() {
        canvas.classList.add('shake');
        setTimeout(function () { canvas.classList.remove('shake'); }, 240);
    }

    /* ---------------- Враги ---------------- */

    function updateEnemies(dt) {
        var p = state.player;
        state.level.enemies.forEach(function (e) {
            if (e.dead) { return; }
            e.x += e.vx;
            if (e.x < e.x1) { e.x = e.x1; e.vx = Math.abs(e.vx); }
            if (e.x > e.x2) { e.x = e.x2; e.vx = -Math.abs(e.vx); }
            var eb = { x: e.x, y: e.y, w: 34, h: 30 };
            if (hit({ x: p.x, y: p.y, w: PW, h: PH }, eb)) {
                var falling = p.vy > 1.5 && (p.y + PH - e.y) < 22;
                if (falling) {
                    e.dead = true;
                    p.vy = -4.75;
                    p.invuln = 400;
                    state.totalScore += SCORE.stomp;
                    burst(e.x + 17, e.y, '#a6ff4d', '+' + SCORE.stomp);
                    syncHud();
                } else {
                    hurt();
                }
            }
        });
    }

    function drawEnemy(e, t) {
        if (e.dead) { return; }
        var x = e.x - state.camX;
        var y = e.y;
        ctx.save();
        // гусеница-«вирус»: тёмный корпус с неоновой окантовкой
        ctx.fillStyle = 'rgba(20, 24, 40, .2)';
        ctx.beginPath();
        ctx.ellipse(x + 17, y + 32, 17, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#5a3a7a';
        ctx.beginPath();
        ctx.roundRect(x, y + 6, 34, 24, 11);
        ctx.fill();
        ctx.strokeStyle = '#ff3ea5';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // лапки
        ctx.fillStyle = '#2b1a3d';
        var wig = Math.sin(t / 110) * 2;
        ctx.fillRect(x + 4, y + 28 + wig, 6, 4);
        ctx.fillRect(x + 24, y + 28 - wig, 6, 4);

        // глаза
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + 11, y + 15, 5, 0, Math.PI * 2);
        ctx.arc(x + 23, y + 15, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#17203a';
        ctx.beginPath();
        ctx.arc(x + 12, y + 15, 2.4, 0, Math.PI * 2);
        ctx.arc(x + 24, y + 15, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /* ---------------- Босс ---------------- */

    function openBoss() {
        if (state.bossActive) { return; }
        var def = state.level.def.boss;
        state.bossActive = true;
        state.boss = {
            x: def.x, y: GROUND_Y - 96, w: 88, h: 96,
            hp: def.hp, hpMax: def.hp,
            vx: -def.speed, speed: def.speed,
            baseX: def.x, phase: 0, hitFlash: 0, dead: false
        };
        syncHud();
        say('Босс! Прыгайте ему на голову', 2000);
    }

    function updateBoss(dt) {
        var b = state.boss;
        if (!b || b.dead) { return; }
        var p = state.player;
        b.phase += dt;
        b.x = b.baseX + Math.sin(b.phase / 900) * 70;
        if (b.hitFlash > 0) { b.hitFlash -= dt; }

        var bb = { x: b.x + 8, y: b.y + 2, w: b.w - 16, h: b.h - 2 };
        if (hit({ x: p.x, y: p.y, w: PW, h: PH }, bb)) {
            var onTop = p.vy > 1 && (p.y + PH - b.y) < 46;
            if (onTop) {
                b.hp--;
                b.hitFlash = 220;
                p.vy = -5.75;
                p.invuln = 900;
                state.totalScore += SCORE.bossHit;
                burst(b.x + b.w / 2, b.y, '#22f0ff', '+' + SCORE.bossHit);
                syncHud();
                if (b.hp <= 0) { defeatBoss(); }
            } else {
                hurt();
            }
        }
    }

    function defeatBoss() {
        var b = state.boss;
        b.dead = true;
        state.totalScore += SCORE.bossKill;
        burst(b.x + b.w / 2, b.y + 40, '#ffc61a', '+' + SCORE.bossKill);
        syncHud();
        say('Босс повержен!', 1500);
        state.running = false;
        setTimeout(finishLevel, 1500);
    }

    function drawBoss(b, t) {
        if (!b || b.dead) { return; }
        var x = b.x - state.camX;
        var y = b.y + Math.sin(t / 320) * 4;
        ctx.save();
        if (b.hitFlash > 0) { ctx.globalAlpha = 0.55; }
        // свечение
        ctx.shadowColor = '#ff3ea5';
        ctx.shadowBlur = 24;
        // корпус — гигантская папка
        ctx.fillStyle = '#8a5a1e';
        ctx.beginPath();
        ctx.roundRect(x, y + 16, b.w, b.h - 16, 10);
        ctx.fill();
        ctx.strokeStyle = '#17203a';
        ctx.lineWidth = 3;
        ctx.stroke();
        // язычок папки
        ctx.fillStyle = '#d9a23a';
        ctx.beginPath();
        ctx.roundRect(x + 6, y, b.w * 0.52, 24, 7);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // глаза
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + 28, y + 48, 13, 0, Math.PI * 2);
        ctx.arc(x + 60, y + 48, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#17203a';
        var look = Math.sin(t / 600) * 4;
        ctx.beginPath();
        ctx.arc(x + 28 + look, y + 48, 6, 0, Math.PI * 2);
        ctx.arc(x + 60 + look, y + 48, 6, 0, Math.PI * 2);
        ctx.fill();
        // злой рот
        ctx.strokeStyle = '#17203a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + 44, y + 76, 16, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        // зубы
        ctx.fillStyle = '#fff';
        for (var i = 0; i < 4; i++) {
            ctx.fillRect(x + 30 + i * 9, y + 74, 6, 7);
        }
        ctx.restore();
    }

    /* ---------------- Жизни и проигрыш ---------------- */

    function hurt() {
        var p = state.player;
        if (p.invuln > 0) { return; }
        p.invuln = 1200;
        p.vy = -4;
        p.vx = p.face > 0 ? -2 : 2;
        loseLife('Ой! Берегите жизни.');
    }

    function loseLife(reason) {
        if (state.lives <= 0) { return; }
        state.lives--;
        syncHud();
        if (state.lives <= 0) {
            state.running = false;
            setTimeout(function () { showLose(reason); }, 700);
        } else {
            say(reason + ' Осталось жизней: ' + state.lives, 1500);
            if (reason.indexOf('Провал') === 0) {
                respawn();
            }
        }
    }

    function respawn() {
        var p = state.player;
        p.x = Math.max(60, state.camX + 80);
        p.y = 120;
        p.vx = 0;
        p.vy = 0;
        p.invuln = 1400;
    }

    function levelTime() {
        return performance.now() - state.levelStart;
    }

    function levelScore() {
        return state.totalScore - state.levelScoreStart;
    }

    function pushResult(passed) {
        var lv = LEVELS[state.levelIndex];
        state.results[state.levelIndex] = {
            n: lv.n,
            name: lv.name,
            files: state.collected,
            need: state.need,
            misses: state.misses,
            ms: levelTime(),
            score: levelScore(),
            passed: passed
        };
    }

    /* ---------------- Итоги уровня ---------------- */

    function finishLevel() {
        state.totalScore += SCORE.levelEnd;
        pushResult(true);
        syncHud();
        showStats();
    }

    function showStats() {
        var r = state.results[state.levelIndex];
        var last = state.levelIndex >= LEVELS.length - 1;
        $('stats-eyebrow').textContent = 'Уровень ' + r.n + ' пройден';
        $('stats-title').textContent = last ? 'Все уровни позади!' : 'Отлично!';
        $('stats-files').textContent = r.files + ' из ' + r.need;
        $('stats-miss').textContent = r.misses;
        $('stats-time').textContent = clock(r.ms);
        $('stats-score').textContent = '+' + r.score;
        $('stats-total').textContent = state.totalScore;
        $('btn-next-level').hidden = last;
        $('btn-next-level').textContent = last ? '' : 'СЛЕДУЮЩИЙ УРОВЕНЬ';
        $('btn-replay-level').hidden = true;
        show('screen-stats');

        if (last) {
            setTimeout(showFinal, 900);
        }
    }

    $('btn-next-level').addEventListener('click', function () {
        state.levelIndex++;
        if (state.levelIndex >= LEVELS.length) { showFinal(); return; }
        openBrief();
    });

    /* ---------------- Проигрыш ---------------- */

    function showLose(reason) {
        pushResult(false);
        var r = state.results[state.levelIndex];
        $('lose-sub').textContent = reason || 'Жизни закончились. Попробуйте ещё раз.';
        $('lose-level').textContent = r.n + ' · ' + r.name;
        $('lose-files').textContent = r.files + ' из ' + r.need;
        $('lose-miss').textContent = r.misses;
        $('lose-score').textContent = r.score;
        $('lose-total').textContent = state.totalScore;
        show('screen-lose');
    }

    $('btn-retry').addEventListener('click', function () {
        state.totalScore = state.levelScoreStart;
        state.levelStart = performance.now();
        openBrief();
    });

    $('btn-lose-restart').addEventListener('click', resetAll);

    /* ---------------- Финал ---------------- */

    function showFinal() {
        var g = GROUPS[state.group];
        var files = 0, misses = 0, ms = 0;
        state.results.forEach(function (r) {
            files += r.files;
            misses += r.misses;
            ms += r.ms;
        });
        $('final-sub').textContent = state.nick + ' · ' + state.klass + state.letter +
            ' · ' + state.shop + ' · ' + g.label;
        $('final-score').textContent = state.totalScore;
        $('final-files').textContent = files;
        $('final-miss').textContent = misses;
        $('final-time').textContent = clock(ms);

        var rows = '';
        state.results.forEach(function (r) {
            rows += '<tr><td>' + r.n + ' · ' + r.name + '</td><td>' + r.files + ' из ' + r.need +
                '</td><td>' + r.misses + '</td><td>' + clock(r.ms) + '</td><td>' + r.score + '</td></tr>';
        });
        $('final-rows').innerHTML = rows;
        show('screen-final');
    }

    $('btn-restart').addEventListener('click', resetAll);

    function resetAll() {
        state.levelIndex = 0;
        state.lives = LIVES_START;
        state.totalScore = 0;
        state.results = [];
        state.running = false;
        $('chip-player').hidden = true;
        $('chip-target').hidden = true;
        show('screen-start');
    }

    /* ---------------- Камера и эффекты ---------------- */

    function updateCamera() {
        var lv = state.level;
        var p = state.player;
        var target = clamp(p.x - W * 0.42, 0, Math.max(0, lv.def.width - W));
        state.camX += (target - state.camX) * 0.12;
    }

    function updateParticles(dt) {
        state.particles = state.particles.filter(function (pt) {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.16;
            pt.life -= 1;
            return pt.life > 0;
        });
    }

    function drawParticles() {
        state.particles.forEach(function (pt) {
            var a = clamp(pt.life / 60, 0, 1);
            ctx.save();
            ctx.globalAlpha = a;
            if (pt.text) {
                ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
                ctx.fillStyle = pt.color;
                ctx.strokeStyle = 'rgba(20, 24, 40, .8)';
                ctx.lineWidth = 4;
                ctx.textAlign = 'center';
                ctx.strokeText(pt.text, pt.x, pt.y);
                ctx.fillText(pt.text, pt.x, pt.y);
            } else {
                ctx.fillStyle = pt.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    }

    /* ---------------- Главный цикл ---------------- */

    var lastT = 0;

    function frame(now) {
        if (!state.running && !state.finished) {
            return;
        }
        var dt = Math.min(34, now - lastT || 16);
        lastT = now;
        state.time = now;

        if (!state.paused && state.running) {
            updatePlayer(dt);
            updateEnemies(dt);
            collectFiles();
            updateBoss(dt);
            updateCamera();
        }
        updateParticles(dt);

        if (state.msgUntil && now > state.msgUntil) {
            hideSay();
            state.msgUntil = 0;
        }

        var lv = state.level;
        drawWorld(lv, now);
        lv.files.forEach(function (f) { drawFile(f, now); });
        lv.enemies.forEach(function (e) { drawEnemy(e, now); });
        drawBoss(state.boss, now);
        drawPlayer(now);
        drawParticles();

        if (state.running) {
            requestAnimationFrame(frame);
        }
    }

    /* ---------------- Управление ---------------- */

    var KEYMAP = {
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'jump', Space: 'jump', KeyW: 'jump'
    };

    window.addEventListener('keydown', function (e) {
        if (e.code === 'Escape') {
            if (state.running) { togglePause(); }
            return;
        }
        var k = KEYMAP[e.code];
        if (!k || !state.running) { return; }
        e.preventDefault();
        state.keys[k] = true;
    });

    window.addEventListener('keyup', function (e) {
        var k = KEYMAP[e.code];
        if (!k) { return; }
        state.keys[k] = false;
    });

    function togglePause() {
        if (!state.running) { return; }
        state.paused = !state.paused;
        $('pause-box').hidden = !state.paused;
        if (!state.paused) {
            lastT = performance.now();
            requestAnimationFrame(frame);
        }
    }

    $('btn-pause').addEventListener('click', togglePause);
    $('btn-resume').addEventListener('click', togglePause);

    document.querySelectorAll('.tbtn').forEach(function (btn) {
        var move = btn.getAttribute('data-move');
        function on(e) {
            e.preventDefault();
            state.keys[move] = true;
        }
        function off(e) {
            e.preventDefault();
            state.keys[move] = false;
        }
        btn.addEventListener('touchstart', on, { passive: false });
        btn.addEventListener('touchend', off, { passive: false });
        btn.addEventListener('touchcancel', off, { passive: false });
        btn.addEventListener('mousedown', on);
        btn.addEventListener('mouseup', off);
        btn.addEventListener('mouseleave', off);
    });


    /* Полифилл roundRect для старых браузеров */
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
            var rad = Math.min(r, w / 2, h / 2);
            this.beginPath();
            this.moveTo(x + rad, y);
            this.lineTo(x + w - rad, y);
            this.quadraticCurveTo(x + w, y, x + w, y + rad);
            this.lineTo(x + w, y + h - rad);
            this.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
            this.lineTo(x + rad, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - rad);
            this.lineTo(x, y + rad);
            this.quadraticCurveTo(x, y, x + rad, y);
            this.closePath();
            return this;
        };
    }
})();
