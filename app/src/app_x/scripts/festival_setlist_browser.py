"""Loopback form for public festival DOM captures; never fetches external pages."""
import argparse
import hashlib
from html import escape
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs
from festival_setlists import DIRECTORIES, candidate_links, targets_for
from refresh_setlists import read, save
from seed_setlists import identity, norm

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--catalog', type=Path, required=True)
parser.add_argument('--work', type=Path, required=True)
args = parser.parse_args()
args.work.mkdir(parents=True, exist_ok=True)
folder = args.work / 'pages'
folder.mkdir(exist_ok=True)
targets = targets_for(read(args.catalog, {}))
manifest = read(args.work / 'browser-captures.json', {})
origin = 'http://127.0.0.1:8778'
candidate_queue = None


def path(url):
    return folder / (hashlib.sha256(url.encode()).hexdigest() + '.html')


def queue():
    global candidate_queue
    if candidate_queue is not None:
        return [url for url in candidate_queue if not path(url).exists()]
    urls = ['https://www.setlist.fm/festival/' + suffix for suffix in DIRECTORIES.values()]
    missing = [url for url in urls if not path(url).exists()]
    if missing:
        return missing
    result = []
    for cid, suffix in DIRECTORIES.items():
        directory = 'https://www.setlist.fm/festival/' + suffix
        artists = {norm(t['artist']) for t in targets if t['concert_id'] == cid}
        result.extend(x['url'] for x in candidate_links(path(directory).read_text(), directory) if norm(x['artist']) in artists)
    candidate_queue = list(dict.fromkeys(result))
    return [url for url in candidate_queue if not path(url).exists()]


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        pending = queue()
        url = pending[0] if pending else ''
        body = '<!doctype html><title>Festival capture</title><h1>Festival capture</h1>'
        body += f'<p id="progress">{len(manifest)} captured; {len(pending)} pending</p>'
        if url:
            body += f'<a id="source" href="{escape(url)}">Open source</a><form method="post"><label>Source URL<input name="url" id="url" value="{escape(url)}"></label><label>Page HTML<textarea name="html" id="capture"></textarea></label><button>Save page</button></form>'
        else:
            body += '<p>All directory candidates captured.</p>'
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(body.encode())

    def do_POST(self):
        if self.headers.get('Origin') != origin:
            self.send_error(403)
            return
        try:
            values = parse_qs(self.rfile.read(int(self.headers['Content-Length'])).decode())
            url, html = values['url'][0], values['html'][0]
            if not queue() or url != queue()[0]:
                raise ValueError('Capture must match current observed queue URL')
            details = {'identity': identity(html)} if '/setlist/' in url else {'links': len(candidate_links(html, url))}
            path(url).write_text(html)
            manifest[url] = details
            save(args.work / 'browser-captures.json', manifest)
            self.send_response(303)
            self.send_header('Location', '/')
            self.end_headers()
        except Exception as error:
            self.send_error(400, str(error))

    def log_message(self, *_):
        pass


print('Festival capture form: ' + origin, flush=True)
HTTPServer(('127.0.0.1', 8778), Handler).serve_forever()
