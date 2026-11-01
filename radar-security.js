/**
 * Shared XSS/CSS/param helpers for Wildfire Radar (browser + Node tests).
 * No dependencies.
 */
(function (g) {
  "use strict";

  /** Escape text for HTML body / attribute contexts (incl. single quote). */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Allowlisted route swatch colours (WCAG ≥3:1 on white/light surfaces).
   * Legacy bright hex values map to the darkened allowlist entry.
   */
  var ROUTE_COLOR_ALLOWLIST = ["#15803d", "#b45309", "#b91c1c"];
  var ROUTE_COLOR_ALIASES = {
    "#2ee66d": "#15803d",
    "#f5a524": "#b45309",
    "#ff4d4d": "#b91c1c",
  };

  function safeRouteColor(color, fallback) {
    var fb = fallback == null ? "#4b5563" : fallback;
    var raw = String(color || "").trim().toLowerCase();
    if (ROUTE_COLOR_ALIASES[raw]) raw = ROUTE_COLOR_ALIASES[raw];
    for (var i = 0; i < ROUTE_COLOR_ALLOWLIST.length; i++) {
      if (ROUTE_COLOR_ALLOWLIST[i].toLowerCase() === raw) {
        return ROUTE_COLOR_ALLOWLIST[i];
      }
    }
    return fb;
  }

  /** Validate camp latitude/longitude. */
  function validateCampCoords(lat, lon) {
    var la = typeof lat === "number" ? lat : parseFloat(lat);
    var lo = typeof lon === "number" ? lon : parseFloat(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      return { ok: false, error: "Invalid lat/lon" };
    }
    if (la < -90 || la > 90 || lo < -180 || lo > 180) {
      return { ok: false, error: "Lat must be −90…90, lon −180…180" };
    }
    return { ok: true, lat: la, lon: lo };
  }

  /**
   * Sanitize a camp name from URL/user input for safe display.
   * Strips markup-ish / control characters; use textContent or escapeHtml when injecting HTML.
   */
  function sanitizeCampName(name, fallback) {
    var fb = fallback == null ? "Camp" : String(fallback);
    var s = String(name == null ? "" : name)
      .replace(/[<>&"'`]/g, "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .replace(/\s+/g, " ");
    if (!s) return fb;
    if (s.length > 80) s = s.slice(0, 80);
    return s;
  }

  /**
   * Parse ?lat=&lon=&name= from a URLSearchParams-like object.
   * Returns { ok, lat, lon, name } or { ok:false, error }.
   */
  function parseCampQueryParams(params, defaultName) {
    if (!params || typeof params.get !== "function") {
      return { ok: false, error: "Missing params" };
    }
    var latRaw = params.get("lat");
    var lonRaw = params.get("lon");
    if (latRaw == null || lonRaw == null || latRaw === "" || lonRaw === "") {
      return { ok: false, error: "lat/lon required" };
    }
    var coords = validateCampCoords(latRaw, lonRaw);
    if (!coords.ok) return coords;
    var name = sanitizeCampName(params.get("name"), defaultName || "Camp");
    return { ok: true, lat: coords.lat, lon: coords.lon, name: name };
  }

  /**
   * Pick a live fire for the EXAMPLE pin (prefer BC, Out of Control, then Being Held).
   * Returns fire object or null.
   */
  function pickLiveExampleFire(fires) {
    if (!Array.isArray(fires) || !fires.length) return null;
    function score(f) {
      var s = String(f.FIRE_STATUS || "").toLowerCase();
      var src = String(f.SOURCE || "").toUpperCase();
      var n = 0;
      if (!Number.isFinite(f.LATITUDE) || !Number.isFinite(f.LONGITUDE)) return -1;
      if (src === "BC") n += 10;
      if (src === "AB") n += 5;
      if (s.indexOf("out of control") >= 0) n += 30;
      else if (s.indexOf("being held") >= 0) n += 20;
      else if (s.indexOf("under control") >= 0) n += 5;
      return n;
    }
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < fires.length; i++) {
      var sc = score(fires[i]);
      if (sc > bestScore) {
        bestScore = sc;
        best = fires[i];
      }
    }
    return bestScore > 0 ? best : null;
  }

  g.escapeHtml = escapeHtml;
  g.safeRouteColor = safeRouteColor;
  g.ROUTE_COLOR_ALLOWLIST = ROUTE_COLOR_ALLOWLIST;
  g.validateCampCoords = validateCampCoords;
  g.sanitizeCampName = sanitizeCampName;
  g.parseCampQueryParams = parseCampQueryParams;
  g.pickLiveExampleFire = pickLiveExampleFire;
})(typeof window !== "undefined" ? window : globalThis);
