"""Extract reported setlist facts from public HTML, without using the API."""
from datetime import datetime
from html.parser import HTMLParser
import re
from urllib.parse import urljoin


class Node:
    def __init__(self, tag="root", attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def has(self, name):
        return name in self.attrs.get("class", "").split()

    def all(self, predicate):
        result = []
        for child in self.children:
            if isinstance(child, Node):
                if predicate(child):
                    result.append(child)
                result.extend(child.all(predicate))
        return result

    def first(self, predicate):
        return next(iter(self.all(predicate)), None)

    def text(self):
        if self.tag in ("script", "style") or self.has("play") or self.has("setlistFluidAd"):
            return ""
        content = "".join(c.text() if isinstance(c, Node) else c for c in self.children)
        return " " + content if self.has("inlineDivider") or self.tag == "br" else content


class Tree(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def text(node):
    return re.sub(r"\s+", " ", node.text()).strip() if node else ""


def link(node, url):
    target = urljoin(url, node.attrs.get("href", ""))
    result = {"text": text(node), "url": target}
    if node.attrs.get("title"):
        result["title"] = node.attrs["title"]
    return result


def details(node, url):
    """Keep unclassified text and link/tooltip detail instead of guessing it away."""
    result = {"text": text(node)}
    links = [link(n, url) for n in node.all(lambda n: n.tag == "a" and n.attrs.get("href", "").startswith(("/", ".", "https://")))]
    labels = [n.attrs[k] for n in [node, *node.all(lambda _: True)] for k in ("title", "aria-label") if n.attrs.get(k)]
    if links:
        result["links"] = links
    if labels:
        result["labels"] = list(dict.fromkeys(labels))
    return result


def extract(html, url, expected):
    match = re.fullmatch(r"https://www\.setlist\.fm/setlist/.+/[0-9]{4}/[^/]+-([0-9a-f]+)\.html", url)
    if not match:
        raise ValueError("Expected a public setlist.fm setlist URL")
    root = Tree(html).root
    info = root.first(lambda n: n.has("setlistInfo"))
    listing = root.first(lambda n: n.has("setlistList"))
    if not info or not listing:
        raise ValueError("Setlist markup missing; keep the previous cache")
    heading = info.first(lambda n: n.tag == "h1")
    heading_links = heading.all(lambda n: n.tag == "a") if heading else []
    if len(heading_links) not in (2, 3):
        raise ValueError("Unrecognized artist/venue heading")
    artist, venue = [link(n, url) for n in heading_links[:2]]
    if len(heading_links) == 3:
        venue["text"] += ", " + text(heading_links[2])
    date_node = info.first(lambda n: n.has("date"))
    if not date_node:
        raise ValueError("Event date missing")
    date_text = " ".join(text(date_node.first(lambda n: n.has(c))) for c in ("month", "day", "year"))
    event_date = datetime.strptime(date_text, "%b %d %Y").date().isoformat()
    for field, actual in [("artist", artist["text"]), ("venue", venue["text"]), ("event_date", event_date)]:
        if actual != expected[field]:
            raise ValueError(f"Source mismatch for {field}: {actual!r} != {expected[field]!r}")
    result = {"source_url": url, "setlist_id": match[1], "event_date": event_date, "artist": artist, "venue": venue, "sets": []}
    tour = info.first(lambda n: n.tag == "a" and "search?" in n.attrs.get("href", "") and "tour=" in n.attrs.get("href", ""))
    if tour:
        result["tour"] = link(tour, url)
    current = None
    for row in listing.all(lambda n: n.tag == "li" and n.has("setlistParts")):
        if row.has("setlistFluidAd"):
            continue
        if row.has("section") or row.has("encore"):
            current = {"kind": "encore" if row.has("encore") else "set", "name": text(row), "songs": []}
            result["sets"].append(current)
            continue
        song_labels = row.all(lambda n: n.has("songLabel") or n.has("unknownSong"))
        if not song_labels and (row.has("song") or row.has("tape")):
            plain_song = row.first(lambda n: n.has("songPart"))
            if plain_song and text(plain_song):
                song_labels = [plain_song]
        if not song_labels:
            # A new, non-ad source row is not safe to silently omit.
            if text(row):
                raise ValueError(f"Unrecognized setlist row: {text(row)[:100]}")
            continue
        if current is None:
            current = {"kind": "set", "songs": []}
            result["sets"].append(current)
        song = {"name": " / ".join(text(n) for n in song_labels), "source_text": text(row)}
        song["source_links"] = [link(n, url) for n in song_labels if n.attrs.get("href")]
        annotations = [details(n, url) for n in row.all(lambda n: n.has("infoPart"))]
        song["annotations"] = [a for a in annotations if a["text"] or a.get("links") or a.get("labels")]
        labels = [n.attrs[k] for n in [row, *row.all(lambda _: True)] for k in ("title", "aria-label") if n.attrs.get(k) and not n.has("play") and not n.has("songLabel")]
        if labels:
            song["source_labels"] = list(dict.fromkeys(labels))
        if row.has("tape") or row.first(lambda n: n.has("tape")) or any("played from tape" in v.lower() for v in labels):
            song["tape"] = True
        # Preserve original source flags for unclassified/medley/special rows.
        song["source_classes"] = row.attrs.get("class", "").split()
        current["songs"].append(song)
    if not any(s["songs"] for s in result["sets"]):
        raise ValueError("No reported songs; retain previous data and review this page")
    notes = listing.all(lambda n: n.tag == "p" or n.has("setlistComment"))
    if notes:
        result["notes"] = [details(n, url) for n in notes if text(n)]
    times = root.first(lambda n: n.has("setTimesTimeline"))
    if times:
        result["times"] = {}
        for key in ("doors", "scheduled", "start", "end"):
            node = times.first(lambda n: n.has(key))
            if node:
                result["times"][key] = {"time": text(node.first(lambda n: n.tag == "strong")), "source_text": text(node)}
    editor = root.first(lambda n: n.has("editorPart"))
    if editor:
        result["last_edit"] = details(editor, url)
        stamp = editor.first(lambda n: "data-isotime" in n.attrs)
        if stamp:
            result["last_edit"]["at"] = stamp.attrs["data-isotime"]
    return compact(result)



def compact(value):
    """Current schema: typed setlist content, not webpage presentation metadata."""
    result = {"kind": "setlist_fm", "url": value.get("source_url", value.get("url")), "sets": []}
    for section in value["sets"]:
        current = {"songs": []}
        if section.get("name"):
            current["name"] = section["name"]
        if section.get("kind") == "encore" or section.get("encore"):
            current["encore"] = True
        for source in section["songs"]:
            song = {"name": source["name"]}
            notes = [a["text"] for a in source.get("annotations", []) if a.get("text")]
            if source.get("notes"):
                notes.append(source["notes"])
            if notes:
                song["notes"] = " ".join(dict.fromkeys(notes))
            if source.get("tape"):
                song["tape"] = True
            current["songs"].append(song)
        result["sets"].append(current)
    notes = value.get("notes")
    if notes:
        result["notes"] = " ".join(dict.fromkeys(n["text"] if isinstance(n, dict) else n for n in notes)) if isinstance(notes, list) else notes
    return result
