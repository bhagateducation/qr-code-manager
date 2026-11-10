"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, QrCode } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { api, ThemeControl } from "./ui";

export default function AuthForm({ register = false }: { register?: boolean }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await api(`/api/auth/${register ? "register" : "login"}`, Object.fromEntries(new FormData(event.currentTarget)));
      if (result.mfaRequired) setMfaRequired(true);
      else if (result.emailVerificationRequired) setMessage("Account created. Open the link we emailed you to verify your address, then sign in.");
      else return window.location.assign("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }
  return (
    <main className="auth-shell">
      <div className="auth-side">
        <ThemeControl />
      </div>
      <Link href="/" className="brand">
        <span className="brand-mark">
          <QrCode size={20} />
        </span>
        {BRAND}
      </Link>
      <div className="auth-card panel">
        <div>
          <h1>{register ? "Create your workspace" : "Welcome back"}</h1>
          <p className="muted">{register ? "Free to start. No card needed." : "Sign in to manage your codes and scans."}</p>
        </div>
        <form onSubmit={submit} className="stack">
          {register && (
            <>
              <label>
                Your name
                <input name="name" autoComplete="name" required maxLength={100} />
              </label>
              <label>
                Business or workspace name
                <input name="workspace" autoComplete="organization" required maxLength={100} />
              </label>
            </>
          )}
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required maxLength={190} />
          </label>
          <label>
            Password
            <div className="password-input">
              <input name="password" type={visible ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={72} />
              <button type="button" className="icon-button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {register && <small>At least 12 characters.</small>}
          </label>
          <AnimatePresence>
            {mfaRequired && (
              <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden" }}>
                Authenticator or backup code
                <input name="mfaCode" maxLength={20} required autoFocus autoComplete="one-time-code" placeholder="000000" />
                <small>Enter the 6-digit code from your authenticator app, or one of your backup codes.</small>
              </motion.label>
            )}
          </AnimatePresence>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          <button disabled={busy} className="button primary large block">
            {busy ? "Please wait…" : register ? "Create free account" : mfaRequired ? "Verify and sign in" : "Sign in"}
            {!busy && <ArrowRight size={17} />}
          </button>
          {!register && (
            <Link href="/forgot-password" className="auth-switch">
              Forgot your password?
            </Link>
          )}
        </form>
      </div>
      <p className="auth-switch">
        {register ? "Already have an account?" : `New to ${BRAND}?`} <Link href={register ? "/login" : "/register"}>{register ? "Sign in" : "Create an account"}</Link>
      </p>
    </main>
  );
}
