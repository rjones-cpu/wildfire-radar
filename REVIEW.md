# Review summary — Wildfire Preparedness add-on (local prototype)

**For:** SOC 2 Type 2 agent (`09c48fca`) and Smart Lodge QA (`689bf595`)  
**Date:** 2026-10-31  
**Scope:** Local files under `/workspace/wildfire-radar` only. **Not pushed. Not deployed.** No touch of staging1, camp-reservations staging, or campinspectors.

## Files changed / added

| Path | Change |
|------|--------|
| `index.html` | Dual AB+BC feeds; WHZ UI; plan tabs; **Windy free embed** wind background behind radar; Contacts shows ICS **response-chart** role duties |
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
- **No Windy Map Forecast API key** required or used.

## Plan / gaps (current)

- WHZ thresholds match site chart: Alert ≥100 km (within 150), L1 50–100, L2 25–50, L3 ≤25.
- ICS **WILDFIRE RESPONSE CHART** role duties surfaced in Contacts (verbatim). Gap note: **named people/phones blank; role duty text exists**.
- Still flagged as-is: alternate meeting points TBD; CO recommended-actions table not extractable; laydown plot “needs stars…”; blank Forestry/ECC phones; no camp lat/lon (Cold Lake placeholder).

## Security notes (for SOC 2)

1. **No secrets** — no API keys, tokens, credentials, or `.env` files.
2. **Read-only public feeds** — browser GET to AB FeatureServer + BCWS ActiveFires PublicView only. No writes.
3. **No user input sent anywhere** — camp lat/lon used only in-browser for haversine / Windy recenter.
4. **No PII collection** — plan contacts are role titles/duties from the site document; blanks shown as gaps.
5. **No production hosting / no push** until SOC 2 + Smart Lodge QA pass the same SHA.
6. **XSS hygiene** — plan and feed strings rendered via `escapeHtml`.
7. **Prototype authority boundary** — UI does not auto-evacuate.

## QA notes (for Smart Lodge QA)

- Live mode: both feeds respond; WHZ clear when no fire ≤150 km of pin.
- `?test=1`: WHZ math (e.g. ~25.6 km → Level 2).
- Contacts tab lists response-chart ICS roles without invented phones.
- Screenshots under `screenshots/` for visual review.

## Request

Please review this commit/folder locally. Approve only if acceptable; **do not push** until both SOC 2 and Smart Lodge QA pass the same SHA.
