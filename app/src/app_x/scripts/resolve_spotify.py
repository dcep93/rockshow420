"""Disambiguate names only when multiple exact song titles corroborate one profile."""
from collections import Counter
from pathlib import Path
import argparse
from urllib.parse import unquote
from refresh_setlists import DATA,read,save,digest
from song_sources import spotify_tracks,publish_sources
from seed_setlists import norm


def resolve(work):
    state=read(work/'spotify-progress.json',{})
    setlists=read(DATA/'cached.setlist.fm.json',{})
    songs={}
    for key,row in setlists.items():
        artist=unquote(key.split(':')[0]);songs.setdefault(artist,set()).update(norm(s['name']) for section in row['sets'] for s in section['songs'] if not s.get('tape'))
    for key,row in state.items():
        if row['status']!='ambiguous':continue
        options=[]
        for id in row['candidates']:
            path=work/'spotify-pages'/(id+'.html')
            if not path.exists():continue
            url='https://open.spotify.com/embed/artist/'+id
            try:value=spotify_tracks(path.read_text(),url,row['name'])
            except ValueError:continue
            overlap=sorted({norm(s['name']) for s in value['songs']} & songs.get(key,set()))
            options.append((len(overlap),overlap,value,path))
        options.sort(key=lambda o:o[0],reverse=True)
        if options and options[0][0]>=2 and (len(options)==1 or options[1][0]==0):
            _,overlap,value,path=options[0]
            publish_sources('spotify',{key:value},source_hashes={key:digest(path.read_bytes())})
            row.update(status='cached',url=value['url'],count=len(value['songs']),identity_basis='Exact name and multiple song titles matched the saved performance setlists',matched_song_titles=overlap)
            print('Resolved',row['name'],len(overlap),flush=True)
    # A failed/ambiguous refresh must never erase a previously verified list.
    # Explicitly withdrawn identities are handled separately with review evidence.
    save(work/'spotify-progress.json',state);save(DATA.parent/'docs/spotify-fetch-progress.json',state)
    print(dict(Counter(v['status'] for v in state.values())))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('work',type=Path);args=parser.parse_args();resolve(args.work)
