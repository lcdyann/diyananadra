/* =====================================================================
   api/leaderboard.js - Bug Snake weekly TOP 10
   The live address is  /api/leaderboard

   GET  /api/leaderboard                        -> this week's top 10
   POST /api/leaderboard  { name, score }       -> saves a score, gives back the new top 10

   WEEKLY CLEANSE: each week is saved under its own name, e.g. "snake:2026-W47",
   and that list deletes itself 8 days later. A new week = a fresh, empty board.
   Weeks start on Monday 00:00 Malaysia time.
   ===================================================================== */

var db = require('./_redis.js');

var MAX_SCORE = 4500;    /*the board has 225 squares, so a real score can't be higher*/
var TOP = 10;
var BAD_WORDS = ['FUCK', 'SHIT', 'BITCH', 'PUKI', 'BABI', 'SIAL', 'KONEK', 'PANTAT', 'BODOH', 'SEX'];


/* ----- which week is it? (Malaysia time) ----- */
function weekInfo() {
    var now = new Date(Date.now() + 8 * 60 * 60 * 1000); /*UTC + 8 hours = Malaysia time*/

    /*ISO week number (weeks start on Monday)*/
    var day = (now.getUTCDay() + 6) % 7; /*Monday = 0 ... Sunday = 6*/
    var thursday = new Date(now);
    thursday.setUTCDate(now.getUTCDate() - day + 3);
    var firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
    var week = 1 + Math.round(((thursday - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);

    /*next Monday 00:00 Malaysia time (as a normal UTC time)*/
    var nextMonday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 7) - 8 * 60 * 60 * 1000;

    return {
        key: 'snake:' + thursday.getUTCFullYear() + '-W' + String(week).padStart(2, '0'),
        resetsAt: new Date(nextMonday).toISOString()
    };
}


/* ----- read the top 10 ----- */
async function readTop(key) {
    var results = await db.redis([['ZREVRANGE', key, 0, TOP - 1, 'WITHSCORES']]);
    var flat = results[0] || [];  /*[name, score, name, score, ...]*/
    var top = [];

    for (var i = 0; i < flat.length; i = i + 2) {
        top.push({ name: flat[i], score: Number(flat[i + 1]) });
    }
    return top;
}


/* ----- clean the name: A-Z 0-9 _ only, max 12, no rude words ----- */
function cleanName(raw) {
    var name = String(raw || '').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 12);

    var rude = BAD_WORDS.some(function (word) {
        return name.indexOf(word) !== -1;
    });

    return rude ? '' : name;
}


/* ===================== THE REQUEST ===================== */
module.exports = async function (req, res) {
    res.setHeader('Cache-Control', 'no-store');
    var week = weekInfo();

    try {
        /* ---------- GET: show the board ---------- */
        if (req.method === 'GET') {
            var top = await readTop(week.key);
            return res.status(200).json({ resetsAt: week.resetsAt, top: top });
        }

        /* ---------- POST: save a score ---------- */
        if (req.method === 'POST') {

            /*max 5 saves per minute from one visitor*/
            if (!(await db.allowed(req, 'score', 5))) {
                return res.status(429).json({ error: 'Too many tries. Wait a minute.' });
            }

            var body = req.body || {};
            var name = cleanName(body.name);
            var score = Number(body.score);

            if (name === '') {
                return res.status(400).json({ error: 'Please use another name (A-Z, 0-9, _).' });
            }

            /*real scores are whole numbers, steps of 10, between 10 and MAX_SCORE*/
            if (!Number.isInteger(score) || score <= 0 || score > MAX_SCORE || score % 10 !== 0) {
                return res.status(400).json({ error: 'That score is not possible.' });
            }

            /*GT = only keep the name's BEST score this week. The list deletes itself after 8 days.*/
            await db.redis([
                ['ZADD', week.key, 'GT', score, name],
                ['EXPIRE', week.key, 8 * 24 * 60 * 60]
            ]);

            var newTop = await readTop(week.key);
            return res.status(200).json({ resetsAt: week.resetsAt, top: newTop });
        }

        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Use GET or POST.' });

    } catch (err) {
        return res.status(500).json({ error: 'Leaderboard is not available right now.' });
    }
};
