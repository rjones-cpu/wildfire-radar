# Wind data sources — BC & Alberta (LodgeX Wildfire Radar)

**Date:** 2026-11-01 (America/Vancouver)  
**Purpose:** Choose free, commercially usable, browser-safe forecast grids and observed station winds for the particle map.

## Recommendation (implemented)

| Role | Source | Why |
|------|--------|-----|
| **Primary forecast grid** | **ECCC HRDPS-WEonG 2.5 km** (`HRDPS-WEonG_2.5km_WindSpeed` + `WindDir`) via MSC GeoMet **WCS AAIGRID** | Highest free resolution over western Canada (covers BC + Alberta). CORS `*`. Commercial use under ECCC Data Services End-use Licence with attribution. |
| **Fallback / longer horizon** | **ECCC RDPS 10 km** (`RDPS_10km_WindSpeed_10m` + `WindDir_10m`) | Same stack as HRDPS; ~84 h hourly vs HRDPS ~47 h. Used when the forecast slider exceeds HRDPS availability or HRDPS fetch fails. |
| **Observed station winds** | **ECCC SWOB realtime** (`https://api.weather.gc.ca/collections/swob-realtime`) | Official surface obs with 10 m wind speed (km/h) + direction; bbox query; CORS `*`; commercial OK with attribution. |
| **Optional longer context** | GDPS 15 km | Covers globe, coarser; keep as documented secondary — not wired as primary particles (HRDPS/RDPS suffice for camp 150 km). |

**Attribution (footer):** Data Source: Environment and Climate Change Canada (MSC GeoMet HRDPS/RDPS; SWOB observations).

---

## Comparison matrix

| Source | Licence / commercial | Attribution | Browser CORS | Resolution | Forecast horizon | Reliability for BC/AB camps | Verdict |
|--------|----------------------|-------------|--------------|------------|------------------|-----------------------------|---------|
| **ECCC HRDPS-WEonG 2.5 km** | ECCC Data Services End-use Licence — **commercial allowed** | “Data Source: Environment and Climate Change Canada” | GeoMet `Access-Control-Allow-Origin: *` | **2.5 km** | ~**48 h** hourly (run-dependent) | Domain covers western Canada (≈152°W–41°W, 27°N–71°N) — **includes BC & Alberta** | **USE — primary grid** |
| **ECCC RDPS 10 km** | Same ECCC licence — commercial OK | Same | Same `*` | 10 km | ~**84 h** hourly | Full Canada/US coverage | **USE — fallback / +48 h slider** |
| **ECCC GDPS 15 km** | Same | Same | Same | ~15 km | Multi-day (longer than RDPS) | Global; coarse for 150 km radar | Document only; not particle primary |
| **ECCC SWOB-ML / OGC API** | Same ECCC licence — commercial OK | Same | `api.weather.gc.ca` CORS `*` | Point stations | **Observations** (last ~30 days archive in collection) | Dense AB/BC airport & climate stations | **USE — station markers** |
| **BCWS Fire Weather API** (`bcwsapi.nrs.gov.bc.ca`) | Catalogue **“Access Only”** (not OGL-BC); public API no auth, but **not clearly commercial-redistributable** | Unclear / BCWS | Reflects Origin (e.g. github.io) on GET | ~260 fire-weather stations | Hourly obs (poll ≥15 min) | Excellent when reporting; **probe returned empty collections** (off-season / query) | **REJECT for now** — licence ambiguity + empty live probe |
| **BC Data Catalogue weather stations** | Often Access Only / WMS view | Varies | ArcGIS hosts vary | Points | Locations; live winds via BCWS API | Locations OK; winds need API | Reject as wind feed (same as BCWS) |
| **Alberta ACIS** | ACIS disclaimer + citation; related open data under **OGL-Alberta** (commercial OK) | Required ACIS citation | **No documented public CORS JSON API** for live hourlies (viewer/download UI) | Station network | Obs / derivatives | Good AG network | **REJECT for browser** — no CORS-safe live API |
| **Alberta Wildfire / open.alberta weather-stations** | OGL-Alberta (commercial OK) | OGL attribution | PDF yearbooks, not live wind API | N/A | Static docs | Not a live wind feed | **REJECT** as live source |
| **NOAA HRRR** | US gov open / NODD — commercial OK; attribution requested | NOAA attribution; no endorsement | Raw GRIB/Zarr on S3 — **not a simple browser JSON/WCS** | 3 km | Short-range | **CONUS-focused** — poor/no coverage for most of BC/northern Alberta | **REJECT** for this product domain |
| **NOAA GFS** | Open | NOAA attribution | Same — GRIB/NOMADS, not browser-friendly without a proxy | ~13–25 km | 7–16 days | Covers BC/AB but coarse; access pattern unfit for static GH Pages | **REJECT** (no free CORS grid API we can call safely without a backend) |
| **Open-Meteo free API** | **Free tier = non-commercial only**; paid tier for commercial | CC BY 4.0 on data | CORS-friendly | Multi-model blend | Up to 16 days | Convenient but **licence blocks LodgeX commercial use** on free tier | **REJECT** until a paid commercial key is approved |
| **NASA POWER** | Free / NASA terms | NASA acknowledgment | CORS `*` | Coarse | **Not a forecast** (future hours often −999) | NRT/analysis | **REJECT for forecast particles** (already documented) |
| **NASA GEOS-FP** | NASA | Acknowledgment | Download portals — **no browser CORS forecast API** | ~0.25° | ~5 days | Global | **REJECT for browser** |
| **NASA GIBS** | Imagery acknowledgment | Required | WMS OK | Imagery | Smoke/aerosol (not wind vector forecast) | Optional smoke only | Keep smoke overlay only |

---

## Decision notes

1. **HRDPS vs RDPS:** HRDPS-WEonG WCS GetCoverage succeeds for Hinton-area bbox and covers AB/BC. Prefer HRDPS for particle detail; keep RDPS when the user slides past HRDPS’s time dimension or HRDPS errors.
2. **Stations:** SWOB alone gives official observed wind direction/speed across both provinces without BCWS licence risk.
3. **Open-Meteo:** Explicitly excluded (free = non-commercial). Revisit only with a commercial subscription under Ralph’s approval.
4. **Security:** Only allowlisted coverage IDs; cap WCS response size; reject non-hourly / zero TIME steps (SOC 2 B1); never log Maps keys.

## Implementation map

| File | Role |
|------|------|
| `wind-grid.js` | HRDPS + RDPS WCS AAIGRID, UV sample, TIME expand (B1-hardened) |
| `wind-stations.js` | SWOB fetch/parse/validate for markers |
| `wind-particles.js` | Canvas streamlines |
| `index.html` | Primary=HRDPS, fallback=RDPS; station markers + popups; footer attribution |
