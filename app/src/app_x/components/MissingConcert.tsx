import { useState } from "react";
import type { UserConcert } from "../data/model";
import { removeLog } from "../data/actions";
import { errorMessage } from "./errors";
import { Message } from "./ui";

export function MissingConcert({ log, canEdit }: { log: UserConcert; canEdit: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="rs-message">
      <p>A saved concert is no longer available.</p>
      {canEdit && (
        <button
          type="button"
          className="rs-text-button"
          disabled={busy}
          onClick={async () => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            setBusy(true);
            try {
              await removeLog(log.user_id, log.concert_id);
            } catch (caught) {
              setError(errorMessage(caught));
              setBusy(false);
            }
          }}
        >
          {busy ? "Removing…" : confirm ? "Confirm removal" : "Remove from this page"}
        </button>
      )}
      {confirm && !busy && (
        <button type="button" className="rs-text-button" onClick={() => setConfirm(false)}>
          Keep it
        </button>
      )}
      {error && <Message error>{error}</Message>}
    </div>
  );
}
