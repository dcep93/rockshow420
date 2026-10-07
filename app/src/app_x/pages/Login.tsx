import { useState } from "react";
import { useApp } from "../data/store";
import { Message } from "../components/ui";
import { errorMessage } from "../components/errors";

export function Login() {
  const { signIn, ready } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="rs-login">
      <h1>rockshow420</h1>
      <button
        className="rs-google-button"
        type="button"
        disabled={!ready || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await signIn();
          } catch (caught) {
            setError(errorMessage(caught));
          } finally {
            setBusy(false);
          }
        }}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4c-.2 1.3-1 2.4-2 3.1v2.6h3.4c2-1.8 2.8-4.4 2.8-7.6ZM12 22c2.7 0 5-.9 6.7-2.4l-3.4-2.6c-.9.6-2 1-3.3 1-2.6 0-4.8-1.8-5.6-4.1H2.9v2.7C4.6 19.8 8 22 12 22ZM6.4 13.9a6 6 0 0 1 0-3.8V7.4H2.9a10 10 0 0 0 0 9.2l3.5-2.7ZM12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2C8 2 4.6 4.2 2.9 7.4l3.5 2.7C7.2 7.8 9.4 6 12 6Z"
          />
        </svg>
        {busy ? "Signing in…" : "Continue with Google"}
      </button>
      {error && <Message error>{error}</Message>}
    </section>
  );
}
