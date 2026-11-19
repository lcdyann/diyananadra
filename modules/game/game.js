/* =====================================================================
   game.js - BUG SNAKE (only for game.html)
   1. Settings        - change these numbers to make it easier / harder
   2. Game data       - where everything is right now
   3. Drawing         - shows the snake, bug and cola on the board
   4. One step        - what happens every "tick"
   5. Start / game over
   6. Controls        - keys, arrow buttons, swipe
   7. Leaderboard     - weekly Top 10 (talks to /api/leaderboard on Vercel)
   ===================================================================== */


/* ===================== 1. SETTINGS ===================== */

var BOARD_SIZE   = 15;   /*squares across (also change repeat(15, 1fr) in game.css)*/
var START_SPEED  = 180;  /*ms between moves at the start (bigger = slower)*/
var FASTEST      = 80;   /*it never gets faster than this*/
var SPEED_UP     = 5;    /*ms faster after every bug (like the dino game)*/
var BUG_POINTS   = 10;   /*points for one bug (×2 with cola)*/
var COLA_EVERY   = 4;    /*a cola appears after every 4 bugs*/
var COLA_STAYS   = 40;   /*the cola disappears after 40 moves if you don't get it*/
var DOUBLE_LASTS = 50;   /*double score lasts 50 moves*/


/* ===================== 2. GAME DATA ===================== */

/*make the 15 × 15 squares inside <div id="board"> (225 empty <div class="cell">)*/
var boardBox = document.getElementById('board');
for (var i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    var square = document.createElement('div');
    square.className = 'cell';
    boardBox.appendChild(square);
}

var cells = boardBox.querySelectorAll('.cell'); /*all 225 squares*/

var snake;        /*list of squares, the first one is the head: [{x:7, y:7}, {x:6, y:7}, ...]*/
var direction;    /*where the snake moved last: {x:1, y:0} = right*/
var nextDir;      /*the direction you pressed (used on the next move)*/
var bug;          /*{x, y} of the bug*/
var cola;         /*{x, y} of the cola, or null when there is none*/
var colaLeft;     /*moves before the cola disappears*/
var doubleLeft;   /*moves of double score left (0 = off)*/
var score;
var bugsEaten;
var speed;
var playing = false;
var timer = null;

var DIRECTIONS = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1,  y: 0 }
};

/*best score is kept in this browser*/
var best = 0;
try {
    best = parseInt(localStorage.getItem('bugSnakeBest'), 10) || 0;
} catch (e) {
}
document.getElementById('best').textContent = best;


/* ===================== 3. DRAWING ===================== */

/*the square at column x, row y*/
function cellAt(x, y) {
    return cells[y * BOARD_SIZE + x];
}

/*true if the point is on the snake*/
function onSnake(point) {
    return snake.some(function (part) {
        return part.x === point.x && part.y === point.y;
    });
}

/*a random empty square (not on the snake, not on the other item)*/
function emptySquare(other) {
    var spot;
    do {
        spot = {
            x: Math.floor(Math.random() * BOARD_SIZE),
            y: Math.floor(Math.random() * BOARD_SIZE)
        };
    } while (onSnake(spot) || (other && other.x === spot.x && other.y === spot.y));
    return spot;
}

/*clears the board, then marks the head, trail, bug and cola*/
function draw() {
    cells.forEach(function (cell) {
        cell.className = 'cell';
    });

    snake.forEach(function (part, i) {
        cellAt(part.x, part.y).classList.add(i === 0 ? 'head' : 'body');
    });

    cellAt(bug.x, bug.y).classList.add('bug');

    if (cola) {
        cellAt(cola.x, cola.y).classList.add('cola');
    }

    /*scores and plate*/
    document.getElementById('score').textContent = score;
    document.getElementById('plate').textContent = doubleLeft > 0 ? '★ SCORE ×2 ★' : '◆ BUGS SQUASHED: ' + bugsEaten + ' ◆';

    /*cola timer bar*/
    document.getElementById('cola-box').hidden = (doubleLeft <= 0);
    document.getElementById('cola-fill').style.width = (doubleLeft / DOUBLE_LASTS * 100) + '%';
}


/* ===================== 4. ONE STEP ===================== */

