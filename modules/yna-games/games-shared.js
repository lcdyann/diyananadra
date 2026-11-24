/* =====================================================================
   games-shared.js - what every game in Yna's Playroom uses
   1. Page parts + the list of games
   2. Pictures (loaded once)
   3. Boss scores (from /api/yna)
   4. Choose a game -> START card
   5. The game loop (Cloud Jump, Cola Cart, Yna Run draw on the canvas)
   6. Controls: hold buttons, arrow keys, swipe
   7. RESULT card: score, boss score, top 5, save score

   EACH GAME FILE adds itself to YNA_GAMES with these parts:
     title, pic, tips (list of lines), unit ('m', 'pts' or 'time'), lowerIsBetter
     canvas: true  -> reset(w, h), step(dt, input), draw(ctx, w, h), over, score, hud(), result()
     canvas: false -> begin(), end()   (Daily Sudoku, it calls finishGame(score) itself)
   ===================================================================== */


/* ===================== 1. PAGE PARTS ===================== */

var YNA_GAMES = {};          /*filled by cloud-jump.js, cola-cart.js, yna-run.js, sudoku.js*/

var picker = document.getElementById('picker');
var stage = document.getElementById('stage');
var canvasBox = document.getElementById('canvas-box');
var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var startCard = document.getElementById('start-card');
var resultCard = document.getElementById('result-card');
var holdRow = document.getElementById('hold-row');
var holdLeft = document.getElementById('hold-left');
var holdRight = document.getElementById('hold-right');

var gameId = '';             /*the game being played*/
var game = null;
var running = false;
var lastTime = 0;
var canvasW = 360;           /*game size in CSS pixels*/
var canvasH = 640;
var input = { left: false, right: false };
var boss = {};               /*Yna's boss scores*/
var ownerKey = '';           /*signed in on yna.html = Yna's owner*/

try {
    ownerKey = localStorage.getItem('yna-owner-key') || '';
} catch (e) {
}


/* ===================== 2. PICTURES ===================== */

var pictures = {};

/*picture(name) -> the <img> for assets/.../name.webp (starts loading the first time)*/
function picture(path) {
    if (!pictures[path]) {
        var img = new Image();
        img.src = path;
        pictures[path] = img;
    }
    return pictures[path];
}

/*draw a picture only when it has loaded (otherwise skip, no error)*/
function drawPic(path, x, y, w, h) {
    var img = picture(path);
    if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, w, h);
    }
}

/* rounded rectangle (fill) - used by the games */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
}

function pose(name) {
    return 'assets/yna/poses/' + name + '.webp';
}

function sprite(name) {
    return 'assets/yna/games/' + name + '.webp';
}


/* ===================== 3. BOSS SCORES ===================== */

/*how a score is written: 342 m · 980 pts · 05:12*/
function scoreText(value, unit) {
    if (!value) return '—';
    if (unit === 'time') return clockText(value);
    return value + ' ' + unit;
}

/*seconds as a clock: 312 -> 05:12*/
function clockText(secs) {
    return String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
}

function loadBoss() {
    return fetch('/api/yna')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            boss = data.boss || {};
            window.YNA_BOARDS = data.boards || {};
        })
        .catch(function () {
            boss = {};
        })
        .then(function () {
            Object.keys(YNA_GAMES).forEach(function (id) {
                var box = document.getElementById('boss-' + id);
                if (box) box.textContent = scoreText(Number(boss[id]) || 0, YNA_GAMES[id].unit);
            });
        });
}

/*is this score better than the boss score?*/
function beatsBoss(id, score) {
    var old = Number(boss[id]) || 0;
    if (!score) return false;
    if (!old) return true;
    return YNA_GAMES[id].lowerIsBetter ? score < old : score > old;
}


/* ===================== 4. CHOOSE A GAME -> START ===================== */

