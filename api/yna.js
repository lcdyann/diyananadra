/* =====================================================================
   api/yna.js - YNA'S HOUSE (the live house visitors see on yna.html)
   The live address is  /api/yna

   GET  /api/yna                                  -> everything the visitor page shows
   POST /api/yna  { do: 'care', what, name }      -> visitor pats / listens / feeds / naps Yna
   POST /api/yna  { do: 'score', game, name, score } -> visitor score vs Yna's boss score
   POST /api/yna  { do: 'suggest', song, name }   -> visitor suggests a song
   POST /api/yna  { do: 'owner', key, house, shows } -> ONLY the Yna's House app (needs the owner key)

   SETTINGS (Vercel -> project -> Settings -> Environment Variables):
     YNA_OWNER_KEY  = any long secret words (the same words go in the app, links/MyLinks.kt -> OWNER_KEY)

   WHAT IS SAVED (Redis):
     yna:house    - Yna's mood, meters, craving, music, weather, boss scores (sent by the app)
     yna:shows    - the watch list with posters (sent by the app when it changes)
     yna:boost    - care from visitors since the app last synced (the app adds it to Yna's meters)
     yna:care     - last 20 visitor care actions ("Someone patted Yna")
     yna:suggest  - last 50 song suggestions (only the app can read them)
     yna:scores:<game> - visitors' best scores per game
   ===================================================================== */

var db = require('./_redis.js');
var spotify = require('./yna-spotify.js');

/* ----- same rules as the app (state/YnaHouseState.kt) ----- */
var DROP_PER_HOUR = 4;          /*all meters go down slowly*/
var REST_UP_PER_HOUR = 10;      /*"me time" moods fill rest*/
var TUMMY_UP_PER_HOUR = 12;     /*eating moods fill tummy*/
var ME_TIME = ['WATCHING', 'SLEEPING', 'MUSIC', 'CHILLING'];
var EATING = ['EATING', 'STRESS_EATING'];

/*what each visitor care does to the meters (smaller than when Yna's owner does it)*/
var CARE = {
    pat: { happiness: 4, text: 'patted Yna' },
    listen: { happiness: 4, text: 'listened to Yna yap' },
    snack: { tummy: 6, happiness: 1, text: 'fed Yna a snack' },
    nap: { rest: 6, text: 'tucked Yna in for a nap' }
};

/*games: higher is better, except sudoku (time in seconds, lower is better)*/
var GAMES = {
    cloud_jump: { max: 100000, lowerIsBetter: false },
    cola_cart: { max: 100000, lowerIsBetter: false },
    runner: { max: 1000000, lowerIsBetter: false },
    sudoku: { max: 86400, lowerIsBetter: true }
};

var BAD_WORDS = ['FUCK', 'SHIT', 'BITCH', 'PUKI', 'BABI', 'SIAL', 'KONEK', 'PANTAT', 'BODOH', 'SEX'];


/* ===================== SMALL HELPERS ===================== */

function clamp(n) {
    return Math.max(0, Math.min(100, Number(n) || 0));
}

/*visitor name: letters, numbers, space, max 16. Empty = "Someone"*/
function cleanName(raw) {
    var name = String(raw || '').replace(/[^A-Za-z0-9 _]/g, '').trim().slice(0, 16);
    var upper = name.toUpperCase();
    var rude = BAD_WORDS.some(function (word) { return upper.indexOf(word) !== -1; });
    return rude || name === '' ? 'Someone' : name;
}

