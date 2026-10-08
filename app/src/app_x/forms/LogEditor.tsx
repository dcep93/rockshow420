import { useId, useState } from "react";
import type { Catalog, Concert, TicketStatus, UserConcert } from "../data/model";
import { isTicketStatus, ticketStatusLabels } from "../data/model";
import { saveLog } from "../data/actions";
import { Message } from "../components/ui";
import { errorMessage } from "../components/errors";

export function LogEditor({ catalog, concert, log, uid }: {
  catalog: Catalog; concert: Concert; log?: UserConcert; uid: string;
}) {
  const notesId = useId();
  const [draft, setDraft] = useState<{ notes: string; selected: string[]; ticketStatus: TicketStatus } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const savedNotes = log?.notes || "";
  const savedSelections = log?.supporting_artist_ids || [];
  const savedTicketStatus = log?.ticket_status || "";
  const notes = draft?.notes ?? savedNotes;
  const selected = draft?.selected ?? savedSelections;
  const ticketStatus = draft?.ticketStatus ?? savedTicketStatus;
  const hidden = log?.removed === true;
  const available = new Set(concert.supporting_artist_ids);
  const stale = selected.some((id) => !available.has(id));
  const dirty = notes !== savedNotes || ticketStatus !== savedTicketStatus || JSON.stringify(selected) !== JSON.stringify(savedSelections) || stale;
  async function submit(nextHidden = hidden) {
    setBusy(true);
    setError("");
    try {
      const support = selected.filter((id) => available.has(id));
      await saveLog(uid, concert.id, { notes, supporting_artist_ids: support, removed: nextHidden, ticket_status: ticketStatus }, hidden && !nextHidden);
      setDraft(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="rs-inline-editor" aria-label="Concert entry" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label className="rs-field">
        Ticket status
        <select value={ticketStatus} disabled={busy} onChange={(event) => {
          if (isTicketStatus(event.target.value)) setDraft({ notes, selected, ticketStatus: event.target.value });
        }}>
          {Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value} label={label || " "}>{label}</option>)}
        </select>
      </label>
      {!!concert.supporting_artist_ids.length && (
        <fieldset disabled={busy}>
          <legend>Supporting artists</legend>
          {concert.supporting_artist_ids.map((id) => (
            <label className="rs-check" key={id}>
              <input type="checkbox" checked={selected.includes(id)} onChange={(event) => setDraft({ notes, ticketStatus, selected:
                event.target.checked ? [...selected, id] : selected.filter((item) => item !== id),
              })} />
              {catalog.artists.find((item) => item.id === id)?.name || "Unknown artist"}
            </label>
          ))}
        </fieldset>
      )}
      {stale && <Message>Some selected acts are no longer in the lineup. Saving will remove those selections.</Message>}
      <div className="rs-field">
        <label htmlFor={notesId}>Public Notes</label>
        <textarea id={notesId} value={notes} disabled={busy} onChange={(event) => setDraft({ notes: event.target.value, selected, ticketStatus })} rows={3} maxLength={20000} />
      </div>
      {error && <Message error>{error}</Message>}
      <div className="rs-form-actions">
        <button type="button" className="rs-text-button" disabled={busy} onClick={() => void submit(!hidden)}>
          {hidden ? "Unhide" : "Hide"}
        </button>
        <span className="rs-spacer" />
        <button className="rs-primary" type="submit" disabled={busy || !dirty}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