function openGame(id) {
    if (!YNA_GAMES[id]) return;
    gameId = id;
    game = YNA_GAMES[id];

    picker.hidden = true;
    stage.hidden = false;
    resultCard.hidden = true;
    document.getElementById('fuel').hidden = id !== 'cola_cart';
    canvasBox.hidden = !game.canvas;
    document.getElementById('sudoku').hidden = game.canvas;

    /*hold buttons: Cloud Jump ◀ ▶, Cola Cart Brake / Gas, none for the others*/
    holdRow.hidden = !game.holds;
    if (game.holds) {
        holdLeft.textContent = game.holds[0];
        holdRight.textContent = game.holds[1];
    }
    document.getElementById('stage-hint').textContent = game.hint || '';

    /*start card*/
    document.getElementById('start-title').textContent = game.title;
    document.getElementById('start-pic').src = pose(game.pic);
    var tips = document.getElementById('start-tips');
    tips.innerHTML = '';
    game.tips.concat(['👑 Yna\'s boss score: ' + scoreText(Number(boss[id]) || 0, game.unit)]).forEach(function (line) {
        var li = document.createElement('li');
        li.textContent = line;
        tips.appendChild(li);
    });
    startCard.hidden = false;

    if (game.canvas) {
        fitCanvas();
        game.reset(canvasW, canvasH);
        drawFrame();
    }
    history.replaceState(null, '', '?game=' + id);
}

function startGame() {
    startCard.hidden = true;
    resultCard.hidden = true;
    input.left = false;
    input.right = false;

    if (game.canvas) {
        game.reset(canvasW, canvasH);
        running = true;
        lastTime = 0;
        requestAnimationFrame(loop);
    } else {
        game.begin();
    }
}

function closeGame() {
    running = false;
    if (game && !game.canvas) game.end();
    stage.hidden = true;
    picker.hidden = false;
    history.replaceState(null, '', location.pathname);
    loadBoss();
}

document.querySelectorAll('[data-game]').forEach(function (card) {
    card.addEventListener('click', function () { openGame(card.dataset.game); });
});
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('again-btn').addEventListener('click', startGame);
document.getElementById('start-back').addEventListener('click', closeGame);
document.getElementById('result-back').addEventListener('click', closeGame);
document.getElementById('close-game').addEventListener('click', closeGame);


/* ===================== 5. THE GAME LOOP ===================== */

/*canvas: tall phone shape (9:16), as big as fits*/
function fitCanvas() {
    var maxW = Math.min(canvasBox.clientWidth || 360, 440);
    var roomLeft = window.innerHeight - (game.holds ? 350 : 280);     /*leave space for the top bar, chips and hold buttons*/
    var maxH = Math.max(360, roomLeft);
    canvasW = Math.floor(Math.min(maxW, maxH * 9 / 16));
    canvasH = Math.floor(canvasW * 16 / 9);

    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    canvas.width = Math.floor(canvasW * dpr);
    canvas.height = Math.floor(canvasH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawFrame() {
    ctx.clearRect(0, 0, canvasW, canvasH);
    game.draw(ctx, canvasW, canvasH);
    var hud = game.hud();
    document.getElementById('hud-1').textContent = hud[0] || '';
    document.getElementById('hud-2').textContent = hud[1] || '';
    document.getElementById('hud-3').textContent = '👑 ' + scoreText(Number(boss[gameId]) || 0, game.unit);
    document.getElementById('hud-2').hidden = !hud[1];
}

function loop(time) {
    if (!running) return;
    if (lastTime) {
        var dt = Math.min(0.033, (time - lastTime) / 1000);   /*max 1/30 s, so a slow phone doesn't jump*/
        game.step(dt, input);
    }
    lastTime = time;
    drawFrame();

    if (game.over) {
        running = false;
        setTimeout(function () { finishGame(game.score); }, 500);
        return;
    }
    requestAnimationFrame(loop);
}


/* ===================== 6. CONTROLS ===================== */

/*hold buttons (finger down = held)*/
function hold(button, side) {
    function down(e) { e.preventDefault(); input[side] = true; button.classList.add('held'); }
    function up() { input[side] = false; button.classList.remove('held'); }
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointerleave', up);
    button.addEventListener('pointercancel', up);
}
hold(holdLeft, 'left');
hold(holdRight, 'right');

/*laptop keys: ← → hold, ↑ ↓ for Yna Run*/
document.addEventListener('keydown', function (e) {
    if (!running) return;
    if (e.key === 'ArrowLeft') { input.left = true; if (game.swipe) game.swipe(-1, 0); }
    if (e.key === 'ArrowRight') { input.right = true; if (game.swipe) game.swipe(1, 0); }
    if (e.key === 'ArrowUp' && game.swipe) game.swipe(0, -1);
    if (e.key === 'ArrowDown' && game.swipe) game.swipe(0, 1);
    if (e.key.indexOf('Arrow') === 0) e.preventDefault();
});
document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft') input.left = false;
    if (e.key === 'ArrowRight') input.right = false;
});

