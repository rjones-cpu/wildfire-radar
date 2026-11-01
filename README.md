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

## Background map (wind / smoke)

Full-page map behind the transparent radar (no third-party wind embed):

| Layer | Source | Id |
|-------|--------|----|
| Basemap | NASA GIBS WMS | `MODIS_Terra_CorrectedReflectance_TrueColor` |
| Wind speed | ECCC MSC GeoMet WMS | `HRDPS-WEonG_2.5km_WindSpeed` / `WINDSPEEDKMH` |
| Wind direction | ECCC MSC GeoMet WMS | `HRDPS-WEonG_2.5km_WindDir` / `WDIR6` |
| Smoke (toggle) | NASA GIBS WMS | `OMPS_Aerosol_Index` |

- Endpoints: `https://geo.weather.gc.ca/geomet` · `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi`
- **ECCC:** commercial use allowed; attribute **Data Source: Environment and Climate Change Canada**; no bulk tile scraping; contact if ≥86,400 requests/day. This app uses infrequent GetMap images (≈30 min refresh).
- **GIBS:** acknowledge NASA GIBS / ESDIS; no NASA endorsement implied.
- URL builders live in `map-layers.js`.

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
