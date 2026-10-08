# Spotify festival enrichment — October 8, 2026

Reviewed the expanded local catalog of **1387 artists**. **1187 artists have public Spotify ranked lists**, including **900 additions**; all 287 previous payloads are unchanged. There are **5901 ranked song entries**, capped at five per artist.

**1176 artists expose five tracks; 11 expose fewer. 200 artists remain unresolved or have no public ranked tracks.** Every missing artist received a discovery/candidate pass. A missing match does not prove no Spotify recording exists.

## Identity and source review

- Song titles and rank come only from captured public Spotify artist embeds; recording credits and official artist/label links corroborate difficult identities. No music-service APIs were used.
- The festival archive’s IDs are discovery hints. Wrong-name and wrong-repertoire matches were rejected, including same-name Interpol, The Garden, Griff, phem, Glove, Elohim, Carola, BabyJake, Rence and Poolside profiles. Their correct profiles were recovered from official links or corroborated recording credits.
- The Thing uses its Brooklyn band’s official profile. Petey uses the renamed Petey USA profile. Joint bills, tribute acts and local performers never inherit another performer’s catalog.
- Identical duplicate-profile catalogs were resolved through public recording credits; ambiguous different catalogs remain withheld unless multiple songs match independently saved performance setlists.
- Original local/tribute exceptions remain unresolved without stronger identity evidence, even when a same-name recording credit is found.
- Official websites for Griff and Rachel Chinouriri returned HTTP 403 and were not retried. Their Spotify identities were independently corroborated using public recording credits. No Spotify 403/429/challenge occurred.
- Retired catalog IDs (Lauren Sanderson, Maz, Kidd Revel and Wu-Tang Clan) are excluded from current cache coverage; immutable research history remains. The combined Maz & Kidd Revel bill is separately unresolved.

## Remaining statuses

| Status | Artists |
|---|---:|
| ambiguous | 57 |
| needs_review | 18 |
| no_ranked_tracks | 3 |
| no_spotify_match | 122 |

## Public lists shorter than five

