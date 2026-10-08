import { useId, useState } from "react";
import type { Catalog, Concert, TicketStatus, UserConcert } from "../data/model";
import { isTicketStatus, ticketStatusLabels } from "../data/model";
import { setLabel } from "../data/schedules";
import { saveLog } from "../data/actions";
import { Message } from "../components/ui";
import { errorMessage } from "../components/errors";

export function LogEditor({ catalog, concert, log, uid }: {
  catalog: Catalog; concert: Concert; log?: UserConcert; uid: string;
}) {
  const notesId = useId();
  const [draft, setDraft] = useState<{ notes: string; selected: string[]; seen: string[]; ticketStatus: TicketStatus } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const savedNotes = log?.notes || "";
  const savedSelections = log?.supporting_artist_ids || [];
  const savedSeen = log?.seen_set_ids || [];
  const seen = draft?.seen ?? savedSeen;
  const sets = catalog.schedules.find(item => item.id === concert.id)?.sets || [];
  const savedTicketStatus = log?.ticket_status || "";
  const notes = draft?.notes ?? savedNotes;
  const selected = draft?.selected ?? savedSelections;
  const ticketStatus = draft?.ticketStatus ?? savedTicketStatus;
  const hidden = log?.removed === true;
  const available = new Set(concert.supporting_artist_ids);
  const stale = selected.some((id) => !available.has(id)) || seen.some(id => !sets.some(set => set.id === id));
  const dirty = notes !== savedNotes || ticketStatus !== savedTicketStatus || JSON.stringify(selected) !== JSON.stringify(savedSelections) || JSON.stringify(seen) !== JSON.stringify(savedSeen) || stale;
  async function submit(nextHidden = hidden) {
    setBusy(true);
    setError("");
    try {
      const support = selected.filter((id) => available.has(id));
      await saveLog(uid, concert.id, { notes, supporting_artist_ids: support, removed: nextHidden, ticket_status: ticketStatus, seen_set_ids: seen.filter(id => sets.some(set => set.id === id)) }, hidden && !nextHidden);
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
          if (isTicketStatus(event.target.value)) setDraft({ notes, selected, seen, ticketStatus: event.target.value });
        }}>
          {Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value} label={label || " "}>{label}</option>)}
        </select>
      </label>
      {!!sets.length && <fieldset disabled={busy}>
        <legend>Seen sets</legend>
        {sets.map(set => <label className={`rs-check${seen.includes(set.id) ? "" : " rs-set-unseen"}`} key={set.id}>
          <input type="checkbox" checked={seen.includes(set.id)} onChange={event => setDraft({ notes, selected, ticketStatus,
            seen: event.target.checked ? [...seen, set.id] : seen.filter(id => id !== set.id),
          })} />
          {setLabel(set, catalog, concert)}
        </label>)}
      </fieldset>}
      {!sets.length && !!concert.supporting_artist_ids.length && (
        <fieldset disabled={busy}>
          <legend>Supporting artists</legend>
          {concert.supporting_artist_ids.map((id) => (
            <label className="rs-check" key={id}>
              <input type="checkbox" checked={selected.includes(id)} onChange={(event) => setDraft({ notes, ticketStatus, seen, selected:
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
        <textarea id={notesId} value={notes} disabled={busy} onChange={(event) => setDraft({ notes: event.target.value, selected, seen, ticketStatus })} rows={3} maxLength={20000} />
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
