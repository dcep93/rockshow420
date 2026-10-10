import { useEffect, useId, useRef, useState } from "react";

export function UserOptions({ username, isAdmin, busy, exportDisabled, onExport, onExportNotes, onManage, onSignOut }: {
  username: string;
  isAdmin: boolean;
  busy: boolean;
  exportDisabled: boolean;
  onExport: () => Promise<void>;
  onExportNotes: () => Promise<void>;
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
          <ExportButton label="Export to clipboard" disabled={exportDisabled} onExport={onExport} />
          <ExportButton label="Export all notes" disabled={exportDisabled} onExport={onExportNotes} />
          {isAdmin && (
            <button type="button" className="rs-text-button" onClick={() => choose(onManage)}>admin: Manage</button>
          )}
          <button type="button" className="rs-text-button" onClick={() => choose(onSignOut)}>Sign out</button>
        </div>
      )}
    </div>
  );
}

function ExportButton({ label, disabled, onExport }: { label: string; disabled: boolean; onExport: () => Promise<void> }) {
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  return <button type="button" className="rs-text-button" disabled={disabled}
    aria-label={label} aria-busy={copyState === "copying"} aria-live="polite"
    onClick={async () => {
      if (copyState === "copying") return;
      setCopyState("copying");
      try {
        await onExport();
        setCopyState("copied");
      } catch {
        setCopyState("failed");
      }
    }}
  >{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed — retry" : label}</button>;
}