function step() {
    direction = nextDir;
    var head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    /* ----- crash? (wall, or your own trail) -----
       the last part of the trail moves away this step, so it doesn't count */
    var hitWall = head.x < 0 || head.y < 0 || head.x >= BOARD_SIZE || head.y >= BOARD_SIZE;
    var hitTrail = snake.slice(0, -1).some(function (part) {
        return part.x === head.x && part.y === head.y;
    });

    if (hitWall || hitTrail) {
        gameOver();
        return;
    }

    /* ----- move: add the new head ----- */
    snake.unshift(head);

    if (doubleLeft > 0) {
        doubleLeft = doubleLeft - 1;
    }

    /* ----- ate the bug? ----- */
    if (head.x === bug.x && head.y === bug.y) {
        score = score + (doubleLeft > 0 ? BUG_POINTS * 2 : BUG_POINTS);
        bugsEaten = bugsEaten + 1;
        speed = Math.max(FASTEST, speed - SPEED_UP);
        bug = emptySquare(cola);

        /*time for a cola?*/
        if (!cola && bugsEaten % COLA_EVERY === 0) {
            cola = emptySquare(bug);
            colaLeft = COLA_STAYS;
        }
        /*(the tail is NOT removed, so the trail grows by one)*/
    } else {
        snake.pop(); /*no bug: remove the tail, so the length stays the same*/
    }

    /* ----- cola ----- */
    if (cola) {
        if (head.x === cola.x && head.y === cola.y) {
            cola = null;
            doubleLeft = DOUBLE_LASTS; /*double score starts*/
        } else {
            colaLeft = colaLeft - 1;
            if (colaLeft <= 0) {
                cola = null; /*too slow, it's gone*/
            }
        }
    }

    draw();
    timer = setTimeout(step, speed); /*next step*/
}


/* ===================== 5. START / GAME OVER ===================== */

var message = document.getElementById('message');
var messageTitle = document.getElementById('message-title');
var messageText = document.getElementById('message-text');
var startBtn = document.getElementById('start-btn');

function startGame(firstDir) {
    clearTimeout(timer);

    /*snake of 3 in the middle, moving right (or the way you pressed)*/
    snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
    direction = DIRECTIONS.right;
    nextDir = (firstDir && firstDir !== DIRECTIONS.left) ? firstDir : DIRECTIONS.right;

    cola = null;
    colaLeft = 0;
    doubleLeft = 0;
    score = 0;
    bugsEaten = 0;
    speed = START_SPEED;
    bug = emptySquare(null);

    playing = true;
    gameArea.classList.add('playing');
    message.hidden = true;
    nameBox.hidden = true;
    draw();

    /*phone: the leaderboard is on top, so scroll the board into view*/
    if (window.innerWidth <= 900) {
        document.getElementById('cabinet').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    timer = setTimeout(step, speed);
}

function gameOver() {
    playing = false;
    gameArea.classList.remove('playing');

    /*new best score?*/
    if (score > best) {
        best = score;
        document.getElementById('best').textContent = best;
        try {
            localStorage.setItem('bugSnakeBest', best);
        } catch (e) {
        }
    }

    messageTitle.textContent = 'CODE CRASHED!';
    messageText.textContent = 'You squashed ' + bugsEaten + ' bugs for ' + score + ' points.';
    startBtn.innerHTML = 'Play again <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>';

    /*made this week's top 10? -> ask for a name first (part 7)*/
    var rank = rankFor(score);
    if (rank > 0) {
        askForName(rank);
    } else {
        showGameOver();
    }
}

/*shows the "CODE CRASHED!" screen with Play again*/
function showGameOver() {
    nameBox.hidden = true;
    message.hidden = false;
    startBtn.focus();
}

startBtn.addEventListener('click', function () {
    startGame(null);
});


/* ===================== 6. CONTROLS ===================== */

/*turn the snake (or start the game if it is not running)*/
function turn(name) {
    var want = DIRECTIONS[name];

    /*the name box is open: arrows do nothing*/
    if (!nameBox.hidden) {
        return;
    }

    if (!playing) {
        startGame(want);
        return;
    }

    /*can't turn straight back into yourself*/
    if (want.x === -direction.x && want.y === -direction.y) {
        return;
    }

    nextDir = want;
}

/* ----- keyboard (laptop): arrow keys or W A S D ----- */
document.addEventListener('keydown', function (e) {
    var keys = {
        ArrowUp: 'up',     w: 'up',     W: 'up',
        ArrowDown: 'down', s: 'down',   S: 'down',
        ArrowLeft: 'left', a: 'left',   A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right'
    };

    /*typing in the name box: let the letters through (W A S D are letters too!)*/
    if (e.target.tagName === 'INPUT') {
        return;
    }

    if (keys[e.key]) {
        e.preventDefault(); /*stop the page from scrolling*/
        turn(keys[e.key]);
    }
});

/* ----- arrow buttons ----- */
document.querySelectorAll('.pad-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        turn(btn.getAttribute('data-dir'));
    });
});

/* ----- swipe anywhere on the game area (phone) -----
   While playing, the game area gets the class "playing" so swiping moves the snake
   instead of scrolling the page (see .game.playing in game.css). */
var gameArea = document.querySelector('.game');
var swipeX = null;
var swipeY = null;

