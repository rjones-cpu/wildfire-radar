# LodgeX Wildfire Preparedness · Radar (prototype)

Static add-on for **Smart Lodge** and **CrewSight (Major Projects)**. Animated 150 km radar on a **placeholder** camp pin, with **Alberta + British Columbia** active wildfire feeds, and the **site-specific wildfire plan** embedded (WHZ distance triggers, actions, muster, evacuation routes, contacts, air-quality tables, and documented gaps).

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

## Plan

Extracted into `plan-data.js` from `/workspace/wildfire-preparedness/site-specific-plan.docx` (+ pptx context).

## Docs

- `DESIGN.md` — nine agent functions  
- `REVIEW.md` — SOC 2 / Smart Lodge QA review summary  

**Not** production LodgeX hosting. Do not push without SOC 2 Type 2 + Smart Lodge QA on the same commit.
