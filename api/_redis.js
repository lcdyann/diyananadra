/* =====================================================================
   api/_redis.js - talks to the Upstash Redis database
   (files starting with "_" are helpers, not pages: Vercel does not make a link for them)

   The database address and password are NOT written here.
   Vercel puts them in automatically when you connect "Upstash for Redis" to the project
   (Vercel dashboard -> your project -> Storage). They are read from process.env below.
   ===================================================================== */

/*Finds a key by the END of its name, so it works with or without a prefix:
    KV_REST_API_URL, STORAGE_KV_REST_API_URL, UPSTASH_REDIS_REST_URL ... all work.
  (READ_ONLY keys are skipped: they can read but not save scores.)*/
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

var REDIS_URL = findKey(['KV_REST_API_URL', 'REDIS_REST_URL']);
var REDIS_TOKEN = findKey(['KV_REST_API_TOKEN', 'REDIS_REST_TOKEN']);

/*runs several Redis commands in one go, e.g.
      redis([ ['INCR', 'site:visits'], ['GET', 'site:visits'] ])
  and gives back their results in the same order*/
async function redis(commands) {
    if (!REDIS_URL || !REDIS_TOKEN) {
        throw new Error('Database is not connected yet (no Upstash keys in this Vercel project).');
    }

    var response = await fetch(REDIS_URL + '/pipeline', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + REDIS_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(commands)
    });

    if (!response.ok) {
        throw new Error('Database error ' + response.status);
    }

    var results = await response.json();

    return results.map(function (one) {
        if (one.error) {
            throw new Error(one.error);
        }
        return one.result;
    });
}

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
    return results[0] <= max;
}

module.exports = { redis: redis, allowed: allowed };
