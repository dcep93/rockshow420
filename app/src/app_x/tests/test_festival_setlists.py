"""Guard matching against festival day mistakes and silent performance loss."""
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from festival_setlists import candidate_links, matches_target, targets_for

DIRECTORY = 'https://www.setlist.fm/festival/2024/example-123.html'
BACKLINK = '<a href="../../festival/2024/example-123.html">Festival</a>'


class FestivalResearchTests(unittest.TestCase):
    def test_program_day_and_documented_overnight_day_are_allowed(self):
        catalog = {'concerts': {'c': {'name': 'Festival', 'date': '2024-07-12', 'end_date': '2024-07-13', 'venue_id': 'v'}},
                   'venues': {'v': {'timezone': 'Europe/Lisbon'}}, 'artists': {'a': {'name': 'Example'}},
                   'schedules': {'c': {'sets': {'s': {'artist_id': 'a', 'day': '2024-07-13', 'start': '2024-07-14T01:00:00+01:00'}}}}}
        target = targets_for(catalog)[0]
        self.assertEqual(target['dates'], ['2024-07-13', '2024-07-14'])
        actual = {'artist': 'Example', 'event_date': '2024-07-13', 'venue': 'Main Stage, City'}
        self.assertTrue(matches_target(actual, target, BACKLINK, DIRECTORY))
        self.assertTrue(matches_target({**actual, 'event_date': '2024-07-14'}, target, BACKLINK, DIRECTORY))
        self.assertFalse(matches_target({**actual, 'event_date': '2024-07-12'}, target, BACKLINK, DIRECTORY))
        self.assertFalse(matches_target(actual, target, '<a href="/festival/other.html">Other festival</a>', DIRECTORY))

    def test_repeated_schedule_rows_remain_explicit_under_one_cache_key(self):
        catalog = {'concerts': {'c': {'name': 'Festival', 'date': '2024-07-12', 'end_date': '2024-07-13'}},
                   'venues': {}, 'artists': {'a': {'name': 'Example'}},
                   'schedules': {'c': {'sets': {'one': {'artist_id': 'a', 'day': '2024-07-12'}, 'two': {'artist_id': 'a', 'day': '2024-07-13'}}}}}
        target = targets_for(catalog)[0]
        self.assertTrue(target['repeated'])
        self.assertEqual(len(target['sets']), 2)
        self.assertEqual(target['key'], 'a:c')

    def test_incomplete_directory_capture_cannot_be_reported_as_absence(self):
        html = '<h1>Festival Setlists</h1><div>Showing <span>2 setlists</span></div><a href="/setlist/a/2024/a-123.html">A</a>'
        with self.assertRaisesRegex(ValueError, 'Incomplete directory'):
            candidate_links(html, DIRECTORY)
        links = candidate_links(html.replace('2 setlists', '1 setlists'), DIRECTORY)
        self.assertEqual(links, [{'artist': 'A', 'url': 'https://www.setlist.fm/setlist/a/2024/a-123.html'}])

    def test_verified_festival_membership_does_not_replace_artist_identity(self):
        actual = {'artist': 'Other Example', 'event_date': '2024-07-13'}
        target = {'artist': 'Example', 'dates': ['2024-07-13']}
        self.assertFalse(matches_target(actual, target, BACKLINK, DIRECTORY))


if __name__ == '__main__':
    unittest.main()
