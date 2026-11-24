/* =====================================================================
   sudoku.js - DAILY SUDOKU
   - One puzzle a day: everyone gets the same puzzle on the same date.
   - Tap a cell, then tap a number. ⌫ = erase. Laptop: type 1-9, Backspace, arrow keys.
   - A wrong number turns red (+1 mistake). A number used 9 times fades on the number pad.
   - Leave halfway? Your numbers + time are kept for today (in this browser).
   - Score = time in seconds (LOWER is better)
   Same rules as the Yna's House app (games/SudokuScreen.kt)
   ===================================================================== */

YNA_GAMES.sudoku = {
    title: 'Daily Sudoku',
    pic: 'yna_hmm',
    unit: 'time',
    lowerIsBetter: true,
    canvas: false,
    tips: [
        '👆 Tap a cell, then tap a number',
        '❌ Wrong numbers turn red',
        '⏱️ Faster time = better score',
        '📅 New puzzle every day!'
    ],

    /* ---------- start (or carry on with today's puzzle) ---------- */
    begin: function () {
        var made = makeSudoku(todayNumber(), 50);
        this.puzzle = made.puzzle;
        this.solution = made.solution;
        this.entries = this.puzzle.slice();
        this.secs = 0;
        this.mistakes = 0;
        this.selected = -1;

        /*carry on from earlier today (unless it was finished: then a fresh try)*/
        var saved = loadSudoku();
        if (saved && !saved.done) {
            this.entries = saved.entries;
            this.secs = saved.secs;
            this.mistakes = saved.mistakes;
        }

        this.buildBoard();
        this.showBoard();

        var me = this;
        clearInterval(this.timer);
        this.timer = setInterval(function () {
            me.secs++;
            me.showHud();
            if (me.secs % 10 === 0) me.save(false);
        }, 1000);
    },

    /* ---------- leave the game: stop the clock, keep today's progress ---------- */
    end: function () {
        clearInterval(this.timer);
        if (this.entries) this.save(false);
    },

    /* ---------- the 81 cells (made once) ---------- */
    buildBoard: function () {
        var board = document.getElementById('sudoku-board');
        if (board.children.length === 81) return;
        var me = this;
        for (var i = 0; i < 81; i++) {
            var cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', function () {
                me.selected = Number(this.dataset.index);
                me.showBoard();
            });
            board.appendChild(cell);
        }
    },

    /* ---------- show the numbers + colours ---------- */
    showBoard: function () {
        var cells = document.querySelectorAll('#sudoku-board .cell');
        var pick = this.selected >= 0 ? this.entries[this.selected] : 0;
        var count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        for (var i = 0; i < 81; i++) {
            var cell = cells[i];
            var n = this.entries[i];
            if (n && n === this.solution[i]) count[n]++;

            cell.textContent = n ? n : '';
            cell.classList.toggle('given', this.puzzle[i] !== 0);
            cell.classList.toggle('wrong', n !== 0 && n !== this.solution[i]);
            cell.classList.toggle('picked', i === this.selected);
            cell.classList.toggle('same', pick !== 0 && n === pick && i !== this.selected);
            cell.classList.toggle('line', this.selected >= 0 && i !== this.selected && sameLine(i, this.selected));
        }

        /*numbers already used 9 times fade out*/
        document.querySelectorAll('#numpad [data-num]').forEach(function (key) {
            var num = Number(key.dataset.num);
            key.classList.toggle('used-up', num > 0 && count[num] >= 9);
        });
        this.showHud();
    },

    showHud: function () {
        document.getElementById('hud-1').textContent = '⏱️ ' + clockText(this.secs);
        document.getElementById('hud-2').hidden = false;
        document.getElementById('hud-2').textContent = '❌ ' + this.mistakes;
        document.getElementById('hud-3').textContent = '👑 ' + scoreText(Number(boss.sudoku) || 0, 'time');
    },

    /* ---------- put a number in the picked cell (0 = erase) ---------- */
    put: function (n) {
        var i = this.selected;
        if (i < 0 || this.puzzle[i] !== 0) return;          /*nothing picked, or a given number*/
        if (this.entries[i] === this.solution[i]) return;    /*already right: keep it*/
        if (n !== 0 && n !== this.solution[i]) this.mistakes++;
        this.entries[i] = n;
        this.showBoard();

        /*solved?*/
        for (var k = 0; k < 81; k++) {
            if (this.entries[k] !== this.solution[k]) {
                this.save(false);
                return;
            }
        }
        clearInterval(this.timer);
        this.save(true);
        var me = this;
        setTimeout(function () { finishGame(Math.max(1, me.secs)); }, 400);
    },

    save: function (done) {
        try {
            localStorage.setItem('yna-sudoku', JSON.stringify({
                day: todayNumber(), entries: this.entries, secs: this.secs, mistakes: this.mistakes, done: done
            }));
        } catch (e) {
        }
    },

    hud: function () {
        return [];
    },

    result: function () {
        return { title: 'Solved! 🎉', label: 'your time', extra: '❌ ' + this.mistakes + ' mistakes', pic: 'yna_hmm' };
    }
};


