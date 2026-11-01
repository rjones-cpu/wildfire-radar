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
const sandbox = { console, globalThis: null };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "radar-security.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "plan-data.js"), "utf8"), sandbox);

const { escapeHtml, safeRouteColor, computeWhzLevel, WILDFIRE_PLAN, validateCampCoords, sanitizeCampName, parseCampQueryParams, pickLiveExampleFire } = sandbox;

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


// --- camp URL param validation ---
assert(typeof validateCampCoords === "function", "validateCampCoords exported");
assert(validateCampCoords(53.42, -117.5).ok === true, "valid Hinton coords");
assert(validateCampCoords("91", "0").ok === false, "lat > 90 rejected");
assert(validateCampCoords("-91", "0").ok === false, "lat < -90 rejected");
assert(validateCampCoords("0", "181").ok === false, "lon > 180 rejected");
assert(validateCampCoords("0", "-181").ok === false, "lon < -180 rejected");
assert(validateCampCoords("abc", "1").ok === false, "non-numeric rejected");
assert(validateCampCoords(NaN, 0).ok === false, "NaN rejected");

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

if (failed) {
  console.error("\n" + failed + " failure(s)");
  process.exit(1);
}
console.log("\nAll tests passed.");
