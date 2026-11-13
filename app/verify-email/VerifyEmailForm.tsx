"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function VerificationForm({ emailAvailable }: { emailAvailable: boolean }) {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/email-verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Email verified successfully. You can sign in now.");
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Unable to verify this email.");
    } finally {
      setBusy(false);
    }
  }

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.message);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Unable to send verification instructions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card panel">
        <span className="badge">Account verification</span>
        <h1>{token ? "Verify your email" : "Resend verification"}</h1>
        <p className="muted">
          {token
            ? "This secure link is valid for 24 hours and can only be used once."
            : emailAvailable
              ? "Enter your account email to request a fresh verification link."
              : "Verification email is currently unavailable."}
        </p>
        {token ? (
          <div className="stack">
            {error && <p role="alert" className="notice error">{error}</p>}
            {message && <p role="status" className="notice">{message}</p>}
            <button className="button primary" onClick={verify} disabled={busy || !!message}>
              {busy ? "Verifying…" : "Verify email"}
            </button>
          </div>
        ) : emailAvailable ? (
          <form className="stack" onSubmit={resend}>
            <label>
              Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={190} />
            </label>
            {error && <p role="alert" className="notice error">{error}</p>}
            {message && <p role="status" className="notice">{message}</p>}
            <button className="button primary" disabled={busy}>
              {busy ? "Sending…" : "Send verification link"}
            </button>
          </form>
        ) : null}
        <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
      </div>
    </main>
  );
}

export default function VerifyEmailForm({ emailAvailable }: { emailAvailable: boolean }) {
  return <Suspense fallback={<main className="loading-screen"><h1>Opening verification…</h1></main>}><VerificationForm emailAvailable={emailAvailable} /></Suspense>;
}
