import type { Catalog, Concert, UserConcert } from "../data/model";
import { ticketStatusLabels, ticketStatusSymbols } from "../data/model";
import { concertPeriod } from "../data/time";
import { ConcertDate } from "./ConcertDate";
import { Link } from "./navigation";
import { entityPath } from "./routing";
import { concertName } from "../data/presentation";
import { selectedArtistIds } from "../data/schedules";
import { Picture } from "./ui";

export function ConcertRow({
  concert,
  catalog,
  log,
  now,
}: {
  concert: Concert;
  catalog: Catalog;
  log?: UserConcert | null;
  now?: number;
}) {
  const artist = catalog.artists.find((item) => item.id === concert.artist_id);
  const venue = catalog.venues.find((item) => item.id === concert.venue_id);
  const support = catalog.schedules.some(item => item.id === concert.id) ? [] : (log === undefined ? concert.supporting_artist_ids : selectedArtistIds(catalog, concert, log)).map(
    (id) => catalog.artists.find((item) => item.id === id)?.name || "Unavailable artist",
  );
  const status = log?.ticket_status || "";
  const symbol = now !== undefined && concertPeriod(concert, venue?.timezone || "UTC", now) === "upcoming" ? ticketStatusSymbols[status] : "";
  return (
    <article className={`rs-concert-row${log?.removed ? " rs-concert-hidden" : ""}`}>
      <Picture src={artist?.image} name={artist?.name || ""} fallbackSrc={venue?.image} fallbackName={venue?.name} />
      <div className="rs-concert-info">
        {log?.removed && <span className="rs-hidden-label">Hidden</span>}
        <p className="rs-date">
          <ConcertDate concert={concert} timezone={venue?.timezone || "UTC"} cancelled={status === "cancelled"} />
          {symbol && <> <span title={ticketStatusLabels[status]} aria-label={ticketStatusLabels[status]}>{symbol}</span></>}
        </p>
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
