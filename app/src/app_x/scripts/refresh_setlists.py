"""Refresh explicitly matched public pages; no API, credentials or database writes."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import time
from urllib.parse import quote
from urllib.request import Request, urlopen
from setlist_page import extract, compact

DATA = Path(__file__).resolve().parents[1] / "data"


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def digest(value):
    return hashlib.sha256(value).hexdigest()


def cache_key(artist_id, concert_id):
    # Same safe characters as JavaScript encodeURIComponent.
    return ":".join(quote(v, safe="~()*!.'-") for v in (artist_id, concert_id))


def read(path, fallback):
    return json.loads(path.read_text()) if path.exists() else fallback


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(canonical(value), encoding="utf-8")
    temporary.replace(path)


def publish(captures, output=DATA, fetched_at=None):
    fetched_at = fetched_at or datetime.now(timezone.utc).isoformat()
    cache_path = output / "cached.setlist.fm.json"
    metadata_path = output / "cached.setlist.fm.meta.json"
    cache = read(cache_path, {})
    meta = read(metadata_path, {"schema_version": 3, "parser_version": 3, "entries": {}})
    migrated = set()
    if meta["schema_version"] in (1, 2):
        cache = {key: compact(value) for key, value in cache.items()}
        for key, value in cache.items():
            content_hash = digest(canonical(value).encode())
            entry = meta["entries"][key]
            entry["content_sha256"] = content_hash
            if not any(r["sha256"] == content_hash for r in entry["revisions"]):
                entry["revisions"].append({"sha256": content_hash, "first_seen_at": fetched_at})
            migrated.add(key)
        meta.update(schema_version=3, parser_version=3)
    if meta["schema_version"] != 3 or meta["parser_version"] != 3:
        raise ValueError("Unsupported cache format; migrate explicitly")
    seen = set()
    for item, html in captures:
        key = cache_key(item["artist_id"], item["concert_id"])
        if key in seen:
            raise ValueError(f"Duplicate manifest key: {key}")
        seen.add(key)
        parsed = extract(html, item["url"], item["expected"])
        content_hash = digest(canonical(parsed).encode())
        entry = meta["entries"].setdefault(key, {"first_fetched_at": fetched_at, "revisions": []})
        entry.update(last_fetched_at=fetched_at, content_sha256=content_hash, source_html_sha256=digest(html.encode()))
        if not any(r["sha256"] == content_hash for r in entry["revisions"]):
            entry["revisions"].append({"sha256": content_hash, "first_seen_at": fetched_at})
        cache[key] = parsed
    # Finish all parsing/matching before touching any published file.
    for key in seen | migrated:
        path = output / "setlist-history" / (meta["entries"][key]["content_sha256"] + ".json")
        if path.exists():
            if path.read_text() != canonical(cache[key]):
                raise ValueError("Archived revision content does not match its hash")
        else:
            save(path, cache[key])
    save(metadata_path, meta)
    save(cache_path, cache)
    return {key: sum(len(s["songs"]) for s in cache[key]["sets"]) for key in sorted(seen)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--html-dir", type=Path, help="Use captured <artist_id>.html files offline")
    args = parser.parse_args()
    captures = []
    for item in read(args.manifest, []):
        if args.html_dir:
            html = (args.html_dir / (item["artist_id"] + ".html")).read_text()
        else:
            # Only explicit public page URLs; never arbitrary manifest destinations.
            if not item["url"].startswith("https://www.setlist.fm/setlist/"):
                raise ValueError("Only public setlist.fm pages are supported")
            if captures:
                time.sleep(2)
            request = Request(item["url"], headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html", "Accept-Language": "en"})
            with urlopen(request, timeout=30) as response:
                if not response.url.startswith("https://www.setlist.fm/setlist/"):
                    raise ValueError("Unexpected redirect; stop and review")
                html = response.read().decode("utf-8")
        captures.append((item, html))
    print(json.dumps(publish(captures), indent=2))


if __name__ == "__main__":
    main()
