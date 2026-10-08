import { useEffect, useState } from "react";
import type { Artist, Concert } from "../data/model";
import { concertSongLists } from "../data/songLists";
import type { SongCaches } from "../data/songLists";
import "../styles/setlists.css";

export function ConcertSetlists({ concert, artists }: { concert: Concert; artists: Artist[] }) {
  const [caches, setCaches] = useState<SongCaches | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      import("../data/cached.setlist.fm.json"),
      import("../data/cached.musicals.json"),
      import("../data/cached.spotify.json"),
    ]).then(([setlists, musicals, spotify]) => {
      if (active) setCaches({ setlists: setlists.default, musicals: musicals.default, spotify: spotify.default } as SongCaches);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (failed) return <p role="alert">Couldn’t load song lists. Refresh to retry.</p>;
  const entries = caches ? concertSongLists(concert, artists, caches) : [];
  if (!entries.length) return null;
  return (
    <section className="rs-setlists" aria-label="Song lists">
      {entries.map(({ key, title, label, value }) => (
        <details key={key}>
          <summary>{title} · {label}</summary>
          <a href={value.url} target="_blank" rel="noreferrer">{value.kind === "spotify_top_tracks" ? "Spotify" : value.kind === "musical_program" ? "Program source" : "setlist.fm"}</a>
          <pre tabIndex={0} aria-label={`${title} ${label} JSON`}>{JSON.stringify(value, null, 2)}</pre>
        </details>
      ))}
    </section>
  );
}
