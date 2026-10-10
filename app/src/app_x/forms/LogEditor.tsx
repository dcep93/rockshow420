import { useId } from "react";
import type { LogEditing } from "./useLogEditor";

export function LogEditor({ editor, compact = false }: { editor: LogEditing; compact?: boolean }) {
  const notesId = useId();
  const { notes, savedNotes, setNotesDraft, busy, saving, persist } = editor;
  return <form className={`${compact ? "rs-entry-notes" : "rs-panel"} rs-inline-editor rs-public-notes`} aria-label="Public notes editor" onSubmit={event => {
    event.preventDefault();
    if (!editor.readOnly && notes !== savedNotes) void persist({ notes }, "notes");
  }}>
    <h2><label htmlFor={notesId}>Public Notes</label></h2>
    <textarea id={notesId} value={notes} readOnly={editor.readOnly} onChange={event => setNotesDraft(event.target.value)} rows={4} maxLength={20000} />
    <div className="rs-notes-actions">
      <button className="rs-primary" type="submit" disabled={editor.readOnly || busy || notes === savedNotes}>{saving === "notes" ? "Saving…" : "Save"}</button>
    </div>
  </form>;
}
