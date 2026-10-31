/**
 * Shared XSS/CSS helpers for Wildfire Radar (browser + Node tests).
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

  /** Allowlisted route swatch colours only (SOC 2 N1). */
  var ROUTE_COLOR_ALLOWLIST = ["#2ee66d", "#f5a524", "#ff4d4d"];

  function safeRouteColor(color, fallback) {
    var fb = fallback == null ? "#8a9bb0" : fallback;
    var raw = String(color || "").trim().toLowerCase();
    for (var i = 0; i < ROUTE_COLOR_ALLOWLIST.length; i++) {
      if (ROUTE_COLOR_ALLOWLIST[i].toLowerCase() === raw) {
        return ROUTE_COLOR_ALLOWLIST[i];
      }
    }
    return fb;
  }

  g.escapeHtml = escapeHtml;
  g.safeRouteColor = safeRouteColor;
  g.ROUTE_COLOR_ALLOWLIST = ROUTE_COLOR_ALLOWLIST;
})(typeof window !== "undefined" ? window : globalThis);
