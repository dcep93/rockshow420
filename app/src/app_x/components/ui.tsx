import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

export function Icon({ name }: { name: "close" | "search" }) {
  const paths = {
    close: "m6 6 12 12M6 18 18 6",
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
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function Picture({ src, name, large = false }: { src?: string; name: string; large?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (!src || !/^https?:\/\//i.test(src) || failedSrc === src) return null;
  return (
    <div className={`rs-picture${large ? " rs-picture-large" : ""}`}>
      <img src={src} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} />
    </div>
  );
}
