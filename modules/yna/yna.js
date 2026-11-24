/* =====================================================================
   yna.js - what YNA'S HOUSE (yna.html) does
   1. Page parts
   2. Load the house from /api/yna (again every 30 seconds)
   3. Small helpers (which room is Yna in, night, rain, time ago)
   4. Draw the room you are looking at (picture, Yna, projector, TV, label)
   5. Yna's pose (changes by itself, like in the app)
   6. HUD (meters + chips), dock, hallway
   7. Room info cards (visitor log, craving, boss scores, shows, music)
   8. Care buttons (pat / listen / snack / nap)
   9. Moving between rooms (arrows, swipe, hallway, Find Yna)
   10. Suggest a song + visitor name
   The rooms, moods and poses list is in yna-data.js
   ===================================================================== */


/* ===================== 1. PAGE PARTS ===================== */

var statusBox = document.getElementById('yna-status');
var roomBox = document.getElementById('room');
var roomArt = document.getElementById('room-art');
var ynaImg = document.getElementById('yna');
var speech = document.getElementById('speech');
var floatPlus = document.getElementById('float-plus');
var spotLabel = document.getElementById('spot-label');
var theaterScreen = document.getElementById('theater-screen');
var musicTv = document.getElementById('music-tv');
var nameInput = document.getElementById('visitor-name');

var house = null;       /*the last answer from /api/yna*/
var viewing = 0;        /*which room you are looking at (number in YNA_ROOMS)*/
var firstLoad = true;
var carePose = '';      /*pose while a care is happening*/
var careUntil = 0;


/* ===================== 2. LOAD THE HOUSE ===================== */

function loadHouse() {
    fetch('/api/yna')
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.error) {
                throw new Error(data.error);
            }
            house = data;

            if (!house.ready) {
                statusBox.textContent = "Yna's house isn't open yet — come back soon 🥺";
                statusBox.hidden = false;
            } else {
                statusBox.hidden = true;
            }

            /*first time: start in the room from the link (yna.html?room=RADIO), else the room Yna is in*/
            if (firstLoad) {
                var asked = new URLSearchParams(location.search).get('room');
                var linked = YNA_ROOMS.findIndex(function (room) { return room.id === String(asked).toUpperCase(); });
                if (linked >= 0) {
                    viewing = linked;
                } else if (ynaRoomIndex() >= 0) {
                    viewing = ynaRoomIndex();
                }
            }
            firstLoad = false;
            drawAll();
        })
        .catch(function () {
            statusBox.textContent = "Can't reach Yna's house right now 🥺 (it only works on the live website)";
            statusBox.hidden = false;
            drawAll();
        });
}


/* ===================== 3. SMALL HELPERS ===================== */

/*the room number Yna is in (-1 = not known yet)*/
function ynaRoomIndex() {
    if (!house || !house.ready) {
        return -1;
    }
    return YNA_ROOMS.findIndex(function (room) {
        return room.mood === house.mood;
    });
}

/*night in Malaysia (7pm - 7am), or what the weather says*/
function isNight() {
    if (house && house.weather) {
        return house.weather.night;
    }
    var hour = new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCHours();
    return hour >= 19 || hour < 7;
}

function isRainy() {
    return !!(house && house.weather && (house.weather.kind === 'rain' || house.weather.kind === 'storm'));
}

