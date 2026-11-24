/* =====================================================================
   yna-data.js - THE HOUSE (rooms, moods, Yna's poses and lines)
   Same as the Yna's House app (house/HouseRoom.kt, yna/YnaPose.kt, yna/YnaLines.kt),
   so if you move Yna in the app, change the same numbers here.

   Positions are 0 - 1 of the room picture:
     x = Yna's middle from the left, y = Yna's feet from the top, size = Yna's width
   Pictures: assets/yna/rooms/<name>.webp and assets/yna/poses/<name>.webp
   ===================================================================== */

/*the rooms in the order you swipe through them (a round house: after the last comes the first)*/
var YNA_ROOMS = [
    { id: 'OUTSIDE', label: 'Outside', emoji: '🏡', art: 'house_outside', night: 'house_outside_night', rain: 'house_outside_rain',
      mood: 'OUT', x: 0.5, y: 0.88, size: 0.27 },
    { id: 'KITCHEN', label: 'Kitchen', emoji: '🍳', art: 'room_kitchen',
      mood: 'EATING', x: 0.36, y: 0.9, size: 0.32 },
    { id: 'GACHA', label: 'Gacha room', emoji: '🎰', art: 'room_gacha',
      mood: 'STRESS_EATING', x: 0.6, y: 0.88, size: 0.31,
      spot: { left: 0.16, top: 0.42, right: 0.36, text: '🎰 craving' } },
    { id: 'PLAYROOM', label: 'Playroom', emoji: '🕹️', art: 'room_playroom',
      mood: 'GAMING', x: 0.58, y: 0.88, size: 0.34,
      spot: { left: 0.17, top: 0.42, right: 0.38, text: '🕹️ play games', href: 'yna-games.html' } },
    { id: 'THEATER', label: 'Theater', emoji: '🎬', art: 'room_theater',
      mood: 'WATCHING', x: 0.5, y: 0.79, size: 0.28,
      spot: { left: 0.375, top: 0.345, right: 0.745, text: '📺 watch list' } },
    { id: 'RADIO', label: 'Music room', emoji: '🎵', art: 'room_radio',
      mood: 'MUSIC', x: 0.78, y: 0.9, size: 0.34,
      spot: { left: 0.366, top: 0.397, right: 0.634, text: '🎵 music' } },
    { id: 'DESK', label: 'Computer desk', emoji: '💻', art: 'room_desk',
      mood: 'CODING', x: 0.75, y: 0.755, size: 0.3 },
    { id: 'BEDROOM', label: 'Bedroom', emoji: '🌙', art: 'room_bedroom',
      mood: 'SLEEPING', x: 0.49, y: 0.745, size: 0.34 },
    { id: 'BALCONY', label: 'Balcony', emoji: '🌿', art: 'room_balcony', night: 'room_balcony_night', rain: 'room_balcony_rain',
      mood: 'CHILLING', x: 0.49, y: 0.69, size: 0.22 }
];

/*what Yna does in each mood: poses play in a loop, "speed" = milliseconds per pose*/
var YNA_MOODS = {
    WATCHING: { label: 'Watching', emoji: '🎬', speed: 1500,
                poses: ['yna_watch', 'yna_watch_laugh', 'yna_watch', 'yna_watch_cry', 'yna_watch', 'yna_watch_shock'] },
    CODING: { label: 'Busy coding', emoji: '💻', speed: 500,
              poses: ['yna_code_type_1', 'yna_code_type_2', 'yna_code_type_1', 'yna_code_type_2', 'yna_code_eyeroll'] },
    GAMING: { label: 'Gaming', emoji: '🎮', speed: 1000, poses: ['yna_game'] },
    STRESS_EATING: { label: 'Stress eating', emoji: '🍟', speed: 450, poses: ['yna_stress_eat_1', 'yna_stress_eat_2'] },
    EATING: { label: 'Eating', emoji: '🍽️', speed: 600, poses: ['yna_eat_1', 'yna_eat_2'] },
    SLEEPING: { label: 'Sleeping', emoji: '😴', speed: 1400, poses: ['yna_sleep_1', 'yna_sleep_2'] },
    MUSIC: { label: 'Listening to music', emoji: '🎧', speed: 300, poses: ['yna_bop_1', 'yna_bop_2', 'yna_bop_3', 'yna_bop_4'] },
    OUT: { label: 'Going out', emoji: '🚶', speed: 700, poses: ['yna_excited', 'yna_happy'] },
    CHILLING: { label: 'Chilling', emoji: '🌿', speed: 1600, poses: ['yna_cola', 'yna_happy'] }
};

/*watching a show with a reaction: Yna copies the reaction*/
var YNA_REACTION_POSE = { LAUGH: 'yna_watch_laugh', LOVE: 'yna_watch_laugh', CRY: 'yna_watch_cry', SHOCK: 'yna_watch_shock' };
var YNA_REACTION_EMOJI = { LAUGH: '😂', LOVE: '😍', CRY: '😭', SHOCK: '😱' };
var YNA_KIND_EMOJI = { ANIME: '🎌', CDRAMA: '🏮', OTHER: '🎬' };

/*what visitors can do in Yna's room: pose while it happens + what Yna says*/
var YNA_CARE = {
    pat: { pose: 'yna_patted', meter: '+4 ❤️',
           lines: ['Hehe more pats please 💕', 'I feel so loved 🥹', "Okay I'm not sulking anymore… maybe 😤💕", 'Huggies! 🤗'] },
    listen: { pose: 'yna_yap_1', meter: '+4 ❤️',
              lines: ['I want kentang putar sooo bad 🥔', 'Can we get cola? Just one… or three 🥤',
                      "Did you see that episode?! I'm not okay 😭", "Fries > everything. That's the tweet 🍟",
                      'Hehe I just wanted to talk to you 💖'] },
    snack: { pose: 'yna_snack', meter: '+6 🍟',
             lines: ['Nom nom nom 🍟', 'Is that… fries?! 😍', "You're the best 🥺🍟", 'My tummy says thank you 💖'] },
    nap: { pose: 'yna_yawn', meter: '+6 🌙', lines: ['Zzz… 💤', 'Just five more minutes… 😴'] }
};

/*the 4 games in the app (for the boss score board)*/
var YNA_GAMES = [
    { id: 'cloud_jump', name: 'Cloud Jump', emoji: '☁️', unit: 'm' },
    { id: 'cola_cart', name: 'Cola Cart', emoji: '🥤', unit: 'm' },
    { id: 'runner', name: 'Yna Run', emoji: '🏃', unit: 'pts' },
    { id: 'sudoku', name: 'Daily Sudoku', emoji: '🔢', unit: 'time' }
];

/*weather words + emoji (sent by the app, no location)*/
var YNA_WEATHER = {
    clear: ['☀️', 'Sunny'], cloudy: ['⛅', 'Cloudy'], fog: ['🌫️', 'Foggy'],
    rain: ['🌧️', 'Rainy'], storm: ['⛈️', 'Stormy'], snow: ['❄️', 'Snowy']
};

/*the projector (Theater) and TV (Music room) inside the pictures, 0 - 1*/
var YNA_SCREENS = {
    THEATER: { left: 0.375, top: 0.345, right: 0.745, bottom: 0.515 },
    RADIO: { left: 0.378, top: 0.405, right: 0.622, bottom: 0.52 }
};
