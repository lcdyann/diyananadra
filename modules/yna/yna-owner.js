/* =====================================================================
   yna-owner.js - "My" for Yna's owner on yna.html (works on iPhone)
   Visitors never see any of this: it only wakes up after the owner key is typed once.

   1. Sign in (key saved on this phone only)
   2. Save to the house (sends the whole house to /api/yna, like the Android app did)
   3. My corner: open / fill
   4. Mood · levels · craving
   5. Watch list (add, poster search, poster from photos, status, remove)
   6. Weather place
   7. From visitors

   It uses "house", "loadHouse" and "drawAll" from yna.js.
   ===================================================================== */


/* ===================== 1. SIGN IN ===================== */

var ownerKey = '';
var myBtn = document.getElementById('my-btn');
var mySheet = document.getElementById('my-sheet');
var loginBox = document.getElementById('owner-login');
var myStatus = document.getElementById('my-status');
var extras = { care: [], suggestions: [] };   /*song suggestions + visitor care (owner only)*/

try {
    ownerKey = localStorage.getItem('yna-owner-key') || '';
} catch (e) {
}

/*ask the server if the key is right*/
function checkKey(key) {
    return fetch('/api/yna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ do: 'owner-check', key: key })
    }).then(function (response) {
        return response.json().then(function (data) {
            if (!response.ok) throw new Error(data.error || 'Wrong owner key.');
            return data;
        });
    });
}

function signedIn(data) {
    extras = { care: data.care || [], suggestions: data.suggestions || [] };
    myBtn.hidden = false;
    document.getElementById('owner-link').hidden = true;
}

/*already signed in on this phone: check quietly*/
if (ownerKey) {
    checkKey(ownerKey).then(signedIn).catch(function () {
        ownerKey = '';
    });
}

document.getElementById('owner-link').addEventListener('click', function () {
    document.getElementById('owner-login-note').textContent = '';
    loginBox.showModal();
});

document.getElementById('owner-login-cancel').addEventListener('click', function () {
    loginBox.close();
});

document.getElementById('owner-login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var key = document.getElementById('owner-key').value.trim();
    var note = document.getElementById('owner-login-note');
    note.textContent = 'Checking…';

    checkKey(key)
        .then(function (data) {
            ownerKey = key;
            try {
                localStorage.setItem('yna-owner-key', key);
            } catch (err) {
            }
            signedIn(data);
            loginBox.close();
            openMy();
        })
        .catch(function (err) {
            note.textContent = err.message + ' 🥺';
        });
});

document.getElementById('sign-out').addEventListener('click', function () {
    try {
        localStorage.removeItem('yna-owner-key');
    } catch (e) {
    }
    ownerKey = '';
    myBtn.hidden = true;
    document.getElementById('owner-link').hidden = false;
    mySheet.close();
});


/* ===================== 2. SAVE TO THE HOUSE ===================== */

/*Copies the house as it is now, lets "change" edit it, then saves everything.
  sendShows = true when the watch list changed (posters can be big, so only then).*/
function saveHouse(change, sendShows) {
    if (!house || !ownerKey) return Promise.resolve();

    var h = {
        mood: house.mood || 'WATCHING',
        happiness: house.happiness,
        tummy: house.tummy,
        rest: house.rest,
        foodMood: house.foodMood || '',
        foodMoodBefore: house.foodMoodBefore || '',
        song: house.song || null,
        boss: house.boss || {}
    };
    var shows = (house.shows || []).map(function (s) { return Object.assign({}, s); });
    change(h, shows);

    myStatus.textContent = 'Saving…';
    var body = { do: 'owner', key: ownerKey, house: h, metersIncludeBoost: true };
    if (sendShows) body.shows = shows;

    return fetch('/api/yna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.error) throw new Error(data.error);
            extras = { care: data.care || [], suggestions: data.suggestions || [] };
            myStatus.textContent = 'Saved ✓ Visitors see it now';
            loadHouse();          /*yna.js: read the house again and redraw*/
        })
        .catch(function (err) {
            myStatus.textContent = "Couldn't save: " + err.message;
        });
}


/* ===================== 3. MY CORNER ===================== */

function openMy() {
    if (!house || !house.ready) {
        /*brand new house: start with gentle values*/
        house = Object.assign({ ready: true, mood: 'WATCHING', happiness: 70, tummy: 60, rest: 60, shows: [], boss: {} }, house || {});
    }
    myStatus.textContent = '';
    fillMy();
    mySheet.showModal();
}

myBtn.addEventListener('click', openMy);
document.getElementById('my-close').addEventListener('click', function () {
    mySheet.close();
});

