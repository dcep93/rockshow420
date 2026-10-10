import { DateTime } from "luxon";
import type { Catalog, Concert, Profile, UserConcert } from "../data/model";
import { groupScheduleDays } from "../data/songLists";
import { setLabel } from "../data/schedules";
import { useLogEditor } from "../forms/useLogEditor";
import { LogEditor } from "../forms/LogEditor";
import { LogControls } from "./LogControls";
import { Link } from "./navigation";
import { Message } from "./ui";

export function EditableUserEntry({ catalog, concert, profile, log }: {
  catalog: Catalog; concert: Concert; profile: Profile; log?: UserConcert;
}) {
  const editor = useLogEditor(concert.id, profile.user_id, log);
  const sets = catalog.schedules.find(schedule => schedule.id === concert.id)?.sets || [];
  const timezone = catalog.venues.find(venue => venue.id === concert.venue_id)?.timezone || "UTC";
  const selection = (id: string, name: string, scheduled: boolean) => {
    const values = scheduled ? editor.seen : editor.selected;
    return <label className="rs-check" key={id}>
      <input type="checkbox" aria-label={`Seen ${name}`} checked={values.includes(id)} disabled={editor.readOnly || editor.busy} onChange={event => {
        const next = event.target.checked ? [...values, id] : values.filter(value => value !== id);
        void editor.persist(scheduled ? { seen_set_ids: next } : { supporting_artist_ids: next }, "controls");
      }} />
      <span>{name}</span>
    </label>;
  };
  return <article className="rs-entry rs-own-entry" aria-label={`@${profile.username} entry`}>
    <div className="rs-entry-heading">
      <Link href={`/user/${encodeURIComponent(profile.username)}`}>@{profile.username}</Link>
      <LogControls editor={editor} />
    </div>
    {editor.error && <Message error>{editor.error}</Message>}
    <div className="rs-entry-selections">
      {sets.length ? groupScheduleDays(sets, timezone).map(group => <details className="rs-entry-sets" key={group.day}>
        <summary>{group.day ? DateTime.fromISO(group.day, { zone: "UTC" }).toFormat("ccc, LLL d") : "Date unknown"}</summary>
        {group.sets.map(set => selection(set.id, setLabel(set, catalog, concert), true))}
      </details>) : concert.supporting_artist_ids.map(id => selection(id, catalog.artists.find(artist => artist.id === id)?.name || "Unavailable artist", false))}
    </div>
    <LogEditor editor={editor} compact />
  </article>;
}
