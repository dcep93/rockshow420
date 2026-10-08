import { useId, useState } from "react";
import type { Catalog, Concert, UserConcert } from "../data/model";
import { removeLog, saveLog } from "../data/actions";
import { Modal, Message } from "../components/ui";
import { errorMessage } from "../components/errors";

export function LogEditor({
  catalog,
  concert,
  log,
  uid,
  onClose,
}: {
  catalog: Catalog;
  concert: Concert;
  log?: UserConcert;
  uid: string;
  onClose: () => void;
}) {
  const notesId = useId();
  const [notes, setNotes] = useState(log?.notes || "");
  const [selected, setSelected] = useState(log?.supporting_artist_ids || []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const artist = catalog.artists.find((item) => item.id === concert.artist_id);
  const available = new Set(concert.supporting_artist_ids);
  const stale = selected.filter((id) => !available.has(id));
  async function submit(remove = false) {
    setBusy(true);
    setError("");
    try {
      if (remove) await removeLog(uid, concert.id);
      else
        await saveLog(
          uid,
          concert.id,
          { notes, supporting_artist_ids: selected.filter((id) => available.has(id)) },
          log?.removed === true,
        );
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }
  return (
    <Modal
      title={log?.removed ? "Restore concert" : "Edit entry"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="rs-form-intro">{artist?.name || "Concert"}</p>
        {!!concert.supporting_artist_ids.length && (
          <fieldset>
            <legend>Supporting artists</legend>
            {concert.supporting_artist_ids.map((id) => (
              <label className="rs-check" key={id}>
                <input
                  type="checkbox"
                  checked={selected.includes(id)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked ? [...selected, id] : selected.filter((item) => item !== id),
                    )
                  }
                />
                {catalog.artists.find((item) => item.id === id)?.name || "Unknown artist"}
              </label>
            ))}
          </fieldset>
        )}
        {!!stale.length && (
          <Message>
            Some selected acts were removed from this concert’s lineup. Saving will remove those selections.
          </Message>
        )}
        <div className="rs-field">
          <label htmlFor={notesId}>Public Notes</label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            maxLength={20000}
          />
        </div>
        {error && <Message error>{error}</Message>}
        {confirmRemove && (
          <div className="rs-confirm">
            <p>Remove this entry?</p>
            <button type="button" className="rs-danger" disabled={busy} onClick={() => void submit(true)}>
              Remove concert
            </button>
            <button
              type="button"
              className="rs-text-button"
              disabled={busy}
              onClick={() => setConfirmRemove(false)}
            >
              Cancel
            </button>
          </div>
        )}
        {!confirmRemove && (
          <div className="rs-form-actions">
            {!log?.removed && (
              <button
                className="rs-text-button rs-danger-text"
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemove(true)}
              >
                Remove
              </button>
            )}
            <span className="rs-spacer" />
            <button type="button" className="rs-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="rs-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : log?.removed ? "Restore concert" : "Save changes"}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
