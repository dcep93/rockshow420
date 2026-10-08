import { useState } from "react";
import type { Catalog, Concert } from "../data/model";
import { formatConcertDate } from "../data/time";
import { Modal, Empty, Icon } from "../components/ui";
import { concertName } from "../data/presentation";

export function ConcertPicker({
  catalog,
  uid,
  onSelect,
  onClose,
}: {
  catalog: Catalog;
  uid: string;
  onSelect: (concert: Concert) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const removed = new Set(catalog.logs.filter((log) => log.user_id === uid && log.removed).map((log) => log.concert_id));
  const concerts = catalog.concerts.filter((concert) => removed.has(concert.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((concert) =>
      `${concertName(concert, catalog)} ${concert.date}`.toLowerCase().includes(search.toLowerCase()),
    );
  return (
    <Modal title="Removed concerts" onClose={onClose}>
      <label className="rs-search">
        <Icon name="search" />
        <input
          type="search"
          aria-label="Search concerts"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Artist, venue, or date"
          autoFocus
        />
      </label>
      <div className="rs-picker-list">
        {concerts.map((concert) => (
          <button
            type="button"
            className="rs-picker-item"
            key={concert.id}
            onClick={() => onSelect(concert)}
          >
            <span>
              <strong>{concertName(concert, catalog)}</strong>
              <small>
                {formatConcertDate(
                  concert.date,
                  catalog.venues.find((item) => item.id === concert.venue_id)?.timezone || "UTC",
                )}
              </small>
            </span>
            <span>Restore</span>
          </button>
        ))}
        {!concerts.length && (
          <Empty title="No concerts found" />
        )}
      </div>
    </Modal>
  );
}