| Artist | Tracks |
|---|---:|
| [Aines](https://open.spotify.com/embed/artist/1JxQwWa6ZP0xGTh3LHgctB) | 2 |
| [Andre Power](https://open.spotify.com/embed/artist/6ilBbQy2gAe1KclVLxRMZP) | 4 |
| [DJ Heavy](https://open.spotify.com/embed/artist/7EtT1fkAgM7MjJ2d4ecDdR) | 1 |
| [Dj Playero](https://open.spotify.com/embed/artist/7HZ3dOfMWYvts1LC9fJq44) | 2 |
| [Hotline TNT](https://open.spotify.com/embed/artist/5DDuwU1X2Aqdp3CxfXstRe) | 4 |
| [Isa Rojas](https://open.spotify.com/embed/artist/1NyicQvZfj7h85jm2fAJ2N) | 2 |
| [Jake Duby](https://open.spotify.com/embed/artist/0YaAdRRY6VABRNgGniK7NN) | 2 |
| [Jauz](https://open.spotify.com/embed/artist/5pzqxek11nSUythmdLZnW7) | 1 |
| [Joanna Newsom](https://open.spotify.com/embed/artist/4gn6f5jaOO75s0oF7ozqGG) | 1 |
| [King Gizzard & the Lizard Wizard](https://open.spotify.com/embed/artist/6XYvaoDGE0VmRt83Jss9Sn) | 1 |
| [Lisabö](https://open.spotify.com/embed/artist/6D93wXOGzYm3uii0eKOwnV) | 1 |

## Final major-artist identity pass

All ten requested major-artist checks were resolved through official profile links, official discographies or recording credits: Blondie, James Blake, Pulp, Arca, Duster, Pond, CSS, billy woods, Tourist and Quarters of Change. Quarters of Change now performs as Quarters; the primary promoter documents this rename.

Official sites for Blondie and James Blake returned HTTP 403; Pond and Tourist website checks encountered challenges. Those accesses stopped, and independent public label/artist sources supplied corroboration. TAGABOW’s alias to They Are Gutting a Body of Water is confirmed by ATO, but its additional SoundCloud check encountered a challenge and its cache remains withheld.

| Artist | Identity basis | Evidence |
|---|---|---|
| Arca | Multiple distinctive official discography titles match the public artist ranked list | [source 1](https://www.xlrecordings.com/releases/xxxxx), [source 2](https://open.spotify.com/track/2ZFu40Ik8VsUE9H87W0MmZ) |
| billy woods | Official label identifies recording; public Spotify recording credits identify artist profile | [source 1](https://backwoodzstudioz.com/pages/billy-woods), [source 2](https://open.spotify.com/album/0HmKhR7Umt3ACs52ZLnKyK) |
| Blondie | Official artist/label profile link | [source 1](https://blondie.lnk.to/Streaming) |
| CSS | Official artist/label profile link | [source 1](https://www.subpop.com/artists/css) |
| Duster | Multiple distinctive official discography titles match the public artist ranked list | [source 1](https://unrecovery.org/) |
| James Blake | Official label identifies recording; public Spotify recording credits identify artist profile | [source 1](https://www.universal-music.co.jp/james-blake/products/00602435230337/), [source 2](https://open.spotify.com/track/5WfACgyEk4rwdWU3rrzNt1) |
| Pond | Official artist/label profile link | [source 1](https://linktr.ee/Pondband) |
| Pulp | Multiple distinctive official discography titles match the public artist ranked list | [source 1](https://www.universal-music.co.jp/pulp/products/00044006351322/) |
| Quarters of Change | Official artist profile link plus primary promoter confirmation of rename to Quarters | [source 1](https://ffm.bio/quartersofchange), [source 2](https://first-avenue.com/event/2026-03-quarters/) |
| Tourist | Official artist/label profile link | [source 1](https://officialtourist.bandcamp.com/music) |

## Remaining artist review queue

| Artist | Status |
|---|---|
| 3phaz | ambiguous |
| Acidnena | no_spotify_match |
| Adrasha | no_spotify_match |
| Aidan Corcoran | no_spotify_match |
| AJNA (US) | no_spotify_match |
| Alina Kobialka | no_spotify_match |
| ALLBLACK | ambiguous |
| Amble | ambiguous |
| Anderson .Paak & The Free Nationals | no_spotify_match |
| Anruna | no_spotify_match |
| Arielle Lana | no_spotify_match |
| Arlie | ambiguous |
| aya | ambiguous |
| Bad Juuju | no_spotify_match |
| Badfish | needs_review |
| Balma | ambiguous |
| Bapari | no_spotify_match |
| Beau Beau Honeydrops | no_spotify_match |
| Bella De Leon | no_spotify_match |
| Benson | ambiguous |
| Berlioz | ambiguous |
| Beya | no_spotify_match |
| Bikoko | no_spotify_match |
| Bill Kouligas | no_spotify_match |
| BINGO LOCO | no_spotify_match |
| Bob Weir & Wolf Bros | no_spotify_match |
| bobo_ | no_spotify_match |
| Body Of Leaves | no_spotify_match |
| Bootie Mashup | no_spotify_match |
| Boyfriend | ambiguous |
| Brady O’Keefe | no_spotify_match |
| Britton | ambiguous |
| Brownies & Lemonade All-Stars | needs_review |
| Brutus | ambiguous |
| Buffalo Gospel | no_spotify_match |
| Bushwick’s Dead | no_spotify_match |
| Cam | needs_review |
| Cariño | ambiguous |
| Catarina Matos | no_spotify_match |
| Charles Hawthorne | no_spotify_match |
| CHICA Gang | no_spotify_match |
| Chicago Made | needs_review |
| Chilé | ambiguous |
| Chris Pierce | ambiguous |
| Clara | ambiguous |
| Clever | ambiguous |
| Collectivity | no_spotify_match |
| Dan Bar-Hava | no_spotify_match |
| Dani Satin and Always Hallways | no_spotify_match |
| Daniel Donato’s Cosmic Country | no_spotify_match |
| Demdike Stare b2b Raime | no_spotify_match |
| Desire | ambiguous |
| DIESEL | ambiguous |
| DJ Dolomedes | no_spotify_match |
| DJ Erinyes | no_spotify_match |
| Dj Fart in the Club | no_spotify_match |
| DJ Haram | ambiguous |
| DJ Hopeless & Hot Goth Pole Show | no_spotify_match |
| DJ Lazyboy | no_spotify_match |
| DJ Mel | needs_review |
| DJ Negro presents The Noise | no_spotify_match |
| DJ Starr Noir | no_spotify_match |
| Dogstar | ambiguous |
| DPR IAN & DPR LIVE | no_spotify_match |
| Dulce | needs_review |
| Elaine & Robin | no_spotify_match |
| Electric Feels | no_spotify_match |
| Ella Jane | needs_review |
| Emmit Fenn | ambiguous |
| EMO NITE | needs_review |
| Equal | ambiguous |
| Eye | ambiguous |
| F.R.A.C | no_spotify_match |
| Felly | ambiguous |
| Flash | ambiguous |
| Freddie Gibbs & Madlib | no_spotify_match |
| Friendless Summer | no_spotify_match |
| Full Moonalice | no_spotify_match |
| Gel | ambiguous |
| Gomz | ambiguous |
| Grace Towers & Friends | no_spotify_match |
| Grass Child | no_spotify_match |
| Gustaf | ambiguous |
| Herrensauna (CEM b2b MCMLXXXV b2b Salome b2b SPFDJ) | no_spotify_match |
| High Time | no_spotify_match |
| Hobo Johnson & The Lovemakers | needs_review |
| Hofe x 4:40 | no_spotify_match |
| Hot Goth Freak Show | no_spotify_match |
| Hugo Sousa | no_spotify_match |
| Jacob Aviner | no_spotify_match |
| JD Twitch (Optimo) | no_spotify_match |
| Joe Russo’s Almost Dead | no_spotify_match |
| John Kadlecik | no_spotify_match |
| Johnson and Johnson | no_spotify_match |
| Joker | ambiguous |
| Justin Waves | no_spotify_match |
| Kaidara | no_spotify_match |
| Kerala Dust | ambiguous |
| Kids Rock For Kids | no_spotify_match |
| Kooze | needs_review |
| Kosine × Frayne Vibez | no_spotify_match |
| La Zowi | ambiguous |
| Law | ambiguous |
| Leyl Master Black | no_spotify_match |
| Liberato | ambiguous |
| Little Moon | no_spotify_match |
| Live Dead & Brothers | no_spotify_match |
| Locus Pocus | needs_review |
| Lolahol | no_ranked_tracks |
| Luda | ambiguous |
| Luttrell | needs_review |
| M8NSE | no_spotify_match |
| Malena | ambiguous |
| Maria Rui | no_spotify_match |
| Mark O’Brien | no_spotify_match |
| Marta Mer | no_spotify_match |
| Martina O' Clock | no_spotify_match |
| Marty Rock | no_spotify_match |
| Maz & Kidd Revel | no_spotify_match |
| Motion Potion | no_spotify_match |
| MPH | ambiguous |
| MPHD | no_spotify_match |
| Mr. Shaw | no_spotify_match |
| Ms. Boan | no_ranked_tracks |
| MUSIC IN THE KEY OF CHICAGO | needs_review |
| Musicians from Marlboro | no_spotify_match |
| Márcia | ambiguous |
| Napa Valley Youth Symphony | no_spotify_match |
| Nazar | ambiguous |
| Near Dead Experience | no_spotify_match |
| Nelsonn | no_spotify_match |
| Nez | ambiguous |
| Nezza | ambiguous |
| Nicole.Aiff | no_spotify_match |
| Night Animals | no_spotify_match |
| Nilton | no_spotify_match |
| Not Our First Goat Rodeo | no_spotify_match |
| Not-Porterfield | no_spotify_match |
| OASIS DJ Set: Beverly Chills | no_spotify_match |
| OASIS DJ Set: DJ Ion The Prize | no_spotify_match |
| ODD MOB & OMNOM present HYPERBEAM | no_spotify_match |
| Oliver Herbert | needs_review |
| OUT TONIGHT: A Musical Singalong feat. D’Arcy Drollinger | no_spotify_match |
| Pacific Radio | ambiguous |
| Peter Harper | ambiguous |
| Pole Position | ambiguous |
| PRINCESS w/ Tito Soto feat. Lydia B Kollins | no_spotify_match |
| Questlove | no_spotify_match |
| Rachel Torro | no_spotify_match |
| REPARATIONS w/ DJ Newoncé | no_spotify_match |
| REPARATIONS w/ Nicki Jizz feat. Kori King | no_spotify_match |
| Ricardo Cardoso | no_spotify_match |
| Rooz | needs_review |
| Sam Johnson | needs_review |
| Santé | ambiguous |
| Sasha Marie | no_spotify_match |
| School of Rock Brooklyn | no_spotify_match |
| School Of Rock Queens | no_spotify_match |
| SF Gay Men’s Chorus | no_spotify_match |
| Silica Gel | ambiguous |
| Silverado Pickups | no_spotify_match |
| Slap Dragon | needs_review |
| Soho Soho | no_spotify_match |
| Sound It Out! | no_spotify_match |
| Sports | ambiguous |
| Stanley Frank Sensation | no_spotify_match |
| Steph | ambiguous |
| Strawberry Launch | no_spotify_match |
| Subtronics and GRiZ present GRIZTRONICS | no_spotify_match |
| TAGABOW | needs_review |
| Tercer Sol | no_spotify_match |
| The Emo Night Tour | no_spotify_match |
| The Happiness Club | no_spotify_match |
| The Latin Dead | no_spotify_match |
| The Messthetics & James Brandon Lewis | no_spotify_match |
| The Score | ambiguous |
| Tirzah | ambiguous |
| Toccororo | no_spotify_match |
| Tokyo Rose | ambiguous |
| Tom Ravenscroft b2b Deb Grant | no_spotify_match |
| Trashi | ambiguous |
| TraTraTrax (Verraco b2b Bitter Babe b2b Nick León) | no_spotify_match |
| Tre | ambiguous |
| Trey Anastasio Band | no_spotify_match |
| Turkuaz with Jerry Harrison & Adrian Belew | no_spotify_match |
| Tyler Christian | no_ranked_tracks |
| Uncle Blazer + DJ Ango | no_spotify_match |
| unTame Impala | no_spotify_match |
| Valley | ambiguous |
| Variações | no_spotify_match |
| Vertigo | ambiguous |
| Viuda | ambiguous |
| Walrus | ambiguous |
| Weird Phishes | no_spotify_match |
| Whateverglades | no_spotify_match |
| Woody92 | no_spotify_match |
| Yousuke Yukimatsu (¥ØU$UK€ ¥UK1MAT$U) | no_spotify_match |
| YPR | no_spotify_match |
| ZOLA | ambiguous |
| Ángeles, Víctor, Gloria & Javier | no_spotify_match |

## Verification

All current payload hashes match their metadata and immutable history; all current cache keys exist in the final catalog; every original validated payload is preserved. The seven song-source parser/cache/history tests pass. `spotify-festival-enrichment.json` contains machine-readable counts and the complete per-artist exception queue; `spotify-fetch-progress.json` covers every current artist. Raw HTML and detailed research are outside the app bundle in the work directory listed in that report.