/* ===================== number pad + keyboard ===================== */

document.querySelectorAll('#numpad [data-num]').forEach(function (key) {
    key.addEventListener('click', function () {
        YNA_GAMES.sudoku.put(Number(key.dataset.num));
    });
});

document.addEventListener('keydown', function (e) {
    var s = YNA_GAMES.sudoku;
    if (gameId !== 'sudoku' || stage.hidden || !startCard.hidden || !resultCard.hidden) return;
    if (e.key >= '1' && e.key <= '9') s.put(Number(e.key));
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') s.put(0);

    /*arrow keys move the picked cell*/
    var moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (moves[e.key]) {
        e.preventDefault();
        var next = (s.selected < 0 ? 40 : s.selected) + moves[e.key];
        if (next >= 0 && next < 81) {
            s.selected = next;
            s.showBoard();
        }
    }
});


/* ===================== helpers ===================== */

/*today as a number, e.g. 20261124 (same puzzle for everyone today)*/
function todayNumber() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/*today's saved progress (null = none / another day)*/
function loadSudoku() {
    try {
        var saved = JSON.parse(localStorage.getItem('yna-sudoku'));
        if (saved && saved.day === todayNumber() && saved.entries.length === 81) return saved;
    } catch (e) {
    }
    return null;
}

/*same row, same column or same 3x3 box?*/
function sameLine(a, b) {
    var sameRow = Math.floor(a / 9) === Math.floor(b / 9);
    var sameCol = a % 9 === b % 9;
    var sameBox = Math.floor(a / 27) === Math.floor(b / 27) && Math.floor(a % 9 / 3) === Math.floor(b % 9 / 3);
    return sameRow || sameCol || sameBox;
}

/*random numbers from a seed (same seed = same numbers)*/
function seededRandom(seed) {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle(list, rnd) {
    for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1));
        var keep = list[i];
        list[i] = list[j];
        list[j] = keep;
    }
    return list;
}

/* make a puzzle: { puzzle, solution } (0 = empty cell)
   1. a full grid from a basic pattern, then shuffle rows, columns and numbers
   2. remove numbers one by one, but only if the answer is still the ONLY answer */
function makeSudoku(seed, holes) {
    var rnd = seededRandom(seed);

    function shuffledGroups() {
        var out = [];
        shuffle([0, 1, 2], rnd).forEach(function (g) {
            shuffle([0, 1, 2], rnd).forEach(function (k) { out.push(g * 3 + k); });
        });
        return out;
    }
    var rows = shuffledGroups();
    var cols = shuffledGroups();
    var nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd);

    var solution = [];
    for (var i = 0; i < 81; i++) {
        var r = rows[Math.floor(i / 9)];
        var c = cols[i % 9];
        solution.push(nums[(3 * (r % 3) + Math.floor(r / 3) + c) % 9]);
    }

    var puzzle = solution.slice();
    var order = shuffle(Array.from({ length: 81 }, function (_, k) { return k; }), rnd);
    var removed = 0;
    for (var o = 0; o < 81 && removed < holes; o++) {
        var cell = order[o];
        var keep = puzzle[cell];
        puzzle[cell] = 0;
        if (countSolutions(puzzle.slice(), 2) === 1) removed++;
        else puzzle[cell] = keep;
    }
    return { puzzle: puzzle, solution: solution };
}

/* numbers that can go in cell i (bits 1..9) */
function sudokuCandidates(g, i) {
    var r = Math.floor(i / 9);
    var c = i % 9;
    var used = 0;
    for (var k = 0; k < 9; k++) used |= (1 << g[r * 9 + k]) | (1 << g[k * 9 + c]);
    var br = r - r % 3;
    var bc = c - c % 3;
    for (var dr = 0; dr < 3; dr++) {
        for (var dc = 0; dc < 3; dc++) used |= 1 << g[(br + dr) * 9 + bc + dc];
    }
    return 0x3FE & ~used;
}

/* count answers (stops at limit). Tries the cell with the fewest choices first */
function countSolutions(g, limit) {
    var best = -1;
    var bestMask = 0;
    var bestCount = 10;
    for (var i = 0; i < 81; i++) {
        if (g[i] !== 0) continue;
        var m = sudokuCandidates(g, i);
        var n = 0;
        for (var b = m; b; b &= b - 1) n++;
        if (n === 0) return 0;
        if (n < bestCount) {
            best = i;
            bestMask = m;
            bestCount = n;
            if (n === 1) break;
        }
    }
    if (best === -1) return 1;

    var total = 0;
    for (var d = 1; d <= 9; d++) {
        if (!(bestMask & (1 << d))) continue;
        g[best] = d;
        total += countSolutions(g, limit - total);
        if (total >= limit) break;
    }
    g[best] = 0;
    return total;
}
