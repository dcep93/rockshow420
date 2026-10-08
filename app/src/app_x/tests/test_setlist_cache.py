import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from refresh_setlists import publish, cache_key, canonical, digest
from setlist_page import extract

URL = "https://www.setlist.fm/setlist/example/2024/example-123abc.html"
ITEM = {"artist_id": "a", "concert_id": "c", "url": URL,
        "expected": {"artist": "Example", "venue": "Venue, City", "event_date": "2024-09-21"}}
HTML = '''<div class="setlistInfo"><div class="date"><span class="month">Sep</span>
<span class="day">21</span><span class="year">2024</span></div>
<h1><a href="/setlists/example.html">Example</a> at <a href="/venue/venue.html">Venue, City</a></h1></div>
<div class="setlistList"><ol class="songsList">
<li class="setlistParts section"><span>First set</span></li>
<li class="setlistParts song tape"><span title="Song played from tape"></span><span class="songLabel">Intro</span></li>
<li class="setlistParts song"><a class="songLabel" href="/stats/song">Song</a>
<div class="infoPart">(<a href="/setlists/cover.html">Original Artist</a> cover)
(with <a href="/setlists/guest.html">Guest</a>) (extended outro)</div><a class="play">Play Video</a></li>
<li class="setlistParts setlistFluidAd">Unrelated advertisement</li>
<li class="setlistParts encore"><span>Encore 2:</span></li>
<li class="setlistParts song"><span class="songLabel">Finale</span></li></ol>
<p class="setlistComment">Note: Shortened due to rain.</p></div>
<div class="setTimesTimeline"><div class="start"><strong>8:15 PM</strong> 15m after scheduled</div></div>
<span class="editorPart">last edit by Someone <abbr data-isotime="2024-09-22T01:02:03Z">22 Sep</abbr></span>'''


