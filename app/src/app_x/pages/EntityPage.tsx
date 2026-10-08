import { useApp } from "../data/store";
import type { Concert, EntityKind, UserConcert } from "../data/model";
import { formatConcertDate } from "../data/time";
import { ConcertRow } from "../components/ConcertRow";
import { Link } from "../components/navigation";
import { entityPath } from "../components/routing";
import { Empty, Picture } from "../components/ui";

export function EntityPage({
  kind,
  id,
  onEdit,
  onLog,
}: {
  kind: EntityKind;
  id: string;
  onEdit: (kind: EntityKind, id: string) => void;
  onLog: (concert: Concert, log?: UserConcert, uid?: string) => void;
}) {
  const { catalog, viewer, isAdmin, loading } = useApp();
  const record =
    kind === "concert"
      ? catalog.concerts.find((item) => item.id === id)
      : kind === "artist"
        ? catalog.artists.find((item) => item.id === id)
        : kind === "venue"
          ? catalog.venues.find((item) => item.id === id)
          : catalog.festivals.find((item) => item.id === id);
  if (loading) return null;
  if (!record) return <Empty title={`${kind[0].toUpperCase()}${kind.slice(1)} not found`} />;
  if (kind === "concert") {
    const concert = record as Concert;
    const artist = catalog.artists.find((item) => item.id === concert.artist_id);
    const venue = catalog.venues.find((item) => item.id === concert.venue_id);
    const festivals = catalog.festivals.filter((item) => item.concert_ids.includes(id));
    const records = catalog.logs.filter((item) => item.concert_id === id);
    const ownLog = records.find((item) => item.user_id === viewer?.uid);
    const logs = catalog.profiles.map((profile) => ({
      profile, log: records.find((item) => item.user_id === profile.user_id),
    })).filter(({ log }) => !log?.removed);
    return (
      <>
        <section className="rs-detail-heading">
          <Picture src={artist?.image} name={artist?.name || ""} large />
          <div className="rs-detail-title">
            <p className="rs-eyebrow">{formatConcertDate(concert.date, venue?.timezone || "UTC")}</p>
            <h1>{artist?.name || "Unknown artist"}</h1>
            <p className="rs-subtitle">
              {venue ? (
                <Link href={entityPath("venue", venue.id, venue.name)}>{venue.name}</Link>
              ) : (
                "Venue unavailable"
              )}
              {venue?.location && <span> · {venue.location}</span>}
            </p>
            <div className="rs-detail-actions">
              {viewer ? (
                <button
                  type="button"
                  className="rs-secondary"
                  onClick={() => onLog(concert, ownLog)}
                >
                  {ownLog?.removed ? "Restore concert" : "Edit my entry"}
                </button>
              ) : null}
              {isAdmin && (
                <button type="button" className="rs-text-button" onClick={() => onEdit("concert", id)}>
                  Edit concert
                </button>
              )}
            </div>
          </div>
        </section>
        <div className="rs-detail-grid">
          <section className="rs-panel">
            <h2>Lineup</h2>
            {artist && (
              <Link className="rs-lineup-item" href={entityPath("artist", artist.id, artist.name)}>
                <Picture src={artist.image} name={artist.name} />
                <span>
                  {artist.name}
                  <small>Headliner</small>
                </span>
              </Link>
            )}
            {concert.supporting_artist_ids.map((artistId) => {
              const support = catalog.artists.find((item) => item.id === artistId);
              return support ? (
                <Link
                  key={artistId}
                  className="rs-lineup-item"
                  href={entityPath("artist", support.id, support.name)}
                >
                  <Picture src={support.image} name={support.name} />
                  <span>
                    {support.name}
                    <small>Supporting</small>
                  </span>
                </Link>
              ) : (
                <p className="rs-message" key={artistId}>
                  Supporting artist unavailable ({artistId})
                </p>
              );
            })}
            {/^https:\/\/(www\.)?setlist\.fm\//i.test(concert.setlist_fm_url) && (
              <a className="rs-outbound" href={concert.setlist_fm_url} target="_blank" rel="noreferrer">
                Setlist.fm
              </a>
            )}
            {festivals.map((festival) => (
              <Link
                key={festival.id}
                className="rs-outbound"
                href={entityPath("festival", festival.id, festival.name)}
              >
                {festival.name}
              </Link>
            ))}
          </section>
          <section className="rs-panel rs-public-entries">
            <div className="rs-section-heading">
              <h2>User logs</h2>
              <span className="rs-count">{logs.length}</span>
            </div>
            {logs.map(({ profile, log }) => {
              const supports = (log?.supporting_artist_ids || []).map(
                (artistId) =>
                  catalog.artists.find((item) => item.id === artistId)?.name || "Unavailable artist",
              );
              return (
                <article className="rs-entry" key={profile.user_id}>
                  <div className="rs-entry-heading">
                    <Link href={`/user/${encodeURIComponent(profile.username)}`}>@{profile.username}</Link>
                    {(isAdmin || profile.user_id === viewer?.uid) && (
                      <button type="button" className="rs-text-button" onClick={() => onLog(concert, log, profile.user_id)}>
                        Edit entry
                      </button>
                    )}
                  </div>
                  {!!supports.length && <p className="rs-support">Supporting acts: {supports.join(" · ")}</p>}
                  {log?.notes && <p className="rs-notes">{log.notes}</p>}
                </article>
              );
            })}
            {!logs.length && <p className="rs-muted">No entries</p>}
          </section>
        </div>
      </>
    );
  }
  const name = "name" in record ? record.name : "";
  const image = "image" in record ? record.image : "";
  const related = catalog.concerts
    .filter((concert) =>
      kind === "venue"
        ? concert.venue_id === id
        : kind === "artist"
          ? concert.artist_id === id || concert.supporting_artist_ids.includes(id)
          : "concert_ids" in record && record.concert_ids.includes(concert.id),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <section className="rs-detail-heading">
        <Picture src={image} name={name} large />
        <div className="rs-detail-title">
          <p className="rs-eyebrow">{kind}</p>
          <h1>{name}</h1>
          {"location" in record && typeof record.location === "string" && record.location && (
            <p className="rs-subtitle">{record.location}</p>
          )}
          {"timezone" in record && typeof record.timezone === "string" && (
            <p className="rs-help">{record.timezone.replaceAll("_", " ")}</p>
          )}
          {isAdmin && (
            <button type="button" className="rs-secondary" onClick={() => onEdit(kind, id)}>
              Edit {kind}
            </button>
          )}
        </div>
      </section>
      <section className="rs-concert-list" aria-label={`${name} concerts`}>
        {related.map((concert) => (
          <ConcertRow key={concert.id} concert={concert} catalog={catalog} />
        ))}
        {!related.length && <Empty title="No concerts" />}
      </section>
    </>
  );
}
