/* =====================================================================
   yna-run.js - YNA RUN (like Subway Surfers)
   - Swipe left / right = change lane      (laptop: ← →)
   - Swipe up = jump the low striped barrier (laptop: ↑)
   - Swipe down = slide under the high bar   (laptop: ↓)
   - Big box = must change lane. Fries 🍟 = bonus. Gets faster over time.
   - Score = metres + fries × 5
   Same rules as the Yna's House app (games/YnaRunScreen.kt)

   Fake 3D: everything has a distance z (metres ahead of Yna).
   Further away = smaller and closer to the horizon (see scaleAt / screenX / screenY).
   ===================================================================== */

YNA_GAMES.runner = {
    title: 'Yna Run',
    pic: 'yna_excited',
    unit: 'pts',
    lowerIsBetter: false,
    canvas: true,
    hint: 'Swipe on the game · Laptop: arrow keys',
    tips: [
        '👈👉 Swipe left / right to switch lanes',
        '👆 Swipe up to jump the low striped barriers',
        '👇 Swipe down to slide under the high bars',
        '🍟 Grab fries for bonus points!'
    ],

    /* ---------- start a new round ---------- */
    reset: function (w, h) {
        this.w = w;
        this.h = h;
        this.horizonY = h * 0.36;
        this.feetY = h * 0.80;            /*Yna's feet line (z = 0)*/
        this.laneGap = w * 0.3;           /*space between lanes at z = 0*/
        this.speed = 13;                  /*metres per second*/
        this.distance = 0;
        this.fries = 0;
        this.score = 0;
        this.over = false;
        this.lane = 0;                    /*lane she is going to (-1, 0, 1)*/
        this.laneX = 0;                   /*where she really is (slides to the lane)*/
        this.jumpT = -1;                  /*jump timer (-1 = not jumping)*/
        this.slideT = -1;                 /*slide timer*/
        this.jumpTime = 0.75;
        this.slideTime = 0.7;
        this.runClock = 0;
        this.things = [];                 /*{ lane, z, kind: 'LOW' | 'HIGH' | 'BLOCK' | 'FRIES', done }*/
        this.nextRow = 30;
    },

    /* ---------- fake 3D helpers ---------- */
    scaleAt: function (z) {
        return 1 / (1 + z / 14);
    },
    screenY: function (z) {
        return this.horizonY + (this.feetY - this.horizonY) * this.scaleAt(z);
    },
    screenX: function (laneF, z) {
        return this.w / 2 + laneF * this.laneGap * this.scaleAt(z);
    },
    jumpHeight: function () {
        if (this.jumpT < 0) return 0;
        return Math.sin(Math.PI * this.jumpT / this.jumpTime) * this.h * 0.17;
    },

    /* ---------- swipe (called by games-shared.js) ---------- */
    swipe: function (dx, dy) {
        if (this.over) return;
        if (dx !== 0) this.lane = Math.min(Math.max(this.lane + dx, -1), 1);
        if (dy < 0 && this.jumpT < 0) { this.jumpT = 0; this.slideT = -1; }
        if (dy > 0 && this.slideT < 0) { this.slideT = 0; this.jumpT = -1; }
    },

    /* ---------- a new row of things far ahead (one lane is always safe) ---------- */
    addRow: function (z) {
        var lanes = [-1, 0, 1].sort(function () { return Math.random() - 0.5; });
        var hard = Math.min(this.distance / 1500, 1);
        var blocked = Math.random() < 0.35 + 0.35 * hard ? 2 : 1;
        var kinds = ['LOW', 'HIGH', 'BLOCK'];
        for (var i = 0; i < blocked; i++) {
            this.things.push({ lane: lanes[i], z: z, kind: kinds[Math.floor(Math.random() * 3)], done: false });
        }
        /*fries in the safe lane (sometimes)*/
        if (Math.random() < 0.6) {
            for (var k = 0; k < 5; k++) {
                this.things.push({ lane: lanes[2], z: z - 3 - k * 2.2, kind: 'FRIES', done: false });
            }
        }
    },

    /* ---------- one step of time ---------- */
    step: function (dt) {
        if (this.over) return;
        this.speed = Math.min(this.speed + dt * 0.25, 30);
        var move = this.speed * dt;
        this.distance += move;
        this.runClock += dt;

        /*slide to the new lane*/
        this.laneX += (this.lane - this.laneX) * Math.min(dt * 14, 1);
        if (this.jumpT >= 0) { this.jumpT += dt; if (this.jumpT > this.jumpTime) this.jumpT = -1; }
        if (this.slideT >= 0) { this.slideT += dt; if (this.slideT > this.slideTime) this.slideT = -1; }

        /*new rows*/
        this.nextRow -= move;
        if (this.nextRow <= 0) {
            this.addRow(60);
            this.nextRow = 22 - 8 * Math.min(this.distance / 2000, 1) + Math.random() * 6;
        }

        /*everything comes towards Yna*/
        var myLane = Math.round(this.laneX);
        for (var i = 0; i < this.things.length; i++) {
            var t = this.things[i];
            var before = t.z;
            t.z -= move;
            /*passing Yna right now*/
            if (!t.done && before > 0.3 && t.z <= 0.3 && t.lane === myLane) {
                t.done = true;
                if (t.kind === 'FRIES') this.fries++;
                if (t.kind === 'LOW' && this.jumpHeight() < this.h * 0.05) this.over = true;
                if (t.kind === 'HIGH' && this.slideT < 0) this.over = true;
                if (t.kind === 'BLOCK') this.over = true;
            }
        }
        this.things = this.things.filter(function (t) {
            return t.z >= -4 && !(t.kind === 'FRIES' && t.done);
        });

        this.score = Math.floor(this.distance) + this.fries * 5;
    },

    /* ---------- draw ---------- */
    draw: function (ctx, w, h) {
        var me = this;
        this.drawWorld(ctx, w, h);

        /*far things first, then Yna, then things that already passed her*/
        var ahead = this.things.filter(function (t) { return t.z > 0; });
        ahead.sort(function (a, b) { return b.z - a.z; });
        ahead.forEach(function (t) { me.drawThing(ctx, t); });
        this.drawYna(ctx);
        this.things.forEach(function (t) { if (t.z <= 0) me.drawThing(ctx, t); });
    },

    drawWorld: function (ctx, w, h) {
        var hz = this.horizonY;

        /*sky*/
        var sky = ctx.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, '#AEDBFF');
        sky.addColorStop(1, '#FFE0EE');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, hz + 2);

        /*far hills + grass*/
        ctx.fillStyle = '#CDEBD3';
        ctx.beginPath();
        ctx.arc(w * 0.15, hz + w * 0.33, w * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#BDE3C6';
        ctx.beginPath();
        ctx.arc(w * 0.9, hz + w * 0.43, w * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#A8DDA0';
        ctx.fillRect(0, hz, w, h - hz);

        /*road (from below the screen to the horizon)*/
        this.quad(ctx, '#F3E4D2', -1.6, 1.6, -5, 200);

        /*moving lane lines*/
        var z = -(this.distance % 4) - 2;
        while (z < 80) {
            this.quad(ctx, 'rgba(255,255,255,0.9)', -0.53, -0.47, z, z + 1.8);
            this.quad(ctx, 'rgba(255,255,255,0.9)', 0.47, 0.53, z, z + 1.8);
            z += 4;
        }

        /*round trees beside the road (moving)*/
        var tz = 70 - (this.distance % 9);
        while (tz > -2) {
            var r = this.laneGap * 0.45 * this.scaleAt(tz);
            var sides = [-2.4, 2.4];
            for (var i = 0; i < 2; i++) {
                var cx = this.screenX(sides[i], tz);
                var cy = this.screenY(tz);
                ctx.fillStyle = '#B08A6A';
                ctx.fillRect(cx - r * 0.12, cy - r * 1.2, r * 0.24, r * 1.2);
                ctx.fillStyle = '#8CCF8F';
                ctx.beginPath();
                ctx.arc(cx, cy - r * 1.6, r, 0, Math.PI * 2);
                ctx.fill();
            }
            tz -= 9;
        }
    },

    /* a flat shape on the road: from lane a to lane b, from distance z1 to z2 */
    quad: function (ctx, colour, a, b, z1, z2) {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.moveTo(this.screenX(a, z1), this.screenY(z1));
        ctx.lineTo(this.screenX(b, z1), this.screenY(z1));
        ctx.lineTo(this.screenX(b, z2), this.screenY(z2));
        ctx.lineTo(this.screenX(a, z2), this.screenY(z2));
        ctx.fill();
    },

    drawThing: function (ctx, t) {
        var u = this.laneGap * this.scaleAt(Math.max(t.z, -0.9));    /*size of one lane at this distance*/
        var cx = this.screenX(t.lane, t.z);
        var by = this.screenY(t.z);                                  /*ground line*/
        var k, bw, bh;

        if (t.kind === 'LOW') {
            /*low striped barrier (jump)*/
            bw = u * 0.85;
            bh = u * 0.3;
            ctx.fillStyle = '#8B6B5C';
            ctx.fillRect(cx - bw * 0.4, by - bh, u * 0.05, bh);
            ctx.fillRect(cx + bw * 0.35, by - bh, u * 0.05, bh);
            ctx.fillStyle = '#FFFFFF';
            roundRect(ctx, cx - bw / 2, by - bh, bw, bh * 0.55, u * 0.04);
            ctx.fillStyle = '#F27BB4';
            for (k = 0; k < 4; k++) ctx.fillRect(cx - bw / 2 + k * bw / 4 + bw * 0.03, by - bh, bw / 8, bh * 0.55);
        }
        if (t.kind === 'HIGH') {
            /*high bar (slide under)*/
            bw = u * 0.9;
            var top = by - u * 0.95;
            ctx.fillStyle = '#8B6B5C';
            ctx.fillRect(cx - bw / 2, top, u * 0.06, u * 0.95);
            ctx.fillRect(cx + bw / 2 - u * 0.06, top, u * 0.06, u * 0.95);
            ctx.fillStyle = '#FFBE3D';
            roundRect(ctx, cx - bw / 2, top, bw, u * 0.28, u * 0.06);
            ctx.fillStyle = '#A98BF2';
            roundRect(ctx, cx - bw * 0.35, top + u * 0.07, bw * 0.7, u * 0.14, u * 0.04);
        }
        if (t.kind === 'BLOCK') {
            /*big box (change lane)*/
            bw = u * 0.88;
            bh = u * 1.15;
            ctx.fillStyle = '#DCCBFF';
            roundRect(ctx, cx - bw / 2, by - bh, bw, bh, u * 0.08);
            ctx.fillStyle = '#A98BF2';
            roundRect(ctx, cx - bw / 2, by - bh, bw, bh * 0.16, u * 0.08);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(cx - bw * 0.06, by - bh, bw * 0.12, bh);
        }
        if (t.kind === 'FRIES') {
            /*box of fries (bobbing)*/
            var bob = Math.sin(this.runClock * 6 + t.z) * u * 0.05;
            var fw = u * 0.22;
            var fy = by - u * 0.35 + bob;
            ctx.fillStyle = '#FFD866';
            for (k = 0; k < 4; k++) ctx.fillRect(cx - fw * 0.4 + k * fw * 0.22, fy - fw * 0.55, fw * 0.14, fw * 0.7);
            ctx.fillStyle = '#E8506A';
            roundRect(ctx, cx - fw / 2, fy, fw, fw * 0.8, fw * 0.15);
        }
    },

    drawYna: function (ctx) {
        var cx = this.w / 2 + this.laneX * this.laneGap;
        var jump = this.jumpHeight();
        var feet = this.feetY - jump;

        /*shadow*/
        var sw = this.laneGap * (0.55 - jump / this.h);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, this.feetY, sw / 2, sw * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        /*Yna (seen from the back)*/
        var name = 'game_yna_run_' + (Math.floor(this.runClock * 8) % 2 + 1);
        if (jump > 0) name = 'game_yna_jump';
        else if (this.slideT >= 0) name = 'game_yna_slide';
        var img = picture(sprite(name));
        var height = this.laneGap * (this.slideT >= 0 ? 0.75 : 1.05);
        var width = img.naturalWidth ? height * img.naturalWidth / img.naturalHeight : height * 0.75;
        drawPic(sprite(name), cx - width / 2, feet - height, width, height);
    },

    hud: function () {
        return ['🏁 ' + Math.floor(this.distance) + ' m', '🍟 ' + this.fries];
    },

    result: function () {
        return {
            title: 'Ouch! I bumped into something',
            label: 'score (metres + fries × 5)',
            extra: '🍟 ' + this.fries + ' fries',
            pic: 'yna_teary'
        };
    }
};
