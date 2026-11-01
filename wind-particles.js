/**
 * Windy-style particle streamlines on a canvas overlay.
 * Subtle cyan/white trails; respects prefers-reduced-motion.
 */
(function (g) {
  "use strict";

  var DEFAULT_COUNT = 900;
  var REDUCED_COUNT = 180;
  var MAX_AGE = 90;
  var FADE = 0.92;

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

  /** Speed (m/s) → subtle stroke colour (not bright / garish). */
  function colorForSpeed(speed, alpha) {
    var a = alpha == null ? 0.55 : alpha;
    if (!Number.isFinite(speed)) return "rgba(180,210,230," + a + ")";
    // Calm → soft grey-blue; moderate → cyan; stronger → pale white-blue
    if (speed < 2) return "rgba(148,163,184," + a * 0.7 + ")";
    if (speed < 5) return "rgba(125,185,210," + a + ")";
    if (speed < 10) return "rgba(160,210,230," + Math.min(0.85, a + 0.1) + ")";
    return "rgba(220,235,245," + Math.min(0.9, a + 0.15) + ")";
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts
   *   getUv(lon, lat) -> {u,v,speed}|null
   *   project(lon, lat) -> {x,y}|null  (canvas pixels)
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
      // Deg displacement per frame (approx): scale m/s → visual speed
      var scale = reduced ? 0.018 : 0.028;
      var dLon = (uv.u * scale) / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180));
      var dLat = uv.v * scale;
      var nextLon = p.lon + dLon;
      var nextLat = p.lat + dLat;
      var from = opts.project(p.lon, p.lat);
      var to = opts.project(nextLon, nextLat);
      p.lon = nextLon;
      p.lat = nextLat;
      p.age += 1;
      if (
        !from ||
        !to ||
        p.age > MAX_AGE ||
        to.x < -20 ||
        to.y < -20 ||
        to.x > (canvas.clientWidth || 0) + 20 ||
        to.y > (canvas.clientHeight || 0) + 20
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
      // Fade previous trails (Windy-like persistence)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0," + (1 - FADE) + ")";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      ctx.lineWidth = reduced ? 1.2 : 1.35;
      ctx.lineCap = "round";
      for (var i = 0; i < particles.length; i++) {
        var seg = stepParticle(particles[i]);
        if (!seg) continue;
        var ageFade = 1 - particles[i].age / MAX_AGE;
        ctx.strokeStyle = colorForSpeed(seg.speed, 0.35 + 0.45 * ageFade);
        ctx.beginPath();
        ctx.moveTo(seg.x0, seg.y0);
        ctx.lineTo(seg.x1, seg.y1);
        ctx.stroke();
      }
      frame += 1;
      if (reduced) {
        // Draw a few frames then stop (static-ish streamlines)
        if (frame > 40) {
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
      // One-shot denser static strokes for reduced-motion / fallback snapshot
      resize();
      resetParticles();
      ctx.clearRect(0, 0, canvas.clientWidth || 1, canvas.clientHeight || 1);
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (var i = 0; i < particles.length; i++) {
        for (var k = 0; k < 12; k++) {
          var seg = stepParticle(particles[i]);
          if (!seg) break;
          ctx.strokeStyle = colorForSpeed(seg.speed, 0.45);
          ctx.beginPath();
          ctx.moveTo(seg.x0, seg.y0);
          ctx.lineTo(seg.x1, seg.y1);
          ctx.stroke();
        }
      }
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
