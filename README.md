# LodgeX Wildfire Preparedness · Radar (prototype)

Static add-on for **Smart Lodge** and **CrewSight (Major Projects)**. Animated 150 km radar on a **placeholder** camp pin, with **Alberta + British Columbia** active wildfire feeds. WHZ level is computed from nearest-fire distance using thresholds in `plan-data.js`. The camp-location form and site wildfire plan side panel are **not** shown in the UI (Ralph, 2026-10-31); camp pin comes from the default TEST pin, validated `?lat=&lon=&name=`, `?example=1`, or a radar click.

## Run locally

```bash
cd /workspace/wildfire-radar
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

- Live feeds: default URL  
- Test pings (sample AB + BC fires only): `?test=1`

## Data sources (fires)

1. **Alberta** — [Active Alberta Wildfire Locations](https://geospatial.alberta.ca/mimas/rest/services/wildfire/alberta_fire_status_by_category_group/FeatureServer/0) (FeatureServer/0 GeoJSON)
2. **British Columbia** — BC Wildfire Service [BCWS_ActiveFires_PublicView](https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/BCWS_ActiveFires_PublicView/FeatureServer/0)  
   Query filter: `FIRE_STATUS <> 'Out'` (active only). Fields used: fire number, status, `CURRENT_SIZE` (ha), lat/lon.  
   CORS: `Access-Control-Allow-Origin: *` (browser-safe).

Each ping is tagged **AB** or **BC**. Feeds load in parallel; one failure keeps the other. Same 150 km range and WHZ plan triggers apply to the nearest fire of either province.

## Background map (Google Maps + wind / smoke)

Full-page **Google Maps** hybrid basemap behind the transparent radar (Maps JavaScript API, `loading=async`). Referrer-restricted browser key in `maps-config.js` (allowlisted for gitleaks — not a server secret).

| Layer | Source | Id / notes | Default |
|-------|--------|------------|---------|
| Basemap | Google Maps JS API | `hybrid` (satellite + labels) | on |
| Wind direction (arrows) | ECCC MSC GeoMet WMS | `RDPS_10km_Winds_10m` / `WINDARROWKMH` | on (toggle) |
| Smoke | NASA GIBS WMS | `OMPS_Aerosol_Index` | off (toggle) |

- Google’s logo and map-data attribution render on the map itself (required).
- If Maps fails to load (billing / referrer), a fallback message is shown; radar + fire feeds + overlays still run.
- ECCC GeoMet: attribute **Data Source: Environment and Climate Change Canada**; light GetMap refresh (~30 min). HRDPS **WindSpeed** colour wash is **not** shown.
- GIBS smoke (optional): NASA GIBS acknowledgment; no NASA endorsement.
- URL builders: `map-layers.js`. Config: `maps-config.js`.
- **CSP note (known residual risk):** enabling Google Maps required widening the page CSP (`script-src` includes `'unsafe-eval'` plus `maps.googleapis.com` / `maps.gstatic.com` / `blob:`; `img-src`/`connect-src` allow Google wildcards; `frame-src https://*.google.com`; `worker-src blob:`). Nonce-based strict CSP is not practical on static GitHub Pages (no server to mint nonces per response), so XSS risk is higher than a nonce CSP. Revisit if hosting moves behind a server that can emit nonces.
- **gitleaks:** `.gitleaks.toml` uses `[extend] useDefault = true` so default rules stay active, and allowlists only `maps-config.js` (referrer-restricted Maps browser key).

## Licences and disclaimer

- Contains information licensed under the [Open Government Licence – British Columbia](https://www2.gov.bc.ca/gov/content/data/policy-standards/data-policies/open-data/open-government-licence-bc).
- Contains information licensed under the [Open Government Licence – Alberta](https://open.alberta.ca/licence).
- This page is **not** an official BC Wildfire Service or Alberta Wildfire product and is **not** endorsed by either government.
- Fire data is for reference only, is not guaranteed accurate, and locations are approximate. It is not for insurance or risk decisions. See the [BC Wildfire Service disclaimer](https://www2.gov.bc.ca/gov/content/safety/wildfire-status/about-bcws/disclaimer).
- No provincial logos are used on this page.

## Plan data (WHZ only in UI)

`plan-data.js` still holds the site-plan extract (WHZ chart, actions, routes, contacts, AQ, gaps) and exports `computeWhzLevel`. The live page surfaces **WHZ banner + radar rings only** — plan actions, routes, contacts, AQ tables, and the Plan gaps list are **not rendered** (no home on the page until Ralph asks to restore a panel). Documented gaps remain in `plan-data.js` / DESIGN.md.

## Tests

```bash
node test/whz-escape.test.js
```

## Docs

- `DESIGN.md` — nine agent functions  
- `REVIEW.md` — SOC 2 / Smart Lodge QA review summary  

**Not** production LodgeX hosting. Do not push without SOC 2 Type 2 + Smart Lodge QA on the same commit.
