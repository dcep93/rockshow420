import type { Catalog, Concert } from "./model";

export function concertName(concert: Concert, catalog: Catalog) {
  const artist = catalog.artists.find((item) => item.id === concert.artist_id);
  const venue = catalog.venues.find((item) => item.id === concert.venue_id);
  return `${artist?.name || "Unknown artist"} at ${venue?.name || "Unknown venue"}`;
}
