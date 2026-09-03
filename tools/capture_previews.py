#!/usr/bin/env python3
"""
Capture website screenshots for TrioSphere's Preview view.

Reads datasets.xlsx, opens each source's url in headless Chromium, and writes

    images/previews/<id>.webp       800x500 thumbnail (16:10 crop of the top of the page)
    images/previews/manifest.json   {"previews": {"<id>": {"captured": "YYYY-MM-DD", "url": "..."}}}

script.js reads the manifest for the "captured" caption on each preview card. The
site works without it (cards just show no date), and a source with no image shows a
"No preview yet" placeholder, so a failed capture never breaks the page.

One-time setup (macOS / Linux):

    pip3 install playwright openpyxl pillow
    python3 -m playwright install chromium

Usage, from the repo root:

    python3 tools/capture_previews.py                 # capture every source
    python3 tools/capture_previews.py --only-missing  # sources with no image yet (new entries)
    python3 tools/capture_previews.py --ids 12,34     # recapture specific ids
    python3 tools/capture_previews.py --dry-run       # show what would be captured

Want a more recognizable page than the catalog url (a map explorer instead of a generic
agency homepage)?  Add  "<id>": "<url>"  to tools/preview_overrides.json and recapture
that id. The manifest records which url was actually captured.

Review before committing: serve the site locally, switch to Preview view, and look for
cookie walls, "Access denied" pages, or blank captures; recapture those with --ids
(an override url usually fixes it). The script also warns about captures that look
blank or blocked, and exits non-zero if anything failed.

Sites that block headless browsers (Cloudflare "Just a moment", reCAPTCHA, "I'm not a
robot" gates) have two escape hatches:

    python3 tools/capture_previews.py --ids 15,61 --headed
        Opens a visible browser window, one site at a time. If a check appears, solve it
        in the window; the script waits (up to --wait-human seconds) and then captures.
        Add --channel chrome to use your installed Google Chrome instead of Playwright's.

    python3 tools/capture_previews.py --import 61=~/Desktop/geo.png
        Ingests a screenshot you took yourself (any size; it is cropped to 16:10 from the
        top and resized), and records it in the manifest as a manual capture.

Recapture everything each January alongside the other annual maintenance in CLAUDE.md.
"""

import argparse
import asyncio
import datetime as dt
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "datasets.xlsx"
OUT_DIR = ROOT / "images" / "previews"
MANIFEST = OUT_DIR / "manifest.json"
OVERRIDES = ROOT / "tools" / "preview_overrides.json"

VIEWPORT = {"width": 1280, "height": 800}   # 16:10, same aspect as the thumbnail
THUMB = (800, 500)
WEBP_QUALITY = 80
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

# Buttons that usually dismiss cookie / consent banners
CONSENT_BUTTON = re.compile(
    r"^\s*(accept( all)?( cookies)?|i (agree|accept|understand)|agree|got it|ok(ay)?|"
    r"allow( all)?( cookies)?|continue|dismiss|close|no thanks)\s*$",
    re.I,
)
CONSENT_SELECTORS = [
    "#onetrust-accept-btn-handler",
    "button#accept-cookies, button.accept-cookies",
    ".cc-btn.cc-dismiss, .cc-btn.cc-allow",
    "button[aria-label*='accept' i], button[aria-label*='dismiss' i]",
]
# Page titles that mean we were blocked rather than shown the site
BLOCKED_TITLE = re.compile(
    r"access denied|forbidden|just a moment|attention required|are you a human|"
    r"captcha|request blocked|error 4\d\d|503", re.I,
)
# In-page bot checks that don't change the title (e.g. an "I'm not a robot" gate)
CAPTCHA_FRAMES = (
    "iframe[src*='recaptcha'], iframe[src*='hcaptcha'], iframe[src*='turnstile'], "
    "iframe[title*='challenge' i], iframe[title*='recaptcha' i]"
)