class SetlistCacheTests(unittest.TestCase):
    def test_reprocessing_preserves_capture_date_separately(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            original = '2026-09-01T12:00:00+00:00'
            processed = '2026-10-08T12:00:00+00:00'
            publish([(ITEM, HTML)], output, original)
            publish([(ITEM, HTML)], output, processed, capture_times={URL: original})
            entry = json.loads((output / 'cached.setlist.fm.meta.json').read_text())['entries']['a:c']
            self.assertEqual(entry['first_fetched_at'], original)
            self.assertEqual(entry['last_fetched_at'], original)
            self.assertEqual(entry['sources'][URL]['last_fetched_at'], original)
            self.assertEqual(entry['last_processed_at'], processed)
            self.assertEqual(len(entry['revisions']), 1)

    def test_refresh_of_one_performance_preserves_others(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            first = {**ITEM, 'set_id': 'abc123'}
            second = {**ITEM, 'set_id': 'def456', 'url': URL.replace('123abc', '456def')}
            publish([(first, HTML), (second, HTML.replace('Finale', 'Other finale'))], output, 'first')
            publish([(first, HTML.replace('Finale', 'Updated finale'))], output, 'second')
            performances = json.loads((output / 'cached.setlist.fm.json').read_text())['a:c']
            self.assertEqual([p['set_id'] for p in performances], ['abc123', 'def456'])
            self.assertEqual(performances[1]['sets'][1]['songs'][0]['name'], 'Other finale')
            self.assertEqual(performances[0]['sets'][1]['songs'][0]['name'], 'Updated finale')
            previous = (output / 'cached.setlist.fm.json').read_bytes()
            with self.assertRaisesRegex(ValueError, 'Duplicate'):
                publish([(first, HTML), (first, HTML)], output)
            with self.assertRaisesRegex(ValueError, 'source URL'):
                publish([({**first, 'set_id': 'ghi789'}, HTML)], output)
            self.assertEqual(previous, (output / 'cached.setlist.fm.json').read_bytes())

    def test_structure_annotations_and_unknown_details_survive(self):
        result = extract(HTML, URL, ITEM["expected"])
        self.assertEqual([s.get("name") for s in result["sets"]], ["First set", "Encore 2:"])
        self.assertTrue(result["sets"][0]["songs"][0]["tape"])
        song = result["sets"][0]["songs"][1]
        self.assertIn("extended outro", song["notes"])
        self.assertIn("Original Artist", song["notes"])
        self.assertIn("Guest", song["notes"])
        self.assertNotIn("Play Video", song["notes"])
        self.assertNotIn("times", result)
        self.assertNotIn("last_edit", result)
        self.assertEqual(result["notes"], "Note: Shortened due to rain.")

    def test_bad_source_does_not_replace_or_partially_publish_cache(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            publish([(ITEM, HTML)], output, "first")
            previous = {p.name: p.read_bytes() for p in output.glob("*.json")}
            wrong = copy.deepcopy(ITEM)
            wrong["artist_id"] = "wrong"
            wrong["expected"]["event_date"] = "2024-09-22"
            with self.assertRaisesRegex(ValueError, "Source mismatch"):
                publish([(ITEM, HTML.replace("Finale", "New Finale")), (wrong, HTML)], output, "second")
            self.assertEqual(previous, {p.name: p.read_bytes() for p in output.glob("*.json")})
            with self.assertRaisesRegex(ValueError, "markup missing"):
                publish([(ITEM, "<html>Rate limited</html>")], output)

    def test_revisions_preserved_and_ads_do_not_create_revisions(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            publish([(ITEM, HTML)], output, "first")
            initial = (output / "cached.setlist.fm.json").read_bytes()
            publish([(ITEM, HTML.replace("Unrelated advertisement", "New ad"))], output, "second")
            self.assertEqual(initial, (output / "cached.setlist.fm.json").read_bytes())
            self.assertEqual(len(list((output / "setlist-history").glob("*.json"))), 1)
            publish([(ITEM, HTML.replace("Finale", "New Finale"))], output, "third")
            self.assertEqual(len(list((output / "setlist-history").glob("*.json"))), 2)
            entry = json.loads((output / "cached.setlist.fm.meta.json").read_text())["entries"]["a:c"]
            self.assertEqual(entry["first_fetched_at"], "first")
            self.assertEqual(entry["last_fetched_at"], "third")
            self.assertEqual(len(entry["revisions"]), 2)

    def test_plain_tape_unknown_song_and_subvenue(self):
        html = HTML.replace('<span class="songLabel">Intro</span>', '<div class="songPart"><span>Intro</span></div>')
        html = html.replace('<span class="songLabel">Finale</span>', '<span class="unknownSong">Unknown</span>')
        html = html.replace('<a href="/venue/venue.html">Venue, City</a>', '<a href="/venue/room.html">Room</a>, <a href="/venue/venue.html">Venue, City</a>')
        expected = {**ITEM["expected"], "venue": "Room, Venue, City"}
        result = extract(html, URL, expected)
        self.assertEqual(result["sets"][0]["songs"][0], {"name": "Intro", "tape": True})
        self.assertEqual(result["sets"][1]["songs"][0]["name"], "Unknown")

    def test_schema_migration_updates_untouched_hashes(self):
        from refresh_setlists import save
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            old = {"source_url": URL, "sets": [{"kind": "set", "songs": [{"name": "Old", "source_text": "Old Play Video"}]}]}
            hashed = digest(canonical(old).encode())
            save(output / "cached.setlist.fm.json", {"old:c": old})
            save(output / "setlist-history" / (hashed + ".json"), old)
            save(output / "cached.setlist.fm.meta.json", {"schema_version": 1, "parser_version": 1, "entries": {"old:c": {"first_fetched_at": "old", "last_fetched_at": "old", "content_sha256": hashed, "revisions": [{"sha256": hashed, "first_seen_at": "old"}]}}})
            publish([(ITEM, HTML)], output, "new")
            cache = json.loads((output / "cached.setlist.fm.json").read_text())
            meta = json.loads((output / "cached.setlist.fm.meta.json").read_text())
            self.assertEqual(meta["entries"]["old:c"]["last_fetched_at"], "old")
            self.assertEqual(meta["entries"]["old:c"]["content_sha256"], digest(canonical(cache["old:c"]).encode()))
            self.assertTrue((output / "setlist-history" / (hashed + ".json")).exists())
            self.assertEqual(len(meta["entries"]["old:c"]["revisions"]), 2)

    def test_identity_matching_does_not_accept_other_cities_or_artists(self):
        from seed_setlists import matches
        target = {"artist": "Tash Sultana", "venue": "Greek Theatre – Berkeley", "event_date": "2019-09-29"}
        actual = {**target, "venue": "William Randolph Hearst Greek Theatre, Berkeley, CA, USA"}
        self.assertTrue(matches(actual, target))
        self.assertFalse(matches(actual, {**target, "venue": "Greek Theatre – Los Angeles"}))
        self.assertFalse(matches({**actual, "artist": "Someone Else"}, target))
        self.assertFalse(matches({**actual, "event_date": "2019-09-30"}, target))

    def test_key_encoding_and_current_sample_integrity(self):
        self.assertNotEqual(cache_key("a:b", "c"), cache_key("a", "b:c"))
        data = Path(__file__).resolve().parents[1] / "data"
        cache = json.loads((data / "cached.setlist.fm.json").read_text())
        meta = json.loads((data / "cached.setlist.fm.meta.json").read_text())
        self.assertTrue({"khruangbin:1oahei", "men-i-trust:1oahei"}.issubset(cache))
        for key, value in cache.items():
            hashed = digest(canonical(value).encode())
            self.assertEqual(hashed, meta["entries"][key]["content_sha256"])
            self.assertEqual(json.loads((data / "setlist-history" / (hashed + ".json")).read_text()), value)
        headliner = cache["khruangbin:1oahei"][0]
        self.assertEqual([len(s["songs"]) for s in headliner["sets"]], [12, 7, 3])
        self.assertIn("Emma", headliner["sets"][2]["songs"][0]["notes"])
        self.assertNotIn("times", cache["men-i-trust:1oahei"])


if __name__ == "__main__":
    unittest.main()
