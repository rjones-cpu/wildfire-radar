# Review summary — Wildfire Preparedness add-on (local prototype)

**For:** SOC 2 Type 2 agent (`09c48fca`) and Smart Lodge QA (`689bf595`)  
**Date:** 2026-10-31  
**Scope:** Local files under `/workspace/wildfire-radar` only. **Not pushed. Not deployed.** No touch of staging1, camp-reservations staging, or campinspectors.

## Files changed / added

| Path | Change |
|------|--------|
| `index.html` | Dual AB+BC feeds; WHZ UI; plan tabs; Windy embed (`sandbox=allow-scripts`); CSP meta; Contacts ICS response chart |
| `radar-security.js` | `escapeHtml` (incl. `'`) + route colour hex allowlist |
| `test/whz-escape.test.js` | Plain Node tests for WHZ edges + escape/allowlist |
| `plan-data.js` | Plan knowledge + `computeWhzLevel` + **responseChartRoles** (verbatim docx) + reworded gaps |
| `DESIGN.md` | Nine agent functions (dual feed + Windy) |
| `REVIEW.md` | This summary |
| `HANDOFF.md` | Merged briefs; Ralph dual-feed decision |
| `README.md` | Preparedness module + BC feed + run notes |
| `screenshots/` | Local verification captures (incl. baseline, Windy before/after, 13+) |

## Dual feed (Ralph decision — 2026-10-31)

- **Product intent:** radar uses **both** Alberta and British Columbia public active-fire feeds (not Alberta-only).
- Alberta: `geospatial.alberta.ca` mimas FeatureServer/0 (do **not** use tokenized `Active_Wildfires_Prod_View2`).
- BC: BCWS `BCWS_ActiveFires_PublicView` FeatureServer/0; filter `FIRE_STATUS <> 'Out'`.
- Each fire tagged `SOURCE: AB|BC`; nearest of either province within 150 km drives WHZ.
- `Promise.allSettled`: one feed failing does not clear the other.

## Windy wind background

- Free `embed.windy.com/embed2.html` with `overlay=wind`, centered on camp pin; canvas rings/fires remain on top (`pointer-events: none` on iframe).
- iframe `sandbox="allow-scripts"` only (**no** `allow-same-origin`).
- **No Windy Map Forecast API key** required or used.
- **Third-party console noise:** Windy’s embed may log CORS / cross-origin warnings in the browser console for its own tile or analytics subrequests. That is third-party noise, not an app connect-src violation for our AB/BC feeds; do not treat it as a LodgeX feed failure.

## Plan / gaps (current)

- WHZ thresholds match site chart: Alert ≥100 km (within 150), L1 50–100, L2 25–50, L3 ≤25.
- ICS **WILDFIRE RESPONSE CHART** role duties surfaced in Contacts (verbatim). Gap note: **named people/phones blank; role duty text exists**.
- Still flagged as-is: alternate meeting points TBD; CO recommended-actions table not extractable; laydown plot “needs stars…”; blank Forestry/ECC phones; no camp lat/lon (TEST pin just outside Hinton 53.42, −117.50 — not a real camp).

## Security notes (for SOC 2)

1. **No secrets** — no API keys, tokens, credentials, or `.env` files.
2. **Read-only public feeds** — browser GET to AB FeatureServer + BCWS ActiveFires PublicView only. No writes.
3. **No user input sent anywhere** — camp lat/lon used only in-browser for haversine / Windy recenter.
4. **No PII collection** — plan contacts are role titles/duties from the site document; blanks shown as gaps.
5. **No production hosting / no push** until SOC 2 + Smart Lodge QA pass the same SHA.
6. **XSS hygiene** — plan and feed strings rendered via `escapeHtml` (escapes `& < > " '`); route swatch colours go through a hex **allowlist** (`safeRouteColor`).
7. **CSP** — meta CSP with `connect-src` limited to AB + BC FeatureServer hosts and `frame-src https://embed.windy.com`.
8. **Prototype authority boundary** — UI does not auto-evacuate.

## QA notes (for Smart Lodge QA)

- Live mode: both feeds respond; WHZ clear when no fire ≤150 km of pin (Hinton TEST pin).
- `?test=1`: WHZ math (nearest sample → Level 2 near ~26 km).
- Alert label: **100 to 150 km (monitor radius)** — aligned with 150 km app cap.
- Contacts tab lists response-chart ICS roles without invented phones.
- Unit check: `node test/whz-escape.test.js` (no deps) covers `computeWhzLevel` edges + `escapeHtml` / allowlist.
- Screenshots under `screenshots/` for visual review.

## Request

Please review this commit/folder locally. Approve only if acceptable; **do not push** until both SOC 2 and Smart Lodge QA pass the same SHA.
