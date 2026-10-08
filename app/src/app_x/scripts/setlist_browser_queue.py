"""Loopback-only form for saving public DOM captures made through the browser UI.

This server never fetches setlist.fm. It verifies source identity, publishes compact
records, and presents the next public URL as a normal link for browser navigation.
"""
import hashlib
import argparse
from html import escape
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urljoin
from collections import Counter
from refresh_setlists import DATA, cache_key, publish, read, save
from seed_setlists import catalog, targets_for, identity, matches, related
from setlist_page import Tree, extract

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--snapshot-root", type=Path, default=Path("/Users/danielcepeda/repos/_codex_output/rockshow420"))
parser.add_argument("--catalog", type=Path, help="Current decoded catalog, with tables mapping IDs to records")
parser.add_argument("--work", type=Path, required=True)
parser.add_argument("--refresh", action="store_true", help="Revisit all targets; preserve cached content and revision history")
args = parser.parse_args()
ROOT = args.snapshot_root
WORK = args.work
WORK.mkdir(parents=True, exist_ok=True)
(WORK / "pages").mkdir(exist_ok=True)
ORIGIN = "http://127.0.0.1:8777"
targets, events = targets_for(read(args.catalog, {}) if args.catalog else catalog(ROOT))
state = read(WORK / "progress.json", {"records": {}, "related": {}})
if args.refresh:
    state["records"] = {}
# Earlier identity failures were browser verification pages, not absent setlists.
state["records"] = {k: v for k, v in state["records"].items() if not any("No setlist identity" in e.get("reason", "") for e in v.get("fetch_errors", []))}
state.pop("blocked", None)
state.update(total_targets=len(targets), total_events=len(events), events=events, retrieval="Public browser DOM; no setlist.fm API")
sources = {cache_key(x["artist_id"], x["concert_id"]): x for x in read(DATA / "setlist-sources.json", [])}
for target in targets:
    if target["future"]:
        state["records"][cache_key(target["artist_id"], target["concert_id"])] = {**target, "status": "future"}
queue = []
active = None
seen = set()
found = []
searched = False
last = "Ready"


def checkpoint():
    state["counts"] = dict(Counter(r["status"] for r in state["records"].values()))
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    save(WORK / "progress.json", state)
    save(DATA.parent / "docs/setlist-fetch-progress.json", state)
    save(DATA / "setlist-sources.json", list(sources.values()))


def finish(status, **extra):
    global active, last
    key = cache_key(active["artist_id"], active["concert_id"])
    state["records"][key] = {**active, "status": status, **extra}
    last = f'{active["artist"]} {active["event_date"]}: {status}'
    active = None
    checkpoint()


def next_job():
    global active, queue, seen, found, searched
    if active is None:
        active = next((t for t in targets if cache_key(t["artist_id"], t["concert_id"]) not in state["records"]), None)
        if active is None:
            return None
        seen, found, searched = set(), [], False
        queue = [active["url"]] if "/setlist/" in active["url"] else []
        queue += [url for name, url in state["related"].get(active["concert_id"], []) if name.casefold() == active["artist"].casefold()]
    queue = list(dict.fromkeys(url for url in queue if url not in seen))
    if queue:
        return queue[0]
    if found:
        if len(found) == 1:
            item, html, count = found[0]
            publish([(item, html)])
            sources[cache_key(item["artist_id"], item["concert_id"])] = item
            finish("cached", source_url=item["url"], songs=count)
        else:
            finish("ambiguous", candidates=[f[0]["url"] for f in found])
        return next_job()
    if not searched:
        query = f'artist:({active["artist"]}) date:[{active["event_date"]} TO {active["event_date"]}]'
        queue = ["https://www.setlist.fm/search?" + urlencode({"query": query})]
        return queue[0]
    finish("needs_review" if active.get("rejected_candidates") else "no_match")
    return next_job()


def accept(url, html):
    global queue, searched
    expected_url = next_job()
    if url != expected_url:
        raise ValueError("Capture URL does not match the current queue item")
    if "awsWafCookieDomainList" in html or "gokuProps" in html:
        raise ValueError("Browser verification is not a setlist capture")
    tree = Tree(html).root
    if "/search?" in url:
        # A real search result or an explicit no-result message is required.
        if not tree.first(lambda n: n.tag in ("h1", "h2")):
            raise ValueError("Search page has not rendered")
        links = [urljoin(url, n.attrs["href"]) for h in tree.all(lambda n: n.tag == "h2") for n in h.all(lambda n: n.tag == "a" and "setlist/" in n.attrs.get("href", ""))]
        if not links and "did not match any setlists" not in tree.text():
            raise ValueError("No explicit search result or no-result message")
        active["search_url"] = url
        active["search_verified"] = True
        seen.add(url)
        queue = list(dict.fromkeys(links))
        searched = True
        if len(queue) > 8:
            finish("ambiguous", candidates=queue)
    else:
        actual = identity(html)
        seen.add(url)
        queue = queue[1:]
        if matches(actual, active):
            state["related"][active["concert_id"]] = related(html, url)
            item = {"artist_id": active["artist_id"], "concert_id": active["concert_id"], "url": url, "expected": actual}
            try:
                parsed = extract(html, url, actual)
                found.append((item, html, sum(len(s["songs"]) for s in parsed["sets"])))
            except ValueError as error:
                finish("empty_or_parser_review", source_url=url, reason=str(error))
        else:
            active.setdefault("rejected_candidates", []).append({"url": url, "actual": actual})
    path = WORK / "pages" / (hashlib.sha256(url.encode()).hexdigest() + ".html")
    path.write_text(html)
    next_job()
    checkpoint()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = next_job()
        payload = '<!doctype html><title>Setlist capture queue</title><h1>Setlist capture queue</h1>'
        payload += f'<p id="progress">{escape(json.dumps(state.get("counts", {})))} / {len(targets)}</p><p id="last">{escape(last)}</p>'
        if url:
            payload += f'<p>{escape(active["artist"])} · {escape(active["event_date"])} · {escape(active["venue"])}</p><a id="source" href="{escape(url)}">Open source</a>'
            payload += f'<form method="post"><input type="hidden" name="url" value="{escape(url)}"><label for="capture">Page HTML</label><textarea id="capture" name="html"></textarea><button>Save page</button></form>'
        else:
            payload += '<p>Queue complete</p>'
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(payload.encode())

    def do_POST(self):
        if self.headers.get("Origin") != ORIGIN:
            self.send_error(403)
            return
        try:
            fields = parse_qs(self.rfile.read(int(self.headers["Content-Length"])).decode())
            accept(fields["url"][0], fields["html"][0])
            self.send_response(303)
            self.send_header("Location", "/")
            self.end_headers()
        except Exception as error:
            self.send_error(400, str(error))

    def log_message(self, *_):
        pass


checkpoint()
print(f"Queue at {ORIGIN}", flush=True)
HTTPServer(("127.0.0.1", 8777), Handler).serve_forever()
