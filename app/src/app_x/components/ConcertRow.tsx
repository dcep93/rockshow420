import type { Catalog, Concert, UserConcert } from "../data/model";
import { formatConcertDate } from "../data/time";
import { Link } from "./navigation";
import { entityPath } from "./routing";
import { concertName } from "../data/presentation";
import { Icon, Picture } from "./ui";

export function ConcertRow({
  concert,
  catalog,
  log,
  onEdit,
}: {
  concert: Concert;
  catalog: Catalog;
  log?: UserConcert;
  onEdit?: () => void;
}) {
  const artist = catalog.artists.find((item) => item.id === concert.artist_id);
  const venue = catalog.venues.find((item) => item.id === concert.venue_id);
  const support = (log?.supporting_artist_ids ?? concert.supporting_artist_ids).map(
    (id) => catalog.artists.find((item) => item.id === id)?.name || "Unavailable artist",
  );
  const festival = catalog.festivals.find((item) => item.concert_ids.includes(concert.id));
  return (
    <article className="rs-concert-row">
      <Picture src={artist?.image} name={artist?.name || ""} />
      <div className="rs-concert-info">
        <p className="rs-date">{formatConcertDate(concert.date, venue?.timezone || "UTC")}</p>
        <h2>
          <Link href={entityPath("concert", concert.id, concertName(concert, catalog))}>
            {artist?.name || "Unknown artist"}
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
        {festival && (
          <Link className="rs-festival-tag" href={entityPath("festival", festival.id, festival.name)}>
            {festival.name}
          </Link>
        )}
      </div>
      <div className="rs-row-actions">
        {onEdit ? (
          <button type="button" className="rs-text-button" onClick={onEdit}>
            Edit
          </button>
        ) : (
          <Link
            className="rs-icon-link"
            href={entityPath("concert", concert.id, concertName(concert, catalog))}
            aria-label={`View ${concertName(concert, catalog)}`}
          >
            <Icon name="arrow" />
          </Link>
        )}
      </div>
    </article>
  );
}
