import { useState } from "react";
import type { Catalog, Concert, Profile, UserConcert } from "../data/model";
import { Link } from "./navigation";
import { LogEditor } from "../forms/LogEditor";

function UserEntry({ catalog, concert, profile, log, own, isAdmin }: {
  catalog: Catalog; concert: Concert; profile: Profile; log?: UserConcert; own: boolean; isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const editable = own || (isAdmin && editing);
  const supports = (log?.supporting_artist_ids || []).map((id) => catalog.artists.find((artist) => artist.id === id)?.name || "Unavailable artist");
  return (
    <article className="rs-entry" aria-label={`@${profile.username} entry`}>
      <div className="rs-entry-heading">
        <Link href={`/user/${encodeURIComponent(profile.username)}`}>@{profile.username}</Link>
        {log?.removed && <span className="rs-hidden-label">Hidden</span>}
        {isAdmin && !own && <button type="button" className="rs-text-button" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit entry"}</button>}
      </div>
      {editable ? (
        <LogEditor catalog={catalog} concert={concert} log={log} uid={profile.user_id} />
      ) : (
        <>
          {!!supports.length && <p className="rs-support">Supporting acts: {supports.join(" · ")}</p>}
          {log?.notes && <p className="rs-notes">{log.notes}</p>}
        </>
      )}
    </article>
  );
}

export function ConcertEntries({ catalog, concert, viewerUid, isAdmin }: {
  catalog: Catalog; concert: Concert; viewerUid?: string; isAdmin: boolean;
}) {
  const records = catalog.logs.filter((log) => log.concert_id === concert.id);
  const entries = catalog.profiles.map((profile) => ({profile, log: records.find((log) => log.user_id === profile.user_id)}))
    .filter(({profile, log}) => !log?.removed || profile.user_id === viewerUid || isAdmin)
    .sort((a, b) => Number(b.profile.user_id === viewerUid) - Number(a.profile.user_id === viewerUid));
  return (
    <section className="rs-panel rs-public-entries">
      <div className="rs-section-heading"><h2>User logs</h2></div>
      {entries.map(({profile, log}) => <UserEntry key={`${concert.id}:${profile.user_id}:${viewerUid || "guest"}`} catalog={catalog} concert={concert} profile={profile} log={log} own={profile.user_id === viewerUid} isAdmin={isAdmin} />)}
      {!entries.length && <p className="rs-muted">No entries</p>}
    </section>
  );
}
