/* =====================================================================
   cloud-jump.js - CLOUD JUMP (like Doodle Jump)
   - Yna bounces by herself. Hold ◀ ▶ (or the arrow keys) to move.
   - Going off one side brings her back on the other side.
   - Pink spring cloud = super jump. Cracked cloud = breaks after one jump.
   - Score = how high she got (m). Falling off the bottom = game over.
   - Sky changes: day -> sunset (150 m) -> night (400 m)
   Same rules as the Yna's House app (games/CloudJumpScreen.kt)
   ===================================================================== */

YNA_GAMES.cloud_jump = {
    title: 'Cloud Jump',
    pic: 'yna_excited',
    unit: 'm',
    lowerIsBetter: false,
    canvas: true,
    holds: ['◀', '▶'],
    hint: 'Laptop: ← → arrow keys',
    tips: [
        '◀ ▶ Hold to move Yna left / right',
        '☁️ Land on clouds to bounce higher',
        '🌸 Pink spring cloud = super jump!',
        '💔 Cracked clouds break after one jump'
    ],

    /* ---------- start a new round ---------- */
    reset: function (w, h) {
        this.w = w;
        this.h = h;
        this.ynaSize = w * 0.22;
        this.cloudW = w * 0.28;
        this.cloudH = w * 0.12;

        /*physics (pixels per second)*/
        this.gravity = h * 2.2;
        this.jumpSpeed = h * 1.11;
        this.springSpeed = h * 1.62;
        this.moveSpeed = w * 1.1;
        this.groundY = h * 0.92;

        this.x = w / 2;                   /*Yna's feet (world position)*/
        this.y = this.groundY;
        this.vy = -this.jumpSpeed;
        this.cameraY = 0;                 /*top of the screen in the world (only moves up)*/
        this.score = 0;
        this.over = false;

        /*clouds: { x, y, kind: 'NORMAL' | 'SPRING' | 'CRACK' | 'GROUND', gone }*/
        this.clouds = [{ x: w / 2, y: this.groundY, kind: 'GROUND', gone: false }];
        this.topY = this.groundY;
        this.addClouds();
    },

    /* ---------- add clouds above, remove the ones far below ---------- */
    addClouds: function () {
        var h = this.h;
        while (this.topY > this.cameraY - h * 0.3) {
            var harder = Math.min(this.score / 600, 1);
            this.topY -= h * (0.10 + Math.random() * (0.08 + 0.06 * harder));

            var roll = Math.random();
            var kind = 'NORMAL';
            if (roll < 0.10) kind = 'SPRING';
            else if (this.score > 50 && roll < 0.28) kind = 'CRACK';

            this.clouds.push({
                x: this.cloudW / 2 + Math.random() * (this.w - this.cloudW),
                y: this.topY,
                kind: kind,
                gone: false
            });
        }
        var bottom = this.cameraY + h * 1.2;
        this.clouds = this.clouds.filter(function (c) { return c.y < bottom; });
    },

    /* ---------- one step of time ---------- */
    step: function (dt, input) {
        if (this.over) return;
        var w = this.w;
        var h = this.h;

        /*move left / right, wrap around the sides*/
        var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        this.x += dir * this.moveSpeed * dt;
        if (this.x < 0) this.x += w;
        if (this.x > w) this.x -= w;

        /*gravity*/
        var oldY = this.y;
        this.vy += this.gravity * dt;
        this.y += this.vy * dt;

        /*land on a cloud (only while falling)*/
        if (this.vy > 0) {
            for (var i = 0; i < this.clouds.length; i++) {
                var c = this.clouds[i];
                if (c.gone) continue;
                var crossed = oldY <= c.y && this.y >= c.y;
                var near = c.kind === 'GROUND' || Math.abs(this.x - c.x) < this.cloudW / 2 + this.ynaSize * 0.2;
                if (crossed && near) {
                    this.y = c.y;
                    this.vy = c.kind === 'SPRING' ? -this.springSpeed : -this.jumpSpeed;
                    if (c.kind === 'CRACK') c.gone = true;
                    break;
                }
            }
        }

        /*camera follows Yna up (never down)*/
        var target = this.y - h * 0.55;
        if (target < this.cameraY) this.cameraY = target;

        this.score = Math.max(this.score, Math.floor((this.groundY - this.y) / h * 100));
        this.addClouds();

        /*fell below the screen*/
        if (this.y - this.ynaSize > this.cameraY + h) this.over = true;
    },

    /* ---------- draw ---------- */
    draw: function (ctx, w, h) {
        /*sky: day -> sunset -> night*/
        var sunset = Math.min(Math.max((this.score - 150) / 100, 0), 1);
        var night = Math.min(Math.max((this.score - 400) / 150, 0), 1);
        drawPic(sprite('game_sky_day'), 0, 0, w, h);
        ctx.globalAlpha = sunset;
        drawPic(sprite('game_sky_sunset'), 0, 0, w, h);
        ctx.globalAlpha = night;
        drawPic(sprite('game_sky_night'), 0, 0, w, h);
        ctx.globalAlpha = 1;

        /*clouds*/
        var pics = { NORMAL: 'game_cloud', SPRING: 'game_cloud_spring', CRACK: 'game_cloud_crack', GROUND: 'game_cloud_ground' };
        for (var i = 0; i < this.clouds.length; i++) {
            var c = this.clouds[i];
            if (c.gone) continue;
            var cw = c.kind === 'GROUND' ? w : this.cloudW;
            var ch = c.kind === 'SPRING' ? this.cloudH * 1.5 : this.cloudH;
            drawPic(sprite(pics[c.kind]), c.x - cw / 2, c.y - this.cameraY - ch * 0.35, cw, ch);
        }

        /*Yna: arms up going up, excited coming down, teary at the end*/
        var face = this.over ? 'yna_teary' : (this.vy < 0 ? 'yna_happy' : 'yna_excited');
        var s = this.ynaSize;
        var sy = this.y - this.cameraY - s;
        drawPic(pose(face), this.x - s / 2, sy, s, s);
        /*the part going off one side shows on the other side*/
        if (this.x < s / 2) drawPic(pose(face), this.x + w - s / 2, sy, s, s);
        if (this.x > w - s / 2) drawPic(pose(face), this.x - w - s / 2, sy, s, s);
    },

    hud: function () {
        return ['☁️ ' + this.score + ' m'];
    },

    result: function () {
        return { title: 'Whoops, I fell!', label: 'metres high', pic: 'yna_teary' };
    }
};
