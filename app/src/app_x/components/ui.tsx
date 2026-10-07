import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

export function Icon({ name }: { name: "plus" | "arrow" | "close" | "music" | "search" }) {
  const paths = {
    plus: "M12 5v14M5 12h14",
    arrow: "M7 17 17 7M7 7h10v10",
    close: "m6 6 12 12M6 18 18 6",
    music:
      "M9 18V5l12-2v13M9 8l12-2M9 18a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3ZM21 16a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Z",
    search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      dialog.close();
    };
  }, []);
  return (
    <dialog
      className="rs-dialog"
      ref={ref}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="rs-dialog-inner">
        <div className="rs-dialog-heading">
          <h2 id={heading}>{title}</h2>
          <button type="button" className="rs-icon-button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Message({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p className={error ? "rs-message rs-error" : "rs-message"} role={error ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rs-empty">
      <span className="rs-empty-icon">
        <Icon name="music" />
      </span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function Picture({ src, name, large = false }: { src?: string; name: string; large?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const safe = src && /^https?:\/\//i.test(src);
  return (
    <div className={`rs-picture${large ? " rs-picture-large" : ""}`} aria-hidden="true">
      {safe && failedSrc !== src ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} />
      ) : (
        <span>{name.slice(0, 1).toUpperCase() || "♪"}</span>
      )}
    </div>
  );
}