function cleanText(raw, max) {
    return String(raw || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function parse(text, fallback) {
    try {
        return text ? JSON.parse(text) : fallback;
    } catch (e) {
        return fallback;
    }
}

/*meters right now = what the app sent, minus time passed, plus visitor care*/
function liveMeters(house, boost) {
    var hours = Math.max(0, (Date.now() - (house.updatedAt || Date.now())) / 3600000);
    var m = {
        happiness: house.happiness - DROP_PER_HOUR * hours,
        tummy: house.tummy - DROP_PER_HOUR * hours,
        rest: house.rest - DROP_PER_HOUR * hours
    };
    if (ME_TIME.indexOf(house.mood) !== -1) m.rest += REST_UP_PER_HOUR * hours;
    if (EATING.indexOf(house.mood) !== -1) m.tummy += TUMMY_UP_PER_HOUR * hours;

    m.happiness = clamp(m.happiness + (Number(boost.happiness) || 0));
    m.tummy = clamp(m.tummy + (Number(boost.tummy) || 0));
    m.rest = clamp(m.rest + (Number(boost.rest) || 0));
    return m;
}

/*Redis HGETALL gives [k, v, k, v] (or an object) -> plain object*/
function hashToObject(raw) {
    if (!raw) return {};
    if (!Array.isArray(raw)) return raw;
    var out = {};
    for (var i = 0; i < raw.length; i = i + 2) out[raw[i]] = Number(raw[i + 1]);
    return out;
}

/*top 5 visitors for one game*/
async function topScores(game) {
    var rule = GAMES[game];
    var cmd = rule.lowerIsBetter
        ? ['ZRANGE', 'yna:scores:' + game, 0, 4, 'WITHSCORES']
        : ['ZREVRANGE', 'yna:scores:' + game, 0, 4, 'WITHSCORES'];
    var flat = (await db.redis([cmd]))[0] || [];
    var top = [];
    for (var i = 0; i < flat.length; i = i + 2) top.push({ name: flat[i], score: Number(flat[i + 1]) });
    return top;
}


/* ===================== GET: everything for the visitor page ===================== */

async function readHouse() {
    var r = await db.redis([
        ['GET', 'yna:house'],
        ['HGETALL', 'yna:boost'],
        ['LRANGE', 'yna:care', 0, 9],
        ['GET', 'yna:shows']
    ]);
    var house = parse(r[0], null);
    var boost = hashToObject(r[1]);
    var care = (r[2] || []).map(function (one) { return parse(one, null); }).filter(Boolean);
    var shows = parse(r[3], []);

    if (!house) {
        return { ready: false, care: care, shows: shows };
    }

    var meters = liveMeters(house, boost);
    var boards = {};
    var names = Object.keys(GAMES);
    for (var i = 0; i < names.length; i++) boards[names[i]] = await topScores(names[i]);

    return {
        ready: true,
        mood: house.mood,
        happiness: meters.happiness,
        tummy: meters.tummy,
        rest: meters.rest,
        foodMood: house.foodMood || '',
        foodMoodBefore: house.foodMoodBefore || '',
        song: house.song || null,
        weather: house.weather || null,
        boss: house.boss || {},
        updatedAt: house.updatedAt,
        care: care,
        shows: shows,
        boards: boards,
        spotify: await spotify.read()
    };
}


/* ===================== THE REQUEST ===================== */
module.exports = async function (req, res) {
    res.setHeader('Cache-Control', 'no-store');

    try {
        if (req.method === 'GET') {
            return res.status(200).json(await readHouse());
        }

        if (req.method !== 'POST') {
            res.setHeader('Allow', 'GET, POST');
            return res.status(405).json({ error: 'Use GET or POST.' });
        }

        var body = req.body || {};

        /* ---------- visitor: care for Yna ---------- */
        if (body.do === 'care') {
            var care = CARE[body.what];
            if (!care) return res.status(400).json({ error: 'Unknown care.' });
            if (!(await db.allowed(req, 'yna-care', 8))) {
                return res.status(429).json({ error: 'Yna needs a little break 🥺 Try again in a minute.' });
            }
            var name = cleanName(body.name);
            var cmds = [];
            ['happiness', 'tummy', 'rest'].forEach(function (meter) {
                if (care[meter]) cmds.push(['HINCRBY', 'yna:boost', meter, care[meter]]);
            });
            cmds.push(['LPUSH', 'yna:care', JSON.stringify({ name: name, what: body.what, text: care.text, at: Date.now() })]);
            cmds.push(['LTRIM', 'yna:care', 0, 19]);
            await db.redis(cmds);
            return res.status(200).json(await readHouse());
        }

        /* ---------- visitor: game score vs Yna's boss score ---------- */
        if (body.do === 'score') {
            var rule = GAMES[body.game];
            var score = Number(body.score);
            if (!rule) return res.status(400).json({ error: 'Unknown game.' });
            if (!Number.isInteger(score) || score <= 0 || score > rule.max) {
                return res.status(400).json({ error: 'That score is not possible.' });
            }
            if (!(await db.allowed(req, 'yna-score', 5))) {
                return res.status(429).json({ error: 'Too many tries. Wait a minute.' });
            }
            var player = cleanName(body.name);
            /*keep each name's BEST: LT for times (lower), GT for points (higher)*/
            await db.redis([['ZADD', 'yna:scores:' + body.game, rule.lowerIsBetter ? 'LT' : 'GT', score, player]]);
            return res.status(200).json({ top: await topScores(body.game) });
        }

        /* ---------- visitor: suggest a song ---------- */
        if (body.do === 'suggest') {
            var song = cleanText(body.song, 80);
            if (song.length < 2) return res.status(400).json({ error: 'Type a song first 🎵' });
            if (!(await db.allowed(req, 'yna-suggest', 3))) {
                return res.status(429).json({ error: 'Too many suggestions. Wait a minute.' });
            }
            await db.redis([
                ['LPUSH', 'yna:suggest', JSON.stringify({ song: song, name: cleanName(body.name), at: Date.now() })],
                ['LTRIM', 'yna:suggest', 0, 49]
            ]);
            return res.status(200).json({ ok: true });
        }

        /* ---------- owner app: save Yna's house ---------- */
        if (body.do === 'owner') {
            var secret = process.env.YNA_OWNER_KEY;
            if (!secret || body.key !== secret) {
                return res.status(401).json({ error: 'Wrong owner key.' });
            }
            var h = body.house || {};

            /*take the visitors' care so far, and add it to the meters the app sent*/
            var taken = await db.redis([['HGETALL', 'yna:boost'], ['DEL', 'yna:boost']]);
            var boost = hashToObject(taken[0]);

            var house = {
                mood: String(h.mood || 'WATCHING'),
                happiness: clamp(Number(h.happiness) + (boost.happiness || 0)),
                tummy: clamp(Number(h.tummy) + (boost.tummy || 0)),
                rest: clamp(Number(h.rest) + (boost.rest || 0)),
                foodMood: cleanText(h.foodMood, 80),
                foodMoodBefore: cleanText(h.foodMoodBefore, 80),
                song: h.song ? {
                    title: cleanText(h.song.title, 120),
                    artist: cleanText(h.song.artist, 120),
                    art: typeof h.song.art === 'string' && h.song.art.length < 40000 ? h.song.art : '',
                    playing: !!h.song.playing
                } : null,
                boss: h.boss || {},
                /*weather near Yna: only the kind + temperature, never the location*/
                weather: h.weather ? {
                    kind: cleanText(h.weather.kind, 12),          /*clear, cloudy, rain, storm, fog, snow*/
                    temp: Math.round(Number(h.weather.temp) || 0),
                    night: !!h.weather.night
                } : null,
                updatedAt: Date.now()
            };
            var cmds2 = [['SET', 'yna:house', JSON.stringify(house)]];

            /*watch list only comes when it changed (posters can be big)*/
            if (Array.isArray(body.shows)) {
                var shows = body.shows.slice(0, 15).map(function (s) {
                    return {
                        title: cleanText(s.title, 80),
                        kind: cleanText(s.kind, 12),
                        reaction: cleanText(s.reaction, 12),
                        status: cleanText(s.status, 12),
                        poster: typeof s.poster === 'string' && s.poster.length < 60000 ? s.poster : ''
                    };
                });
                cmds2.push(['SET', 'yna:shows', JSON.stringify(shows)]);
            }
            await db.redis(cmds2);

            /*give back: the care that was added, recent care + song suggestions (owner only), Spotify*/
            var extra = await db.redis([['LRANGE', 'yna:care', 0, 9], ['LRANGE', 'yna:suggest', 0, 19]]);
            return res.status(200).json({
                boost: boost,
                care: (extra[0] || []).map(function (x) { return parse(x, null); }).filter(Boolean),
                suggestions: (extra[1] || []).map(function (x) { return parse(x, null); }).filter(Boolean),
                spotify: await spotify.read()
            });
        }

        return res.status(400).json({ error: 'Unknown action.' });

    } catch (err) {
        return res.status(500).json({ error: "Yna's House is not available right now.", reason: err.message });
    }
};
