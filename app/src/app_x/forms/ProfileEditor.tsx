import { useState } from "react";
import type { Profile } from "../data/model";
import { saveProfile } from "../data/actions";
import { Modal, Message } from "../components/ui";
import { errorMessage } from "../components/errors";

export function ProfileEditor({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [name, setName] = useState(profile.display_name || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Edit profile"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await saveProfile(profile.username, name.trim());
            onClose();
          } catch (caught) {
            setError(errorMessage(caught));
            setBusy(false);
          }
        }}
      >
        <label className="rs-field">
          Display name
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        </label>
        {error && <Message error>{error}</Message>}
        <div className="rs-form-actions">
          <button type="button" className="rs-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="rs-primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
