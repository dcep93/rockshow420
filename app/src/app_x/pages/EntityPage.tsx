import { ConcertDetails } from "../components/ConcertDetails";
import { useApp } from "../data/store";
import type { Concert, EntityKind } from "../data/model";
import { canonicalId } from "../data/ids";
import { formatConcertDate } from "../data/time";
import { ConcertRow } from "../components/ConcertRow";
import { Link } from "../components/navigation";
import { entityPath } from "../components/routing";
import { Empty, Picture } from "../components/ui";

export function EntityPage({
  kind,
  id,
}: {
  kind: EntityKind;
  id: string;
}) {
  const { catalog, viewer, isAdmin, loading } = useApp();
  const record =
    kind === "concert"
      ? catalog.concerts.find((item) => canonicalId(kind, item.id) === id)
      : kind === "artist"
        ? catalog.artists.find((item) => item.id === id)
        : kind === "venue"
          ? catalog.venues.find((item) => item.id === id)
          : undefined;
  if (loading) return null;
  if (!record) return <Empty title={`${kind[0].toUpperCase()}${kind.slice(1)} not found`} />;
  if (kind === "concert") {
    const concert = record as Concert;
    const artist = catalog.artists.find((item) => item.id === concert.artist_id);
    const venue = catalog.venues.find((item) => item.id === concert.venue_id);
    return (
      <>
        <section className="rs-detail-heading">
          <Picture key={concert.id} src={artist?.image} name={artist?.name || ""} fallbackSrc={venue?.image} fallbackName={venue?.name} large />
          <div className="rs-detail-title">
            <p className="rs-eyebrow">{formatConcertDate(concert.date, venue?.timezone || "UTC", concert.date_precision, concert.end_date)}</p>
            <h1>{concert.name || artist?.name || "Unknown artist"}</h1>
            <p className="rs-subtitle">
              {venue ? (
                <Link href={entityPath("venue", venue.id, venue.name)}>{venue.name}</Link>
              ) : (
                "Venue unavailable"
              )}
              {venue?.location && <span> · {venue.location}</span>}
            </p>
          </div>
        </section>
        <ConcertDetails key={`${concert.id}:${viewer?.uid || "guest"}`} catalog={catalog} concert={concert} viewerUid={viewer?.uid} isAdmin={isAdmin} />
      </>
    );
  }
  const name = "name" in record ? record.name || "" : "";
  const image = "image" in record ? record.image : "";
  const related = catalog.concerts
    .filter((concert) =>
      kind === "venue"
        ? concert.venue_id === id
        : kind === "artist"
          ? concert.artist_id === id || concert.supporting_artist_ids.includes(id)
          : false,
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
