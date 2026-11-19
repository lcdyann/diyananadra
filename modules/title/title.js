/* =====================================================================
   title.js - only for index.html
   VISITORS counter: asks /api/visits for the number and shows it as 5 digits (00128)
   - first visit of the day in this browser -> POST (adds +1)
   - any other time                          -> GET  (just reads it)
   On your laptop (Live Server) there is no /api, so it just stays "-----".
   ===================================================================== */

var countBox = document.getElementById('visitor-count');

/*today's date, e.g. "2026-11-19"*/
var today = new Date().toISOString().slice(0, 10);

/*did this browser already count today?*/
var lastCounted = null;
try {
    lastCounted = localStorage.getItem('visitCountedOn');
} catch (e) {
}

var firstTimeToday = (lastCounted !== today);

fetch('/api/visits', { method: firstTimeToday ? 'POST' : 'GET' })
    .then(function (response) {
        if (!response.ok) throw new Error('no counter');
        return response.json();
    })
    .then(function (data) {
        /*show 5 digits: 128 -> 00128*/
        countBox.textContent = String(data.count).padStart(5, '0');

        if (firstTimeToday) {
            try {
                localStorage.setItem('visitCountedOn', today);
            } catch (e) {
            }
        }
    })
    .catch(function () {
        countBox.textContent = '-----'; /*no counter (offline or on your laptop)*/
    });