/*swipe on the game (Yna Run): reacts as soon as the finger has moved far enough*/
var swipeFrom = null;
canvas.addEventListener('pointerdown', function (e) {
    swipeFrom = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointermove', function (e) {
    if (!swipeFrom || !running || !game.swipe) return;
    var dx = e.clientX - swipeFrom.x;
    var dy = e.clientY - swipeFrom.y;
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) game.swipe(dx > 0 ? 1 : -1, 0);
        else game.swipe(0, dy > 0 ? 1 : -1);
        swipeFrom = null;
    }
});
canvas.addEventListener('pointerup', function () { swipeFrom = null; });

window.addEventListener('resize', function () {
    if (game && game.canvas && !running) {
        fitCanvas();
        drawFrame();
    }
});


/* ===================== 7. RESULT CARD ===================== */

/*called when a game ends (score 0 = nothing to save)*/
function finishGame(score) {
    var result = game.result ? game.result() : {};
    var newBest = beatsBoss(gameId, score);

    document.getElementById('result-title').textContent = result.title || 'Game over!';
    document.getElementById('result-score').textContent = game.unit === 'time' ? scoreText(score, 'time') : score;
    document.getElementById('result-label').textContent = result.label || '';
    document.getElementById('result-boss').textContent = scoreText(Number(boss[gameId]) || 0, game.unit);
    document.getElementById('result-extra-box').hidden = !result.extra;
    document.getElementById('result-extra').textContent = result.extra || '';
    document.getElementById('result-pic').src = pose(newBest ? 'yna_happy' : (result.pic || 'yna_teary'));

    var ribbon = document.getElementById('result-ribbon');
    ribbon.hidden = !newBest;
    ribbon.textContent = ownerKey ? '⭐ NEW BOSS SCORE! ⭐' : '⭐ YOU BEAT YNA! ⭐';

    showTop5(gameId);
    resultCard.hidden = false;

    if (!score) {
        document.getElementById('name-form').hidden = true;
        return;
    }

    if (ownerKey) {
        /*Yna's owner: her score is the boss score (the server keeps the best)*/
        document.getElementById('name-form').hidden = true;
        fetch('/api/yna', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ do: 'owner-boss', key: ownerKey, game: gameId, score: score })
        })
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d.boss) boss = d.boss; })
            .catch(function () {});
    } else {
        /*visitor: type a name to go on the top 5 board*/
        var nameInput = document.getElementById('player-name');
        try {
            nameInput.value = localStorage.getItem('yna-visitor-name') || '';
        } catch (e) {
        }
        document.getElementById('name-form').hidden = false;
        document.getElementById('name-form').dataset.score = score;
    }
}

/*visitor saves the score*/
document.getElementById('name-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = this;
    var name = document.getElementById('player-name').value.trim() || 'Someone';
    try {
        localStorage.setItem('yna-visitor-name', name);
    } catch (err) {
    }
    fetch('/api/yna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ do: 'score', game: gameId, name: name, score: Number(form.dataset.score) })
    })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d.top) {
                window.YNA_BOARDS = window.YNA_BOARDS || {};
                window.YNA_BOARDS[gameId] = d.top;
                showTop5(gameId);
            }
            form.hidden = true;
        })
        .catch(function () {
            form.hidden = true;
        });
});

/*the top 5 visitors for this game*/
function showTop5(id) {
    var list = document.getElementById('top5');
    var top = (window.YNA_BOARDS || {})[id] || [];
    list.innerHTML = '';
    top.forEach(function (row) {
        var li = document.createElement('li');
        li.textContent = row.name + ' · ' + scoreText(row.score, YNA_GAMES[id].unit);
        list.appendChild(li);
    });
}


/* ===================== START ===================== */
function startPlayroom() {
    if (ownerKey) {
        document.getElementById('picker-note').textContent = "👑 You're signed in as Yna's owner: your best scores become the boss scores.";
    }
    loadBoss().then(function () {
        var asked = new URLSearchParams(location.search).get('game');
        if (asked) openGame(asked);
    });
}
