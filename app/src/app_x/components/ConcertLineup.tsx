import { DateTime } from "luxon";
import type { Catalog, Concert } from "../data/model";
import { artistSongLists, groupScheduleDays } from "../data/songLists";
import { ConcertSetlists } from "./ConcertSetlists";
import { useSongCaches } from "./useSongCaches";
import { Link } from "./navigation";
import { entityPath } from "./routing";
import { Picture } from "./ui";

export function ConcertLineup({ catalog, concert }: { catalog: Catalog; concert: Concert }) {
  const caches = useSongCaches();
  const artists = new Map(catalog.artists.map(artist => [artist.id, artist]));
  const schedule = catalog.schedules.find(item => item.id === concert.id);
  const scheduled = new Set(schedule?.sets.map(set => set.artist_id));
  const timezone = catalog.venues.find(venue => venue.id === concert.venue_id)?.timezone || "UTC";
  const ids = [...new Set([concert.artist_id, ...concert.supporting_artist_ids].filter(Boolean))];
  const program = caches?.musicals[concert.id];
  const row = (artistId: string, detail: string, setId?: string) => {
    const artist = artists.get(artistId);
    const name = artist?.name || artistId;
    return <div className="rs-performance" key={setId || artistId}>
      {artist ? <Link className="rs-lineup-item" href={entityPath("artist", artist.id, name)}>
        {!setId && <Picture src={artist.image} name={name} />}
        <span>{name}{detail && <small>{detail}</small>}</span>
      </Link> : <p className="rs-message">Artist unavailable ({artistId}){detail && <small>{detail}</small>}</p>}
      <ConcertSetlists entries={caches ? artistSongLists(concert.id, artistId, name, caches, setId) : []} />
    </div>;
  };
  return <section className="rs-panel rs-lineup">
    {!!schedule?.sets.length && <>
      <h2>Schedule</h2>
      {groupScheduleDays(schedule.sets, timezone).map(group => <section className="rs-schedule-day" key={group.day}>
        {group.day && <h3>{DateTime.fromISO(group.day, { zone: "UTC" }).toFormat("ccc, LLL d")}</h3>}
        {group.sets.map(set => row(set.artist_id, [
          set.start && DateTime.fromISO(set.start).setZone(timezone).toFormat("h:mm a"),
          set.stage,
        ].filter(Boolean).join(" · "), set.id))}
      </section>)}
    </>}
    {!schedule?.sets.length && ids.length > 0 && <h2>Lineup</h2>}
    {ids.filter(id => !scheduled.has(id)).map(id => row(id, id === concert.artist_id ? "Headliner" : concert.artist_id ? "Supporting" : ""))}
    {program?.sets.some(set => set.songs.length) && <ConcertSetlists entries={[{ key: `musical:${concert.id}`, title: program.title, label: "Musical program", value: program }]} />}
    {!schedule?.sets.length && /^https:\/\/(www\.)?setlist\.fm\//i.test(concert.setlist_fm_url) && <a className="rs-outbound" href={concert.setlist_fm_url} target="_blank" rel="noreferrer">Setlist.fm</a>}
  </section>;
}
