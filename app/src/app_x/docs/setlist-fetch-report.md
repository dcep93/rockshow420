# Setlist discovery — 2026-10-08

All 462 saved artist/concert pairs were accounted for. 25 are today/future and were not queried. Catalog: saved production snapshot plus corrections and verified-time overlays; live Firestore was quota-blocked. Supporting-artist selections were ignored. No production concert records were changed.

| Outcome | Pairs |
|---|---:|
| ambiguous | 1 |
| cached | 265 |
| empty | 38 |
| future | 25 |
| needs_review | 9 |
| no_match | 124 |

Cache: 265 performances across 208 concerts. Empty means a matching source page has no reported songs. No match means the public artist/date search explicitly returned no setlists; it does not prove that no alternate listing exists.

## Review

| Artist | Date | App venue | Source candidates |
|---|---|---|---|
| Law | 2020-02-21 | Cornerstone | [Unwritten Law — Leisure Inn, Rockingham, Australia](https://www.setlist.fm/setlist/unwritten-law/2020/leisure-inn-rockingham-australia-6b987296.html) |
| Lawrence | 2024-12-31 | City Winery New York | [Lawrence — City Winery Vineyard, New York, NY, USA](https://www.setlist.fm/setlist/lawrence/2024/city-winery-vineyard-new-york-ny-5b5c6314.html) |
| Rise Against | 2021-08-22 | Bill Graham Civic Auditorium | [Rise Against — Masonic Auditorium, San Francisco, CA, USA](https://www.setlist.fm/setlist/rise-against/2021/masonic-auditorium-san-francisco-ca-2b8c98ca.html) |
| Robert Glasper | 2023-11-04 | Brooklyn Music School | [Robert Glasper — Blue Note Jazz Club, New York, NY, USA](https://www.setlist.fm/setlist/robert-glasper/2023/blue-note-jazz-club-new-york-ny-7ba04674.html); [Robert Glasper — Blue Note Jazz Club, New York, NY, USA](https://www.setlist.fm/setlist/robert-glasper/2023/blue-note-jazz-club-new-york-ny-6ba04676.html) |
| Tash Sultana | 2019-09-29 | Greek Theatre – Los Angeles | [Tash Sultana — William Randolph Hearst Greek Theatre, Berkeley, CA, USA](https://www.setlist.fm/setlist/tash-sultana/2019/william-randolph-hearst-greek-theatre-berkeley-ca-639c0e6b.html) |
| The California Honeydrops | 2020-09-12 | Solano County Fairgrounds | [The California Honeydrops — Sweetwater Music Hall, Mill Valley, CA, USA](https://www.setlist.fm/setlist/the-california-honeydrops/2020/sweetwater-music-hall-mill-valley-ca-385c1ab.html) |
| The Teskey Brothers | 2019-09-29 | Greek Theatre – Los Angeles | [The Teskey Brothers — William Randolph Hearst Greek Theatre, Berkeley, CA, USA](https://www.setlist.fm/setlist/the-teskey-brothers/2019/william-randolph-hearst-greek-theatre-berkeley-ca-6b9c0e6a.html) |
| Victor Wooten | 2018-01-12 | The Regency Ballroom | [Victor Wooten Trio — The Regency Ballroom, San Francisco, CA, USA](https://www.setlist.fm/setlist/victor-wooten-trio/2018/the-regency-ballroom-san-francisco-ca-63e17a3b.html) |
| Vulfpeck | 2023-11-12 | Avant Gardner – Great Hall | [Vulfpeck — The Great Hall at Avant Gardner, Brooklyn, NY, USA](https://www.setlist.fm/setlist/vulfpeck/2023/the-great-hall-at-avant-gardner-brooklyn-ny-3a1d5cb.html); [Vulfpeck — The Great Hall at Avant Gardner, Brooklyn, NY, USA](https://www.setlist.fm/setlist/vulfpeck/2023/the-great-hall-at-avant-gardner-brooklyn-ny-3a1d5db.html) |
| ZOLA | 2020-01-23 | Swedish American Hall | [ZOLA — Café du Nord, San Francisco, CA, USA](https://www.setlist.fm/setlist/zola/2020/cafe-du-nord-san-francisco-ca-1398ad21.html) |

## Events without artist IDs

31 saved events have no artist/concert pair to look up. These include festivals and non-musical entries. No artist IDs or festival lineups were invented.

- 2023-10-31 — Habbaween (`1glyhb`)
- 2019-07-13 — NOS Alive (`37a4hj`)
- 2024-05-27 — Primavera Sound Barcelona (`3s9mjj`)
- 2025-09-26 — All Things Go (`65mer9`)
- 2019-09-11 — Hamilton (`7csr7y`)
- 2025-06-06 — Governors Ball (`7zj1wf`)
- 2019-09-21 — Sonoma Harvest Music Festival (`81bzyp`)
- 2024-08-01 — Gen Con (`848240`)
- 2018-08-10 — Outside Lands (`8nhjof`)
- 2023-04-15 — The Taylor Party (`ak38f6`)
- 2024-07-27 — New York City Tattoo Arts Convention (`be1uk3`)
- 2024-08-10 — Illinoise (`blavfl`)
- 2019-08-09 — Outside Lands (`brv1d9`)
- 2021-09-03 — BottleRock Napa Valley (`c26k26`)
- 2024-06-07 — Governors Ball (`cy53a8`)
- 2024-04-13 — Gimme Gimme Disco (`ejctaz`)
- 2024-05-10 — Kilby Block Party (`fuaiif`)
- 2023-07-29 — Look What You Made Me Do – A Taylor Swift Party (`hd8krk`)
- 2025-05-20 — Glengarry Glen Ross (`how1st`)
- 2020-05-22 — BottleRock Napa Valley (`hwtzpg`)
- 2023-09-09 — Recital (`jit457`)
- 2018-11-09 — Reel Rock (`ls23su`)
- 2018-09-09 — The Phantom of the Opera (`nminnq`)
- 2024-03-09 — Shakedown Beats (`sljutr`)
- 2023-08-03 — Lollapalooza (`ub5qri`)
- 2023-07-21 — Taylor Swift Rave (`utyehg`)
- 2020-02-16 — Gatz (`vkv4ky`)
- 2026-08-07 — Outside Lands (`xuwdm1`)
- 2021-07-29 — Lollapalooza (`yyea3y`)
- 2024-12-27 — Life and Trust (`zocc87`)
- 2024-01-20 — The Taylor Party (`zr5e64`)

## Full outcomes

The machine-readable `setlist-fetch-progress.json` includes every target, source URL, empty page, rejected candidate and search result. All 124 `no_match` records have `search_verified: true`. Original page/DOM captures are retained in the dated `_codex_output/concertboxd/setlist-bulk-2026-10-08/pages` directory.
