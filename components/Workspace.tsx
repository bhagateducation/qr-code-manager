"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Building2, Check, LifeBuoy, Mail, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { BRAND, SUPPORT_EMAIL } from "@/lib/brand";
import { api, Ctx, Empty, Modal, Secret, formatDate, formatDateTime, itemMotion, listMotion, rupees } from "./ui";
import { Meter } from "./Overview";

const roleHelp: Record<string, string> = {
  admin: "Everything except billing, team and workspace settings",
  editor: "Create and edit codes, systems and records",
  viewer: "View and download only",
};

export function Team({ ctx }: { ctx: Ctx }) {
  const { data, isOwner, mutate, notify, ask } = ctx;
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    try {
      const result = await mutate("team.invite", { email: form.get("email"), role: form.get("role") });
      if (result.oneTimeSecret) setLink(`${window.location.origin}/invite?token=${encodeURIComponent(result.oneTimeSecret)}`);
      element.reset();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      {link && <Secret title="Invitation link — send it to your teammate. It works once and expires in 7 days:" value={link} notify={notify} />}
      {isOwner ? (
        <form className="panel inline-form" onSubmit={invite}>
          <label>
            Email address
            <input name="email" type="email" required maxLength={190} placeholder="teammate@company.com" />
          </label>
          <label>
            Role
            <select name="role" defaultValue="editor">
              {Object.entries(roleHelp).map(([role, help]) => (
                <option key={role} value={role}>
                  {role[0].toUpperCase() + role.slice(1)} — {help}
                </option>
              ))}
            </select>
          </label>
          <button className="button primary" disabled={busy}>
            <UserPlus size={16} /> Invite
          </button>
        </form>
      ) : (
        <p className="notice info">Only the workspace owner can invite or remove members.</p>
      )}
      <div className="panel">
        <div className="panel-heading">
          <h2>Members ({data.members.length})</h2>
        </div>
        <div className="feature-list">
          {data.members.map((member) => (
            <div className="feature-row" key={member.id}>
              <span className="avatar">{member.name.slice(0, 1)}</span>
              <div>
                <strong>
                  {member.name} {member.id === data.user.id && <span className="muted">(you)</span>}
                </strong>
                <small>{member.email}</small>
              </div>
              {isOwner && member.id !== data.user.id && member.role !== "owner" ? (
                <>
                  <select aria-label={`Role of ${member.name}`} value={member.role} onChange={(event) => void mutate("team.role", { role: event.target.value }, member.id).catch(() => {})}>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button className="icon-button danger" aria-label={`Remove ${member.name}`} onClick={async () => (await ask({ title: `Remove ${member.name}?`, body: "Their account is deleted and they are signed out immediately. Codes they created stay in the workspace.", action: "Remove member" })) && mutate("team.remove", undefined, member.id).catch(() => {})}>
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <span className="badge">{member.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      {data.invitations.length > 0 && (
        <div className="panel">
          <div className="panel-heading">
            <h2>Pending invitations</h2>
          </div>
          <div className="feature-list">
            {data.invitations.map((invitation) => (
              <div className="feature-row" key={invitation.id}>
                <span className="stat-icon">
                  <Mail size={16} />
                </span>
                <div>
                  <strong>{invitation.email}</strong>
                  <small>
                    {invitation.role} · expires {formatDate(invitation.expiresAt)}
                  </small>
                </div>
                {isOwner && (
                  <button className="button small" onClick={() => void mutate("invitation.revoke", undefined, invitation.id).catch(() => {})}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const planNotes: Record<string, string> = { free: "For your first codes", pro: "For growing teams and campaigns", business: "For large collections and operations" };
const planLimits = { free: [10, 1, 50], pro: [500, 10, 5000], business: [2500, 50, 25000] } as const;
export function Billing({ ctx }: { ctx: Ctx }) {
  const { data, isOwner, reload, notify } = ctx;
  const [busy, setBusy] = useState(false);
  async function checkout(plan: string) {
    setBusy(true);
    try {
      const order = await api("/api/billing/order", { plan });
      if (!(window as any).Razorpay)
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("The payment window could not load. Check your connection and try again."));
          document.head.appendChild(script);
        });
      const window_ = new (window as any).Razorpay({
        key: order.key,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: BRAND,
        description: `${plan} plan — 30 days`,
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() },
        handler: async (response: unknown) => {
          try {
            await api("/api/billing/verify", response);
            await reload();
            notify("Payment received. Your plan is active.");
          } catch (e) {
            notify((e as Error).message, "error");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      window_.on("payment.failed", () => {
        notify("The payment did not complete. You have not been charged for a plan.", "error");
        setBusy(false);
      });
      window_.open();
    } catch (e) {
      notify((e as Error).message, "error");
      setBusy(false);
    }
  }
  const plans = [
    { id: "free", price: 0 },
    { id: "pro", price: data.prices.pro },
    { id: "business", price: data.prices.business },
  ] as const;
  return (
    <div className="page-stack">
      <div className="panel stack">
        <div className="panel-heading" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ textTransform: "capitalize" }}>{data.workspace.plan} plan</h2>
            <p className="muted">{data.workspace.paidUntil && data.workspace.plan !== "free" ? `Active until ${formatDate(data.workspace.paidUntil)}. It does not renew automatically.` : "No payment needed."}</p>
          </div>
        </div>
        <div className="three-col">
          <Meter label="QR codes" used={data.codeCount} limit={data.limits.codes} />
          <Meter label="Systems" used={data.systems.length} limit={data.limits.systems} />
          <Meter label="Records" used={data.recordCount} limit={data.limits.records} />
        </div>
      </div>
      {!data.checkoutReady && <p className="notice info">Online payment is not switched on for this site yet. {SUPPORT_EMAIL ? `Contact ${SUPPORT_EMAIL} to upgrade.` : "Contact your provider to upgrade."}</p>}
      <motion.div className="plans-grid" variants={listMotion} initial="hidden" animate="show">
        {plans.map((plan) => {
          const [codes, systems, records] = planLimits[plan.id];
          const isCurrent = plan.id === data.workspace.plan;
          return (
            <motion.div variants={itemMotion} className={`panel plan ${isCurrent ? "current" : ""}`} key={plan.id}>
              <div className="row-actions" style={{ justifyContent: "space-between" }}>
                <h2 style={{ textTransform: "capitalize" }}>{plan.id}</h2>
                {isCurrent && <span className="badge">Current</span>}
              </div>
              <p className="price">
                {plan.price ? rupees(plan.price) : plan.id === "free" ? "₹0" : "—"}
                <small className="muted"> /{plan.id === "free" ? "forever" : "30 days"}</small>
              </p>
              <p className="muted">{planNotes[plan.id]}</p>
              <ul>
                {[`${codes.toLocaleString()} QR codes`, `${systems} business ${systems === 1 ? "system" : "systems"}`, `${records.toLocaleString()} records`, "Analytics, API and webhooks"].map((line) => (
                  <li key={line}>
                    <Check size={16} /> {line}
                  </li>
                ))}
              </ul>
              {plan.id !== "free" && (
                <button className={`button ${isCurrent ? "" : "primary"}`} disabled={busy || !data.checkoutReady || !plan.price || !isOwner || (data.workspace.plan === "business" && plan.id === "pro")} onClick={() => checkout(plan.id)}>
                  {!isOwner ? "Owner only" : isCurrent ? "Extend 30 days" : "Upgrade"}
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>
      <div className="panel flush">
        <div className="panel-heading">
          <h2>Payment history</h2>
        </div>
        {data.payments.map((payment) => (
          <div className="audit-row" key={payment.id}>
            <span>
              <strong style={{ textTransform: "capitalize" }}>{payment.plan}</strong> {rupees(payment.amount)}
            </span>
            <span className={`badge ${payment.status === "paid" || payment.status === "captured" ? "success" : "neutral"}`}>{payment.status}</span>
            <time>{formatDate(payment.createdAt)}</time>
          </div>
        ))}
        {!data.payments.length && <p className="empty">No payments yet.</p>}
      </div>
    </div>
  );
}

// Audit actions are stored as machine keys; show people a sentence instead.
const actionLabels: Record<string, string> = {
  "qr.create": "Created a QR code",
  "qr.update": "Edited a QR code",
  "qr.pause": "Paused or resumed a QR code",
  "qr.delete": "Moved a QR code to the trash",
  "qr.bulk.pause": "Paused several QR codes",
  "qr.bulk.resume": "Resumed several QR codes",
  "qr.bulk.trash": "Moved QR codes to the trash",
  "qr.bulk.restore": "Restored QR codes from the trash",
  "qr.bulk.purge": "Permanently deleted QR codes",
  "trash.empty": "Emptied the trash",
  "qr.bulk.move": "Moved QR codes to a folder",
  "folder.create": "Created a folder",
  "folder.rename": "Renamed a folder",
  "folder.delete": "Deleted a folder",
  "book.create": "Created a book QR set",
  "system.create": "Created a system",
  "system.delete": "Deleted a system",
  "record.create": "Added a record",
  "record.update": "Edited a record",
  "record.delete": "Deleted a record",
  "record.publish": "Changed a record's public page",
  "tag.create": "Created a tag",
  "tag.delete": "Deleted a tag",
  "campaign.create": "Created a campaign",
  "campaign.status": "Changed a campaign status",
  "campaign.delete": "Deleted a campaign",
  "webhook.create": "Added a webhook",
  "webhook.toggle": "Paused or resumed a webhook",
  "webhook.delete": "Deleted a webhook",
  "apiKey.create": "Created an API key",
  "apiKey.revoke": "Revoked an API key",
  "team.invite": "Invited a member",
  "team.role": "Changed a member's role",
  "team.remove": "Removed a member",
  "invitation.revoke": "Revoked an invitation",
  "workspace.rename": "Renamed the workspace",
  "workspace.suspended": "Suspended a client workspace",
  "workspace.restored": "Restored a client workspace",
};
export function AuditLog({ ctx }: { ctx: Ctx }) {
  const { audit } = ctx.data;
  return (
    <div className="panel flush">
      {audit.map((event) => (
        <div className="audit-row" key={event.id}>
          <span>
            <Activity size={15} className="muted" />
            {actionLabels[event.action] || event.action.replaceAll(".", " ")}
          </span>
          <time>{formatDateTime(event.createdAt)}</time>
        </div>
      ))}
      {!audit.length && <Empty icon={Activity} title="Nothing logged yet" text="Every saved change in this workspace is recorded here. The latest 50 are shown." />}
    </div>
  );
}

function Mfa({ ctx }: { ctx: Ctx }) {
  const { notify } = ctx;
  const [enabled, setEnabled] = useState<boolean | null>(null),
    [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null),
    [disabling, setDisabling] = useState(false),
    [code, setCode] = useState(""),
    [backup, setBackup] = useState<string[]>([]);
  useEffect(() => {
    api("/api/account/mfa")
      .then((result) => setEnabled(result.enabled))
      .catch((e) => notify(e.message, "error"));
  }, [notify]);
  async function run(payload: object, after: (result: any) => void) {
    try {
      after(await api("/api/account/mfa", payload));
      setCode("");
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }
  const codeInput = (
    <label>
      6-digit code from your authenticator app
      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" autoComplete="one-time-code" />
    </label>
  );
  return (
    <div className="panel stack">
      <div className="panel-heading" style={{ marginBottom: 0 }}>
        <div>
          <h2>
            <ShieldCheck size={17} /> Two-step sign-in
          </h2>
          <p className="muted">Ask for a code from an authenticator app, such as Google Authenticator, at every sign-in.</p>
        </div>
        {enabled !== null && <span className={`badge ${enabled ? "success" : "neutral"}`}>{enabled ? "On" : "Off"}</span>}
      </div>
      {backup.length > 0 && <Secret title="Backup codes — each works once if you lose your phone. Store them now:" value={backup.join("  ")} notify={notify} />}
      {enabled === false && !setup && (
        <button className="button primary" style={{ justifySelf: "start" }} onClick={() => run({ action: "setup" }, setSetup)}>
          Turn on two-step sign-in
        </button>
      )}
      {setup && (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            run({ action: "enable", secret: setup.secret, code }, (result) => {
              setEnabled(true);
              setBackup(result.backupCodes || []);
              setSetup(null);
            });
          }}
        >
          <p>
            In your authenticator app choose <strong>Enter a setup key</strong> and type this key:
          </p>
          <code className="secret-value">{setup.secret}</code>
          {codeInput}
          <div className="row-actions">
            <button className="button primary">Confirm and turn on</button>
            <button type="button" className="button" onClick={() => setSetup(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {enabled && !disabling && (
        <button className="button" style={{ justifySelf: "start" }} onClick={() => setDisabling(true)}>
          Turn off
        </button>
      )}
      {enabled && disabling && (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            run({ action: "disable", code }, () => {
              setEnabled(false);
              setDisabling(false);
              setBackup([]);
            });
          }}
        >
          {codeInput}
          <div className="row-actions">
            <button className="button danger">Turn off two-step sign-in</button>
            <button type="button" className="button" onClick={() => setDisabling(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function SettingsPanel({ ctx }: { ctx: Ctx }) {
  const { data, isOwner, mutate, notify } = ctx;
  const [busy, setBusy] = useState(false);
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    try {
      await api("/api/account/password", { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") });
      element.reset();
      notify("Password changed. Other devices have been signed out.");
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="two-col" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
      <div className="page-stack">
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            void mutate("workspace.rename", new FormData(event.currentTarget).get("name")).catch(() => {});
          }}
        >
          <h2>Workspace</h2>
          <label>
            Workspace name
            <input name="name" defaultValue={data.workspace.name} required maxLength={100} readOnly={!isOwner} />
            {!isOwner && <small>Only the owner can rename the workspace.</small>}
          </label>
          <label>
            Your sign-in email
            <input readOnly value={data.user.email} />
          </label>
          {isOwner && (
            <button className="button primary" style={{ justifySelf: "start" }}>
              Save
            </button>
          )}
        </form>
      </div>
      <div className="page-stack">
        <form className="panel stack" onSubmit={changePassword}>
          <h2>Password</h2>
          <label>
            Current password
            <input name="currentPassword" type="password" autoComplete="current-password" required maxLength={72} />
          </label>
          <label>
            New password
            <input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={72} />
            <small>At least 12 characters. Changing it signs out your other devices.</small>
          </label>
          <button className="button primary" disabled={busy} style={{ justifySelf: "start" }}>
            {busy ? "Changing…" : "Change password"}
          </button>
        </form>
        <Mfa ctx={ctx} />
        <div className="panel stack">
          <div>
            <h2>Signed-in devices</h2>
            <p className="muted">If you used a shared or lost device, end every session except this one.</p>
          </div>
          <button
            className="button"
            style={{ justifySelf: "start" }}
            onClick={() =>
              api("/api/auth/logout-others", {})
                .then((result) => notify(result.ended ? `Signed out ${result.ended} other ${result.ended === 1 ? "device" : "devices"}.` : "No other devices were signed in."))
                .catch((e) => notify(e.message, "error"))
            }
          >
            Sign out other devices
          </button>
        </div>
      </div>
    </div>
  );
}

const faq = [
  ["What is a dynamic QR code?", "The printed code holds a short permanent link. When someone scans it we forward them to your destination, which you can change at any time without reprinting."],
  ["Which QR types need a reprint after editing?", "Wi-Fi, contact card and plain text codes store their content inside the code itself, so the image changes when you edit them. Website link codes never change."],
  ["How do I send iPhone and Android users to different places?", "Open a website link code, expand “Device routing and expiry”, and add a separate address for each. Everyone else goes to the main destination."],
  ["What happens when I pause or delete a code?", "A paused code shows an “unavailable” message when scanned and can be resumed. A deleted code goes to the trash, where it can be restored for 30 days before it is removed for good."],
  ["How do I find one code among thousands?", "Every code has its own number, such as QR-00042. Type the number, part of the name or part of the link into the search box, or press Ctrl K from anywhere. Filters narrow the list by status, type, campaign and tag."],
  ["How do public record pages work?", "In Systems & records, publish a record to get a read-only page. Create a website link QR code that points at that page to label a product, asset or member card."],
  ["Who can do what?", "Owners manage billing, team and settings. Admins also manage API keys and webhooks. Editors create and edit content. Viewers can only look and download."],
  ["Is scan data private?", "We record time, device type, operating system and browser. We do not store IP addresses or precise location."],
];
export function Help({ ctx }: { ctx: Ctx }) {
  return (
    <div className="two-col">
      <div className="panel faq">
        <h2 style={{ marginBottom: 12 }}>Common questions</h2>
        {faq.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p className="details-content">{answer}</p>
          </details>
        ))}
      </div>
      <div className="page-stack">
        <div className="panel stack">
          <h2>
            <LifeBuoy size={17} style={{ display: "inline", verticalAlign: "-3px" }} /> Need a hand?
          </h2>
          {SUPPORT_EMAIL ? (
            <>
              <p className="muted">Tell us what you were doing and what you expected. We reply by email.</p>
              <a className="button primary" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${BRAND} support — ${ctx.data.workspace.name}`)}`}>
                <Mail size={16} /> Email support
              </a>
            </>
          ) : (
            <p className="muted">Contact the person or company that gave you this account.</p>
          )}
        </div>
        <div className="panel stack">
          <h2>Get started in three steps</h2>
          {[
            ["Create a QR code", "codes"],
            ["Invite your team", "team"],
            ["Watch the scans arrive", "analytics"],
          ].map(([label, tab], index) => (
            <button key={tab} className="quick" onClick={() => ctx.go(tab)}>
              <span className="stat-icon">{index + 1}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type Client = { id: string; name: string; plan: string; paidUntil: string | null; suspended: boolean; createdAt: string; ownerEmail: string; _count: { users: number; qrCodes: number } };
/** Platform owner only: every customer workspace, with manual plan grants and suspension. */
export function Clients({ ctx }: { ctx: Ctx }) {
  const { notify, ask } = ctx;
  const [report, setReport] = useState<{ totals: Record<string, number>; workspaces: Client[] } | null>(null),
    [search, setSearch] = useState(""),
    [granting, setGranting] = useState<Client | null>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      api(`/api/platform?search=${encodeURIComponent(search)}`)
        .then(setReport)
        .catch((e) => notify(e.message, "error")),
    [search, notify],
  );
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  async function post(payload: object, done: string) {
    setBusy(true);
    try {
      await api("/api/platform", payload);
      await load();
      notify(done);
      setGranting(null);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      {report && (
        <div className="stats-grid">
          {[
            ["Client workspaces", report.totals.workspaces],
            ["Users", report.totals.users],
            ["QR codes", report.totals.codes],
            ["Suspended", report.totals.suspended],
          ].map(([label, value]) => (
            <div className="stat" key={label}>
              <span className="stat-label">{label}</span>
              <strong>{Number(value).toLocaleString()}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="panel flush">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input type="search" aria-label="Search clients" placeholder="Search by workspace or owner email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {!report ? (
          <div className="skeleton" style={{ height: 200, margin: 20 }} />
        ) : report.workspaces.length ? (
          <div className="table-scroll">
            <table className="cards">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Plan</th>
                  <th>Users</th>
                  <th>Codes</th>
                  <th>Joined</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.workspaces.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="row-title">
                        <span className="qr-tile">
                          <Building2 size={17} />
                        </span>
                        <span className="grow">
                          {client.name} {client.suspended && <span className="badge error">Suspended</span>}
                          <small>{client.ownerEmail}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Plan">
                      <span>
                        <span className="badge">{client.plan}</span>
                        {client.plan !== "free" && client.paidUntil && <small> until {formatDate(client.paidUntil)}</small>}
                      </span>
                    </td>
                    <td data-label="Users">{client._count.users}</td>
                    <td data-label="Codes">{client._count.qrCodes}</td>
                    <td data-label="Joined">{formatDate(client.createdAt)}</td>
                    <td className="actions">
                      <div className="row-actions" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                        <button className="button small" onClick={() => setGranting(client)}>
                          Set plan
                        </button>
                        <button
                          className={`button small ${client.suspended ? "" : "danger"}`}
                          disabled={busy}
                          onClick={async () =>
                            (await ask({
                              title: `${client.suspended ? "Restore" : "Suspend"} ${client.name}?`,
                              body: client.suspended ? "Members can sign in again and the workspace's QR codes start working." : "Members are signed out and every QR code of this workspace stops redirecting until you restore it.",
                              action: client.suspended ? "Restore" : "Suspend",
                              danger: !client.suspended,
                            })) && post({ id: client.id, suspended: !client.suspended }, client.suspended ? "Workspace restored." : "Workspace suspended.")
                          }
                        >
                          {client.suspended ? "Restore" : "Suspend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Building2} title="No workspaces found" text="Try a different search." />
        )}
      </div>
      <AnimatePresence>
        {granting && (
          <Modal title={`Set plan for ${granting.name}`} onClose={() => setGranting(null)}>
            <form
              className="stack"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void post({ id: granting.id, plan: form.get("plan"), days: Number(form.get("days")) }, "Plan updated.");
              }}
            >
              <p className="muted">Use this when a client pays you directly. It takes effect immediately and is recorded in your audit log.</p>
              <label>
                Plan
                <select name="plan" defaultValue={granting.plan}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>
              </label>
              <label>
                Valid for (days from today)
                <input name="days" type="number" min={1} max={3660} defaultValue={30} required />
                <small>Ignored for the Free plan.</small>
              </label>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setGranting(null)}>
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  Save plan
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
