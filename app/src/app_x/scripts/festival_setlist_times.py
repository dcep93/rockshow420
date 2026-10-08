"""Export reported times from captured public pages without changing song caches."""
import argparse
import hashlib
from pathlib import Path
from festival_setlists import artist_norm, candidate_links, DIRECTORIES
from refresh_setlists import read, save
from seed_setlists import identity
from setlist_page import Tree, text


def export_times(work):
    expected = {}
    for suffix in DIRECTORIES.values():
        url = 'https://www.setlist.fm/festival/' + suffix
        path = work / 'pages' / (hashlib.sha256(url.encode()).hexdigest() + '.html')
        if path.exists():
            for candidate in candidate_links(path.read_text(), url):
                expected[candidate['url']] = candidate['artist']
    records = []
    for url in read(work / 'browser-captures.json', {}):
        if '/setlist/' not in url:
            continue
        path = work / 'pages' / (hashlib.sha256(url.encode()).hexdigest() + '.html')
        if not path.exists():
            continue
        html = path.read_text()
        actual = identity(html)
        if artist_norm(actual['artist']) != artist_norm(expected.get(url, '')):
            continue
        root = Tree(html).root
        timeline = root.first(lambda n: n.has('setTimesTimeline'))
        if not timeline:
            continue
        values = {}
        for field in ('doors', 'scheduled', 'start', 'end'):
            node = timeline.first(lambda n: n.has(field))
            strong = node.first(lambda n: n.tag == 'strong') if node else None
            if strong:
                values[field] = text(strong)
        if values:
            records.append({'url': url, **actual, 'times': values, 'evidence_text': text(timeline)})
    save(work / 'captured-performance-times.json', records)
    return len(records)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('work', type=Path)
    print(export_times(parser.parse_args().work))