def read_sources():
    """Yield {id, name, url} for every row of the first sheet of datasets.xlsx."""
    import openpyxl  # imported here so --help works without it

    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = [str(h).strip() if h is not None else "" for h in next(rows)]
    col = {h: i for i, h in enumerate(header)}
    for key in ("id", "name", "url"):
        if key not in col:
            sys.exit(f"datasets.xlsx has no '{key}' column — header row is {header}")
    for row in rows:
        if row is None or row[col["id"]] in (None, ""):
            continue
        raw_id = row[col["id"]]
        if isinstance(raw_id, float) and raw_id.is_integer():
            raw_id = int(raw_id)          # 12.0 -> "12", matching script.js's String(row.id)
        yield {
            "id": str(raw_id).strip(),
            "name": str(row[col["name"]] or "").strip(),
            "url": str(row[col["url"]] or "").strip(),
        }
    wb.close()


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    except json.JSONDecodeError as e:
        sys.exit(f"{path} is not valid JSON: {e}")


def looks_blank(img):
    """True if the thumbnail is (nearly) a single flat colour — usually an unrendered page."""
    from PIL import ImageStat

    stat = ImageStat.Stat(img.convert("L"))
    return stat.stddev[0] < 6


def save_thumbnail(img, sid):
    """Crop to 16:10 from the top, resize to THUMB, write <id>.webp. Returns True if it looks blank."""
    from PIL import Image

    img = img.convert("RGB")
    w, h = img.size
    crop_h = min(h, int(w * THUMB[1] / THUMB[0]))
    img = img.crop((0, 0, w, crop_h)).resize(THUMB, Image.LANCZOS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.save(OUT_DIR / f"{sid}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
    return looks_blank(img)


async def blocked_reason(page):
    """A short reason if the page is a bot check / error rather than the site, else None."""
    title = (await page.title()) or ""
    if BLOCKED_TITLE.search(title):
        return f"page title {title[:60]!r}"
    try:
        if await page.locator(CAPTCHA_FRAMES).count() > 0:
            return "captcha on the page"
    except Exception:
        pass
    return None


async def dismiss_consent(page):
    """Best-effort click on a cookie/consent banner button. Never raises."""
    for sel in CONSENT_SELECTORS:
        try:
            btn = page.locator(sel).first
            if await btn.is_visible(timeout=300):
                await btn.click(timeout=1500)
                await page.wait_for_timeout(600)
                return True
        except Exception:
            pass
    for role in ("button", "link"):
        try:
            btn = page.get_by_role(role, name=CONSENT_BUTTON).first
            if await btn.is_visible(timeout=300):
                await btn.click(timeout=1500)
                await page.wait_for_timeout(600)
                return True
        except Exception:
            pass
    return False


async def capture_one(browser, src, target_url, sem, args):
    """Capture one source. Returns (id, ok, message)."""
    from PIL import Image
    from playwright.async_api import TimeoutError as PWTimeout

    async with sem:
        ctx = await browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=1,
            user_agent=USER_AGENT,
            locale="en-US",
            ignore_https_errors=True,
        )
        page = await ctx.new_page()
        note = ""
        try:
            status = None
            try:
                resp = await page.goto(target_url, wait_until="load", timeout=args.timeout * 1000)
                status = resp.status if resp else None
            except PWTimeout:
                note = "load timed out, captured what had rendered; "
            try:
                await page.wait_for_load_state("networkidle", timeout=6000)
            except Exception:
                pass
            dismissed = await dismiss_consent(page)
            try:
                await page.evaluate("window.scrollTo(0, 0)")
            except Exception:
                pass
            await page.wait_for_timeout(args.settle * 1000)
            # Some banners only appear after a delay — try once more after settling
            if not dismissed and await dismiss_consent(page):
                dismissed = True
                await page.wait_for_timeout(800)
            if dismissed:
                note += "dismissed a consent banner; "

            blocked = await blocked_reason(page)
            solved = False
            if blocked and args.headed:
                # A person can solve the check in the visible window; wait for it to clear
                print(f"  [....] {src['id']:>3}  {src['name'][:45]:<45}  bot check ({blocked}) — "
                      f"solve it in the browser window (waiting up to {args.wait_human}s)")
                deadline = asyncio.get_event_loop().time() + args.wait_human
                while blocked and asyncio.get_event_loop().time() < deadline:
                    await page.wait_for_timeout(1500)
                    blocked = await blocked_reason(page)
                if not blocked:
                    solved = True
                    note += "bot check solved by hand; "
                    await page.wait_for_timeout(args.settle * 1000)
            if blocked:
                return src["id"], False, f"looks blocked: {blocked}"
            title = (await page.title()) or ""
            if status is not None and status >= 400 and not solved:
                return src["id"], False, f"HTTP {status} ({title[:60]!r})"

            png = await page.screenshot(type="png", full_page=False)
            if save_thumbnail(Image.open(io.BytesIO(png)), src["id"]):
                note += "WARNING: capture looks blank; "
            return src["id"], True, note.strip("; ")
        except Exception as e:  # noqa: BLE001 — report and move on
            return src["id"], False, f"{type(e).__name__}: {str(e).splitlines()[0][:120]}"
        finally:
            await ctx.close()


def write_manifest(manifest, previews, sources, today):
    """Keep the manifest tidy: numeric id order, only ids that still exist in the sheet."""
    live_ids = {s["id"] for s in sources}
    ordered = sorted(
        ((k, v) for k, v in previews.items() if k in live_ids),
        key=lambda kv: (not kv[0].isdigit(), int(kv[0]) if kv[0].isdigit() else kv[0]),
    )
    manifest["previews"] = dict(ordered)
    manifest["generated"] = today
    manifest["note"] = "Written by tools/capture_previews.py — do not edit by hand"
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")


def import_screenshots(args, sources, overrides, manifest, previews, today):
    """--import <id>=<image>: ingest screenshots taken by hand."""
    from PIL import Image

    by_id = {s["id"]: s for s in sources}
    failed = 0
    for spec in args.import_:
        sid, sep, path = spec.partition("=")
        sid = sid.strip()
        if not sep or sid not in by_id:
            print(f"  [FAIL] {spec!r}: expected <id>=<image path> with an id from datasets.xlsx")
            failed += 1
            continue
        src_path = Path(path.strip()).expanduser()
        try:
            blank = save_thumbnail(Image.open(src_path), sid)
        except Exception as e:  # noqa: BLE001
            print(f"  [FAIL] {sid:>3}  {by_id[sid]['name'][:45]:<45}  {type(e).__name__}: {e}")
            failed += 1
            continue
        previews[sid] = {"captured": today, "url": overrides.get(sid, by_id[sid]["url"]), "manual": True}
        print(f"  [ok  ] {sid:>3}  {by_id[sid]['name'][:45]:<45}  imported {src_path.name}"
              + ("  WARNING: looks blank" if blank else ""))
    write_manifest(manifest, previews, sources, today)
    print(f"\n{len(args.import_) - failed} imported, {failed} failed. Manifest: {MANIFEST.relative_to(ROOT)}")
    return 1 if failed else 0


async def run(args):
    from playwright.async_api import async_playwright

    sources = list(read_sources())
    overrides = {k: v for k, v in load_json(OVERRIDES, {}).items() if not k.startswith("_")}
    manifest = load_json(MANIFEST, {})
    previews = manifest.setdefault("previews", {})
    today = dt.date.today().isoformat()

    if args.import_:
        return import_screenshots(args, sources, overrides, manifest, previews, today)

    wanted = None
    if args.ids:
        wanted = {s.strip() for s in args.ids.split(",") if s.strip()}
        unknown = wanted - {s["id"] for s in sources}
        if unknown:
            sys.exit(f"ids not in datasets.xlsx: {sorted(unknown)}")
    todo = []
    for s in sources:
        if wanted is not None and s["id"] not in wanted:
            continue
        if args.only_missing and (OUT_DIR / f"{s['id']}.webp").exists():
            continue
        url = overrides.get(s["id"], s["url"])
        if not url.lower().startswith(("http://", "https://")):
            print(f"  skip id {s['id']} ({s['name']}): no http(s) url")
            continue
        todo.append((s, url))

    print(f"{len(todo)} of {len(sources)} sources to capture -> {OUT_DIR.relative_to(ROOT)}/")
    if args.dry_run:
        for s, url in todo:
            flag = "  (override)" if s["id"] in overrides else ""
            print(f"  {s['id']:>3}  {s['name'][:45]:<45}  {url}{flag}")
        return 0
    if not todo:
        return 0

    if args.headed:
        args.concurrency = 1   # one visible window at a time, so a person can follow along
        print("Headed mode: a browser window will open; solve any bot check you see there.")
    sem = asyncio.Semaphore(args.concurrency)
    results = []
    async with async_playwright() as p:
        launch = {"headless": not args.headed}
        if args.channel:
            launch["channel"] = args.channel
        browser = await p.chromium.launch(**launch)
        try:
            tasks = [capture_one(browser, s, url, sem, args) for s, url in todo]
            by_id = {s["id"]: (s, url) for s, url in todo}
            for coro in asyncio.as_completed(tasks):
                sid, ok, msg = await coro
                s, url = by_id[sid]
                results.append((sid, ok, msg))
                mark = "ok  " if ok else "FAIL"
                print(f"  [{mark}] {sid:>3}  {s['name'][:45]:<45}  {msg}")
                if ok:
                    previews[sid] = {"captured": today, "url": url}
        finally:
            await browser.close()

    write_manifest(manifest, previews, sources, today)

    failed = [r for r in results if not r[1]]
    warned = [r for r in results if r[1] and "WARNING" in r[2]]
    print(f"\n{len(results) - len(failed)} captured, {len(failed)} failed, "
          f"{len(warned)} flagged for review. Manifest: {MANIFEST.relative_to(ROOT)}")
    if failed:
        print("Failed ids: " + ", ".join(r[0] for r in sorted(failed, key=lambda r: int(r[0]) if r[0].isdigit() else 0)))
        print("Retry with --ids (add --headed for bot checks), use --import for a screenshot taken by hand, "
              "or add a different page for them in tools/preview_overrides.json.")
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument("--ids", help="comma-separated ids to (re)capture; default: all")
    ap.add_argument("--only-missing", action="store_true", help="skip ids that already have an image")
    ap.add_argument("--dry-run", action="store_true", help="list what would be captured and exit")
    ap.add_argument("--headed", action="store_true", help="visible browser window, one site at a time; lets you solve bot checks by hand")
    ap.add_argument("--channel", help="browser channel for --headed, e.g. 'chrome' to use your installed Google Chrome")
    ap.add_argument("--wait-human", type=int, default=90, help="seconds to wait for a bot check to be solved in --headed mode (default 90)")
    ap.add_argument("--import", dest="import_", action="append", metavar="ID=IMAGE", default=[],
                    help="ingest a screenshot taken by hand for an id (repeatable); no browser is opened")
    ap.add_argument("--concurrency", type=int, default=4, help="parallel pages (default 4)")
    ap.add_argument("--timeout", type=int, default=45, help="seconds to wait for a page to load (default 45)")
    ap.add_argument("--settle", type=float, default=2.0, help="seconds to wait after load for animations/lazy content (default 2)")
    args = ap.parse_args()
    if not XLSX.exists():
        sys.exit(f"{XLSX} not found — run from a TrioSphere checkout")
    try:
        sys.exit(asyncio.run(run(args)))
    except KeyboardInterrupt:
        sys.exit("interrupted")


if __name__ == "__main__":
    main()
