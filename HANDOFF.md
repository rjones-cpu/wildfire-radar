# Wildfire Radar — Handoff

**Date:** 2026-10-31 (America/Vancouver)  
**Scope:** Local prototype under `/workspace/wildfire-radar` only. **Do not commit/push** without SOC 2 Type 2 + Smart Lodge QA on the same SHA. Do not touch staging1 / `reservations1.lodgex.ca`, camp-reservations, campinspectors, or production hosting.

---

## 1. Ralph’s original ask (Chief of Staff brief)

- Animated **radar** pinned on a **camp**, showing **active Alberta wildfires** within about **150 km** (early sketch started at 50 km; product settled on **150 km**).
- **Browser-only** fetch — **no backend**. Public Alberta FeatureServer GeoJSON from:
  - `https://geospatial.alberta.ca/mimas/rest/services/wildfire/alberta_fire_status_by_category_group/FeatureServer/0`
- **Do not** use the `services.arcgis.com` `Active_Wildfires_Prod_View2` mirror (needs a token).
- Placeholder camp pin: **TEST location just outside Hinton, AB** `53.42, -117.50` (not a real LodgeX camp; real coords still a plan gap).
- Live GitHub Pages: `https://rjones-cpu.github.io/wildfire-radar/` · repo `rjones-cpu/wildfire-radar`.
- Intended module for **Smart Lodge** and **CrewSight (Major Projects)**.

---

## 2. EcoSystem Team additions

- **BC Wildfire Service** public active-fire feed:
  - `BCWS_ActiveFires_PublicView` FeatureServer/0 on `services6.arcgis.com/ubm4tcTYICKBpist`
  - Filter: `FIRE_STATUS <> 'Out'`; CORS `Access-Control-Allow-Origin: *`
- Embedded **site-specific wildfire plan** (NGTL Expansion DVN Spread / NGTL KARR Project, document label “XX 2021”) from `/workspace/wildfire-preparedness/site-specific-plan.docx` (+ pptx context only):
  - WHZ distance triggers, Road 24 / Canfor 2000 Rd laydown muster, Green / Yellow / Red evacuation routes, roles, AQ visibility table, resource list, explicit **gaps** (never invent missing phones or pins).

---

## 3. Feed decision (Ralph — 2026-10-31)

**Ralph decided the radar uses BOTH British Columbia and Alberta public active-fire feeds.**  
Nearest fire of either province within 150 km drives WHZ. This is product intent, not an unresolved conflict with the earlier Alberta-only sketch. Keep AB mimas FeatureServer/0; do not switch AB to the tokenized ArcGIS Prod View2 mirror.

---

## 4. WHZ thresholds (site plan chart)

| Level | Plan wording | App rule (`computeWhzLevel`) |
|-------|----------------|------------------------------|
| Level 3 | 25 km or less | `nearestKm <= 25` |
| Level 2 | “25 km 50 km” (chart order → 25–50 km) | `> 25` and `<= 50` |
| Level 1 | 50 to 100 km | `> 50` and `<= 100` |
| Alert | 100 km or greater | `> 100` and `<= 150` monitor radius |
| Clear | beyond monitor / no fire | `> 150` or no fire in range |

Authority boundary: UI surfaces plan actions; **evacuation order remains with TCE Incident Commander**.

---

## 5. Known plan gaps (still missing in source docs)

- Response-team **named people / phones** (form blanks / TBD).
- Forestry Field Center & Industry Liaison **phone fields blank**.
- TCE ECC / Calgary EOC **numbers not listed** (plan says to post them).
- Alternate meeting points **TBD by ICs**.
- **No camp lat/lon** in plan — default pin is a TEST location just outside Hinton (`53.42, -117.50`), not a real camp.
- Laydown plot plan note: needs muster stars (no map pins in text).
- CO “recommended actions” table after the CO note not present as extractable text (AQ response table *is* present).

---

## 6. Windy wind background (2026-10-31)

- Free **Windy embed** (`embed.windy.com/embed2.html`, `overlay=wind`) behind a semi-transparent radar canvas, recentered on the camp pin.
- Canvas keeps rings, sweep, and fire pings; iframe has `pointer-events: none` so clicks stay on the radar.
- **No Windy Map Forecast API key** — free embed only. A keyed interactive API is **not** required for this prototype; if deeper integration is wanted later, obtain a key from Windy (do not invent one).

---

## 7. Local run

```bash
cd /workspace/wildfire-radar
python3 -m http.server 8765 --bind 127.0.0.1
# live: http://127.0.0.1:8765/
# test WHZ samples: http://127.0.0.1:8765/?test=1
```

## 8. Key files

| Path | Role |
|------|------|
| `index.html` | UI, dual feeds, radar + Windy embed |
| `plan-data.js` | Plan extract + `computeWhzLevel` |
| `DESIGN.md` / `REVIEW.md` / `README.md` | Design, QA notes, runbook |
| `screenshots/` | Local verification captures |
| `HANDOFF.md` | This document |

