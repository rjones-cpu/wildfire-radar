# Wildfire Preparedness module — agent design (9 functions)

Add-on for LodgeX **Smart Lodge** and **CrewSight (Major Projects)**. Prototype lives in `/workspace/wildfire-radar` (static HTML). Embeds the NGTL DVN/Karr site-specific wildfire plan into the Wildfire Radar UI and computes the active Wildfire Hazard Zone (WHZ) from the nearest active-fire distance (**Alberta + British Columbia** public feeds).

## 1. Role and goal

**Role:** Site wildfire preparedness co-pilot for camp / project operations (lodge ops and major-projects crews).

**Goal:** Given a camp pin and live AB + BC active-wildfire feeds, surface the **WHZ level** (from the site plan distance chart) on the radar so humans can see hazard proximity faster — without inventing plan content or issuing an evacuation order (that remains the TCE Incident Commander). Full plan actions / routes / contacts are kept in `plan-data.js` but are **not** shown in the current UI (camp-location widget and site-plan panel removed per Ralph, 2026-10-31).

## 2. Knowledge

- Site plan extract in `plan-data.js` (from `site-specific-plan.docx` / `.pptx`): WHZ distance chart, muster (Road 24 laydown), green/yellow/red routes, evacuation roles, **WILDFIRE RESPONSE CHART ICS role duties (verbatim)**, AQ visibility table, resource list, documented gaps.
- Live knowledge: Alberta Wildfire FeatureServer layer 0 + BCWS `BCWS_ActiveFires_PublicView` FeatureServer/0 (fire number/label, status, size ha, lat/lon).
- Explicit non-knowledge: blank forestry phone fields, missing ECC/EOC numbers, blank response-team **names/phones** (duty text exists), plot-plan coordinates, alternate meeting points TBD, CO actions table — listed under Plan gaps, never fabricated.
- Wind / smoke context: full-page background from **ECCC MSC GeoMet WMS** (HRDPS wind speed + direction) and **NASA GIBS** (MODIS true-colour base + OMPS aerosol index smoke overlay), centred on the camp pin (~160 km extent).

## 3. Tools

| Tool | Use |
|------|-----|
| Alberta Wildfire FeatureServer query (GeoJSON) | Read-only fetch of active AB fires (`geospatial.alberta.ca` mimas; **not** the tokenized ArcGIS Prod View2 mirror) |
| BCWS ActiveFires PublicView query (GeoJSON) | Read-only fetch of active BC fires (`FIRE_STATUS <> 'Out'`) |
| Haversine + bearing | Distance/bearing from camp pin to each fire |
| `computeWhzLevel(nearestKm)` | Map distance → Alert / L1 / L2 / L3 per plan chart |
| ECCC MSC GeoMet WMS (`geo.weather.gc.ca/geomet`) | HRDPS-WEonG wind speed + WindDir GetMap images; recenters with camp |
| NASA GIBS WMS (`gibs.earthdata.nasa.gov`) | MODIS Terra corrected reflectance basemap + OMPS aerosol index smoke overlay |
| Local UI panels | WHZ banner, fires-within-150 km list, radar; plan detail panels removed from UI |
| `?test=1` | Offline sample fires for demos/tests (not live feeds) |

No write tools, no SMS/email send. Map imagery: ECCC GeoMet + NASA GIBS only (no third-party wind embed). Light map refresh (30 min) to respect ECCC usage policy (no bulk scraping; contact if ≥86,400 req/day).

## 4. Reasoning and planning

1. Fetch (or load test) active fires from **both** AB and BC → filter to ≤150 km of camp.
2. Sort by distance; nearest fire of either province drives WHZ.
3. Thresholds from plan: ≤25 km → Level 3; ≤50 → Level 2; ≤100 → Level 1; ≤150 → Alert; else clear.
4. Present that level on the **WHZ banner** (name + range + nearest-fire reason). Plan action lists / routes / contacts are not rendered in the current UI.
5. Do not choose which coloured route to take — plan assigns route communication to the Incident Commander (still true when a plan panel is restored).

**Feed decision (Ralph, 2026-10-31):** radar uses **both** BC and Alberta feeds (product intent).

## 5. Memory

- **Session only:** camp name/lat/lon in memory (from default / URL / radar click / `?example=1`); last fetch result; hover highlight. No camp-location form on the page.
- **No persistent PII store;** no cookies of guest data; refresh reloads feeds.
- Plan content is static ship-with-app knowledge (`plan-data.js`), versioned with the repo.

## 6. Guardrails

- Never invent plan actions, phone numbers, or muster coordinates.
- Never touch live staging1 (`reservations1.lodgex.ca`), camp-reservations staging branch, or campinspectors.
- Fire data origins: Alberta mimas FeatureServer/0 + BCWS ActiveFires PublicView only.
- No secrets, API keys, or auth headers (ECCC GeoMet + GIBS are public WMS).
- No user content posted to any server; camp coordinates stay in the browser.
- Prototype badge; not an automatic evacuation authority.
- WHZ Level 2 source cell text “25 km 50 km” documented as 25–50 km from chart order — not silently altered beyond that clarification.
- Response-chart titles kept verbatim (including source wording such as “PUBLIC PROTECTION BRAND DIRECTOR”).

## 7. Escalation

| Condition | Escalation |
|-----------|------------|
| WHZ Level 1+ | Surface Contact ECC / Calgary EOC and ESRD actions from plan |
| WHZ Level 2–3 | Emphasize evacuation / shutdown actions from plan; human IC decides |
| One feed fetch failure | `Promise.allSettled`: keep the other feed; retain prior good data for the failed source |
| Plan gap (missing phone) | Gaps remain flagged in `plan-data.js` / DESIGN — **no Plan gaps panel in UI** after 2026-10-31 removal; operator uses on-site posted numbers |
| Push/deploy request | Block until SOC 2 Type 2 (`09c48fca`) and Smart Lodge QA (`689bf595`) pass same commit |

## 8. Communication

- UI: WHZ banner (live), fires list + refresh, radar; **no** camp-location widget and **no** site wildfire plan panel.
- Radar rings at 25 / 50 / 100 / 150 km aligned to WHZ chart + monitor radius; ECCC/GIBS map under semi-transparent overlays; wind/smoke toggles + timestamp.
- Footer cites AB + BC fire feeds; **Data Source: Environment and Climate Change Canada**; NASA GIBS acknowledgment (no NASA endorsement).
- Human-readable MT timestamps (`America/Edmonton`).
- Agent-to-agent: status + screenshot paths reported for Ralph’s review; no production blast.

## 9. Testing and feedback

- Local static server + Playwright/Chromium screenshots (`screenshots/`).
- `?test=1` verifies WHZ math with known distances (sample AB + BC fires around placeholder pin).
- Live mode verifies both FeatureServers load and list/radar update.
- `window.__radar.getState()` exposes camp, near fires, and computed WHZ for automation.
- Feedback loop: update `plan-data.js` only from a revised site plan document; record new gaps rather than filling them.