function fillMy() {
    /*mood buttons: the current one is pink*/
    document.querySelectorAll('[data-mood]').forEach(function (b) {
        b.classList.toggle('picked', b.dataset.mood === house.mood);
    });

    /*level sliders*/
    setSlider('lv-happy', house.happiness);
    setSlider('lv-tummy', house.tummy);
    setSlider('lv-rest', house.rest);

    /*craving chips: the current craving's parts are picked*/
    var now = (house.foodMood || '').split(' + ');
    document.querySelectorAll('[data-food]').forEach(function (b) {
        b.classList.toggle('picked', now.indexOf(b.dataset.food) !== -1);
    });

    fillMyShows();
    fillVisitors();
}


/* ===================== 4. MOOD · LEVELS · CRAVING ===================== */

document.querySelectorAll('[data-mood]').forEach(function (button) {
    button.addEventListener('click', function () {
        var mood = button.dataset.mood;
        saveHouse(function (h) { h.mood = mood; }).then(function () {
            /*turn the house to the room of the new mood*/
            var index = YNA_ROOMS.findIndex(function (r) { return r.mood === mood; });
            if (index >= 0) goTo(index);
            fillMy();
        });
        document.querySelectorAll('[data-mood]').forEach(function (b) { b.classList.toggle('picked', b === button); });
    });
});

function setSlider(id, value) {
    var input = document.getElementById(id);
    input.value = Math.round(value || 0);
    document.getElementById(id + '-out').textContent = input.value;
}

['lv-happy', 'lv-tummy', 'lv-rest'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () {
        document.getElementById(id + '-out').textContent = this.value;
    });
});

document.getElementById('save-levels').addEventListener('click', function () {
    saveHouse(function (h) {
        h.happiness = Number(document.getElementById('lv-happy').value);
        h.tummy = Number(document.getElementById('lv-tummy').value);
        h.rest = Number(document.getElementById('lv-rest').value);
    });
});

/*craving: pick up to 2 chips*/
document.querySelectorAll('[data-food]').forEach(function (button) {
    button.addEventListener('click', function () {
        var picked = document.querySelectorAll('[data-food].picked');
        if (!button.classList.contains('picked') && picked.length >= 2) {
            picked[0].classList.remove('picked');   /*a 3rd pick replaces the oldest*/
        }
        button.classList.toggle('picked');
    });
});

document.getElementById('save-craving').addEventListener('click', function () {
    var text = Array.prototype.map.call(document.querySelectorAll('[data-food].picked'), function (b) {
        return b.dataset.food;
    }).join(' + ');
    if (!text) {
        myStatus.textContent = 'Pick 1 or 2 cravings first 🍟';
        return;
    }
    saveHouse(function (h) {
        if (text !== h.foodMood) {
            h.foodMoodBefore = h.foodMood;   /*the old one becomes "before"*/
            h.foodMood = text;
        }
    });
});


/* ===================== 5. WATCH LIST ===================== */

var STATUS_NEXT = { NOW: 'RECENT', RECENT: 'FAVOURITE', FAVOURITE: 'NOW' };
var STATUS_NAME = { NOW: 'Now watching', RECENT: 'Recent', FAVOURITE: 'Favourite' };
var posterFor = '';   /*which show is choosing a poster from photos*/

function fillMyShows() {
    var list = document.getElementById('my-shows');
    list.innerHTML = '';
    (house.shows || []).forEach(function (show) {
        var row = document.getElementById('tpl-my-show').content.firstElementChild.cloneNode(true);
        var img = row.querySelector('img');
        if (show.poster) {
            img.src = show.poster;
        } else {
            img.remove();
            row.querySelector('.my-poster').textContent = YNA_KIND_EMOJI[show.kind] || '🎬';
        }
        row.querySelector('.my-show-title').textContent = show.title;
        row.querySelector('.my-show-meta').textContent = STATUS_NAME[show.status] + ' · ' + (YNA_REACTION_EMOJI[show.reaction] || '');

        row.querySelectorAll('[data-act]').forEach(function (b) {
            b.addEventListener('click', function () {
                showAction(b.dataset.act, show.title, b);
            });
        });
        list.appendChild(row);
    });
}

function changeShow(title, edit) {
    return saveHouse(function (h, shows) {
        var i = shows.findIndex(function (s) { return s.title === title; });
        if (i >= 0) edit(shows, i);
    }, true).then(fillMyShows);
}

function showAction(act, title, button) {
    if (act === 'remove') {
        changeShow(title, function (shows, i) { shows.splice(i, 1); });
    }
    if (act === 'status') {
        changeShow(title, function (shows, i) { shows[i].status = STATUS_NEXT[shows[i].status] || 'NOW'; });
    }
    if (act === 'photo') {
        posterFor = title;
        document.getElementById('poster-file').click();
    }
    if (act === 'find') {
        var show = (house.shows || []).find(function (s) { return s.title === title; });
        button.textContent = '⏳';
        findPoster(title, show ? show.kind : 'OTHER').then(function (url) {
            button.textContent = '🔎';
            if (!url) {
                myStatus.textContent = 'No poster found 🥺 Try 📷 to pick one from your photos';
                return;
            }
            changeShow(title, function (shows, i) { shows[i].poster = url; });
        });
    }
}

