/* =====================================================================
   api/yna-spotify.js - Yna's Spotify (updates BY ITSELF, nothing to paste)
   The live address is  /api/yna-spotify

   ONE-TIME SETUP
   1. developer.spotify.com/dashboard -> Create app
        Redirect URI:  https://diyananadra.vercel.app/api/yna-spotify
        API: Web API
      (Spotify only allows this for accounts with Spotify Premium.)
   2. Vercel -> project -> Settings -> Environment Variables, add:
        SPOTIFY_CLIENT_ID      (from the Spotify app page)
        SPOTIFY_CLIENT_SECRET  (from the Spotify app page -> View client secret)
        YNA_OWNER_KEY          (same secret words as api/yna.js)
      then Redeploy.
   3. Open once, logged in to Spotify:
        https://diyananadra.vercel.app/api/yna-spotify?connect=YOUR_OWNER_KEY
      Press Agree. Done - from now on the playlists, recently played, top songs
      and "playing now" refresh by themselves (every minute at most).

   Only PUBLIC playlists that Yna's owner made are shown to visitors.
   ===================================================================== */

var db = require('./_redis.js');

var SCOPES = 'user-read-currently-playing user-read-recently-played user-top-read';   /*no private playlists*/
var CACHE_SECONDS = 60;

function redirectUri(req) {
    var host = req.headers['x-forwarded-host'] || req.headers.host;
    return 'https://' + host + '/api/yna-spotify';
}

function page(res, title, text) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(
        '<!DOCTYPE html><meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<body style="font-family:sans-serif;background:#fff0f7;display:grid;place-items:center;min-height:90vh;text-align:center">' +
        '<div style="background:#fff;border:3px solid #f27bb4;border-radius:24px;padding:24px;max-width:360px">' +
        '<h1 style="color:#e0569f">' + title + '</h1><p>' + text + '</p>' +
        '<a href="/yna.html">Go to Yna\'s House →</a></div></body>'
    );
}


/* ===================== TOKENS ===================== */

/*swap a code / refresh token for an access token*/
async function askToken(params) {
    var auth = Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
    var response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString()
    });
    if (!response.ok) throw new Error('Spotify token ' + response.status);
    return response.json();
}

/*a working access token (kept in Redis until it expires)*/
async function accessToken() {
    var saved = await db.redis([['GET', 'yna:spotify:token'], ['GET', 'yna:spotify:refresh']]);
    if (saved[0]) return saved[0];
    if (!saved[1]) return null;                       /*not connected yet*/

    var t = await askToken({ grant_type: 'refresh_token', refresh_token: saved[1] });
    var cmds = [['SET', 'yna:spotify:token', t.access_token, 'EX', Math.max(60, (t.expires_in || 3600) - 120)]];
    if (t.refresh_token) cmds.push(['SET', 'yna:spotify:refresh', t.refresh_token]);
    await db.redis(cmds);
    return t.access_token;
}

async function spotifyGet(token, path) {
    var response = await fetch('https://api.spotify.com/v1' + path, { headers: { Authorization: 'Bearer ' + token } });
    if (response.status === 204) return null;         /*nothing playing*/
    if (!response.ok) throw new Error('Spotify ' + path + ' ' + response.status);
    return response.json();
}

/*a track -> small object for the page*/
function track(t) {
    if (!t) return null;
    var images = (t.album && t.album.images) || [];
    return {
        title: t.name,
        artist: (t.artists || []).map(function (a) { return a.name; }).join(', '),
        art: images.length ? images[images.length > 1 ? 1 : 0].url : '',
        url: (t.external_urls && t.external_urls.spotify) || ''
    };
}


/* ===================== READ (used by api/yna.js) ===================== */

/*{ connected, now, recent, top, playlists } - fresh at most every minute*/
async function read() {
    try {
        var cached = await db.redis([['GET', 'yna:spotify:cache']]);
        if (cached[0]) return JSON.parse(cached[0]);

        var token = await accessToken();
        if (!token) return { connected: false };

        var me = await spotifyGet(token, '/me');
        var results = await Promise.all([
            spotifyGet(token, '/me/player/currently-playing').catch(function () { return null; }),
            spotifyGet(token, '/me/player/recently-played?limit=10').catch(function () { return null; }),
            spotifyGet(token, '/me/top/tracks?limit=5&time_range=short_term').catch(function () { return null; }),
            spotifyGet(token, '/me/playlists?limit=30').catch(function () { return null; })
        ]);

        var now = results[0];
        var data = {
            connected: true,
            profile: (me.external_urls && me.external_urls.spotify) || '',
            now: now && now.item ? Object.assign(track(now.item), { playing: !!now.is_playing }) : null,
            recent: ((results[1] && results[1].items) || []).map(function (x) { return track(x.track); }),
            top: ((results[2] && results[2].items) || []).map(track),
            /*only her own PUBLIC playlists*/
            playlists: ((results[3] && results[3].items) || [])
                .filter(function (p) { return p && p.public && p.owner && p.owner.id === me.id; })
                .map(function (p) {
                    return {
                        name: p.name,
                        url: (p.external_urls && p.external_urls.spotify) || '',
                        image: p.images && p.images.length ? p.images[0].url : ''
                    };
                }),
            at: Date.now()
        };
        await db.redis([['SET', 'yna:spotify:cache', JSON.stringify(data), 'EX', CACHE_SECONDS]]);
        return data;
    } catch (err) {
        return { connected: false, reason: err.message };
    }
}


/* ===================== THE REQUEST (connect + callback) ===================== */
async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    var q = req.query || {};

    try {
        /* step 1: owner opens ?connect=KEY -> go to Spotify's "Agree" page */
        if (q.connect) {
            if (!process.env.YNA_OWNER_KEY || q.connect !== process.env.YNA_OWNER_KEY) {
                return page(res, 'Hmm…', 'That owner key is not right.');
            }
            if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
                return page(res, 'Almost!', 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Vercel first, then Redeploy.');
            }
            var state = Math.random().toString(36).slice(2) + Date.now().toString(36);
            await db.redis([['SET', 'yna:spotify:state', state, 'EX', 600]]);
            var url = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
                client_id: process.env.SPOTIFY_CLIENT_ID,
                response_type: 'code',
                redirect_uri: redirectUri(req),
                scope: SCOPES,
                state: state
            }).toString();
            res.setHeader('Location', url);
            return res.status(302).end();
        }

        /* step 2: Spotify sends back ?code=...&state=... */
        if (q.code) {
            var saved = await db.redis([['GET', 'yna:spotify:state']]);
            if (!saved[0] || saved[0] !== q.state) return page(res, 'Hmm…', 'This link expired. Try connecting again.');

            var t = await askToken({ grant_type: 'authorization_code', code: q.code, redirect_uri: redirectUri(req) });
            await db.redis([
                ['SET', 'yna:spotify:refresh', t.refresh_token],
                ['SET', 'yna:spotify:token', t.access_token, 'EX', Math.max(60, (t.expires_in || 3600) - 120)],
                ['DEL', 'yna:spotify:state'],
                ['DEL', 'yna:spotify:cache']
            ]);
            return page(res, 'Spotify connected ✓', "Yna's music now updates by itself 🎧");
        }

        if (q.error) return page(res, 'Not connected', 'Spotify said: ' + String(q.error).replace(/[<>]/g, ''));

        /* anything else: show the music data (handy for checking) */
        return res.status(200).json(await read());

    } catch (err) {
        return page(res, 'Oh no…', 'Something went wrong: ' + String(err.message).replace(/[<>]/g, ''));
    }
}

module.exports = handler;
module.exports.read = read;
