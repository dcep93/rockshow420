"""Find artist profiles through credited artists on public Spotify song pages."""
import argparse
import re
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from setlist_page import Tree, text
from seed_setlists import norm
from refresh_setlists import read, save, digest


def credited_profiles(html, name):
    root = Tree(html).root
    credited = {n.attrs.get('content', '') for n in root.all(lambda n: n.tag == 'meta' and n.attrs.get('name') == 'music:musician')}
    found = []
    for node in root.all(lambda n: n.tag == 'a'):
        match = re.fullmatch(r'(?:https://open\.spotify\.com)?/artist/([A-Za-z0-9]{22})', node.attrs.get('href', ''))
        if match and norm(text(node)) == norm(name) and 'https://open.spotify.com/artist/' + match[1] in credited:
            found.append(match[1])
    return list(dict.fromkeys(found))


def recover(work):
    state = read(work / 'spotify-progress.json', {})
    folder = work / 'spotify-credit-pages'
    folder.mkdir(exist_ok=True)
    evidence = read(work / 'spotify-credit-evidence.json', {})
    for key, row in list(state.items()):
        if row['status'] != 'no_spotify_match': continue
        path = work / 'search' / (key + '.json')
        source = read(path, {})
        pages = []
        for block in re.split(r'-{10,}\n', source['result']):
            heading = block.strip().splitlines()[0] if block.strip() else ''
            match = re.search(r'https://open\.spotify\.com/(?:intl-[^/]+/)?track/([A-Za-z0-9]{22})', heading)
            # Exact artist identity is checked against the page's own credits below.
            if match and norm(row['name']) in norm(heading.split('https://')[0]):
                pages.append('https://open.spotify.com/track/' + match[1])
        ids = []
        for url in list(dict.fromkeys(pages))[:2]:
            saved = folder / (url.rsplit('/', 1)[1] + '.html')
            try:
                if not saved.exists():
                    time.sleep(0.5)
                    with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US'}), timeout=20) as response:
                        if not response.url.startswith('https://open.spotify.com/'): raise ValueError('Unexpected redirect')
                        html = response.read().decode()
                    if any(s in html.lower() for s in ('verify you are human', 'captcha', 'access denied')):
                        raise RuntimeError('Spotify access challenge; stop')
                    saved.write_text(html)
                found = credited_profiles(saved.read_text(), row['name'])
                if found:
                    ids.extend(found)
                    evidence.setdefault(key, []).append({'url': url, 'profile_ids': found, 'source_html_sha256': digest(saved.read_bytes())})
            except HTTPError as error:
                if error.code in (403, 429): raise
            except (ValueError, OSError): pass
        if ids:
            for profile in dict.fromkeys(ids):
                source['result'] += '\n----------------\n' + row['name'] + ' | Spotify (https://open.spotify.com/artist/' + profile + ')\nVerified credit on public Spotify track page.'
            save(path, source)
            del state[key]
            print(row['name'], list(dict.fromkeys(ids)), flush=True)
    save(work / 'spotify-credit-evidence.json', evidence)
    save(work / 'spotify-progress.json', state)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('work', type=Path)
    recover(parser.parse_args().work)
