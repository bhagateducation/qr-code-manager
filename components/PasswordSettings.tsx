"use client";
import { useState } from "react";
import { api } from "./Dashboard";
export default function PasswordSettings() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(true);
        setError("");
        setMessage("");
        try {
          await api(
            "/api/account/password",
            Object.fromEntries(new FormData(form)),
          );
          form.reset();
          setMessage("Password changed. Other sessions have been signed out.");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Change password</h3>
      <label>
        Current password
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={72}
        />
      </label>
      <label>
        New password
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
        />
      </label>
      <small>Use at least 12 characters.</small>
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
      <button disabled={busy} className="button">
        {busy ? "Changing password…" : "Change password"}
      </button>
    </form>
  );
}