gameArea.addEventListener('pointerdown', function (e) {
    swipeX = e.clientX;
    swipeY = e.clientY;
});

gameArea.addEventListener('pointerup', function (e) {
    if (swipeX === null) return;

    var dx = e.clientX - swipeX;
    var dy = e.clientY - swipeY;
    swipeX = null;

    /*too short = a tap, not a swipe (so tapping the arrow buttons still works normally)*/
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;

    /*sideways or up/down, whichever moved more*/
    if (Math.abs(dx) > Math.abs(dy)) {
        turn(dx > 0 ? 'right' : 'left');
    } else {
        turn(dy > 0 ? 'down' : 'up');
    }
});


/* ===================== 7. LEADERBOARD ===================== */
/*Works on the live site (Vercel + Upstash). On your laptop there is no /api,
  so the board says so and the game still works normally.*/

var nameBox = document.getElementById('name-box');
var nameForm = document.getElementById('name-form');
var nameInput = document.getElementById('name-input');
var nameError = document.getElementById('name-error');
var lbBox = document.getElementById('leaderboard');
var lbRows = document.querySelectorAll('#lb-list .lb-row');
var lbStatus = document.getElementById('lb-status');
var lbOnline = false;      /*true once the board has loaded*/
var topList = [];          /*this week's top 10: [{name, score}, ...]*/
var myName = '';           /*the name you saved (to light up your row)*/

/* ----- fill the 10 rows ----- */
function drawLeaderboard(top, resetsAt) {
    topList = top;

    lbRows.forEach(function (row, i) {
        var entry = top[i];
        row.querySelector('.lb-name').textContent = entry ? entry.name : '---';
        row.querySelector('.lb-score').textContent = entry ? entry.score : '---';
        row.classList.toggle('me', !!entry && entry.name === myName);
    });

    /*"THIS WEEK · RESETS IN 3D 14H"*/
    var msLeft = new Date(resetsAt) - new Date();
    var days = Math.floor(msLeft / 86400000);
    var hours = Math.floor((msLeft % 86400000) / 3600000);
    document.getElementById('lb-week').textContent = 'THIS WEEK · RESETS IN ' + days + 'D ' + hours + 'H';
}

/* ----- load the board when the page opens ----- */
fetch('/api/leaderboard')
    .then(function (response) {
        if (!response.ok) throw new Error('no board');
        return response.json();
    })
    .then(function (data) {
        lbOnline = true;
        drawLeaderboard(data.top, data.resetsAt);
    })
    .catch(function () {
        lbStatus.textContent = 'The leaderboard works on the live site.';
        lbStatus.hidden = false;
    });

/* ----- what rank would this score get? (0 = not in the top 10) ----- */
function rankFor(points) {
    if (!lbOnline || points <= 0) {
        return 0;
    }

    var better = topList.filter(function (entry) {
        return entry.score >= points;
    }).length;

    return better < 10 ? better + 1 : 0;
}

/* ----- show the NEW HIGH SCORE box ----- */
function askForName(rank) {
    document.getElementById('name-rank').textContent = 'RANK #' + rank + ' · ' + score + ' PTS';
    nameError.hidden = true;
    nameInput.value = myName;
    message.hidden = true;
    nameBox.hidden = false;
    nameInput.focus();
}

/*only A-Z, 0-9 and _ while typing (shown in capitals)*/
nameInput.addEventListener('input', function () {
    nameInput.value = nameInput.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 12);
});

/* ----- ✕ = skip, don't save ----- */
document.getElementById('name-close').addEventListener('click', showGameOver);

/* ----- Save to board ----- */
nameForm.addEventListener('submit', function (e) {
    e.preventDefault(); /*stay on this page*/

    var name = nameInput.value || 'PLAYER';
    var saveBtn = document.getElementById('name-save');
    saveBtn.disabled = true;

    fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, score: score })
    })
        .then(function (response) {
            return response.json().then(function (data) {
                if (!response.ok) throw new Error(data.error || 'Could not save.');
                return data;
            });
        })
        .then(function (data) {
            myName = name;
            drawLeaderboard(data.top, data.resetsAt);
            lbBox.classList.add('open');   /*phone: show all 10 so you can see your name*/
            showGameOver();
        })
        .catch(function (err) {
            nameError.textContent = err.message;  /*e.g. "Please use another name"*/
            nameError.hidden = false;
        })
        .then(function () {
            saveBtn.disabled = false;
        });
});

/* ----- phone: SHOW TOP 10 / SHOW TOP 3 ----- */
var lbToggle = document.getElementById('lb-toggle');

lbToggle.addEventListener('click', function () {
    var isOpen = lbBox.classList.toggle('open');
    lbToggle.textContent = isOpen ? 'SHOW TOP 3 ▲' : 'SHOW TOP 10 ▼';
    lbToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});
