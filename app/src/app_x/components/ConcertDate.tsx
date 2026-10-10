import type { Concert } from "../data/model";
import { formatConcertDate } from "../data/time";

export function ConcertDate({ concert, timezone, cancelled = false }: {
  concert: Concert;
  timezone: string;
  cancelled?: boolean;
}) {
  const date = formatConcertDate(concert.date, timezone, concert.date_precision, concert.end_date);
  const label = cancelled ? `[${date}]` : date;
  return date !== "Date unavailable" && /^https?:\/\//i.test(concert.purchase_link || "")
    ? <a className="rs-event-date-link" href={concert.purchase_link} target="_blank" rel="noreferrer">{label}</a>
    : <>{label}</>;
}
