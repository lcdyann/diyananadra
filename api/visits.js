/* =====================================================================
   api/visits.js - the VISITORS counter on the title screen
   The live address is  /api/visits

   GET  /api/visits   -> { count: 128 }        (just read it)
   POST /api/visits   -> { count: 129 }        (+1, then read it)

   The title page only sends POST once per day per browser (it remembers in localStorage),
   so refreshing the page does not add more.
   ===================================================================== */

var db = require('./_redis.js');

module.exports = async function (req, res) {
    res.setHeader('Cache-Control', 'no-store');

    try {
        if (req.method === 'POST') {
            /*max 3 per minute from one visitor (stops someone spamming the counter)*/
            if (!(await db.allowed(req, 'visit', 3))) {
                var now = await db.redis([['GET', 'site:visits']]);
                return res.status(200).json({ count: Number(now[0]) || 0 });
            }

            var added = await db.redis([['INCR', 'site:visits']]);
            return res.status(200).json({ count: Number(added[0]) });
        }

        if (req.method === 'GET') {
            var read = await db.redis([['GET', 'site:visits']]);
            return res.status(200).json({ count: Number(read[0]) || 0 });
        }

        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Use GET or POST.' });

    } catch (err) {
        return res.status(500).json({ error: 'Counter is not available right now.' });
    }
};
