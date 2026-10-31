"use client";
import Link from "next/link";
import { useState } from "react";
import { QrCode, ArrowRight, Eye, EyeOff } from "lucide-react";
export default function AuthForm({ register = false }: { register?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(
        `/api/auth/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <Link href="/" className="brand">
        <QrCode /> QR Manager
      </Link>
      <div className="auth-card panel">
        <span className="badge">Your physical world, connected</span>
        <h1>{register ? "Create your workspace" : "Welcome back."}</h1>
        <p className="muted">
          {register
            ? "Start with 10 dynamic QR codes on the Free plan."
            : "One place for your codes, records and scan activity."}
        </p>
        <form onSubmit={submit} className="stack">
          {register && (
            <>
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Workspace name
                <input name="workspace" required maxLength={100} />
              </label>
            </>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={190}
            />
          </label>
          <label>
            Password
            <div className="password-input">
              <input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 12 : 1}
                maxLength={72}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {register && <small>Use at least 12 characters.</small>}
          </label>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <button disabled={busy} className="button primary">
            {busy
              ? "Please wait…"
              : register
                ? "Create free account"
                : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already registered?" : "New to QR Manager?"}{" "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
      <p className="muted text-sm">
        QR Manager • Workspace access is checked on the server
      </p>
    </main>
  );
}
