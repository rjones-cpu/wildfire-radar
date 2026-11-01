/**
 * ECCC MSC GeoMet RDPS wind grid fetch + parse (WCS AAIGRID).
 * Primary source for forecast wind particles. No Windy / unofficial APIs.
 * NASA POWER was researched: CORS-friendly but not a forecast product (future hours = -999);
 * GEOS-FP has no browser CORS API — NASA is not used for the particle field.
 */
(function (g) {
  "use strict";

  var ECCC_WCS = "https://geo.weather.gc.ca/geomet";
  var COVERAGE_SPEED = "RDPS_10km_WindSpeed_10m";
  var COVERAGE_DIR = "RDPS_10km_WindDir_10m";
  var ISO_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

  function isFiniteNumber(n) {
    return typeof n === "number" && Number.isFinite(n);
  }

  /** Strict ISO8601 UTC second precision (GeoMet TIME). */
  function validateIsoTime(t) {
    if (t == null) return null;
    var s = String(t).trim();
    if (!ISO_TIME_RE.test(s)) return null;
    var ms = Date.parse(s);
    if (!Number.isFinite(ms)) return null;
    return s;
  }

  /**
   * Parse Arc/Info ASCII Grid text (optionally wrapped in multipart/related).
   * Returns { ncols, nrows, xllcorner, yllcorner, cellsize, nodata, values Float64Array row-major north→south }.
   */
  function parseAaigrid(text) {
    if (text == null) throw new Error("empty AAIGRID");
    var raw = String(text);
    // Strip MIME multipart wrapper if present
    var m = raw.match(/ncols\s+[-\d.][\s\S]*?(?=\r?\n--|\r?\nContent-Type:|$)/i);
    if (m) raw = m[0];
    var lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    var meta = {};
    var i = 0;
    for (; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var parts = line.split(/\s+/);
      var key = parts[0].toLowerCase();
      if (
        key === "ncols" ||
        key === "nrows" ||
        key === "xllcorner" ||
        key === "yllcorner" ||
        key === "cellsize" ||
        key === "dx" ||
        key === "dy" ||
        key === "nodata_value"
      ) {
        var num = Number(parts[1]);
        if (!Number.isFinite(num)) throw new Error("bad AAIGRID header: " + key);
        meta[key === "nodata_value" ? "nodata" : key] = num;
        continue;
      }
      // first non-header line → data starts here
      break;
    }
    if (
      !isFiniteNumber(meta.ncols) ||
      !isFiniteNumber(meta.nrows) ||
      !isFiniteNumber(meta.xllcorner) ||
      !isFiniteNumber(meta.yllcorner)
    ) {
      throw new Error("incomplete AAIGRID header");
    }
    // GeoMet may emit cellsize or separate dx/dy (non-square cells).
    if (!isFiniteNumber(meta.cellsize)) {
      if (isFiniteNumber(meta.dx) && isFiniteNumber(meta.dy)) {
        // Prefer dx for lon; require dy nearly equal for isotropic sample math,
        // else store both and use dx as cellsize with dy for lat.
        meta.cellsize = meta.dx;
        meta.cellsizeY = meta.dy;
      }
    } else {
      meta.cellsizeY = meta.cellsize;
    }
    if (!isFiniteNumber(meta.cellsize) || !isFiniteNumber(meta.cellsizeY)) {
      throw new Error("incomplete AAIGRID header (cellsize/dx/dy)");
    }
    var ncols = Math.round(meta.ncols);
    var nrows = Math.round(meta.nrows);
    if (ncols < 1 || nrows < 1 || ncols > 512 || nrows > 512) {
      throw new Error("AAIGRID size out of bounds");
    }
    if (meta.cellsize <= 0 || meta.cellsize > 5 || meta.cellsizeY <= 0 || meta.cellsizeY > 5) {
      throw new Error("AAIGRID cellsize out of bounds");
    }
    var nodata = isFiniteNumber(meta.nodata) ? meta.nodata : -9999;
    var values = new Float64Array(ncols * nrows);
    var filled = 0;
    for (; i < lines.length && filled < values.length; i++) {
      var ln = lines[i].trim();
      if (!ln || ln.indexOf("--") === 0 || ln.indexOf("Content-") === 0) continue;
      var toks = ln.split(/\s+/);
      for (var t = 0; t < toks.length && filled < values.length; t++) {
        if (!toks[t]) continue;
        var v = Number(toks[t]);
        if (!Number.isFinite(v)) throw new Error("non-numeric AAIGRID cell");
        // Reject absurd magnitudes (wind m/s or degrees)
        if (Math.abs(v) > 1e6 && Math.abs(v - nodata) > 1e-6) {
          throw new Error("AAIGRID value out of range");
        }
        values[filled++] = v;
      }
    }
    if (filled !== values.length) throw new Error("AAIGRID cell count mismatch");
    return {
      ncols: ncols,
      nrows: nrows,
      xllcorner: meta.xllcorner,
      yllcorner: meta.yllcorner,
      cellsize: meta.cellsize,
      cellsizeY: meta.cellsizeY || meta.cellsize,
      nodata: nodata,
      values: values,
    };
  }

  /**
   * Meteorological FROM-direction (deg) + speed (m/s) → eastward u, northward v.
   */
  function speedDirToUV(speedMs, dirFromDeg) {
    if (!isFiniteNumber(speedMs) || !isFiniteNumber(dirFromDeg)) {
      return { u: NaN, v: NaN };
    }
    if (speedMs < 0 || speedMs > 150) return { u: NaN, v: NaN };
    // Normalize direction 0–360
    var d = ((dirFromDeg % 360) + 360) % 360;
    var rad = (d * Math.PI) / 180;
    return {
      u: -speedMs * Math.sin(rad),
      v: -speedMs * Math.cos(rad),
    };
  }

  /**
   * Build UV grid from matching speed + direction AAIGRID grids.
   */
  function buildUvGrid(speedGrid, dirGrid) {
    if (
      !speedGrid ||
      !dirGrid ||
      speedGrid.ncols !== dirGrid.ncols ||
      speedGrid.nrows !== dirGrid.nrows
    ) {
      throw new Error("speed/dir grid mismatch");
    }
    var n = speedGrid.ncols * speedGrid.nrows;
    var u = new Float64Array(n);
    var v = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var sp = speedGrid.values[i];
      var dr = dirGrid.values[i];
      if (
        !Number.isFinite(sp) ||
        !Number.isFinite(dr) ||
        Math.abs(sp - speedGrid.nodata) < 1e-6 ||
        Math.abs(dr - dirGrid.nodata) < 1e-6 ||
        sp < 0 ||
        sp > 150
      ) {
        u[i] = NaN;
        v[i] = NaN;
        continue;
      }
      var uv = speedDirToUV(sp, dr);
      u[i] = uv.u;
      v[i] = uv.v;
    }
    return {
      ncols: speedGrid.ncols,
      nrows: speedGrid.nrows,
      xllcorner: speedGrid.xllcorner,
      yllcorner: speedGrid.yllcorner,
      cellsize: speedGrid.cellsize,
      cellsizeY: speedGrid.cellsizeY || speedGrid.cellsize,
      u: u,
      v: v,
      time: null,
      referenceTime: null,
      source: "ECCC MSC GeoMet RDPS",
    };
  }

  /**
   * Bilinear sample of UV at lon/lat. Returns {u,v,speed} or null if outside/nodata.
   */
  function sampleUv(grid, lon, lat) {
    if (!grid || !isFiniteNumber(lon) || !isFiniteNumber(lat)) return null;
    var csY = isFiniteNumber(grid.cellsizeY) ? grid.cellsizeY : grid.cellsize;
    var x = (lon - grid.xllcorner) / grid.cellsize - 0.5;
    var yFromBottom = (lat - grid.yllcorner) / csY - 0.5;
    // rows are north→south: row 0 is northernmost
    var y = grid.nrows - 1 - yFromBottom;
    if (x < 0 || y < 0 || x > grid.ncols - 1 || y > grid.nrows - 1) return null;
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var x1 = Math.min(x0 + 1, grid.ncols - 1);
    var y1 = Math.min(y0 + 1, grid.nrows - 1);
    var tx = x - x0;
    var ty = y - y0;
    function at(c, r) {
      var idx = r * grid.ncols + c;
      return { u: grid.u[idx], v: grid.v[idx] };
    }
    var a = at(x0, y0);
    var b = at(x1, y0);
    var c = at(x0, y1);
    var d = at(x1, y1);
    if (
      !Number.isFinite(a.u) ||
      !Number.isFinite(b.u) ||
      !Number.isFinite(c.u) ||
      !Number.isFinite(d.u)
    ) {
      return null;
    }
    var u =
      a.u * (1 - tx) * (1 - ty) +
      b.u * tx * (1 - ty) +
      c.u * (1 - tx) * ty +
      d.u * tx * ty;
    var v =
      a.v * (1 - tx) * (1 - ty) +
      b.v * tx * (1 - ty) +
      c.v * (1 - tx) * ty +
      d.v * tx * ty;
    var speed = Math.sqrt(u * u + v * v);
    return { u: u, v: v, speed: speed };
  }

  /**
   * Expand ISO8601 time dimension "start/end/PT1H" into hourly ISO strings,
   * capped to [defaultTime, defaultTime+maxHours] when default provided.
   */
  function expandHourlyTimeRange(dimText, defaultTime, maxHours) {
    if (!dimText) return [];
    var s = String(dimText).trim();
    var def = validateIsoTime(defaultTime);
    var maxH = isFiniteNumber(maxHours) && maxHours > 0 ? Math.min(maxHours, 96) : 48;
    var out = [];
    if (s.indexOf("/") >= 0) {
      var bits = s.split("/");
      if (bits.length < 2) return [];
      var startMs = Date.parse(bits[0]);
      var endMs = Date.parse(bits[1]);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return [];
      var stepMs = 60 * 60 * 1000;
      if (bits[2]) {
        var sm = /^PT(\d+)H$/i.exec(bits[2]);
        if (sm) stepMs = parseInt(sm[1], 10) * 3600 * 1000;
      }
      var fromMs = def ? Date.parse(def) : startMs;
      if (!Number.isFinite(fromMs)) fromMs = startMs;
      var toMs = fromMs + maxH * 3600 * 1000;
      if (toMs > endMs) toMs = endMs;
      for (var t = fromMs; t <= toMs + 1; t += stepMs) {
        if (t < startMs) continue;
        var iso = new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
        if (validateIsoTime(iso)) out.push(iso);
      }
      return out;
    }
    // comma-separated list
    s.split(",").forEach(function (tok) {
      var v = validateIsoTime(tok.trim());
      if (v) out.push(v);
    });
    if (def && out.length) {
      var defMs = Date.parse(def);
      var lim = defMs + maxH * 3600 * 1000;
      out = out.filter(function (iso) {
        var ms = Date.parse(iso);
        return ms >= defMs - 1 && ms <= lim + 1;
      });
    }
    return out;
  }

  function parseTimeDimension(xmlText) {
    if (!xmlText) return { defaultTime: null, rangeText: null, referenceDefault: null };
    var xml = String(xmlText);
    var def = null;
    var range = null;
    var m = xml.match(
      /<Dimension\s+name="time"[^>]*\bdefault="([^"]+)"[^>]*>([^<]*)</i
    );
    if (m) {
      def = validateIsoTime(m[1]);
      range = m[2].trim();
    } else {
      var m2 = xml.match(/<Dimension\s+name="time"[^>]*>([^<]*)</i);
      if (m2) range = m2[1].trim();
      var m3 = xml.match(/<Dimension\s+name="time"[^>]*\bdefault="([^"]+)"/i);
      if (m3) def = validateIsoTime(m3[1]);
    }
    var refDef = null;
    var rm = xml.match(
      /<Dimension\s+name="reference_time"[^>]*\bdefault="([^"]+)"/i
    );
    if (rm) refDef = validateIsoTime(rm[1]);
    return { defaultTime: def, rangeText: range, referenceDefault: refDef };
  }

  function buildWcsAaigridUrl(coverageId, opts) {
    var west = opts.west;
    var east = opts.east;
    var south = opts.south;
    var north = opts.north;
    if (
      ![west, east, south, north].every(isFiniteNumber) ||
      west >= east ||
      south >= north ||
      west < -180 ||
      east > 180 ||
      south < -90 ||
      north > 90
    ) {
      throw new Error("invalid WCS bbox");
    }
    var size = Math.round(Number(opts.size) || 24);
    if (size < 8) size = 8;
    if (size > 48) size = 48;
    var q = new URLSearchParams();
    q.set("SERVICE", "WCS");
    q.set("VERSION", "2.0.1");
    q.set("REQUEST", "GetCoverage");
    q.set("COVERAGEID", coverageId);
    q.set("FORMAT", "image/x-aaigrid");
    q.set("SUBSETTINGCRS", "EPSG:4326");
    q.set("SUBSET", "long(" + west + "," + east + ")");
    // WCS needs two SUBSET params — append manually
    var base =
      ECCC_WCS +
      "?" +
      q.toString() +
      "&SUBSET=" +
      encodeURIComponent("lat(" + south + "," + north + ")") +
      "&SIZE=" +
      encodeURIComponent("long(" + size + ")") +
      "&SIZE=" +
      encodeURIComponent("lat(" + size + ")");
    var time = validateIsoTime(opts.time);
    if (time) base += "&TIME=" + encodeURIComponent(time);
    return base;
  }

  function bboxAroundCamp(lat, lon, radiusKm) {
    var r = isFiniteNumber(radiusKm) && radiusKm > 0 ? radiusKm : 180;
    var dLat = r / 111.32;
    var cos = Math.cos((lat * Math.PI) / 180);
    var dLon = r / (111.32 * Math.max(cos, 0.2));
    function round4(n) {
      return Math.round(n * 10000) / 10000;
    }
    return {
      west: round4(lon - dLon),
      east: round4(lon + dLon),
      south: round4(lat - dLat),
      north: round4(lat + dLat),
    };
  }

  async function fetchAaigrid(url) {
    var res = await fetch(url, { method: "GET", credentials: "omit" });
    if (!res.ok) throw new Error("WCS HTTP " + res.status);
    var text = await res.text();
    if (!text || text.indexOf("ncols") < 0) throw new Error("WCS not AAIGRID");
    return parseAaigrid(text);
  }

  /**
   * Fetch RDPS WindSpeed + WindDir AAIGRID around camp and build UV grid.
   */
  async function fetchRdpsUvGrid(opts) {
    var lat = opts.lat;
    var lon = opts.lon;
    if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) throw new Error("bad lat/lon");
    var box = bboxAroundCamp(lat, lon, opts.radiusKm);
    var time = validateIsoTime(opts.time);
    var size = opts.size || 28;
    var speedUrl = buildWcsAaigridUrl(COVERAGE_SPEED, {
      west: box.west,
      east: box.east,
      south: box.south,
      north: box.north,
      size: size,
      time: time,
    });
    var dirUrl = buildWcsAaigridUrl(COVERAGE_DIR, {
      west: box.west,
      east: box.east,
      south: box.south,
      north: box.north,
      size: size,
      time: time,
    });
    var pair = await Promise.all([fetchAaigrid(speedUrl), fetchAaigrid(dirUrl)]);
    var grid = buildUvGrid(pair[0], pair[1]);
    grid.time = time;
    grid.bbox = box;
    return grid;
  }

  function buildWindCapabilitiesUrl() {
    var q = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.3.0",
      REQUEST: "GetCapabilities",
      LAYER: COVERAGE_SPEED,
    });
    return ECCC_WCS + "?" + q.toString();
  }

  g.WIND_GRID = {
    ECCC_WCS: ECCC_WCS,
    COVERAGE_SPEED: COVERAGE_SPEED,
    COVERAGE_DIR: COVERAGE_DIR,
    parseAaigrid: parseAaigrid,
    speedDirToUV: speedDirToUV,
    buildUvGrid: buildUvGrid,
    sampleUv: sampleUv,
    expandHourlyTimeRange: expandHourlyTimeRange,
    parseTimeDimension: parseTimeDimension,
    validateIsoTime: validateIsoTime,
    buildWcsAaigridUrl: buildWcsAaigridUrl,
    bboxAroundCamp: bboxAroundCamp,
    fetchRdpsUvGrid: fetchRdpsUvGrid,
    buildWindCapabilitiesUrl: buildWindCapabilitiesUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);
