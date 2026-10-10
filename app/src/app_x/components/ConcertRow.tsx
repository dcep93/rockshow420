import type { Catalog, Concert, UserConcert } from "../data/model";
import { formatConcertDate } from "../data/time";
import { Link } from "./navigation";
import { entityPath } from "./routing";
import { concertName } from "../data/presentation";
import { selectedArtistIds } from "../data/schedules";
import { Picture } from "./ui";

export function ConcertRow({
  concert,
  catalog,
  log,
}: {
  concert: Concert;
  catalog: Catalog;
  log?: UserConcert | null;
}) {
  const artist = catalog.artists.find((item) => item.id === concert.artist_id);
  const venue = catalog.venues.find((item) => item.id === concert.venue_id);
  const support = catalog.schedules.some(item => item.id === concert.id) ? [] : (log === undefined ? concert.supporting_artist_ids : selectedArtistIds(catalog, concert, log)).map(
    (id) => catalog.artists.find((item) => item.id === id)?.name || "Unavailable artist",
  );
  const date = formatConcertDate(concert.date, venue?.timezone || "UTC", concert.date_precision, concert.end_date);
  return (
    <article className={`rs-concert-row${log?.removed ? " rs-concert-hidden" : ""}`}>
      <Picture src={artist?.image} name={artist?.name || ""} fallbackSrc={venue?.image} fallbackName={venue?.name} />
      <div className="rs-concert-info">
        {log?.removed && <span className="rs-hidden-label">Hidden</span>}
        <p className="rs-date">{log?.ticket_status === "cancelled" ? `[${date}]` : date}</p>
        <h2>
          <Link href={entityPath("concert", concert.id, concertName(concert, catalog))}>
            {concert.name || artist?.name || "Unknown artist"}
          </Link>
        </h2>
        <p className="rs-venue-line">
          {venue ? (
            <Link href={entityPath("venue", venue.id, venue.name)}>{venue.name}</Link>
          ) : (
            "Venue unavailable"
          )}
          {venue?.location && <span> · {venue.location}</span>}
        </p>
        {!!support.length && <p className="rs-support">with {support.join(" · ")}</p>}
      </div>
    </article>
  );
}
