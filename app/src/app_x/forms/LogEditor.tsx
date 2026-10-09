import { useId, useRef, useState } from "react";
import type { Catalog, Concert, UserConcert } from "../data/model";
import { isTicketStatus, ticketStatusLabels } from "../data/model";
import { setLabel } from "../data/schedules";
import { saveLog } from "../data/actions";
import type { LogPatch } from "../data/tableActions";
import { Message } from "../components/ui";
import { errorMessage } from "../components/errors";

type Controls = Omit<LogPatch, "notes">;

export function LogEditor({ catalog, concert, log, uid }: {
  catalog: Catalog; concert: Concert; log?: UserConcert; uid: string;
}) {
  const notesId = useId();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [pending, setPending] = useState<Controls | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"notes" | "controls" | null>(null);
  const inFlight = useRef(false);
  const savedNotes = log?.notes || "";
  const notes = notesDraft ?? savedNotes;
  const selected = pending?.supporting_artist_ids ?? log?.supporting_artist_ids ?? [];
  const seen = pending?.seen_set_ids ?? log?.seen_set_ids ?? [];
  const ticketStatus = pending?.ticket_status ?? log?.ticket_status ?? "";
  const hidden = pending?.removed ?? log?.removed ?? false;
  const sets = catalog.schedules.find(item => item.id === concert.id)?.sets || [];
  const busy = saving !== null;

  if (pending) {
    // Keep the optimistic value until the subscription acknowledges it.
    const remaining = Object.fromEntries(Object.entries(pending).filter(([key, value]) => {
      const stored = log?.[key as keyof Controls] ?? (key === "removed" ? false : key === "ticket_status" ? "" : []);
      return JSON.stringify(stored) !== JSON.stringify(value);
    }));
    if (Object.keys(remaining).length !== Object.keys(pending).length)
      setPending(Object.keys(remaining).length ? remaining : null);
  }
  // A snapshot must not discard text typed while a save was in flight.
  if (notesDraft === savedNotes) setNotesDraft(null);

  async function persist(patch: LogPatch, kind: "notes" | "controls") {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(kind);
    setError("");
    if (kind === "controls") setPending(previous => ({ ...previous, ...patch }));
    try {
      await saveLog(uid, concert.id, patch, patch.removed === false);
    } catch (caught) {
      if (kind === "controls") setPending(null);
      setError(errorMessage(caught));
    } finally {
      inFlight.current = false;
      setSaving(null);
    }
  }
  return (
    <form className="rs-inline-editor" aria-label="Concert entry" onSubmit={(event) => { event.preventDefault(); if (notes !== savedNotes) void persist({ notes }, "notes"); }}>
      <label className="rs-field">
        Ticket status
        <select value={ticketStatus} disabled={busy} onChange={(event) => {
          if (isTicketStatus(event.target.value)) void persist({ ticket_status: event.target.value }, "controls");
        }}>
          {Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value} label={label || " "}>{label}</option>)}
        </select>
      </label>
      {!!sets.length && <fieldset disabled={busy}>
        <legend>Seen sets</legend>
        {sets.map(set => <label className={`rs-check${seen.includes(set.id) ? "" : " rs-set-unseen"}`} key={set.id}>
          <input type="checkbox" checked={seen.includes(set.id)} onChange={event => void persist({
            seen_set_ids: event.target.checked ? [...seen, set.id] : seen.filter(id => id !== set.id),
          }, "controls")} />
          {setLabel(set, catalog, concert)}
        </label>)}
      </fieldset>}
      {!sets.length && !!concert.supporting_artist_ids.length && (
        <fieldset disabled={busy}>
          <legend>Supporting artists</legend>
          {concert.supporting_artist_ids.map((id) => (
            <label className="rs-check" key={id}>
              <input type="checkbox" checked={selected.includes(id)} onChange={(event) => void persist({ supporting_artist_ids:
                event.target.checked ? [...selected, id] : selected.filter((item) => item !== id),
              }, "controls")} />
              {catalog.artists.find((item) => item.id === id)?.name || "Unknown artist"}
            </label>
          ))}
        </fieldset>
      )}
      <div className="rs-field">
        <label htmlFor={notesId}>Public Notes</label>
        <textarea id={notesId} value={notes} onChange={(event) => setNotesDraft(event.target.value)} rows={3} maxLength={20000} />
      </div>
      {error && <Message error>{error}</Message>}
      <div className="rs-form-actions">
        <button type="button" className="rs-text-button" disabled={busy} onClick={() => void persist({ removed: !hidden }, "controls")}>
          {hidden ? "Unhide" : "Hide"}
        </button>
        <span className="rs-spacer" />
        <button className="rs-primary" type="submit" disabled={busy || notes === savedNotes}>{saving === "notes" ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
