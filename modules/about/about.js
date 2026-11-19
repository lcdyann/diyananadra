/* =====================================================================
   about.js - only for about.html
   Builds the page from SKILL_MACHINES and COURSES (written in about-data.js)
   1. Helper: copy a <template>
   2. Skills: gacha machines + tray
   3. Core coursework: rolling capsules (endless) + info box
   ===================================================================== */


/* ===================== 1. HELPER: COPY A TEMPLATE ===================== */
/*copy of <template id="...">; copy.part('name') finds the element with data-fill="name"*/
function copyTemplate(id) {
    var copy = document.getElementById(id).content.cloneNode(true);
    copy.part = function (name) {
        return copy.querySelector('[data-fill="' + name + '"]');
    };
    return copy;
}

/*"JavaScript" -> "JA", "Node.js" -> "NO" (used when a skill has no icon)*/
function initials(name) {
    return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
}


/* ===================== 2. SKILLS: GACHA MACHINES ===================== */

var machinesBox = document.getElementById('machines');
var traySkills = document.getElementById('tray-skills');
var trayTitle = document.getElementById('tray-title');
var capsule = document.getElementById('capsule');
var capsuleTop = document.getElementById('capsule-top');
var openMachine = -1;   /*which machine is open (-1 = none)*/

/* ----- make one machine for each group ----- */
SKILL_MACHINES.forEach(function (group, i) {
    var copy = copyTemplate('machine-template');
    var machine = copy.querySelector('.machine');

    machine.style.setProperty('--machine', group.color); /*the machine's colour (used in about.css)*/
    copy.part('name').textContent = group.name;

    machine.addEventListener('click', function () {
        pullMachine(i);
    });

    machinesBox.appendChild(copy);
});

var machineButtons = machinesBox.querySelectorAll('.machine');

/* ----- click a machine: knob turns, capsule pops, skills spill out ----- */
function pullMachine(index) {
    var button = machineButtons[index];

    /*click the open machine again = close it*/
    if (openMachine === index) {
        openMachine = -1;
        showMachines();
        traySkills.innerHTML = '';
        capsule.hidden = true;
        trayTitle.textContent = 'Turn a knob to get a capsule!';
        return;
    }

    openMachine = index;
    showMachines();

    /*knob turn (class removed, then added again so the animation replays)*/
    button.classList.remove('spinning');
    void button.offsetWidth;
    button.classList.add('spinning');

    /*capsule: machine's colour on top, drops and pops (same replay trick)*/
    var group = SKILL_MACHINES[index];
    capsuleTop.style.background = group.color;
    capsule.hidden = false;
    capsule.classList.remove('popping');
    void capsule.offsetWidth;
    capsule.classList.add('popping');

    trayTitle.textContent = group.name + ' · ' + group.skills.length + ' skills';

    /*skills spill out one after another*/
    traySkills.innerHTML = '';
    group.skills.forEach(function (skill, i) {
        var chip = copyTemplate('skill-template');
        var item = chip.querySelector('.skill-chip');
        item.style.setProperty('--machine', group.color);
        item.style.animationDelay = (0.45 + i * 0.04) + 's';

        chip.part('name').textContent = skill.name;

        if (skill.icon) {
            chip.part('icon').className = skill.icon;
        } else {
            /*no icon: show the first letters on a coloured badge*/
            chip.part('icon-box').classList.add('no-icon');
            chip.part('icon-box').textContent = initials(skill.name);
        }

        traySkills.appendChild(chip);
    });
}

/*the open machine glows; the others don't*/
function showMachines() {
    machineButtons.forEach(function (button, i) {
        var isOpen = (i === openMachine);
        button.classList.toggle('open', isOpen);
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        button.querySelector('[data-fill="hint"]').textContent = isOpen ? '▼ capsule opened!' : 'click to turn the knob';
    });
}


/* ===================== 3. CORE COURSEWORK: ROLLING CAPSULES ===================== */

var TYPE_COLORS = { Passive: '#5EC4CD', Active: '#ff6b6b', Aura: '#6be3a1', Ultimate: '#eac231' };
var TYPE_TAG_COLORS = { Passive: '#18949f', Active: '#cc0000', Aura: '#2f9e63', Ultimate: '#a37c00' };

var rollTrack = document.getElementById('roll-track');
var rollWindow = document.getElementById('roll-window');
var chosenCourse = 0;

/* ----- the capsules, drawn 3 times in a row so the strip never runs out ----- */
for (var copyNo = 0; copyNo < 3; copyNo++) {
    COURSES.forEach(function (course, i) {
        var copy = copyTemplate('course-template');
        var ball = copy.part('button');

        ball.style.setProperty('--ball', TYPE_COLORS[course.type] || '#cccccc');
        ball.setAttribute('aria-label', course.name);
        ball.setAttribute('data-course', i);
        copy.part('icon').className = course.icon;

        /*only the middle copy can be reached with Tab (the others are just for looks)*/
        if (copyNo !== 1) {
            ball.tabIndex = -1;
            ball.setAttribute('aria-hidden', 'true');
        }

        ball.addEventListener('click', function () {
            showCourse(i);
        });

        rollTrack.appendChild(copy);
    });
}

