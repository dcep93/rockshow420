import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from song_sources import spotify_tracks,publish_sources
from refresh_setlists import canonical,digest
from collect_spotify import candidate_ids
from spotify_credits import credited_profiles

URL='https://open.spotify.com/embed/artist/2mVVjNmdjXZZDvhgQWiakk'
HTML='<div data-testid="initialized-false">Example·Top tracks</div><li data-testid="tracklist-row-0"><h3>One</h3><h4>Example, Guest</h4></li>'

class SongSourcesTests(unittest.TestCase):
    def test_rank_and_identity_are_validated(self):
        value=spotify_tracks(HTML,URL,'Example')
        self.assertEqual(value['kind'],'spotify_top_tracks')
        self.assertEqual(value['songs'],[{'name':'One','artists':'Example, Guest'}])
        with self.assertRaisesRegex(ValueError,'Artist mismatch'):spotify_tracks(HTML,URL,'Different')
        with self.assertRaisesRegex(ValueError,'track order'):spotify_tracks(HTML.replace('row-0','row-2'),URL,'Example')
        with self.assertRaisesRegex(ValueError,'heading missing'):spotify_tracks('<h1>Access denied</h1>',URL,'Example')
        explicit = spotify_tracks(HTML.replace('<h4>', '<h4><span aria-label="Explicit">E</span>'), URL, 'Example')
        self.assertEqual(explicit['songs'][0], {'name':'One', 'artists':'Example, Guest', 'explicit':True})

    def test_top_five_retains_ranking_and_reprocessing_keeps_fetch_date(self):
        html='<div data-testid="initialized-false">Example·Top tracks</div>'+''.join(f'<li data-testid="tracklist-row-{i}"><h3>Song {i}</h3><h4>Example</h4></li>' for i in range(10))
        value=spotify_tracks(html,URL,'Example')
        self.assertEqual([s['name'] for s in value['songs']], [f'Song {i}' for i in range(5)])
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)
            publish_sources('spotify',{'artist':value},output,'fetched')
            publish_sources('spotify',{'artist':value},output,'processed',reprocessed=True)
            entry=json.loads((output/'cached.spotify.meta.json').read_text())['entries']['artist']
            self.assertEqual(entry['last_fetched_at'],'fetched')
            self.assertEqual(entry['last_processed_at'],'processed')

    def test_unrelated_search_results_are_not_artist_candidates(self):
        raw='Other | Spotify (https://open.spotify.com/artist/1WgXqy2Dd70QQOU7Ay074N)\nmentions Example\n----------------\nExample | Spotify ('+URL+')\nExample bio'
        self.assertEqual(candidate_ids(raw,'Example'),['2mVVjNmdjXZZDvhgQWiakk'])

    def test_search_separator_and_duplicate_artist_names(self):
        raw='Example | Spotify ('+URL+')\nbody----------------\nExample | Spotify (https://open.spotify.com/artist/1WgXqy2Dd70QQOU7Ay074N)\nbody'
        self.assertEqual(candidate_ids(raw,'Example'),['2mVVjNmdjXZZDvhgQWiakk','1WgXqy2Dd70QQOU7Ay074N'])

    def test_track_credits_exclude_uncredited_same_name_links(self):
        html='<meta name="music:musician" content="https://open.spotify.com/artist/2mVVjNmdjXZZDvhgQWiakk"><a href="/artist/2mVVjNmdjXZZDvhgQWiakk">Example</a><a href="/artist/1WgXqy2Dd70QQOU7Ay074N">Example</a>'
        self.assertEqual(credited_profiles(html,'Example'),['2mVVjNmdjXZZDvhgQWiakk'])

    def test_history_and_kind_validation(self):
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder);value=spotify_tracks(HTML,URL,'Example')
            publish_sources('spotify',{'artist':value},output,'first')
            publish_sources('spotify',{'artist':value},output,'second')
            self.assertEqual(len(list((output/'song-source-history').glob('*.json'))),1)
            value['songs'][0]['name']='Updated'
            publish_sources('spotify',{'artist':value},output,'third')
            self.assertEqual(len(list((output/'song-source-history').glob('*.json'))),2)
            previous=(output/'cached.spotify.json').read_bytes()
            with self.assertRaises(ValueError):publish_sources('spotify',{'wrong':{'kind':'setlist_fm','url':URL}},output)
            self.assertEqual(previous,(output/'cached.spotify.json').read_bytes())

    def test_current_caches_are_typed_and_hashed(self):
        data=Path(__file__).resolve().parents[1]/'data'
        for stem,kind in [('spotify','spotify_top_tracks'),('musicals','musical_program'),('setlist.fm','setlist_fm')]:
            cache=json.loads((data/f'cached.{stem}.json').read_text());meta=json.loads((data/f'cached.{stem}.meta.json').read_text())
            for key,value in cache.items():
                self.assertEqual(value['kind'],kind)
                if stem == 'spotify': self.assertLessEqual(len(value['songs']),5)
                self.assertEqual(meta['entries'][key]['content_sha256'],digest(canonical(value).encode()))
                self.assertNotIn('source_classes',json.dumps(value))
                self.assertNotIn('source_links',json.dumps(value))
                self.assertNotIn('last_edit',value)

if __name__=='__main__':unittest.main()
