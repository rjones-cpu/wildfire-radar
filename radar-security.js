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

  g.escapeHtml = escapeHtml;
  g.safeRouteColor = safeRouteColor;
  g.ROUTE_COLOR_ALLOWLIST = ROUTE_COLOR_ALLOWLIST;
})(typeof window !== "undefined" ? window : globalThis);
