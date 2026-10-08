import type { Song, SongDisclosure, SongSet } from "../data/songLists";
import "../styles/setlists.css";

function SongRow({ song }: { song: Song }) {
  const annotations = [song.tape && "Tape", song.artists, song.explicit && "Explicit", song.notes].filter(Boolean);
  return <li><span>{song.name}</span>{annotations.length > 0 && <small className="rs-song-note">{annotations.join(" · ")}</small>}</li>;
}

function SongSections({ sets }: { sets: SongSet[] }) {
  let nextNumber = 1;
  let encoreNumber = 0;
  return sets.map((set, index) => {
    const start = nextNumber;
    nextNumber += set.songs.length;
    if (set.encore) encoreNumber++;
    const title = set.name || (set.encore ? `Encore${encoreNumber > 1 ? ` ${encoreNumber}` : ""}` : "");
    return <div className="rs-song-section" key={index}>
      {title && <h4>{title}</h4>}
      <ol start={start}>{set.songs.map((song, songIndex) => <SongRow key={songIndex} song={song} />)}</ol>
    </div>;
  });
}

export function ConcertSetlists({ entries }: { entries: SongDisclosure[] }) {
  if (!entries.length) return null;
  return <div className="rs-setlists">
    {entries.map(({ key, title, label, value }) => <details key={key}>
      <summary aria-label={`${title} · ${label}`}>{label}{value.kind === "setlist_fm" && <span className="rs-song-count"> · {value.sets.reduce((count, set) => count + set.songs.length, 0)}</span>}</summary>
      <div className="rs-song-content">
        {value.kind === "musical_program" && <p className="rs-song-note">{value.production}<br />{value.basis}</p>}
        {value.kind === "spotify_top_tracks"
          ? <ol>{value.songs.map((song, index) => <SongRow song={song} key={index} />)}</ol>
          : <SongSections sets={value.sets} />}
        {value.kind !== "spotify_top_tracks" && value.notes && <p className="rs-song-note">{value.notes}</p>}
        <a className="rs-song-source" href={value.url} target="_blank" rel="noreferrer">{value.kind === "spotify_top_tracks" ? "Spotify" : value.kind === "musical_program" ? "Program source" : "setlist.fm"} ↗</a>
      </div>
    </details>)}
  </div>;
}
