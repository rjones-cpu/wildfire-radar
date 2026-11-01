/**
 * Background map URL builders — ECCC MSC GeoMet WMS + NASA GIBS WMS.
 * Licence notes (see DESIGN.md / README):
 * - ECCC GeoMet: commercial use allowed; attribution "Data Source: Environment and Climate Change Canada";
 *   no bulk tile scraping; contact if ≥86,400 req/day.
 * - NASA GIBS: required acknowledgment; no NASA endorsement implied.
 */
(function (g) {
  "use strict";

  var ECCC_WMS = "https://geo.weather.gc.ca/geomet";
  var GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";

  /** Verified layer ids (GetCapabilities / GetMap probed 2026-10-31). */
  var LAYERS = {
    ecccWindSpeed: "HRDPS-WEonG_2.5km_WindSpeed",
    ecccWindDir: "HRDPS-WEonG_2.5km_WindDir",
    ecccWindSpeedStyle: "WINDSPEEDKMH",
    ecccWindDirStyle: "WDIR6",
    gibsBase: "MODIS_Terra_CorrectedReflectance_TrueColor",
    gibsSmoke: "OMPS_Aerosol_Index",
  };

  /** Map half-extent ≈ radar 150 km + padding so rings fit. */
  var DEFAULT_RADIUS_KM = 160;

  /** Light refresh — well under ECCC 86,400/day policy. */
  var MAP_REFRESH_MS = 30 * 60 * 1000;

  function webMercator(lonDeg, latDeg) {
    var x = (lonDeg * 20037508.342789244) / 180;
    var lat = Math.max(Math.min(latDeg, 85.05112878), -85.05112878);
    var y =
      (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 20037508.342789244) /
      Math.PI;
    return { x: x, y: y };
  }

  /**
   * EPSG:3857 BBOX [minX,minY,maxX,maxY] for a square approx. around camp.
   */
  function bbox3857Around(lat, lon, radiusKm) {
    var r = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : DEFAULT_RADIUS_KM;
    var dLat = r / 111.32;
    var cos = Math.cos((lat * Math.PI) / 180);
    var dLon = r / (111.32 * Math.max(cos, 0.2));
    var sw = webMercator(lon - dLon, lat - dLat);
    var ne = webMercator(lon + dLon, lat + dLat);
    return [sw.x, sw.y, ne.x, ne.y];
  }

  function clampMapSize(n) {
    var v = Math.round(Number(n) || 800);
    if (v < 256) v = 256;
    if (v > 1280) v = 1280;
    return v;
  }

  /**
   * Prefer yesterday UTC for GIBS daily products (today often incomplete).
   */
  function gibsDateUTC(now) {
    var d = now ? new Date(now) : new Date();
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - 1);
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth() + 1).padStart(2, "0");
    var day = String(d.getUTCDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function buildWmsGetMapUrl(endpoint, opts) {
    var q = new URLSearchParams();
    q.set("SERVICE", "WMS");
    q.set("VERSION", "1.3.0");
    q.set("REQUEST", "GetMap");
    q.set("LAYERS", opts.layers);
    q.set("STYLES", opts.styles != null ? opts.styles : "");
    q.set("CRS", "EPSG:3857");
    q.set("BBOX", opts.bbox.join(","));
    q.set("WIDTH", String(clampMapSize(opts.width)));
    q.set("HEIGHT", String(clampMapSize(opts.height)));
    q.set("FORMAT", opts.format || "image/png");
    if (opts.transparent !== false) q.set("TRANSPARENT", "TRUE");
    if (opts.time) q.set("TIME", opts.time);
    return endpoint + "?" + q.toString();
  }

  function buildEcccWindSpeedUrl(opts) {
    return buildWmsGetMapUrl(ECCC_WMS, {
      layers: LAYERS.ecccWindSpeed,
      styles: LAYERS.ecccWindSpeedStyle,
      bbox: opts.bbox || bbox3857Around(opts.lat, opts.lon, opts.radiusKm),
      width: opts.width,
      height: opts.height,
      time: opts.time,
      transparent: true,
    });
  }

  function buildEcccWindDirUrl(opts) {
    return buildWmsGetMapUrl(ECCC_WMS, {
      layers: LAYERS.ecccWindDir,
      styles: LAYERS.ecccWindDirStyle,
      bbox: opts.bbox || bbox3857Around(opts.lat, opts.lon, opts.radiusKm),
      width: opts.width,
      height: opts.height,
      time: opts.time,
      transparent: true,
    });
  }

  function buildGibsBaseUrl(opts) {
    return buildWmsGetMapUrl(GIBS_WMS, {
      layers: LAYERS.gibsBase,
      styles: "",
      bbox: opts.bbox || bbox3857Around(opts.lat, opts.lon, opts.radiusKm),
      width: opts.width,
      height: opts.height,
      time: opts.time || gibsDateUTC(),
      transparent: false,
      format: "image/jpeg",
    });
  }

  function buildGibsSmokeUrl(opts) {
    return buildWmsGetMapUrl(GIBS_WMS, {
      layers: LAYERS.gibsSmoke,
      styles: "",
      bbox: opts.bbox || bbox3857Around(opts.lat, opts.lon, opts.radiusKm),
      width: opts.width,
      height: opts.height,
      time: opts.time || gibsDateUTC(),
      transparent: true,
    });
  }

  function buildEcccCapabilitiesUrl(layer) {
    var q = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.3.0",
      REQUEST: "GetCapabilities",
      LAYER: layer || LAYERS.ecccWindSpeed,
    });
    return ECCC_WMS + "?" + q.toString();
  }

  /** Parse default TIME from a filtered GeoMet GetCapabilities XML string. */
  function parseEcccDefaultTime(xmlText) {
    if (!xmlText) return null;
    var m = String(xmlText).match(
      /<Dimension\s+name="time"[^>]*\bdefault="([^"]+)"/i
    );
    return m ? m[1] : null;
  }

  g.MAP_LAYERS = {
    ECCC_WMS: ECCC_WMS,
    GIBS_WMS: GIBS_WMS,
    LAYERS: LAYERS,
    DEFAULT_RADIUS_KM: DEFAULT_RADIUS_KM,
    MAP_REFRESH_MS: MAP_REFRESH_MS,
    webMercator: webMercator,
    bbox3857Around: bbox3857Around,
    clampMapSize: clampMapSize,
    gibsDateUTC: gibsDateUTC,
    buildWmsGetMapUrl: buildWmsGetMapUrl,
    buildEcccWindSpeedUrl: buildEcccWindSpeedUrl,
    buildEcccWindDirUrl: buildEcccWindDirUrl,
    buildGibsBaseUrl: buildGibsBaseUrl,
    buildGibsSmokeUrl: buildGibsSmokeUrl,
    buildEcccCapabilitiesUrl: buildEcccCapabilitiesUrl,
    parseEcccDefaultTime: parseEcccDefaultTime,
  };
})(typeof window !== "undefined" ? window : globalThis);
