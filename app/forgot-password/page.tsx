"use client";

import Link from "next/link";
import { useState } from "react";

export default function Page() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); setMessage(""); try { const response = await fetch("/api/auth/password-reset/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(result.message); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <main className="auth-shell"><div className="auth-card panel"><span className="badge">Account recovery</span><h1>Reset your password</h1><p className="muted">Enter your account email. If it exists, we will send a secure reset link.</p><form className="stack" onSubmit={submit}><label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={190} /></label>{error && <p className="notice error">{error}</p>}{message && <p className="notice">{message}</p>}<button className="button primary" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button></form><p className="auth-switch"><Link href="/login">Back to sign in</Link></p></div></main>;
}
