/**
 * Windy-style particle streamlines on a canvas overlay.
 * Bright white/cyan trails over satellite; respects prefers-reduced-motion.
 */
(function (g) {
  "use strict";

  var DEFAULT_COUNT = 3200;
  var REDUCED_COUNT = 400;
  var MAX_AGE = 110;
  var FADE = 0.90; // longer visible tails

  function prefersReducedMotion() {
    try {
      return !!(
        g.matchMedia &&
        g.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (e) {
      return false;
    }
  }

  /** Speed (m/s) → bright white / light-cyan (readable on hybrid imagery). */
  function colorForSpeed(speed, alpha) {
    var a = alpha == null ? 0.95 : alpha;
    if (!Number.isFinite(speed)) return "rgba(240,249,255," + a + ")";
    // Bright cyan → white for satellite contrast (Windy-like).
    if (speed < 2) return "rgba(165,243,252," + Math.max(0.55, a * 0.85) + ")";
    if (speed < 5) return "rgba(125,211,252," + Math.min(1, a + 0.05) + ")";
    if (speed < 10) return "rgba(224,242,254," + Math.min(1, a + 0.1) + ")";
    return "rgba(255,255,255," + Math.min(1, a + 0.15) + ")";
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts
   *   getUv(lon, lat) -> {u,v,speed}|null
   *   project(lon, lat) -> {x,y}|null
   *   unproject(x, y) -> {lon,lat}|null
   *   isVisible() -> bool
   */
  function createParticleField(canvas, opts) {
    var ctx = canvas.getContext("2d", { alpha: true });
    var particles = [];
    var raf = 0;
    var running = false;
    var reduced = prefersReducedMotion();
    var count = reduced ? REDUCED_COUNT : DEFAULT_COUNT;
    var frame = 0;

    function resize() {
      var w = canvas.clientWidth || canvas.width || 1;
      var h = canvas.clientHeight || canvas.height || 1;
      if (w < 2) w = (canvas.parentElement && canvas.parentElement.clientWidth) || g.innerWidth || 1;
      if (h < 2) h = (canvas.parentElement && canvas.parentElement.clientHeight) || g.innerHeight || 1;
      var dpr = Math.min(g.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }

    function spawnOne() {
      var w = canvas.clientWidth || 1;
      var h = canvas.clientHeight || 1;
      var x = Math.random() * w;
      var y = Math.random() * h;
      var ll = opts.unproject ? opts.unproject(x, y) : null;
      return {
        x: x,
        y: y,
        lon: ll ? ll.lon : NaN,
        lat: ll ? ll.lat : NaN,
        age: Math.floor(Math.random() * MAX_AGE),
      };
    }

    function resetParticles() {
      particles = [];
      for (var i = 0; i < count; i++) particles.push(spawnOne());
    }

    function stepParticle(p) {
      if (!opts.getUv || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) {
        Object.assign(p, spawnOne());
        return null;
      }
      var uv = opts.getUv(p.lon, p.lat);
      if (!uv || !Number.isFinite(uv.u)) {
        Object.assign(p, spawnOne());
        return null;
      }
      // Deg displacement per frame — tuned for dense readable flow
      var scale = reduced ? 0.028 : 0.045;
      var dLon = (uv.u * scale) / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180));
      var dLat = uv.v * scale;
      var nextLon = p.lon + dLon;
      var nextLat = p.lat + dLat;
      var from = opts.project(p.lon, p.lat);
      var to = opts.project(nextLon, nextLat);
      p.lon = nextLon;
      p.lat = nextLat;
      p.age += 1;
      var cw = canvas.clientWidth || 0;
      var ch = canvas.clientHeight || 0;
      if (
        !from ||
        !to ||
        !Number.isFinite(from.x) ||
        !Number.isFinite(to.x) ||
        p.age > MAX_AGE ||
        to.x < -40 ||
        to.y < -40 ||
        to.x > cw + 40 ||
        to.y > ch + 40
      ) {
        Object.assign(p, spawnOne());
        return null;
      }
      p.x = to.x;
      p.y = to.y;
      return { x0: from.x, y0: from.y, x1: to.x, y1: to.y, speed: uv.speed };
    }

    function drawFrame() {
      if (!running) return;
      if (opts.isVisible && !opts.isVisible()) {
        raf = g.requestAnimationFrame(drawFrame);
        return;
      }
      var w = canvas.clientWidth || 1;
      var h = canvas.clientHeight || 1;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0," + (1 - FADE) + ")";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter"; // additive glow like Windy

      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      for (var i = 0; i < particles.length; i++) {
        var seg = stepParticle(particles[i]);
        if (!seg) continue;
        var ageFade = 1 - particles[i].age / MAX_AGE;
        ctx.strokeStyle = colorForSpeed(seg.speed, 0.7 + 0.3 * ageFade);
        ctx.beginPath();
        ctx.moveTo(seg.x0, seg.y0);
        ctx.lineTo(seg.x1, seg.y1);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      if (opts.afterFrame) {
        try { opts.afterFrame(ctx, w, h); } catch (e) { /* ignore */ }
      }
      frame += 1;
      if (reduced) {
        if (frame > 50) {
          running = false;
          return;
        }
      }
      raf = g.requestAnimationFrame(drawFrame);
    }

    function start() {
      reduced = prefersReducedMotion();
      count = reduced ? REDUCED_COUNT : DEFAULT_COUNT;
      resize();
      resetParticles();
      frame = 0;
      if (!running) {
        running = true;
        raf = g.requestAnimationFrame(drawFrame);
      }
    }

    function stop() {
      running = false;
      if (raf) g.cancelAnimationFrame(raf);
      raf = 0;
    }

    function clear() {
      stop();
      var w = canvas.clientWidth || 1;
      var h = canvas.clientHeight || 1;
      ctx.clearRect(0, 0, w, h);
    }

    function redrawStatic() {
      resize();
      resetParticles();
      ctx.clearRect(0, 0, canvas.clientWidth || 1, canvas.clientHeight || 1);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      for (var i = 0; i < particles.length; i++) {
        for (var k = 0; k < 16; k++) {
          var seg = stepParticle(particles[i]);
          if (!seg) break;
          ctx.strokeStyle = colorForSpeed(seg.speed, 0.7);
          ctx.beginPath();
          ctx.moveTo(seg.x0, seg.y0);
          ctx.lineTo(seg.x1, seg.y1);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }

    return {
      start: start,
      stop: stop,
      clear: clear,
      resize: resize,
      redrawStatic: redrawStatic,
      isRunning: function () {
        return running;
      },
    };
  }

  g.WIND_PARTICLES = {
    createParticleField: createParticleField,
    colorForSpeed: colorForSpeed,
    prefersReducedMotion: prefersReducedMotion,
  };
})(typeof window !== "undefined" ? window : globalThis);
