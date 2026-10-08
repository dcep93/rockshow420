"""Resolve saved web-search candidates and capture Spotify's public top-track HTML."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from urllib.parse import unquote
from refresh_setlists import DATA, read, save, digest
from song_sources import spotify_tracks, publish_sources
from seed_setlists import norm


def candidate_ids(raw, name):
    candidates = []
    # Search-result headings, not unrelated artists mentioned inside snippets.
    for block in re.split(r'-{10,}\n', raw):
        block = block.strip('\n')
        heading = block.splitlines()[0] if block.splitlines() else ''
        match = re.search(r'https://open\.spotify\.com/(?:intl-[^/\s]+/|embed/)?artist/([A-Za-z0-9]{22})', heading)
        if not match and ('https://open.spotify.com/embed?' in heading or 'https://embed.spotify.com/' in heading):
            match = re.search(r'spotify:artist:([A-Za-z0-9]{22})', unquote(heading))
        # Directory URLs can identify the artist; song data still comes only from Spotify.
        if not match:
            match = re.search(r'https://(?:www\.)?kworb\.net/spotify/artist/([A-Za-z0-9]{22})_', heading)
        if not match:
            match = re.search(r'https://www\.musicmetricsvault\.com/artists/[^/]+/([A-Za-z0-9]{22})', heading)
        if not match: continue
        title = heading[:heading.index('https://')].rstrip(' (').split(' | Spotify')[0]
        title = re.split(r' - Top tracks| Tickets - | - Spotify ', title)[0]
        if norm(title) == norm(name) or (not title.strip() and f'{name}·Top tracks'.casefold() in block.casefold()):
            candidates.append(match[1])
    return list(dict.fromkeys(candidates))


def collect(work):
    (work / 'spotify-pages').mkdir(exist_ok=True)
    state = read(work / 'spotify-progress.json', {})
    for path in sorted((work / 'search').glob('*.json')):
        row = read(path, {})
        artist = row['artist']
        key = artist['id']
        if key in state: continue
        raw = row['result'] if isinstance(row['result'], str) else json.dumps(row['result'])
        candidates = candidate_ids(raw, artist['name'])
        result = {**artist, 'status': 'no_spotify_match', 'candidates': candidates}
        matched, failures = [], []
        for spotify_id in candidates[:5]:
            url = 'https://open.spotify.com/embed/artist/' + spotify_id
            saved = work / 'spotify-pages' / (spotify_id + '.html')
            try:
                if saved.exists(): html = saved.read_text()
                else:
                    time.sleep(0.5)
                    with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9'}), timeout=20) as response:
                        if not response.url.startswith('https://open.spotify.com/'):
                            raise ValueError('Unexpected redirect')
                        html = response.read().decode()
                    if any(s in html.lower() for s in ('verify you are human','captcha','access denied')):
                        raise RuntimeError('Spotify access challenge; stop')
                    saved.write_text(html)
                parsed = spotify_tracks(html, url, artist['name'])
                matched.append((parsed, html))
            except HTTPError as error:
                if error.code in (403,429): raise RuntimeError(f'Spotify HTTP {error.code}; stop') from error
                failures.append({'url':url, 'reason':str(error)})
            except (ValueError,OSError) as error:
                failures.append({'url':url, 'reason':str(error)})
        if len(candidates)>5:
            result.update(status='ambiguous', reason='More than five artist candidates')
        elif len(matched)==1:
            item, html = matched[0]
            publish_sources('spotify', {key:item}, source_hashes={key:digest(html.encode())})
            result.update(status='cached', url=item['url'], count=len(item['songs']))
        elif len(matched)>1:
            result.update(status='ambiguous', matched_urls=[x[0]['url'] for x in matched])
        elif candidates:
            result['status']='needs_review'
        if failures: result['candidate_errors']=failures
        state[key]=result
        save(work/'spotify-progress.json',state)
        save(DATA.parent/'docs/spotify-fetch-progress.json',state)
        print(json.dumps({'processed':len(state),'artist':artist['name'],'status':result['status'],'counts':dict(Counter(x['status'] for x in state.values()))}),flush=True)
    return state


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('work',type=Path)
    args=parser.parse_args()
    collect(args.work)
