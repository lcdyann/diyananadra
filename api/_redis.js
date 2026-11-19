/* =====================================================================
   api/_redis.js - talks to the Redis database
   (files starting with "_" are helpers, not pages: Vercel does not make a link for them)

   The database address and password are NOT written here.
   Vercel puts them in automatically when you connect the database to the project
   (Vercel dashboard -> your project -> Storage). They are read from process.env below.

   It works with both kinds of keys Vercel can give:
     A) REDIS_URL  (redis://... or rediss://...)       -> normal Redis connection (the "redis" package)
     B) ..._REST_API_URL + ..._REST_API_TOKEN (Upstash) -> Upstash web address
   ===================================================================== */


/* ===================== FIND THE KEYS ===================== */

/*Finds a key by the END of its name, so it works with or without a prefix
  (REDIS_URL, STORAGE_REDIS_URL, KV_REST_API_URL, STORAGE_KV_REST_API_URL ...).
  READ_ONLY keys are skipped: they can read but not save scores.*/
function findKey(endings) {
    var names = Object.keys(process.env);

    for (var i = 0; i < endings.length; i++) {
        var match = names.find(function (name) {
            return name.endsWith(endings[i]) && name.indexOf('READ_ONLY') === -1;
        });
        if (match) {
            return process.env[match];
        }
    }
    return undefined;
}

var REST_URL = findKey(['KV_REST_API_URL', 'REDIS_REST_URL']);
var REST_TOKEN = findKey(['KV_REST_API_TOKEN', 'REDIS_REST_TOKEN']);
var REDIS_URL = findKey(['REDIS_URL', 'KV_URL']);


/* ===================== A) NORMAL REDIS CONNECTION (REDIS_URL) ===================== */

var connecting = null; /*the open connection, kept between requests so it is fast*/

function getClient() {
    if (!connecting) {
        var createClient = require('redis').createClient;
        var client = createClient({ url: REDIS_URL });

        client.on('error', function () {
            connecting = null; /*connection lost -> make a new one next time*/
        });

        connecting = client.connect().then(function () {
            return client;
        });
    }
    return connecting;
}

async function runWithRedisUrl(commands) {
    var client = await getClient();
    var results = [];

    for (var i = 0; i < commands.length; i++) {
        /*Redis wants every part as text: ['EXPIRE', 'key', '60']*/
        var parts = commands[i].map(String);
        results.push(await client.sendCommand(parts));
    }
    return results;
}


/* ===================== B) UPSTASH WEB ADDRESS (REST) ===================== */

async function runWithRest(commands) {
    var response = await fetch(REST_URL + '/pipeline', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + REST_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(commands)
    });

    if (!response.ok) {
        throw new Error('Database answered ' + response.status + ' (401 = wrong key, 404 = wrong address)');
    }

    var results = await response.json();

    return results.map(function (one) {
        if (one.error) {
            throw new Error(one.error);
        }
        return one.result;
    });
}


/* ===================== USE THIS ONE ===================== */

/*runs several Redis commands in order, e.g.
      redis([ ['INCR', 'site:visits'], ['GET', 'site:visits'] ])
  and gives back their results in the same order*/
async function redis(commands) {
    if (REDIS_URL) {
        return runWithRedisUrl(commands);
    }

    if (REST_URL && REST_TOKEN) {
        return runWithRest(commands);
    }

    /*no keys: list only the NAMES of keys that look like database keys (never their values)*/
    var seen = Object.keys(process.env).filter(function (name) {
        return /KV|REDIS|UPSTASH|STORAGE/.test(name);
    });
    throw new Error('Database keys not found. Keys this project has: ' + (seen.join(', ') || 'none'));
}


/* ===================== SPAM LIMIT ===================== */

/*the visitor's IP address (used only to stop spam, never saved for long)*/
function visitorIp(req) {
    var forwarded = req.headers['x-forwarded-for'] || '';
    return forwarded.split(',')[0].trim() || 'unknown';
}

/*allows at most "max" calls per minute from one IP for one action. true = allowed*/
async function allowed(req, action, max) {
    var key = 'limit:' + action + ':' + visitorIp(req);
    var results = await redis([
        ['INCR', key],
        ['EXPIRE', key, 60]
    ]);
    return Number(results[0]) <= max;
}

module.exports = { redis: redis, allowed: allowed };
