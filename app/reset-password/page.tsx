"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetForm() {
  const params = useSearchParams(); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const response = await fetch("/api/auth/password-reset/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.get("token") || "", password }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage("Password changed. You can now sign in."); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <main className="auth-shell"><div className="auth-card panel"><span className="badge">Account recovery</span><h1>Choose a new password</h1><p className="muted">Use at least 12 characters. Existing sessions will be signed out.</p><form className="stack" onSubmit={submit}><label>New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={72} required /></label>{error && <p className="notice error">{error}</p>}{message && <p className="notice">{message}</p>}<button className="button primary" disabled={busy || !!message}>{busy ? "Updating…" : "Update password"}</button></form><p className="auth-switch"><Link href="/login">Back to sign in</Link></p></div></main>;
}

export default function Page() { return <Suspense fallback={<main className="loading-screen"><h1>Opening reset link…</h1></main>}><ResetForm /></Suspense>; }