/* ----- show the clicked course in the dialogue box ----- */
function showCourse(index) {
    var course = COURSES[index];
    chosenCourse = index;

    document.getElementById('course-name').textContent = course.name;
    document.getElementById('course-text').textContent = course.text;

    var tag = document.getElementById('course-type');
    tag.textContent = course.type.toUpperCase();
    tag.style.background = TYPE_TAG_COLORS[course.type] || '#555555';

    /*light up every copy of this course*/
    rollTrack.querySelectorAll('.course-ball').forEach(function (ball) {
        var on = Number(ball.getAttribute('data-course')) === index;
        ball.classList.toggle('on', on);
        ball.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

showCourse(0);


/* ----- ROLLING -----
   offset = how far the strip has moved (px). spin = how far the balls have turned.
   One full set = all courses once. When the strip passes one set, it jumps back by one set
   without animation: the copies look the same, so nobody sees the jump. */
var offset = 0;
var spin = 0;
var paused = false;      /*mouse is on the strip*/
var pausedUntil = 0;     /*after using < >, wait a bit before rolling again*/
var stepping = false;    /*a < > slide is playing*/
var SPEED = 0.05;        /*px per millisecond when idle (bigger = faster)*/
var BALL_SIZE = 58;      /*must match .course-ball width in about.css*/

/*width of one capsule + the gap after it*/
function stepSize() {
    var balls = rollTrack.children;
    if (balls.length < 2) return 72;
    return balls[1].getBoundingClientRect().left - balls[0].getBoundingClientRect().left;
}

function setSize() {
    return stepSize() * COURSES.length;
}

/*moves the strip and turns the balls*/
function drawRoll() {
    rollTrack.style.transform = 'translateX(' + (-offset) + 'px)';
    /*a ball turns 360° when it rolls its own outside length (π × size)*/
    rollTrack.style.setProperty('--spin', (-(spin / (Math.PI * BALL_SIZE)) * 360) + 'deg');
}

/*keeps offset inside one set (invisible jump)*/
function wrapRoll() {
    var set = setSize();
    if (offset >= set) offset = offset - set;
    if (offset < 0) offset = offset + set;
}

/* ----- idle: roll a little bit every frame ----- */
var lastTime = null;
var noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function rollFrame(time) {
    if (lastTime !== null && !paused && !stepping && Date.now() > pausedUntil && !noMotion) {
        var moved = (time - lastTime) * SPEED;
        offset = offset + moved;
        spin = spin + moved;
        wrapRoll();
        drawRoll();
    }
    lastTime = time;
    requestAnimationFrame(rollFrame);
}

requestAnimationFrame(rollFrame);

/* ----- < > buttons and swipe: a smooth slide of 2 capsules ----- */
function rollBy(px) {
    if (stepping) return;
    stepping = true;
    pausedUntil = Date.now() + 3000;

    /*going back past the start: first move one set ahead (invisible), then slide back*/
    if (offset + px < 0) {
        offset = offset + setSize();
        drawRoll();
    }

    /*turn on the smooth slide (class "stepping" in about.css), then move*/
    void rollTrack.offsetWidth;
    rollTrack.classList.add('stepping');
    offset = offset + px;
    spin = spin + px;
    drawRoll();

    /*when the slide is finished: turn the slide off and jump back into one set (invisible)*/
    setTimeout(function () {
        rollTrack.classList.remove('stepping');
        wrapRoll();
        drawRoll();
        stepping = false;
    }, 620);
}

document.getElementById('roll-back').addEventListener('click', function () { rollBy(-stepSize() * 2); });
document.getElementById('roll-fwd').addEventListener('click', function () { rollBy(stepSize() * 2); });

/*pause while the mouse is on the strip (not on phones: a tap there has no "leave"), or a ball has keyboard focus*/
rollWindow.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') paused = true; });
rollWindow.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') paused = false; });
rollWindow.addEventListener('focusin', function () { paused = true; });
rollWindow.addEventListener('focusout', function () { paused = false; });

/*swipe: more than 40px left = forward, right = back*/
var swipeStart = null;

rollWindow.addEventListener('pointerdown', function (e) {
    swipeStart = e.clientX;
    pausedUntil = Date.now() + 3000; /*phone: a tap also stops the rolling for a moment*/
});

rollWindow.addEventListener('pointerup', function (e) {
    if (swipeStart === null) return;
    var moved = e.clientX - swipeStart;
    swipeStart = null;

    if (moved < -40) rollBy(stepSize() * 2);
    if (moved > 40)  rollBy(-stepSize() * 2);
});

drawRoll();
