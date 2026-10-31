"use client";

import { FormEvent, useEffect, useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
import { api } from "./Dashboard";

export default function MfaSettings() {
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { api("/api/account/mfa").then((result) => setEnabled(result.enabled)).catch((e) => setError(e.message)); }, []);
  async function setup() { setError(""); try { const result = await api("/api/account/mfa", { action: "setup" }); setSecret(result.secret); setOtpauth(result.otpauth); } catch (e) { setError((e as Error).message); } }
  async function enable(event: FormEvent) { event.preventDefault(); setError(""); try { const result = await api("/api/account/mfa", { action: "enable", secret, code }); setEnabled(result.enabled); setBackup(result.backupCodes || []); setSecret(""); setOtpauth(""); setCode(""); } catch (e) { setError((e as Error).message); } }
  async function disable() { setError(""); try { await api("/api/account/mfa", { action: "disable" }); setEnabled(false); } catch (e) { setError((e as Error).message); } }
  return <div className="panel narrow" style={{ marginTop: 20 }}><div className="panel-heading"><div><h2><ShieldCheck size={18} /> Multi-factor authentication</h2><p className="muted">Protect sign-in with a TOTP authenticator app.</p></div><span className="badge">{enabled ? "Enabled" : "Not enabled"}</span></div>{error && <p className="notice error">{error}</p>}{backup.length > 0 && <div className="notice"><strong>Save these backup codes now:</strong><code className="secret-value">{backup.join(" · ")}</code><button className="button small" onClick={() => navigator.clipboard.writeText(backup.join("\n"))}><Copy size={14} /> Copy</button></div>}{!enabled && !secret && <button className="button primary" onClick={setup}><ShieldCheck size={16} /> Set up authenticator</button>}{!enabled && secret && <form className="stack" onSubmit={enable}><p className="muted">Add this secret to your authenticator app:</p><code className="secret-value">{secret}</code><small>Manual setup URI: {otpauth}</small><label>Verification code<input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required placeholder="000000" /></label><div className="row-actions"><button className="button primary">Enable MFA</button><button type="button" className="button" onClick={() => { setSecret(""); setOtpauth(""); }}>Cancel</button></div></form>}{enabled && <button className="button" onClick={disable}>Disable MFA</button>}</div>;
}
