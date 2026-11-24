/* =====================================================================
   cola-cart.js - COLA CART (like Hill Climb)
   - Hold Gas ⚡ to drive, hold Brake 🛑 to slow down / reverse.
   - In the air: Gas = lean back, Brake = lean forward. Land too tilted = the cart flips!
   - Fuel ⛽ goes down. Grab a cola can 🥤 to fill it up. No fuel + stopped = game over.
   - Score = metres driven. Potatoes 🥔 are just for fun.
   Same rules as the Yna's House app (games/ColaCartScreen.kt)
   Controls: left hold button = Brake, right = Gas (laptop: ← →)
   ===================================================================== */

YNA_GAMES.cola_cart = {
    title: 'Cola Cart',
    pic: 'yna_cola',
    unit: 'm',
    lowerIsBetter: false,
    canvas: true,
    holds: ['🛑 Brake', '⚡ Gas'],
    hint: 'Laptop: ← Brake · → Gas',
    tips: [
        '⚡ Hold Gas to drive (in the air: lean back)',
        '🛑 Hold Brake to slow down (in the air: lean forward)',
        '🥤 Grab cola cans for fuel. Don\'t flip!'
    ],

    /* ---------- start a new round ---------- */
    reset: function (w, h) {
        this.w = w;
        this.h = h;
        /*hill shape (random every round)*/
        this.p1 = Math.random() * 6;
        this.p2 = Math.random() * 6;
        this.p3 = Math.random() * 6;

        this.cartW = w * 0.26;
        this.wheelR = this.cartW * 0.13;

        /*physics (pixels per second)*/
        this.gravity = h * 1.9;
        this.engine = h * 1.15;
        this.brakeForce = h * 1.4;
        this.maxSpeed = w * 2.4;
        this.metre = w * 0.12;            /*pixels in 1 metre*/

        this.startX = w * 0.3;
        this.x = this.startX;             /*middle of the cart (world)*/
        this.y = this.ground(this.x);     /*bottom of the wheels*/
        this.speed = 0;                   /*speed along the ground*/
        this.vx = 0;                      /*speed in the air*/
        this.vy = 0;
        this.angle = 0;                   /*tilt (radians, + = nose down)*/
        this.spinVel = 0;
        this.inAir = false;
        this.wheelSpin = 0;
        this.fuel = 100;
        this.potatoes = 0;
        this.score = 0;
        this.over = false;
        this.reason = '';
        this.camX = 0;
        this.camY = this.y - h * 0.6;

        this.cans = [];                   /*x of each cola can*/
        this.spuds = [];                  /*{ x, up } potatoes floating above the ground*/
        this.nextCan = w * 5;
        this.nextSpud = w * 2;
    },

    /* ground height at x (y goes down). Flat at the start, hills get steeper further on */
    ground: function (px) {
        var w = this.w;
        var h = this.h;
        var flat = Math.min(Math.max((px - w * 0.6) / (w * 1.5), 0), 1);
        var hard = Math.min(px / (w * 60), 1);
        var a = h * (0.07 + 0.11 * hard) * flat;
        return h * 0.62 +
            a * Math.sin(px / (w * 0.95) + this.p1) +
            a * 0.55 * Math.sin(px / (w * 0.41) + this.p2) +
            a * 0.22 * Math.sin(px / (w * 0.17) + this.p3);
    },

    slopeAt: function (px) {
        return (this.ground(px + 2) - this.ground(px - 2)) / 4;
    },

    curveAt: function (px) {
        return (this.ground(px + 6) - 2 * this.ground(px) + this.ground(px - 6)) / 36;
    },

    /* ---------- cans and potatoes ahead ---------- */
    addThings: function () {
        var w = this.w;
        while (this.nextCan < this.x + w * 2) {
            this.cans.push(this.nextCan);
            this.nextCan += w * (5 + Math.random() * 3);
        }
        while (this.nextSpud < this.x + w * 2) {
            var n = 3 + Math.floor(Math.random() * 3);
            for (var i = 0; i < n; i++) this.spuds.push({ x: this.nextSpud + i * w * 0.09, up: this.h * 0.07 });
            this.nextSpud += w * (1.6 + Math.random() * 1.6);
        }
        var behind = this.x - w;
        this.cans = this.cans.filter(function (cx) { return cx > behind; });
        this.spuds = this.spuds.filter(function (s) { return s.x > behind; });
    },

    /* ---------- one step of time (left = brake, right = gas) ---------- */
    step: function (dt, input) {
        if (this.over) return;
        var w = this.w;
        var h = this.h;
        var gas = input.right;
        var brake = input.left;
        var canGas = gas && this.fuel > 0;

        /*fuel: uses more when pressing gas*/
        this.fuel = Math.max(0, this.fuel - dt * (canGas ? 6 : 1.5));

        if (!this.inAir) {
            var slopeAngle = Math.atan(this.slopeAt(this.x));
            /*push, brake, gravity down the slope, friction*/
            var a = this.gravity * Math.sin(slopeAngle);
            if (canGas) a += this.engine;
            if (brake) a -= this.speed > 0 ? this.brakeForce : this.engine * 0.5;
            a -= this.speed * 0.35;
            this.speed = Math.min(Math.max(this.speed + a * dt, -this.maxSpeed * 0.35), this.maxSpeed);

            this.x += this.speed * Math.cos(slopeAngle) * dt;
            this.y = this.ground(this.x);
            this.angle += (Math.atan(this.slopeAt(this.x)) - this.angle) * Math.min(dt * 12, 1);

            /*over a hill top too fast = fly*/
            var hx = this.speed * Math.cos(slopeAngle);
            if (hx * hx * this.curveAt(this.x) > this.gravity * Math.cos(slopeAngle)) {
                this.inAir = true;
                this.vx = hx;
                this.vy = this.speed * Math.sin(slopeAngle);
                this.spinVel = 0;
            }
            /*no fuel and stopped = game over*/
            if (this.fuel <= 0 && Math.abs(this.speed) < w * 0.03) {
                this.over = true;
                this.reason = 'Out of cola fuel! ⛽';
            }
        } else {
            /*flying: gravity + lean with gas / brake*/
            this.vy += this.gravity * dt;
            this.vx *= (1 - 0.05 * dt);
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (gas) this.spinVel -= 4 * dt;
            if (brake) this.spinVel += 4 * dt;
            this.spinVel *= (1 - 0.8 * dt);
            this.angle += this.spinVel * dt;

            /*landing*/
            var gy = this.ground(this.x);
            if (this.y >= gy) {
                var groundAngle = Math.atan(this.slopeAt(this.x));
                var diff = this.angle - groundAngle;
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                if (Math.abs(diff) > 1.05) {
                    this.over = true;
                    this.reason = 'The cart flipped!';
                }
                this.inAir = false;
                this.y = gy;
                this.angle = groundAngle;
                this.speed = this.vx * Math.cos(groundAngle) + this.vy * Math.sin(groundAngle);
            }
        }

        this.wheelSpin += this.speed * dt / this.wheelR;
        this.addThings();

        /*grab a cola can = full fuel*/
        var me = this;
        this.cans = this.cans.filter(function (cx) {
            var got = Math.abs(cx - me.x) < me.cartW * 0.5;
            if (got) me.fuel = 100;
            return !got;
        });
        /*grab potatoes*/
        this.spuds = this.spuds.filter(function (s) {
            var got = Math.abs(s.x - me.x) < me.cartW * 0.45 &&
                Math.abs((me.ground(s.x) - s.up) - (me.y - me.wheelR * 3)) < h * 0.12;
            if (got) me.potatoes++;
            return !got;
        });

        this.score = Math.max(0, Math.floor((this.x - this.startX) / this.metre));

        /*camera follows the cart (smoothly)*/
        this.camX = this.x - w * 0.32;
        this.camY += (this.y - h * 0.6 - this.camY) * Math.min(dt * 4, 1);
    },

    /* ---------- draw ---------- */
    draw: function (ctx, w, h) {
        var i;

        /*sky + sun*/
        var sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#AEDBFF');
        sky.addColorStop(0.5, '#FFE3EF');
        sky.addColorStop(1, '#FFF1D6');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#FFF3B0';
        ctx.beginPath();
        ctx.arc(w * 0.8, h * 0.18, w * 0.12, 0, Math.PI * 2);
        ctx.fill();

        /*far hills (move slowly)*/
        ctx.fillStyle = '#CDEBD3';
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var fx = 0; fx <= w + 8; fx += 8) {
            ctx.lineTo(fx, h * 0.5 + h * 0.06 * Math.sin((fx + this.camX * 0.25) / (w * 0.5)) - this.camY * 0.15);
        }
        ctx.lineTo(w, h);
        ctx.fill();

        /*the hill we drive on*/
        var dirt = ctx.createLinearGradient(0, h * 0.4, 0, h);
        dirt.addColorStop(0, '#9EDC9B');
        dirt.addColorStop(1, '#C9A27E');
        ctx.fillStyle = dirt;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var sx = 0; sx <= w + 6; sx += 6) ctx.lineTo(sx, this.ground(this.camX + sx) - this.camY);
        ctx.lineTo(w, h);
        ctx.fill();
        ctx.strokeStyle = '#6CBF6E';
        ctx.lineWidth = w * 0.02;
        ctx.beginPath();
        for (sx = 0; sx <= w + 6; sx += 6) ctx.lineTo(sx, this.ground(this.camX + sx) - this.camY);
        ctx.stroke();

        /*cola cans (pink can, white stripe, no logo)*/
        for (i = 0; i < this.cans.length; i++) {
            var cx = this.cans[i] - this.camX;
            if (cx < -50 || cx > w + 50) continue;
            var cw = w * 0.07;
            var ch = cw * 1.5;
            var top = this.ground(this.cans[i]) - this.camY - ch - h * 0.02;
            ctx.fillStyle = '#E8506A';
            roundRect(ctx, cx - cw / 2, top, cw, ch, cw * 0.25);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(cx - cw / 2, top + ch * 0.4, cw, ch * 0.18);
            ctx.fillStyle = '#D0D0D8';
            ctx.fillRect(cx - cw * 0.4, top - ch * 0.08, cw * 0.8, ch * 0.1);
        }

        /*potatoes*/
        for (i = 0; i < this.spuds.length; i++) {
            var s = this.spuds[i];
            var px = s.x - this.camX;
            if (px < -30 || px > w + 30) continue;
            var r = w * 0.03;
            var py = this.ground(s.x) - this.camY - s.up;
            ctx.fillStyle = '#D9A35B';
            ctx.beginPath();
            ctx.ellipse(px, py, r * 1.2, r, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#B07A3A';
            ctx.beginPath();
            ctx.arc(px - r * 0.4, py - r * 0.2, r * 0.18, 0, Math.PI * 2);
            ctx.arc(px + r * 0.5, py + r * 0.3, r * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }

        this.drawCart(ctx);
        this.drawFuel();
    },

    /* the cart with Yna inside (drawn around the bottom middle of the wheels, then tilted) */
    drawCart: function (ctx) {
        var cw = this.cartW;
        var r = this.wheelR;
        ctx.save();
        ctx.translate(this.x - this.camX, this.y - this.camY);
        ctx.rotate(this.angle);

        /*Yna sitting in the cart*/
        var ys = cw * 0.62;
        drawPic(pose(this.over ? 'yna_teary' : 'yna_excited'), -ys / 2 - cw * 0.05, -r * 2 - cw * 0.22 - ys * 0.78, ys, ys);

        /*cart body*/
        var bodyTop = -r * 2.1 - cw * 0.22;
        var paint = ctx.createLinearGradient(0, bodyTop, 0, -r);
        paint.addColorStop(0, '#FF8FA3');
        paint.addColorStop(1, '#E8506A');
        ctx.fillStyle = paint;
        roundRect(ctx, -cw / 2, bodyTop, cw, cw * 0.3, cw * 0.08);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(-cw / 2, bodyTop + cw * 0.11, cw, cw * 0.05);

        /*cola bottle at the back (no logo)*/
        ctx.fillStyle = '#8B4A3C';
        roundRect(ctx, -cw * 0.5, bodyTop - cw * 0.2, cw * 0.1, cw * 0.22, cw * 0.03);
        ctx.fillRect(-cw * 0.475, bodyTop - cw * 0.28, cw * 0.05, cw * 0.1);

        /*wheels*/
        var wheels = [-cw * 0.32, cw * 0.32];
        for (var i = 0; i < wheels.length; i++) {
            var wx = wheels[i];
            ctx.fillStyle = '#3B2B3F';
            ctx.beginPath();
            ctx.arc(wx, -r, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFE597';
            ctx.beginPath();
            ctx.arc(wx, -r, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3B2B3F';
            ctx.lineWidth = r * 0.15;
            for (var k = 0; k < 3; k++) {
                var a = this.wheelSpin + k * (2 * Math.PI / 3);
                ctx.beginPath();
                ctx.moveTo(wx, -r);
                ctx.lineTo(wx + Math.cos(a) * r * 0.5, -r + Math.sin(a) * r * 0.5);
                ctx.stroke();
            }
        }
        ctx.restore();
    },

    /* fuel tank at the top (HTML bar in yna-games.html) */
    drawFuel: function () {
        var fill = document.getElementById('fuel-fill');
        fill.style.width = this.fuel + '%';
        fill.classList.toggle('low', this.fuel < 25);
    },

    hud: function () {
        return ['🏁 ' + this.score + ' m', '🥔 ' + this.potatoes];
    },

    result: function () {
        return { title: this.reason, label: 'metres driven', extra: '🥔 ' + this.potatoes + ' potatoes', pic: 'yna_teary' };
    }
};

