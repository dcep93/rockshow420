import { useState } from "react";
import { useApp } from "../data/store";
import { userConcertRows } from "../data/model";
import { ConcertRow } from "../components/ConcertRow";
import { Empty } from "../components/ui";

export function UserPage({ username }: { username: string }) {
  const [showHidden, setShowHidden] = useState(false);
  const { catalog, loading } = useApp();
  const profile = catalog.profiles.find((item) => item.username === username || item.id === username);
  if (loading) return null;
  if (!profile) return <Empty title="User not found" />;
  const allRows = userConcertRows(catalog, profile.user_id, true);
  const hiddenCount = allRows.filter(({ log }) => log?.removed).length;
  const count = allRows.length - hiddenCount;
  const rows = allRows.filter(({ log }) => showHidden || !log?.removed);
  return (
    <>
      <section className="rs-page-heading">
        <div>
          <h1>@{username}</h1>
          <div className="rs-log-controls">
            <span className="rs-count">{count} {count === 1 ? "concert" : "concerts"}</span>
            <label className="rs-check">
              <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
              Show {hiddenCount} hidden
            </label>
          </div>
        </div>
      </section>
      <section className="rs-concert-list" aria-label={`${username}’s concerts`}>
        {rows.map(({ log, concert }) => concert ? (
          <ConcertRow key={concert.id} catalog={catalog} concert={concert} log={log ?? null} />
        ) : log ? (
          <div key={log.id} className={`rs-message${log.removed ? " rs-concert-hidden" : ""}`}>
            Concert unavailable{log.removed && <span className="rs-hidden-label">Hidden</span>}
          </div>
        ) : null)}
        {!rows.length && <Empty title="No concerts" />}
      </section>
    </>
  );
}
