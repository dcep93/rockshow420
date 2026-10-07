import { useState } from "react";
import type { Catalog, EntityKind } from "../data/model";
import { Modal, Empty } from "../components/ui";
import { concertName } from "../data/presentation";

export function Manager({
  catalog,
  onEdit,
  onClose,
}: {
  catalog: Catalog;
  onEdit: (kind: EntityKind, id?: string) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<EntityKind>("concert");
  const [search, setSearch] = useState("");
  const labels: Record<EntityKind, string> = {
    concert: "Concerts",
    venue: "Venues",
    artist: "Artists",
    festival: "Festivals",
  };
  const items =
    kind === "concert"
      ? catalog.concerts.map((item) => ({ id: item.id, name: concertName(item, catalog) }))
      : kind === "artist"
        ? catalog.artists
        : kind === "venue"
          ? catalog.venues
          : catalog.festivals;
  const visible = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal title="Manage" onClose={onClose}>
      <div className="rs-tabs" aria-label="Record type">
        {Object.entries(labels).map(([value, label]) => (
          <button
            type="button"
            aria-pressed={kind === value}
            key={value}
            onClick={() => {
              setKind(value as EntityKind);
              setSearch("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rs-manager-toolbar">
        <input
          type="search"
          aria-label={`Search ${labels[kind].toLowerCase()}`}
          placeholder={`Find ${kind}…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="button" className="rs-primary" onClick={() => onEdit(kind)}>
          New
        </button>
      </div>
      <div className="rs-picker-list">
        {visible.map((item) => (
          <button
            type="button"
            className="rs-picker-item"
            key={item.id}
            onClick={() => onEdit(kind, item.id)}
          >
            <strong>{item.name}</strong>
            <span>Edit</span>
          </button>
        ))}
        {!visible.length && <Empty title={`No ${labels[kind].toLowerCase()} found`} />}
      </div>
    </Modal>
  );
}
