/**
 * Observed wind stations — ECCC SWOB realtime (OGC API Features).
 * See WIND-SOURCES.md. BCWS / ACIS / Open-Meteo free not used here.
 */
(function (g) {
  "use strict";

  var SWOB_ITEMS =
    "https://api.weather.gc.ca/collections/swob-realtime/items";
  var MAX_JSON_BYTES = 3 * 1024 * 1024;
  var MAX_STATIONS = 80;

  function isFiniteNumber(n) {
    return typeof n === "number" && Number.isFinite(n);
  }

  function prop(p, key) {
    if (!p) return null;
    if (Object.prototype.hasOwnProperty.call(p, key) && p[key] != null) return p[key];
    var alt = key + "-value";
    if (Object.prototype.hasOwnProperty.call(p, alt) && p[alt] != null) return p[alt];
    return null;
  }

  function validateStation(raw) {
    if (!raw || typeof raw !== "object") return null;
    var lat = Number(raw.lat);
    var lon = Number(raw.lon);
    if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    var spd = raw.speedKmh;
    var dir = raw.dirFromDeg;
    if (spd != null) {
      spd = Number(spd);
      if (!isFiniteNumber(spd) || spd < 0 || spd > 250) return null;
    }
    if (dir != null) {
      dir = Number(dir);
      if (!isFiniteNumber(dir) || dir < 0 || dir > 360) return null;
    }
    if (spd == null && dir == null) return null;
    var name = String(raw.name || "Station")
      .replace(/[<>&"'`]/g, "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 80);
    if (!name) name = "Station";
    var observedAt = raw.observedAt != null ? String(raw.observedAt).slice(0, 40) : null;
    return {
      name: name,
      lat: lat,
      lon: lon,
      speedKmh: spd != null ? spd : null,
      dirFromDeg: dir != null ? dir : null,
      observedAt: observedAt,
      source: "ECCC SWOB",
    };
  }

  /**
   * Parse SWOB FeatureCollection → deduped stations (latest per name).
   */
  function parseSwobFeatureCollection(fc) {
    if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
      throw new Error("invalid SWOB FeatureCollection");
    }
    var byName = Object.create(null);
    for (var i = 0; i < fc.features.length; i++) {
      var f = fc.features[i];
      if (!f || f.type !== "Feature") continue;
      var gtry = f.geometry;
      if (!gtry || gtry.type !== "Point" || !Array.isArray(gtry.coordinates)) continue;
      var lon = Number(gtry.coordinates[0]);
      var lat = Number(gtry.coordinates[1]);
      var p = f.properties || {};
      var name = prop(p, "stn_nam") || prop(p, "tc_id") || prop(p, "msc_id");
      var spd = prop(p, "avg_wnd_spd_10m_pst10mts");
      if (spd == null) spd = prop(p, "avg_wnd_spd_10m_pst2mts");
      var dir = prop(p, "avg_wnd_dir_10m_pst10mts");
      if (dir == null) dir = prop(p, "avg_wnd_dir_10m_pst2mts");
      var dt = prop(p, "date_tm") || prop(p, "obs_date_tm");
      var cand = validateStation({
        name: name,
        lat: lat,
        lon: lon,
        speedKmh: spd,
        dirFromDeg: dir,
        observedAt: dt,
      });
      if (!cand) continue;
      var key = cand.name.toLowerCase();
      var prev = byName[key];
      if (!prev || (cand.observedAt && (!prev.observedAt || cand.observedAt > prev.observedAt))) {
        byName[key] = cand;
      }
    }
    var list = [];
    for (var k in byName) {
      if (Object.prototype.hasOwnProperty.call(byName, k)) list.push(byName[k]);
    }
    list.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    if (list.length > MAX_STATIONS) list = list.slice(0, MAX_STATIONS);
    return list;
  }

  function buildSwobUrl(opts) {
    var west = opts.west;
    var east = opts.east;
    var south = opts.south;
    var north = opts.north;
    if (
      ![west, east, south, north].every(isFiniteNumber) ||
      west >= east ||
      south >= north
    ) {
      throw new Error("invalid SWOB bbox");
    }
    var limit = Math.round(Number(opts.limit) || 200);
    if (limit < 10) limit = 10;
    if (limit > 500) limit = 500;
    var q = new URLSearchParams();
    q.set("f", "json");
    q.set("limit", String(limit));
    q.set(
      "bbox",
      [west, south, east, north].map(function (n) {
        return String(Math.round(n * 10000) / 10000);
      }).join(",")
    );
    if (opts.datetime) {
      // Expected "start/end" ISO range — light validate
      var dt = String(opts.datetime);
      if (dt.length > 80 || dt.indexOf("/") < 0) throw new Error("bad datetime");
      q.set("datetime", dt);
    }
    return SWOB_ITEMS + "?" + q.toString();
  }

  async function fetchSwobStations(opts) {
    var url = buildSwobUrl(opts);
    var res = await fetch(url, { method: "GET", credentials: "omit" });
    if (!res.ok) throw new Error("SWOB HTTP " + res.status);
    var cl = res.headers && res.headers.get ? res.headers.get("content-length") : null;
    if (cl != null && Number(cl) > MAX_JSON_BYTES) throw new Error("SWOB too large");
    var text = await res.text();
    if (!text || text.length > MAX_JSON_BYTES) throw new Error("SWOB too large");
    var fc = JSON.parse(text);
    return parseSwobFeatureCollection(fc);
  }

  /** Compass label from meteorological FROM degrees. */
  function dirLabel(deg) {
    if (!isFiniteNumber(deg)) return "—";
    var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    var i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return dirs[i];
  }

  g.WIND_STATIONS = {
    SWOB_ITEMS: SWOB_ITEMS,
    MAX_STATIONS: MAX_STATIONS,
    prop: prop,
    validateStation: validateStation,
    parseSwobFeatureCollection: parseSwobFeatureCollection,
    buildSwobUrl: buildSwobUrl,
    fetchSwobStations: fetchSwobStations,
    dirLabel: dirLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);
