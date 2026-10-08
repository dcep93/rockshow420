"""Typed static song caches. Public page facts only; no service API calls."""
from datetime import datetime, timezone
from pathlib import Path
import re
from refresh_setlists import DATA, read, save, canonical, digest
from seed_setlists import norm
from setlist_page import Tree, text


def spotify_tracks(html, url, expected_artist):
    if not re.fullmatch(r'https://open\.spotify\.com/embed/artist/[A-Za-z0-9]{22}(?:\?[^#]*)?', url):
        raise ValueError('Expected public Spotify artist embed')
    root = Tree(html).root
    heading = root.first(lambda n: n.attrs.get('data-testid', '').startswith('initialized-'))
    label = text(heading)
    if not label.endswith('·Top tracks'):
        raise ValueError('Artist top tracks heading missing')
    artist = label[:-len('·Top tracks')]
    if norm(artist) != norm(expected_artist):
        raise ValueError(f'Artist mismatch: {artist}')
    rows = root.all(lambda n: n.tag == 'li' and n.attrs.get('data-testid', '').startswith('tracklist-row-'))
    if not rows or len(rows) > 10:
        raise ValueError(f'Expected 1–10 ranked songs; found {len(rows)}')
    songs = []
    for index, row in enumerate(rows):
        if row.attrs['data-testid'] != f'tracklist-row-{index}':
            raise ValueError('Unexpected track order')
        name = text(row.first(lambda n: n.tag == 'h3'))
        credit_node = row.first(lambda n: n.tag == 'h4')
        badges = credit_node.all(lambda n: n.attrs.get('aria-label') == 'Explicit') if credit_node else []
        for badge in badges:
            badge.children = []
        credits = text(credit_node)
        if not name or not credits:
            raise ValueError('Track name or artist credit missing')
        songs.append({'name': name, 'artists': credits, **({'explicit': True} if badges else {})})
    return {'kind': 'spotify_top_tracks', 'url': url, 'artist': artist, 'songs': songs[:5]}


def publish_sources(stem, records, output=DATA, fetched_at=None, source_hashes=None, reprocessed=False):
    if stem not in ('spotify', 'musicals'):
        raise ValueError('Unknown song cache')
    expected = 'spotify_top_tracks' if stem == 'spotify' else 'musical_program'
    for key, item in records.items():
        if not key or item.get('kind') != expected or not item.get('url'):
            raise ValueError('Invalid typed source')
        if stem == 'spotify' and not 1 <= len(item.get('songs', [])) <= 5:
            raise ValueError('Invalid top track count')
        if stem == 'musicals' and (not item.get('sets') or not item.get('basis')):
            raise ValueError('Missing production program or basis')
    stamp = fetched_at or datetime.now(timezone.utc).isoformat()
    cache_path = output / f'cached.{stem}.json'
    meta_path = output / f'cached.{stem}.meta.json'
    cache = read(cache_path, {})
    meta = read(meta_path, {'schema_version': 1, 'entries': {}})
    meta['parser_version'] = 3 if stem == 'spotify' else 1
    for key, item in records.items():
        hashed = digest(canonical(item).encode())
        entry = meta['entries'].setdefault(key, {'first_fetched_at': stamp, 'revisions': []})
        entry['content_sha256'] = hashed
        entry['last_processed_at' if reprocessed else 'last_fetched_at'] = stamp
        if source_hashes and key in source_hashes:
            entry['source_html_sha256'] = source_hashes[key]
        if not any(r['sha256'] == hashed for r in entry['revisions']):
            entry['revisions'].append({'sha256': hashed, 'first_seen_at': stamp})
        path = output / 'song-source-history' / f'{hashed}.json'
        if path.exists() and path.read_text() != canonical(item):
            raise ValueError('Archived content hash mismatch')
        if not path.exists(): save(path, item)
        cache[key] = item
    save(meta_path, meta)
    save(cache_path, cache)
