import { useEffect, useState } from "react";
import { useApp } from "../data/store";
import { userConcertRows } from "../data/model";
import { concertPeriod } from "../data/time";
import { ConcertRow } from "../components/ConcertRow";
import { Empty } from "../components/ui";

export function UserPage({ username }: { username: string }) {
  const [showHidden, setShowHidden] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const { catalog, loading } = useApp();
  const profile = catalog.profiles.find((item) => item.username === username || item.id === username);
  if (loading) return null;
  if (!profile) return <Empty title="User not found" />;
  const allRows = userConcertRows(catalog, profile.user_id, true);
  const hiddenCount = allRows.filter(({ log }) => log?.removed).length;
  const count = allRows.length - hiddenCount;
  const rows = allRows.filter(({ log }) => showHidden || !log?.removed);
  const groups: Record<"upcoming" | "past" | "unknown", typeof rows> = { upcoming: [], past: [], unknown: [] };
  const timezones = new Map(catalog.venues.map((venue) => [venue.id, venue.timezone]));
  for (const row of rows) {
    const period = row.concert ? concertPeriod(row.concert, timezones.get(row.concert.venue_id) || "UTC", now) : "unknown";
    groups[period].push(row);
  }
  groups.upcoming.reverse();
  const renderRow = ({ log, concert }: typeof rows[number]) => concert ? (
    <ConcertRow key={concert.id} catalog={catalog} concert={concert} log={log ?? null} />
  ) : log ? (
    <div key={log.id} className={`rs-message${log.removed ? " rs-concert-hidden" : ""}`}>
      Concert unavailable{log.removed && <span className="rs-hidden-label">Hidden</span>}
    </div>
  ) : null;
  return (
    <>
      <section className="rs-user-heading">
          <h1>@{username}</h1>
          <div className="rs-log-controls">
            <span className="rs-count">{count} {count === 1 ? "concert" : "concerts"}</span>
            <label className="rs-check">
              <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
              Show {hiddenCount} hidden
            </label>
          </div>
      </section>
      <section aria-label={`${username}’s concerts`}>
        {!!rows.length && <div className="rs-log-columns">
          {(["upcoming", "past"] as const).map((period) => (
            <section className="rs-log-column" key={period} aria-label={period === "upcoming" ? "Upcoming concerts" : "Past concerts"}>
              <h2>{period === "upcoming" ? "Upcoming" : "Past"}</h2>
              <div className="rs-concert-list">{groups[period].map(renderRow)}</div>
            </section>
          ))}
        </div>}
        {!!groups.unknown.length && <div className="rs-concert-list">{groups.unknown.map(renderRow)}</div>}
        {!rows.length && <Empty title="No concerts" />}
      </section>
    </>
  );
}