/*"just now", "5 min ago", "3 h ago", "2 d ago"*/
function timeAgo(at) {
    var minutes = Math.floor((Date.now() - at) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + ' min ago';
    if (minutes < 60 * 24) return Math.floor(minutes / 60) + ' h ago';
    return Math.floor(minutes / 1440) + ' d ago';
}

/*seconds -> 04:05*/
function asTime(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/*a % position for left / top / width*/
function pct(n) {
    return (n * 100) + '%';
}


/* ===================== 4. DRAW THE ROOM ===================== */

function drawRoom() {
    var room = YNA_ROOMS[viewing];

    /*picture: rain version > night version > day*/
    var pic = room.art;
    if (isRainy() && room.rain) {
        pic = room.rain;
    } else if (isNight() && room.night) {
        pic = room.night;
    }
    var src = 'assets/yna/rooms/' + pic + '.webp';
    if (roomArt.getAttribute('src') !== src) {
        roomArt.src = src;
    }
    roomArt.alt = room.label;

    /*Yna: only in the room she is really in*/
    var here = viewing === ynaRoomIndex();
    ynaImg.hidden = !here;
    if (here) {
        var top = room.y - room.size * (928 / 1152);   /*Yna is square: her height in % of the picture height*/
        ynaImg.style.left = pct(room.x - room.size / 2);
        ynaImg.style.top = pct(top);
        ynaImg.style.width = pct(room.size);
        speech.style.left = pct(room.x);
        speech.style.top = pct(Math.max(0.08, top));
        floatPlus.style.left = pct(room.x);
        floatPlus.style.top = pct(top + 0.05);
    }
    if (!here) {
        speech.hidden = true;
    }

    /*bouncing label above the arcade / gachapon / projector / TV*/
    if (room.spot) {
        spotLabel.textContent = room.spot.text;
        spotLabel.href = room.spot.href || '#room-info';     /*arcade: opens the games page*/
        spotLabel.style.left = pct((room.spot.left + room.spot.right) / 2);
        spotLabel.style.top = pct(room.spot.top - 0.01);
        spotLabel.hidden = false;
    } else {
        spotLabel.hidden = true;
    }

    drawScreen(theaterScreen, room.id === 'THEATER', YNA_SCREENS.THEATER);
    drawScreen(musicTv, room.id === 'RADIO', YNA_SCREENS.RADIO);
    fillTheaterScreen();
    fillMusicTv();
}

/*place the projector / TV box over the picture*/
function drawScreen(box, show, rect) {
    box.hidden = !show;
    if (show) {
        box.style.left = pct(rect.left);
        box.style.top = pct(rect.top);
        box.style.width = pct(rect.right - rect.left);
        box.style.height = pct(rect.bottom - rect.top);
    }
}

/*the show marked "Now watching"*/
function nowWatching() {
    var shows = (house && house.shows) || [];
    return shows.find(function (s) { return s.status === 'NOW'; }) || null;
}

function fillTheaterScreen() {
    var show = nowWatching();
    var poster = document.getElementById('screen-poster');
    document.getElementById('screen-title').textContent = show ? show.title : 'Nothing on yet…';
    document.getElementById('screen-reaction').textContent = show ? (YNA_REACTION_EMOJI[show.reaction] || '') : '';
    poster.hidden = !(show && show.poster);
    if (show && show.poster) {
        poster.src = show.poster;
    }
}

/*the song now: Spotify (updates by itself) first, else what the app sent*/
function currentSong() {
    if (!house) return null;
    var sp = house.spotify;
    if (sp && sp.connected && sp.now) {
        return { title: sp.now.title, artist: sp.now.artist, art: sp.now.art, playing: sp.now.playing, url: sp.now.url };
    }
    return house.song || null;
}

function fillMusicTv() {
    var song = currentSong();
    var art = document.getElementById('tv-art');
    document.getElementById('tv-title').textContent = song ? song.title : '♪ quiet for now';
    document.getElementById('tv-artist').textContent = song ? song.artist : '';
    document.getElementById('tv-bars').hidden = !(song && song.playing);
    art.hidden = !(song && song.art);
    if (song && song.art) {
        art.src = song.art;
    }
}


/* ===================== 5. YNA'S POSE ===================== */

function currentPose() {
    var now = Date.now();
    if (now < careUntil) {
        return carePose;
    }
    var mood = YNA_MOODS[house.mood] || YNA_MOODS.WATCHING;

    /*low meters (not while sleeping): hungry / teary*/
    if (house.mood !== 'SLEEPING') {
        if (house.tummy < 20) return 'yna_hungry';
        if (house.happiness < 20) return 'yna_teary';
    }

    /*watching a show: copy its reaction*/
    var show = nowWatching();
    if (house.mood === 'WATCHING' && show && YNA_REACTION_POSE[show.reaction]) {
        var turn = Math.floor(now / 1500) % 2;
        return turn === 0 ? 'yna_watch' : YNA_REACTION_POSE[show.reaction];
    }
    return mood.poses[Math.floor(now / mood.speed) % mood.poses.length];
}

/*runs every 150 ms: swap Yna's picture when her pose changes*/
setInterval(function () {
    if (!house || !house.ready || ynaImg.hidden) return;
    var src = 'assets/yna/poses/' + currentPose() + '.webp';
    if (ynaImg.getAttribute('src') !== src) {
        ynaImg.src = src;
    }
}, 150);


/* ===================== 6. HUD, DOCK, HALLWAY ===================== */

function setTank(id, value) {
    var tank = document.getElementById(id);
    tank.style.setProperty('--level', Math.round(value) + '%');
    tank.classList.toggle('low', value < 20);
    tank.title = tank.title.split(':')[0] + ': ' + Math.round(value);
}

function drawHud() {
    var room = YNA_ROOMS[viewing];
    document.getElementById('room-name').textContent = room.emoji + ' ' + room.label;

    var ready = house && house.ready;
    if (ready) {
        setTank('tank-happy', house.happiness);
        setTank('tank-tummy', house.tummy);
        setTank('tank-rest', house.rest);
    }

    /*weather chip*/
    var weatherChip = document.getElementById('chip-weather');
    if (ready && house.weather) {
        var w = YNA_WEATHER[house.weather.kind] || ['🌤️', ''];
        var emoji = house.weather.kind === 'clear' && house.weather.night ? '🌙' : w[0];
        weatherChip.textContent = emoji + ' ' + house.weather.temp + '°';
        weatherChip.title = w[1] + ' where Yna is';
        weatherChip.hidden = false;
    } else {
        weatherChip.hidden = true;
    }

    /*craving chip (Kitchen + Gacha room)*/
    var cravingChip = document.getElementById('chip-craving');
    var showCraving = ready && house.foodMood && (room.id === 'KITCHEN' || room.id === 'GACHA');
    cravingChip.hidden = !showCraving;
    if (showCraving) {
        cravingChip.textContent = "🍟 Yna's craving: " + house.foodMood;
    }

    /*"Yna is in the ..." chip + dock*/
    var ynaIndex = ynaRoomIndex();
    var away = ready && ynaIndex >= 0 && ynaIndex !== viewing;
    var findChip = document.getElementById('chip-find');
    findChip.hidden = !away;
    if (away) {
        findChip.textContent = '🐻 Yna is in the ' + YNA_ROOMS[ynaIndex].label + ' →';
    }
    document.getElementById('dock-care').hidden = !ready || away;
    document.getElementById('dock-find').hidden = !away;

    /*hallway: where you are + where Yna is*/
    document.querySelectorAll('.hall').forEach(function (hall) {
        var index = Number(hall.dataset.room);
        hall.classList.toggle('here', index === viewing);
        hall.classList.toggle('yna-here', index === ynaIndex);
    });
}


/* ===================== 7. ROOM INFO CARDS ===================== */

function drawInfo() {
    var roomId = YNA_ROOMS[viewing].id;

    /*show only the cards for this room*/
    document.querySelectorAll('#room-info .card').forEach(function (card) {
        card.hidden = card.dataset.for.split(' ').indexOf(roomId) === -1;
    });
    if (!house || !house.ready) return;

    fillCareLog();
    fillCraving();
    fillBoss();
    fillShows();
    fillMusic();

    document.getElementById('out-note').textContent = house.mood === 'OUT'
        ? "Yna went out! Leave her a pat for when she's back 💕"
        : "Yna's little house. Knock knock!";
}

/*copy a <template> and fill it*/
function fromTemplate(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

function fillCareLog() {
    var list = document.getElementById('care-log');
    var care = house.care || [];
    list.innerHTML = '';
    care.forEach(function (c) {
        var line = fromTemplate('tpl-care');
        line.querySelector('.care-who').textContent = c.name;
        line.querySelector('.care-what').textContent = c.text;
        line.querySelector('.care-when').textContent = '· ' + timeAgo(c.at);
        list.appendChild(line);
    });
    document.getElementById('care-empty').hidden = care.length > 0;
}

function fillCraving() {
    document.getElementById('craving-now').textContent = house.foodMood || 'Nothing yet…';
    document.getElementById('craving-before').textContent = house.foodMoodBefore ? 'before: ' + house.foodMoodBefore : '';
}

function fillBoss() {
    var boss = house.boss || {};
    YNA_GAMES.forEach(function (game) {
        var value = Number(boss[game.id]) || 0;
        var text = '—';
        if (value > 0) {
            text = game.unit === 'time' ? asTime(value) : value + ' ' + game.unit;
        }
        document.getElementById('boss-' + game.id).textContent = text;
    });
}

function fillShows() {
    var shows = house.shows || [];
    var lists = { NOW: 'shows-now', RECENT: 'shows-recent', FAVOURITE: 'shows-fav' };

    Object.keys(lists).forEach(function (status) {
        var box = document.getElementById(lists[status]);
        box.innerHTML = '';
        var these = shows.filter(function (s) { return s.status === status; });

        if (these.length === 0) {
            box.innerHTML = '<p class="card-note">Nothing here yet</p>';
            return;
        }
        these.forEach(function (s) {
            var card = fromTemplate('tpl-show');
            var img = card.querySelector('img');
            var kind = card.querySelector('.show-kind');
            if (s.poster) {
                img.src = s.poster;
                img.alt = s.title + ' poster';
                kind.hidden = true;
            } else {
                img.remove();
                kind.textContent = YNA_KIND_EMOJI[s.kind] || '🎬';
            }
            card.querySelector('.show-title').textContent = s.title;
            card.querySelector('.show-reaction').textContent = (YNA_REACTION_EMOJI[s.reaction] || '') + ' Yna ' +
                ({ LAUGH: 'laughed', LOVE: 'loved it', CRY: 'cried', SHOCK: 'was shocked' }[s.reaction] || 'watched');
            box.appendChild(card);
        });
    });
}

/*fill a list of songs / playlists*/
function fillTracks(boxId, items, emptyText) {
    var box = document.getElementById(boxId);
    box.innerHTML = '';
    if (!items || items.length === 0) {
        box.innerHTML = '<p class="card-note">' + emptyText + '</p>';
        return;
    }
    items.forEach(function (item, i) {
        var row = fromTemplate('tpl-track');
        row.href = item.url || '#';
        var art = row.querySelector('.track-art');
        if (item.art || item.image) {
            art.src = item.art || item.image;
        } else {
            art.remove();
        }
        row.querySelector('.track-title').textContent = item.rank ? (i + 1) + '. ' + item.title : (item.title || item.name);
        row.querySelector('.track-artist').textContent = item.artist || 'playlist';
        box.appendChild(row);
    });
}

function fillMusic() {
    var song = currentSong();
    var art = document.getElementById('now-art');
    document.getElementById('now-title').textContent = song ? song.title : 'Not playing right now';
    document.getElementById('now-artist').textContent = song
        ? song.artist + (song.playing ? ' · listening now 🎧' : ' · paused')
        : '';
    art.hidden = !(song && song.art);
    if (song && song.art) {
        art.src = song.art;
    }

    var sp = house.spotify || {};
    fillTracks('playlists', sp.playlists, 'Nothing here yet');
    fillTracks('top-songs', (sp.top || []).map(function (t) { return Object.assign({ rank: true }, t); }), 'Nothing here yet');
    fillTracks('recent-songs', (sp.recent || []).slice(0, 6), 'Nothing here yet');
}

function drawAll() {
    drawRoom();
    drawHud();
    drawInfo();
}


/* ===================== 8. CARE BUTTONS ===================== */

function say(text, ms) {
    speech.textContent = text;
    speech.hidden = false;
    clearTimeout(say.timer);
    say.timer = setTimeout(function () {
        speech.hidden = true;
    }, ms || 2600);
}

function showPlus(text) {
    floatPlus.hidden = true;
    void floatPlus.offsetWidth;   /*restart the animation*/
    floatPlus.textContent = text;
    floatPlus.hidden = false;
}

document.querySelectorAll('[data-care]').forEach(function (button) {
    button.addEventListener('click', function () {
        var what = button.dataset.care;
        var care = YNA_CARE[what];
        var buttons = document.querySelectorAll('[data-care]');
        buttons.forEach(function (b) { b.disabled = true; });

        /*Yna reacts right away, the server saves it*/
        carePose = care.pose;
        careUntil = Date.now() + 2600;
        say(care.lines[Math.floor(Math.random() * care.lines.length)]);
        showPlus(care.meter);

        fetch('/api/yna', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ do: 'care', what: what, name: nameInput.value })
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                if (data.error) {
                    say(data.error, 3000);
                } else {
                    house = data;
                    drawAll();
                }
            })
            .catch(function () {
                say("I can't hear you… (no internet?) 🥺", 3000);
            })
            .finally(function () {
                setTimeout(function () {
                    buttons.forEach(function (b) { b.disabled = false; });
                }, 1200);
            });
    });
});


