"use client";
import { FormEvent, useState } from "react";
import { CheckCircle2, Globe, LayoutGrid, LogIn, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { CopyButton, Ctx, Empty, Info, api, formatDate, formatDateTime, limitText, plural } from "./ui";

/** Extra panels a client makes for teams or branches. Each has its own codes, folders and members; plan limits are shared. */
export function Panels({ ctx }: { ctx: Ctx }) {
  const { data, mutate, ask, switchPanel } = ctx;
  const { account, limits } = data;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const full = limits.panels !== null && account.panels.length >= limits.panels;
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await mutate("panel.create", name);
      setName("");
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      {account.manages && (
        <form className="panel inline-form" onSubmit={create}>
          <label>
            New panel name
            <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jaipur branch, Maths department" disabled={full} />
          </label>
          <button className="button primary" disabled={busy || full}>
            <Plus size={16} /> Create panel
          </button>
          <small className="num" style={{ alignSelf: "center" }}>
            {account.panels.length} of {limitText(limits.panels)} panels used
          </small>
        </form>
      )}
      {full && account.manages && <p className="notice info">Your plan allows {plural(limits.panels!, "panel")}. Upgrade, or ask us for more, to add another.</p>}
      <div className="panel flush">
        <div className="feature-list">
          <div className="feature-row">
            <span className="qr-tile">
              <LayoutGrid size={17} />
            </span>
            <div>
              <strong>{data.workspace.accountName} · main panel</strong>
              <small>Billing, plan and custom domain are managed here</small>
            </div>
            {data.workspace.isPanel && (
              <button className="button small" onClick={() => switchPanel(account.rootId === account.homeId ? null : account.rootId)}>
                <LogIn size={14} /> Open
              </button>
            )}
          </div>
          {account.panels.map((panel) => (
            <div className="feature-row" key={panel.id}>
              <span className="qr-tile">
                <LayoutGrid size={17} />
              </span>
              <div>
                <strong>
                  {panel.name} {panel.current && <span className="badge">You are here</span>}
                </strong>
                <small>
                  {plural(panel._count.qrCodes, "code")} · {plural(panel._count.users, "member")} · made {formatDate(panel.createdAt)}
                </small>
              </div>
              {!panel.current && (
                <button className="button small" onClick={() => switchPanel(panel.id)}>
                  <LogIn size={14} /> Open
                </button>
              )}
              {account.manages && (
                <>
                  <button
                    className="icon-button"
                    title="Rename"
                    aria-label={`Rename ${panel.name}`}
                    onClick={() => {
                      const next = window.prompt("New name for this panel", panel.name);
                      if (next?.trim()) void mutate("panel.rename", next.trim(), panel.id).catch(() => {});
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  {!panel.current && (
                    <button
                      className="icon-button danger"
                      title="Delete panel"
                      aria-label={`Delete ${panel.name}`}
                      onClick={async () =>
                        (await ask({ title: `Delete the panel “${panel.name}”?`, body: `Its ${plural(panel._count.qrCodes, "QR code")}, folders, scan history and ${plural(panel._count.users, "member account")} are deleted for good, and its printed codes stop working.`, action: "Delete panel" })) &&
                        mutate("panel.delete", undefined, panel.id).catch(() => {})
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        {!account.panels.length && <Empty icon={LayoutGrid} title="No extra panels yet" text="Make a panel for each branch, department or employee group. Invite people into a panel from its Team page; they only see that panel." />}
      </div>
    </div>
  );
}

/** Lets an account owner print QR codes on their own domain, with automatic fallback to ours. */
export function DomainSettings({ ctx }: { ctx: Ctx }) {
  const { data, notify, reload } = ctx;
  const domain = data.domain;
  const [value, setValue] = useState(domain?.name || "");
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<{ txt: boolean; live: boolean } | null>(null);
  if (!domain) return null;
  const run = async (action: string, payload?: unknown, done = "Saved.") => {
    setBusy(true);
    try {
      const result = await api("/api/workspace", { action, data: payload });
      if (action === "domain.check") setCheck(result);
      await reload();
      notify(action === "domain.check" ? (result.status === "verified" ? "Domain verified." : "Not ready yet — see the checks below.") : done, action === "domain.check" && result.status !== "verified" ? "error" : "ok");
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const host = domain.name || "qr.yourbrand.com";
  return (
    <div className="panel stack">
      <div>
        <h2>
          <Globe size={17} /> Custom domain
          <Info text="Print your own domain (like qr.yourbrand.com) in your QR codes instead of ours. Your codes use it only while it is verified and working. If it ever stops working, new copies, downloads and print sheets switch back to our domain automatically and you see a warning. Codes already printed with your domain need your domain to keep pointing to us — so keep the DNS records in place." />
        </h2>
        <p className="muted">Use a sub-domain you own, such as qr.yourbrand.com.</p>
      </div>
      {!data.limits.allowDomain ? (
        <p className="notice info">Your plan does not include a custom domain. Upgrade to use one.</p>
      ) : (
        <>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run("domain.save", value, "Domain saved. Now add the DNS records below.");
            }}
          >
            <label>
              Domain
              <input required value={value} maxLength={253} placeholder="qr.yourbrand.com" onChange={(event) => setValue(event.target.value)} />
            </label>
            <button className="button" disabled={busy || value.trim().toLowerCase() === domain.name}>
              Save
            </button>
          </form>
          {domain.name && (
            <>
              <div>
                <span className="field-label">Add these two records at your domain provider</span>
                <div className="dns" style={{ marginTop: 8 }}>
                  <strong>CNAME</strong>
                  <code>{host}</code>
                  <span className="row-actions" style={{ flexWrap: "nowrap" }}>
                    <code className="grow">{domain.target}</code>
                    <CopyButton value={domain.target} notify={notify} />
                  </span>
                  <strong>TXT</strong>
                  <code>_qrm.{host}</code>
                  <span className="row-actions" style={{ flexWrap: "nowrap" }}>
                    <code className="grow">{domain.token}</code>
                    <CopyButton value={domain.token || ""} notify={notify} />
                  </span>
                </div>
                <small style={{ display: "block", marginTop: 8 }}>DNS changes can take up to a few hours. We also connect the domain on our server; if Check stays red after a day, contact us.</small>
              </div>
              <div className="row-actions">
                <span className={`badge ${domain.status === "verified" ? "success" : domain.status === "failing" ? "error" : "warn"}`}>
                  {domain.status === "verified" ? "Verified" : domain.status === "failing" ? "Not working — using our domain" : "Waiting for DNS"}
                </span>
                {domain.checkedAt && <small>checked {formatDateTime(domain.checkedAt)}</small>}
                <span className="grow" />
                <button className="button small" disabled={busy} onClick={() => run("domain.check")}>
                  Check now
                </button>
              </div>
              {check && (
                <div className="stack" style={{ gap: 4 }}>
                  {[
                    [check.txt, "TXT record found"],
                    [check.live, "Domain reaches our server over HTTPS"],
                  ].map(([ok, label]) => (
                    <span key={label as string} className="toggle-row" style={{ color: ok ? "var(--ok)" : "var(--danger)" }}>
                      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {label}
                    </span>
                  ))}
                </div>
              )}
              <label className="toggle-row">
                <input type="checkbox" disabled={busy || domain.status !== "verified"} checked={domain.use} onChange={(event) => run("domain.use", event.target.checked, event.target.checked ? "New QR codes now use your domain." : "QR codes use our domain again.")} />
                Use {domain.name} in my QR codes
              </label>
              {domain.use && domain.status === "failing" && <p className="notice error">Your domain is not working, so your QR codes are using our domain until it is fixed. Codes printed with your domain will not open until then.</p>}
              <button className="button small danger" style={{ justifySelf: "start" }} disabled={busy} onClick={() => run("domain.remove", undefined, "Domain removed.")}>
                Remove domain
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
