"""Transcribed published musical numbers, verified against the linked productions.

These are production programs, not date-specific performance reports or recordings.
Run only after reviewing the cited sources. No artist IDs are invented for musicals.
"""
from song_sources import publish_sources


def section(name, titles):
    return {'name': name, 'songs': [{'name': x} for x in titles.split('\n') if x]}


programs = {
    '7csr7y': {
        'kind': 'musical_program', 'title': 'Hamilton',
        'url': 'https://ibdb.blob.core.windows.net/ibdb/media/documents/05d0fc44-ec5d-4e0e-b5ee-be7e39816dd4SHNS1902HA_singles_v3%5B2%5D.pdf',
        'production': 'San Francisco, Orpheum Theatre, 2019',
        'basis': 'Published production program; exact performance unverified',
        'notes': 'Musical numbers printed in the February–April 2019 program, page 12. The saved event is September 11. This program groups or omits some passages and is not the complete cast-album track list.',
        'sets': [section('Act 1', '''Alexander Hamilton
My Shot
The Story of Tonight
The Schuyler Sisters
Farmer Refuted
You’ll Be Back
Right Hand Man
Helpless
Satisfied
Wait for It
Stay Alive
Ten Duel Commandments
That Would Be Enough
History Has Its Eyes on You
Yorktown
Dear Theodosia
Non-Stop'''), section('Act 2', '''What’d I Miss
Take a Break
Say No to This
The Room Where It Happens
Schuyler Defeated
Washington on Your Side
One Last Time
The Adams Administration
Hurricane
The Reynolds Pamphlet
Burn
Blow Us All Away
It’s Quiet Uptown
The Election of 1800
Your Obedient Servant
The World Was Wide Enough
Finale''')],
    },
    'nminnq': {
        'kind': 'musical_program', 'title': 'The Phantom of the Opera',
        'url': 'https://www.ibdb.com/tour-production/the-phantom-of-the-opera--500558',
        'production': '2013–2020 North American tour, Orpheum Theatre September 2018',
        'basis': 'Published production program; exact performance unverified',
        'notes': 'IBDB musical numbers for the touring production that played San Francisco September 5–30, 2018. Matinee versus evening on September 9 is unknown.',
        'sets': [section('Act 1', '''Think of Me
Angel of Music
Little Lotte/The Mirror (Angel of Music)
The Phantom of the Opera
The Music of the Night
I Remember/Stranger Than You Dreamt It
Magical Lasso
Notes/Prima Donna
Poor Fool, He Makes Me Laugh
Why Have You Brought Me Here/Raoul I've Been There
All I Ask of You
All I Ask of You (Reprise)'''), section('Act 2', '''Masquerade/Why So Silent
Notes/Twisted Every Way
Wishing You Were Somehow Here Again
Wandering Child/Bravo, Bravo
The Point of No Return
Down Once More/Track Down This Murderer''')],
    },
    'blavfl': {
        'kind': 'musical_program', 'title': 'Illinoise',
        'url': 'https://www.ibdb.com/broadway-production/illinoise-539118',
        'production': 'Broadway, St. James Theatre, April 24–August 10, 2024',
        'basis': 'Published production program; exact performance unverified',
        'notes': 'IBDB song order for the Broadway production; the saved event falls on its closing date. Production titles differ from the original Illinois album.',
        'sets': [section('Program', '''Prologue (or, A Conjunction of Drones...)
Three Stars (or, Concerning the UFO Sighting near Highland, Illinois)
The Long Hike
Come On! Feel the Illinoise!
a story about Jacksonville
a story about Zombies
a story about John Wayne Gacy, Jr.
a story about The Man of Metropolis
Decatur
Chicago
To the Workers of the Rock River Valley Region, I Have an Idea Concerning Your Predicament
Casimir Pulaski Day
Prairie Fire That Wanders About
The Predatory Wasp of the Palisades Is Out to Get Us!
In This Temple as in the Hearts of Man for Whom He Saved the Earth
The Seer's Tower
A Conjunction of Drones, again
Chicago (Reprise)
The Tallest Man, the Broadest Shoulders
Epilogue (or, Riffs and Variations... Out of Egypt...)''')],
    },
}

if __name__ == '__main__':
    publish_sources('musicals', programs)
    print({k: sum(len(s['songs']) for s in v['sets']) for k,v in programs.items()})
