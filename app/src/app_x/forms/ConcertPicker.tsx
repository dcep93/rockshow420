import { useState } from "react";
import type { Catalog, Concert } from "../data/model";
import { formatConcertDate } from "../data/time";
import { Modal, Empty, Icon } from "../components/ui";
import { concertName } from "../data/presentation";

export function ConcertPicker({
  catalog,
  uid,
  isAdmin,
  onSelect,
  onCreate,
  onClose,
}: {
  catalog: Catalog;
  uid: string;
  isAdmin: boolean;
  onSelect: (concert: Concert) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const saved = new Set(catalog.logs.filter((log) => log.user_id === uid).map((log) => log.concert_id));
  const concerts = [...catalog.concerts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((concert) =>
      `${concertName(concert, catalog)} ${concert.date}`.toLowerCase().includes(search.toLowerCase()),
    );
  return (
    <Modal title="Add concert" onClose={onClose}>
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
            disabled={saved.has(concert.id)}
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
            <span>{saved.has(concert.id) ? "Added" : "+"}</span>
          </button>
        ))}
        {!concerts.length && (
          <Empty title="No concerts found">
            <p>
              {isAdmin
                ? "Create the first one below."
                : "Try a different search. An admin can add missing concerts."}
            </p>
          </Empty>
        )}
      </div>
      {isAdmin && (
        <div className="rs-form-actions">
          <button type="button" className="rs-secondary" onClick={onCreate}>
            <Icon name="plus" /> Create concert
          </button>
        </div>
      )}
    </Modal>
  );
}
