import { isTicketStatus, ticketStatusLabels } from "../data/model";
import type { LogEditing } from "../forms/useLogEditor";

export function LogControls({ editor }: { editor: LogEditing }) {
  const disabled = editor.readOnly || editor.busy;
  return <>
    <div className="rs-ticket-control">
      <select aria-label="Ticket status" value={editor.ticketStatus} disabled={disabled} onChange={event => {
        if (isTicketStatus(event.target.value)) void editor.persist({ ticket_status: event.target.value }, "controls");
      }}>
        {Object.entries(ticketStatusLabels).map(([value, label]) => <option key={value} value={value} label={label || " "}>{label}</option>)}
      </select>
    </div>
    <button type="button" className="rs-text-button" disabled={disabled} onClick={() => void editor.persist({ removed: !editor.hidden }, "controls")}>
      {editor.hidden ? "Unhide" : "Hide"}
    </button>
  </>;
}