/*add a show, then look for its poster*/
document.getElementById('add-show-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = document.getElementById('add-title').value.trim();
    if (!title) return;
    var show = {
        title: title,
        kind: document.getElementById('add-kind').value,
        reaction: document.getElementById('add-reaction').value,
        status: document.getElementById('add-status').value,
        poster: ''
    };
    document.getElementById('add-title').value = '';

    findPoster(show.title, show.kind).then(function (url) {
        show.poster = url || '';
        saveHouse(function (h, shows) {
            /*only one "Now watching": the old one moves to Recent*/
            if (show.status === 'NOW') {
                shows.forEach(function (s) { if (s.status === 'NOW') s.status = 'RECENT'; });
            }
            shows.unshift(show);
        }, true).then(fillMyShows);
    });
});

/*poster search: anime -> AniList, others -> TVmaze (both free, no key). '' = not found*/
function findPoster(title, kind) {
    function aniList() {
        return fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                query: 'query($s:String){Media(search:$s,type:ANIME){coverImage{large}}}',
                variables: { s: title }
            })
        })
            .then(function (r) { return r.json(); })
            .then(function (d) { return (d.data && d.data.Media && d.data.Media.coverImage.large) || ''; })
            .catch(function () { return ''; });
    }
    function tvMaze() {
        return fetch('https://api.tvmaze.com/singlesearch/shows?q=' + encodeURIComponent(title))
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
                var url = (d && d.image && (d.image.original || d.image.medium)) || '';
                return url.replace('http://', 'https://');
            })
            .catch(function () { return ''; });
    }
    var first = kind === 'ANIME' ? aniList : tvMaze;
    var second = kind === 'ANIME' ? tvMaze : aniList;
    return first().then(function (url) { return url || second(); });
}

/*poster from photos: made small (200 px tall) so it saves fast*/
document.getElementById('poster-file').addEventListener('change', function () {
    var file = this.files[0];
    this.value = '';
    if (!file || !posterFor) return;

    var reader = new FileReader();
    reader.onload = function () {
        var img = new Image();
        img.onload = function () {
            var scale = Math.min(1, 200 / img.height);
            var canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            var small = canvas.toDataURL('image/jpeg', 0.7);
            var title = posterFor;
            posterFor = '';
            changeShow(title, function (shows, i) { shows[i].poster = small; });
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});


/* ===================== 6. WEATHER PLACE ===================== */

document.getElementById('set-place').addEventListener('click', function () {
    var note = document.getElementById('weather-note');
    if (!navigator.geolocation) {
        note.textContent = "This phone can't share its location 🥺";
        return;
    }
    note.textContent = 'Finding where you are…';
    navigator.geolocation.getCurrentPosition(function (pos) {
        fetch('/api/yna', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ do: 'owner-place', key: ownerKey, lat: pos.coords.latitude, lng: pos.coords.longitude })
        })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.error) throw new Error(d.error);
                var w = d.weather;
                note.textContent = w ? 'Weather set ✓ ' + ((YNA_WEATHER[w.kind] || ['🌤️'])[0]) + ' ' + w.temp + '° — it updates by itself' : 'Place saved ✓';
                loadHouse();
            })
            .catch(function (err) {
                note.textContent = "Couldn't save: " + err.message;
            });
    }, function () {
        note.textContent = 'Location was not allowed. Settings → Safari → Location → Ask, then try again.';
    }, { enableHighAccuracy: false, timeout: 15000 });
});


/* ===================== 7. FROM VISITORS ===================== */

function fillVisitors() {
    var careList = document.getElementById('my-care');
    var suggestList = document.getElementById('my-suggest');
    careList.innerHTML = '';
    suggestList.innerHTML = '';

    extras.care.slice(0, 6).forEach(function (c) {
        var li = document.createElement('li');
        li.className = 'care-line';
        li.textContent = '💕 ' + c.name + ' ' + c.text + ' · ' + timeAgo(c.at);
        careList.appendChild(li);
    });
    extras.suggestions.slice(0, 10).forEach(function (s) {
        var li = document.createElement('li');
        li.className = 'care-line';
        li.textContent = '🎵 ' + s.song + ' · from ' + s.name;
        suggestList.appendChild(li);
    });
    document.getElementById('my-empty').hidden = extras.care.length + extras.suggestions.length > 0;
}
