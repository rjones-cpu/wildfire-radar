#!/usr/bin/env python3
"""Runtime: gm_authFailure labels SIMULATED basemap, and the Wind toggle
does not hide fallback-mode SWOB arrows drawn on #bgWindCanvas."""
from __future__ import annotations
import http.server
import json
import threading
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

# Camp default in index.html is 53.42, -117.50. One station at that point
# projects to the middle of the fallback canvas.
SWOB_FIXTURE = json.dumps({
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [-117.50, 53.42]},
        "properties": {
            "stn_nam": "TEST-STN",
            "avg_wnd_spd_10m_pst10mts": 14,
            "avg_wnd_dir_10m_pst10mts": 270,
            "date_tm": "2026-11-01T18:00:00Z",
        },
    }],
})

INK_JS = """() => {
  const c = document.getElementById('bgWindCanvas');
  if (!c) return { ink: 0, off: true, display: 'missing', w: 0, h: 0 };
  const ctx = c.getContext('2d');
  let ink = 0;
  if (ctx && c.width > 1 && c.height > 1) {
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 30) ink++;
    }
  }
  const display = getComputedStyle(c).display;
  return {
    ink: ink,
    off: c.classList.contains('is-off'),
    display: display,
    w: c.width,
    h: c.height,
    wind: !!document.getElementById('togWind').checked,
    stations: !!document.getElementById('togStations').checked,
  };
}"""

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)
    def log_message(self, *args):
        pass

def main():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    th = threading.Thread(target=server.serve_forever, daemon=True)
    th.start()
    url = f"http://127.0.0.1:{port}/?test=1"
    failed = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1200, "height": 800})

        def handle_route(route):
            req_url = route.request.url
            if "swob-realtime" in req_url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=SWOB_FIXTURE,
                )
                return
            if req_url.startswith("http://127.0.0.1") or req_url.startswith("http://localhost"):
                route.continue_()
                return
            # Keep Maps from becoming ready and avoid hanging on live ECCC grids.
            route.abort()

        page.route("**/*", handle_route)
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        # Give scripts a moment; then force auth failure path.
        page.wait_for_timeout(800)
        page.evaluate("() => { if (typeof window.gm_authFailure === 'function') window.gm_authFailure(); }")
        page.wait_for_timeout(200)
        info = page.evaluate(
            """() => {
              const bg = document.getElementById('bgMap');
              const credit = document.querySelector('.map-credit');
              const banner = document.querySelector('#mapFallback div');
              const stamp = document.getElementById('mapTimestamp');
              return {
                hasMock: !!(bg && bg.classList.contains('map-mock-sat')),
                credit: credit ? credit.textContent : '',
                banner: banner ? banner.textContent : '',
                stamp: stamp ? stamp.textContent : '',
              };
            }"""
        )
        # Reload stations against the SWOB fixture (grid fetch is aborted).
        page.locator("#togStations").uncheck()
        page.locator("#togStations").check()
        page.wait_for_function(
            "() => { const s = " + INK_JS + "; return s().ink > 40; }",
            timeout=15000,
        )
        before = page.evaluate(INK_JS)
        page.locator("#togWind").uncheck()
        page.wait_for_timeout(450)
        wind_off = page.evaluate(INK_JS)
        page.locator("#togWind").check()
        page.wait_for_timeout(300)
        wind_on = page.evaluate(INK_JS)
        page.locator("#togWind").uncheck()
        page.wait_for_timeout(300)
        wind_off_again = page.evaluate(INK_JS)
        page.locator("#togStations").uncheck()
        page.wait_for_timeout(100)
        both_off = page.evaluate(INK_JS)
        browser.close()
    server.shutdown()

    def ok(cond, msg):
        nonlocal failed
        if cond:
            print("ok:", msg)
        else:
            failed += 1
            print("FAIL:", msg, file=sys.stderr)

    ok(info["hasMock"], "#bgMap has map-mock-sat after gm_authFailure")
    ok("SIMULATED" in info["credit"], "credit contains SIMULATED")
    ok("SIMULATED" in info["banner"] or "SIMULATED" in info["stamp"], "banner or stamp contains SIMULATED")
    ok("Google Maps hybrid" not in info["credit"], "credit does not contain 'Google Maps hybrid'")
    ok(before["ink"] > 40 and before["off"] is False, "fallback stations paint arrows before wind toggle")
    ok(wind_off["wind"] is False and wind_off["stations"] is True, "wind unchecked, stations still checked")
    ok(wind_off["off"] is False and wind_off["display"] != "none", "wind off does not hide fallback canvas")
    ok(wind_off["ink"] > 40, "wind off keeps station arrow pixels")
    ok(wind_on["wind"] is True and wind_on["off"] is False and wind_on["ink"] > 40, "wind on again keeps station arrows")
    ok(wind_off_again["off"] is False and wind_off_again["ink"] > 40, "second wind-off still keeps station arrows")
    ok(both_off["off"] is True and both_off["display"] == "none", "stations off hides canvas when wind is off")
    if failed:
        print(info, file=sys.stderr)
        print("before", before, file=sys.stderr)
        print("wind_off", wind_off, file=sys.stderr)
        print("wind_on", wind_on, file=sys.stderr)
        print("wind_off_again", wind_off_again, file=sys.stderr)
        print("both_off", both_off, file=sys.stderr)
        sys.exit(1)
    print("All mock-sat and wind-toggle checks passed.")

if __name__ == "__main__":
    main()