/* ===================== 9. MOVING BETWEEN ROOMS ===================== */

function goTo(index) {
    var count = YNA_ROOMS.length;
    viewing = (index + count) % count;   /*round house: after the last room comes the first*/
    speech.hidden = true;
    drawAll();
}

document.getElementById('prev-room').addEventListener('click', function () { goTo(viewing - 1); });
document.getElementById('next-room').addEventListener('click', function () { goTo(viewing + 1); });
document.getElementById('find-yna').addEventListener('click', function () { goTo(ynaRoomIndex()); });
document.getElementById('chip-find').addEventListener('click', function () { goTo(ynaRoomIndex()); });

document.querySelectorAll('.hall').forEach(function (hall) {
    hall.addEventListener('click', function () {
        goTo(Number(hall.dataset.room));
    });
});

/*swipe left / right on the room picture*/
var swipeStart = null;
roomBox.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button, a')) return;
    swipeStart = e.clientX;
});
roomBox.addEventListener('pointerup', function (e) {
    if (swipeStart === null) return;
    var dx = e.clientX - swipeStart;
    swipeStart = null;
    if (dx > 50) goTo(viewing - 1);
    if (dx < -50) goTo(viewing + 1);
});

/*laptop keys: ← →*/
document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') goTo(viewing - 1);
    if (e.key === 'ArrowRight') goTo(viewing + 1);
});


/* ===================== 10. SUGGEST A SONG + NAME ===================== */

/*remember the visitor's name on this browser*/
try {
    nameInput.value = localStorage.getItem('yna-visitor-name') || '';
} catch (e) {
}
nameInput.addEventListener('change', function () {
    try {
        localStorage.setItem('yna-visitor-name', nameInput.value.trim());
    } catch (e) {
    }
});

document.getElementById('suggest-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('suggest-song');
    var note = document.getElementById('suggest-note');
    note.textContent = 'Sending…';

    fetch('/api/yna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ do: 'suggest', song: input.value, name: nameInput.value })
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.error) {
                note.textContent = data.error;
            } else {
                note.textContent = 'Sent! Yna will check it out 💕';
                input.value = '';
            }
        })
        .catch(function () {
            note.textContent = "Couldn't send right now 🥺";
        });
});


/* ===================== START ===================== */
drawAll();
loadHouse();
setInterval(loadHouse, 30000);
