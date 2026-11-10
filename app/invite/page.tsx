"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/components/ui";
import { BRAND } from "@/lib/brand";

function InviteForm() {
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/api/auth/invite/accept", { token: params.get("token") || "", name, password });
      window.location.assign("/dashboard");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="auth-shell"><form className="auth-card panel stack" onSubmit={submit}><span className="badge">Workspace invitation</span><h1>Join {BRAND}</h1><p className="muted">Create your member account to access the invited workspace.</p><label>Your name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} maxLength={72} /></label>{error && <p className="notice error">{error}</p>}<button className="button primary" disabled={busy}>{busy ? "Joining…" : "Accept invitation"}</button></form></main>;
}

export default function Page() {
  return <Suspense fallback={<main className="loading-screen"><h1>Opening invitation…</h1></main>}><InviteForm /></Suspense>;
}
