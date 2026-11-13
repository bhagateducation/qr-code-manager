"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to request a reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card panel">
        <span className="badge">Account recovery</span>
        <h1>Reset your password</h1>
        <p className="muted">Enter the email address associated with your account.</p>
        <form className="stack" onSubmit={submit}>
          <label>
            Email address
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={190} />
          </label>
          {error && <p role="alert" className="notice error">{error}</p>}
          {message && <p role="status" className="notice">{message}</p>}
          <button className="button primary" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
      </div>
    </main>
  );
}
