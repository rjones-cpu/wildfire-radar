#!/usr/bin/env python3
"""Runtime: gm_authFailure must label SIMULATED basemap (SOC 2 B1)."""
from __future__ import annotations
import http.server
import threading
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

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
    if failed:
        print(info, file=sys.stderr)
        sys.exit(1)
    print("All mock-sat label checks passed.")

if __name__ == "__main__":
    main()
