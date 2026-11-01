#!/usr/bin/env node
/**
 * Plain Node tests (no deps): computeWhzLevel edges + escapeHtml / safeRouteColor.
 * Run: node test/whz-escape.test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

// Load security helpers into a shared globalThis-like sandbox
const sandbox = { console, globalThis: null, URLSearchParams, Date, Math, String, Number, Array, Object, parseInt, isNaN };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "radar-security.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "plan-data.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "map-layers.js"), "utf8"), sandbox);

const { escapeHtml, safeRouteColor, computeWhzLevel, WILDFIRE_PLAN, validateCampCoords, sanitizeCampName, parseCampQueryParams, pickLiveExampleFire, parseStrictDecimal, statusColor, statusTextColor, MAP_LAYERS } = sandbox;

assert(typeof computeWhzLevel === "function", "computeWhzLevel exported");
assert(WILDFIRE_PLAN && WILDFIRE_PLAN.whzLevels.length === 4, "plan levels present");

// --- computeWhzLevel edges ---
const edges = [
  [0, "level3"],
  [25, "level3"],
  [25.0001, "level2"],
  [50, "level2"],
  [50.0001, "level1"],
  [100, "level1"],
  [100.0001, "alert"],
  [150, "alert"],
  [150.0001, null],
  [null, null],
  [Number.NaN, null],
];
for (const [d, expectId] of edges) {
  const r = computeWhzLevel(d, 150);
  const id = r.level ? r.level.id : null;
  assert(id === expectId, "WHZ dist=" + d + " → " + expectId + " (got " + id + ")");
}

// Alert label mentions 150 km monitor cap
const alert = WILDFIRE_PLAN.whzLevels.find((l) => l.id === "alert");
assert(alert && /150/.test(alert.rangeLabel), "Alert rangeLabel mentions 150 km cap: " + (alert && alert.rangeLabel));

// --- escapeHtml ---
assert(escapeHtml("<img>") === "&lt;img&gt;", "escape < >");
assert(escapeHtml('"x"') === "&quot;x&quot;", 'escape "');
assert(escapeHtml("it's") === "it&#39;s", "escape single quote");
assert(escapeHtml("a&b") === "a&amp;b", "escape &");

// --- safeRouteColor allowlist ---
assert(safeRouteColor("#15803d") === "#15803d", "allow WCAG green");
assert(safeRouteColor("#B45309") === "#b45309", "allow amber case-insensitive → canonical");
assert(safeRouteColor("#b91c1c") === "#b91c1c", "allow red");
assert(safeRouteColor("#2ee66d") === "#15803d", "legacy green maps to WCAG");
assert(safeRouteColor("#f5a524") === "#b45309", "legacy amber maps to WCAG");
assert(safeRouteColor("#ff4d4d") === "#b91c1c", "legacy red maps to WCAG");
assert(safeRouteColor("red") === "#4b5563", "reject named color");
assert(safeRouteColor("#000000") === "#4b5563", "reject non-allowlisted hex");
assert(safeRouteColor("expression(alert(1))") === "#4b5563", "reject css expression");


// --- camp URL param validation (SOC 2 B1 strict decimal) ---
assert(typeof validateCampCoords === "function", "validateCampCoords exported");
assert(typeof parseStrictDecimal === "function", "parseStrictDecimal exported");
assert(validateCampCoords(53.42, -117.5).ok === true, "valid Hinton coords");
assert(validateCampCoords(" 53.42 ", " -114.5 ").ok === true, "trimmed valid coords");
assert(validateCampCoords("53.42", "-114.5").ok === true, "allow -114.5 lon");
assert(validateCampCoords("91", "0").ok === false, "lat > 90 rejected");
assert(validateCampCoords("-91", "0").ok === false, "lat < -90 rejected");
assert(validateCampCoords("0", "181").ok === false, "lon > 180 rejected");
assert(validateCampCoords("0", "-181").ok === false, "lon < -180 rejected");
assert(validateCampCoords("abc", "1").ok === false, "non-numeric rejected");
assert(validateCampCoords(NaN, 0).ok === false, "NaN rejected");
// parseFloat footguns — must reject
assert(validateCampCoords("53abc", "-117.5").ok === false, "reject 53abc");
assert(validateCampCoords("53.42abc", "-117.5").ok === false, "reject 53.42abc");
assert(validateCampCoords("5e1", "-117.5").ok === false, "reject 5e1");
assert(validateCampCoords("1e3", "0").ok === false, "reject 1e3");
assert(validateCampCoords("0x10", "0").ok === false, "reject 0x10");
assert(validateCampCoords("53,42", "-117.5").ok === false, "reject 53,42");
assert(parseStrictDecimal("53abc") === null, "parseStrictDecimal null for 53abc");
assert(parseStrictDecimal(" 53.42 ") === 53.42, "parseStrictDecimal trims");

assert(sanitizeCampName('<script>x</script>') === "scriptx/script", "sanitize strips tags");
assert(sanitizeCampName('  a   b  ') === "a b", "sanitize collapses space");
assert(sanitizeCampName("", "Fallback") === "Fallback", "sanitize empty → fallback");
assert(sanitizeCampName("x".repeat(100)).length === 80, "sanitize max 80");

function fakeParams(obj) {
  return { get: (k) => (Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : null) };
}
const okQ = parseCampQueryParams(fakeParams({ lat: "52.1", lon: "-120.2", name: 'Demo <b>' }), "Camp");
assert(okQ.ok === true && okQ.lat === 52.1 && okQ.lon === -120.2, "parseCampQueryParams ok");
assert(okQ.name.indexOf("<") < 0, "parseCampQueryParams name sanitized");
assert(parseCampQueryParams(fakeParams({ lat: "1" })).ok === false, "parse requires lon");
assert(parseCampQueryParams(fakeParams({ lat: "99", lon: "1" })).ok === false, "parse rejects bad lat");

const picked = pickLiveExampleFire([
  { SOURCE: "AB", FIRE_STATUS: "Under Control", LATITUDE: 55, LONGITUDE: -110, FIRE_NUMBER: "A1" },
  { SOURCE: "BC", FIRE_STATUS: "Being Held", LATITUDE: 52, LONGITUDE: -120, FIRE_NUMBER: "B1" },
  { SOURCE: "BC", FIRE_STATUS: "Out of Control", LATITUDE: 51, LONGITUDE: -119, FIRE_NUMBER: "B2" },
]);
assert(picked && picked.FIRE_NUMBER === "B2", "pickLiveExampleFire prefers BC Out of Control");
assert(pickLiveExampleFire([]) === null, "pickLiveExampleFire empty → null");


// --- panel text contrast over dark Windy (rgba(255,255,255,0.88) on #000) ---
function relativeLuminance(hex) {
  const h = String(hex).replace("#", "");
  const toLin = (c) => {
    const s = parseInt(c, 16) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(h.slice(0, 2)), g = toLin(h.slice(2, 4)), b = toLin(h.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(fg, bg) {
  const L1 = relativeLuminance(fg), L2 = relativeLuminance(bg);
  const a = Math.max(L1, L2), b = Math.min(L1, L2);
  return (a + 0.05) / (b + 0.05);
}
function compositeWhiteOver(alpha, backHex) {
  const h = backHex.replace("#", "");
  const br = parseInt(h.slice(0, 2), 16), bg = parseInt(h.slice(2, 4), 16), bb = parseInt(h.slice(4, 6), 16);
  const r = Math.round(255 * alpha + br * (1 - alpha));
  const g = Math.round(255 * alpha + bg * (1 - alpha));
  const b = Math.round(255 * alpha + bb * (1 - alpha));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const PANEL_ALPHA = 0.88;
const panelOverBlack = compositeWhiteOver(PANEL_ALPHA, "#000000");
assert(contrastRatio("475569", panelOverBlack) >= 4.5, "muted #475569 ≥4.5:1 on 0.88 white/#000");
assert(contrastRatio("14532d", panelOverBlack) >= 4.5, "green-text #14532d ≥4.5:1 on 0.88 white/#000");
assert(contrastRatio("92400e", panelOverBlack) >= 4.5, "amber-text #92400e ≥4.5:1 on 0.88 white/#000");
assert(contrastRatio("142033", panelOverBlack) >= 4.5, "body text ≥4.5:1 on 0.88 white/#000");
assert(contrastRatio("5a6b7d", panelOverBlack) < 4.5, "old muted would fail (sanity)");

// --- status text vs graphic colours (fire list uses statusTextColor) ---
assert(typeof statusColor === "function" && typeof statusTextColor === "function", "statusColor/statusTextColor exported");
assert(statusColor("Being Held") === "#b45309", "graphic Being Held stays #b45309");
assert(statusTextColor("Being Held") === "#92400e", "text Being Held uses #92400e / amber-text");
assert(statusColor("Out of Control") === statusTextColor("Out of Control") && statusColor("Out of Control") === "#b91c1c", "OOC text=graphic #b91c1c");
assert(statusColor("Under Control") === statusTextColor("Under Control") && statusColor("Under Control") === "#1d4ed8", "UC text=graphic #1d4ed8");
assert(statusTextColor("Unknown") === "#4b5563", "text default");
const panelBlack2 = compositeWhiteOver(0.88, "#000000");
["Out of Control", "Being Held", "Under Control", "Other"].forEach((st) => {
  const fg = statusTextColor(st);
  const r = contrastRatio(fg, panelBlack2);
  assert(r >= 4.5, "statusTextColor(" + st + ") ≥4.5:1 on 0.88/#000 (got " + r.toFixed(2) + ")");
});
assert(contrastRatio("#b45309", panelBlack2) < 4.5, "graphic Held #b45309 would fail as panel text (sanity)");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(indexHtml.includes("statusTextColor(f.FIRE_STATUS)"), "fire list uses statusTextColor");
assert(indexHtml.indexOf("statusColor(f.FIRE_STATUS)") === indexHtml.lastIndexOf("statusColor(f.FIRE_STATUS)"), "statusColor only used once (radar markers)");
assert(/const col = statusColor\(f\.FIRE_STATUS\)/.test(indexHtml), "radar markers still use statusColor");


// --- map-layers URL builders (ECCC + GIBS) ---
assert(MAP_LAYERS && typeof MAP_LAYERS.buildEcccWindSpeedUrl === "function", "MAP_LAYERS exported");
assert(MAP_LAYERS.ECCC_WMS === "https://geo.weather.gc.ca/geomet", "ECCC endpoint");
assert(MAP_LAYERS.GIBS_WMS.indexOf("gibs.earthdata.nasa.gov") >= 0, "GIBS endpoint");
assert(MAP_LAYERS.LAYERS.ecccWindSpeed === "HRDPS-WEonG_2.5km_WindSpeed", "wind speed layer id");
assert(MAP_LAYERS.LAYERS.ecccWindDir === "HRDPS-WEonG_2.5km_WindDir", "wind dir layer id");
assert(MAP_LAYERS.LAYERS.gibsBase === "MODIS_Terra_CorrectedReflectance_TrueColor", "GIBS base layer");
assert(MAP_LAYERS.LAYERS.gibsSmoke === "OMPS_Aerosol_Index", "GIBS smoke layer");
assert(MAP_LAYERS.MAP_REFRESH_MS === 30 * 60 * 1000, "30 min map refresh");
const bbox = MAP_LAYERS.bbox3857Around(53.42, -117.5, 160);
assert(Array.isArray(bbox) && bbox.length === 4 && bbox[0] < bbox[2] && bbox[1] < bbox[3], "bbox3857 ordered");
const windUrl = MAP_LAYERS.buildEcccWindSpeedUrl({ lat: 53.42, lon: -117.5, width: 800, height: 800, time: "2026-11-01T01:00:00Z" });
assert(windUrl.startsWith("https://geo.weather.gc.ca/geomet?"), "wind URL host");
assert(windUrl.indexOf("LAYERS=HRDPS-WEonG_2.5km_WindSpeed") >= 0, "wind URL layer");
assert(windUrl.indexOf("STYLES=WINDSPEEDKMH") >= 0, "wind URL style");
assert(windUrl.indexOf("CRS=EPSG%3A3857") >= 0 || windUrl.indexOf("CRS=EPSG:3857") >= 0, "wind URL CRS");
assert(windUrl.indexOf("TIME=2026-11-01T01%3A00%3A00Z") >= 0 || windUrl.indexOf("TIME=2026-11-01T01:00:00Z") >= 0, "wind URL time");
assert(windUrl.indexOf("embed.windy.com") < 0, "no windy in wind URL");
const dirUrl = MAP_LAYERS.buildEcccWindDirUrl({ lat: 53.42, lon: -117.5, width: 512, height: 512, time: "2026-11-01T01:00:00Z" });
assert(dirUrl.indexOf("HRDPS-WEonG_2.5km_WindDir") >= 0 && dirUrl.indexOf("WDIR6") >= 0, "wind dir URL");
const gibsDay = MAP_LAYERS.gibsDateUTC(new Date(Date.UTC(2026, 10, 1))); // Nov 1 → Oct 31
assert(gibsDay === "2026-10-31", "gibsDateUTC yesterday got " + gibsDay);
const baseUrl = MAP_LAYERS.buildGibsBaseUrl({ lat: 53.42, lon: -117.5, width: 640, height: 640, time: "2026-10-31" });
assert(baseUrl.indexOf("gibs.earthdata.nasa.gov") >= 0, "base URL host");
assert(baseUrl.indexOf("MODIS_Terra_CorrectedReflectance_TrueColor") >= 0, "base layer in URL");
assert(baseUrl.indexOf("TIME=2026-10-31") >= 0, "base TIME");
const smokeUrl = MAP_LAYERS.buildGibsSmokeUrl({ lat: 53.42, lon: -117.5, width: 640, height: 640, time: "2026-10-31" });
assert(smokeUrl.indexOf("OMPS_Aerosol_Index") >= 0, "smoke layer in URL");
const capUrl = MAP_LAYERS.buildEcccCapabilitiesUrl();
assert(capUrl.indexOf("GetCapabilities") >= 0 && capUrl.indexOf("HRDPS-WEonG_2.5km_WindSpeed") >= 0, "capabilities URL");
const parsed = MAP_LAYERS.parseEcccDefaultTime('<Dimension name="time" units="ISO8601" default="2026-11-01T01:00:00Z" nearestValue="0">x</Dimension>');
assert(parsed === "2026-11-01T01:00:00Z", "parseEcccDefaultTime");
const indexHtmlMap = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(indexHtmlMap.indexOf("embed.windy.com") < 0, "index has no windy embed host");
assert(indexHtmlMap.indexOf("frame-src 'none'") >= 0 || indexHtmlMap.indexOf('frame-src \'none\'') >= 0, "CSP frame-src none");
assert(indexHtmlMap.indexOf("geo.weather.gc.ca") >= 0 && indexHtmlMap.indexOf("gibs.earthdata.nasa.gov") >= 0, "CSP/map hosts present");
assert(indexHtmlMap.indexOf("statusTextColor(f.FIRE_STATUS)") >= 0, "fire list still statusTextColor");
assert(indexHtmlMap.indexOf("Data Source: Environment and Climate Change Canada") >= 0, "ECCC attribution");
assert(indexHtmlMap.toLowerCase().indexOf("not endorsed by nasa") >= 0, "NASA non-endorsement");

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll tests passed.");
