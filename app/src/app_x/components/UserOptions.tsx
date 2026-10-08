import { useEffect, useId, useRef, useState } from "react";

export function UserOptions({ username, isAdmin, busy, onManage, onSignOut }: {
  username: string;
  isAdmin: boolean;
  busy: boolean;
  onManage: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionsId = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  const choose = (action: () => void) => {
    setOpen(false);
    trigger.current?.focus();
    action();
  };
  return (
    <div className="rs-user-options" ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button ref={trigger} type="button" className="rs-text-button rs-username"
        aria-expanded={open} aria-controls={optionsId} disabled={busy}
        onClick={() => setOpen(!open)}
      >
        @{username}
      </button>
      {open && (
        <div id={optionsId} className="rs-user-options-panel" role="group" aria-label="User options">
          {isAdmin && (
            <button type="button" className="rs-text-button" onClick={() => choose(onManage)}>Manage</button>
          )}
          <button type="button" className="rs-text-button" onClick={() => choose(onSignOut)}>Sign out</button>
        </div>
      )}
    </div>
  );
}
