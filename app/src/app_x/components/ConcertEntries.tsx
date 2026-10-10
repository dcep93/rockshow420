import { useState } from "react";
import { concertLogEntries } from "../data/concertLogs";
import { EditableUserEntry } from "./EditableUserEntry";
import type { Catalog, Concert, Profile, UserConcert } from "../data/model";
import { setLabel } from "../data/schedules";
import { ticketStatusLabels } from "../data/model";
import { Link } from "./navigation";

function UserEntry({ catalog, concert, profile, log }: {
  catalog: Catalog; concert: Concert; profile: Profile; log?: UserConcert;
}) {
  const supports = (log?.supporting_artist_ids || []).map(id => catalog.artists.find(artist => artist.id === id)?.name || "Unavailable artist");
  const sets = catalog.schedules.find(item => item.id === concert.id)?.sets || [];
  const seen = sets.filter(set => log?.seen_set_ids.includes(set.id));
  return <article className="rs-entry" aria-label={`@${profile.username} entry`}>
    <div className="rs-entry-heading">
      <Link href={`/user/${encodeURIComponent(profile.username)}`}>@{profile.username}</Link>
      {log?.ticket_status && <span>{ticketStatusLabels[log.ticket_status]}</span>}
      {log?.removed && <span>Hidden</span>}
    </div>
    {!!seen.length && <details className="rs-entry-sets">
      <summary>{seen.length} {seen.length === 1 ? "set" : "sets"}</summary>
      <ul>{seen.map(set => <li key={set.id}>{setLabel(set, catalog, concert)}</li>)}</ul>
    </details>}
    {!sets.length && !!supports.length && <p className="rs-entry-artists">{supports.join(" · ")}</p>}
    {log?.notes && <p className="rs-notes">{log.notes}</p>}
  </article>;
}

export function ConcertEntries({ catalog, concert, viewerUid, isAdmin }: {
  catalog: Catalog; concert: Concert; viewerUid?: string; isAdmin: boolean;
}) {
  const hasOwnLog = catalog.logs.some(log => log.concert_id === concert.id && log.user_id === viewerUid);
  // Keep this editor mounted after resetting to defaults deletes its sparse record.
  const [retainViewer, setRetainViewer] = useState(hasOwnLog);
  if (hasOwnLog && !retainViewer) setRetainViewer(true);
  const entries = concertLogEntries(catalog, concert.id, viewerUid, isAdmin, retainViewer);
  if (!entries.length) return null;
  return <section className="rs-public-entries" aria-label="User logs">
    <h2>User logs</h2>
    {entries.map(({ profile, log }) => profile.user_id === viewerUid
      ? <EditableUserEntry key={profile.user_id} catalog={catalog} concert={concert} profile={profile} log={log} />
      : <UserEntry key={profile.user_id} catalog={catalog} concert={concert} profile={profile} log={log} />)}
  </section>;
}
