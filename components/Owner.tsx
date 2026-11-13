"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Bell, Building2, Check, ExternalLink, Gem, LogIn, Plus, Search, Trash2, X } from "lucide-react";
import { Meter } from "./Overview";
import { Ctx, Drive, Empty, Info, Limits, Modal, Plan, api, formatBytes, formatDate, formatDateTime, limitText, rupees } from "./ui";

type Client = {
  id: string;
  name: string;
  plan: string;
  effectivePlan: string;
  paidUntil: string | null;
  suspended: boolean;
  createdAt: string;
  customLimits: Partial<Limits> | null;
  notes: string | null;
  customDomain: string | null;
  domainStatus: string;
  remindedAt: string | null;
  owner: { name: string; email: string } | null;
  isPlatform: boolean;
  status: "active" | "expiring" | "expired" | "free" | "suspended";
  usage: { codes: number; scans: number; members: number; folders: number; systems: number; records: number; panels: number; lastActive: string | null; storageBytes: number };
  payments: { id: string; plan: string; amount: number; method: string; note: string | null; createdAt: string }[];
};
type Report = {
  clients: Client[];
  plans: (Plan & { clients: number })[];
  totals: Record<string, number>;
  maintenanceRun: string | null;
  site: Site;
};
type Site = {
  heroLine1: string;
  heroLine2: string;
  heroText: string;
  ctaLabel: string;
  useCases: string[];
  faq: { q: string; a: string }[];
  show: { features: boolean; steps: boolean; safety: boolean; pricing: boolean; faq: boolean };
  ctaTitle: string;
  ctaText: string;
};
const LIMITS = [
  ["codes", "QR codes"],
  ["systems", "Systems"],
  ["records", "Records"],
  ["storageMb", "Storage (MB)"],
  ["panels", "Extra panels"],
  ["members", "Team members"],
] as const;
const FEATURES = [
  ["allowApi", "API keys and webhooks"],
  ["allowBooks", "Book QR"],
  ["allowDomain", "Custom domain"],
] as const;
const statusLabel = { active: "Active", expiring: "Ends soon", expired: "Expired", free: "Free", suspended: "Suspended" };
const statusClass = { active: "success", expiring: "warn", expired: "error", free: "neutral", suspended: "error" };
const UNLIMITED: Limits = { codes: null, systems: null, records: null, storageMb: null, panels: null, members: null, allowApi: true, allowBooks: true, allowDomain: true };

/** The plan's limits with this client's own overrides on top. */
function limitsOf(client: Client, plans: Plan[]): Limits {
  if (client.effectivePlan === "owner") return UNLIMITED;
  const plan = plans.find((item) => item.id === client.effectivePlan) || plans.find((item) => item.id === "free");
  const base = Object.fromEntries([...LIMITS, ...FEATURES].map(([key]) => [key, plan?.[key] ?? null])) as Limits;
  return { ...base, ...(client.customLimits || {}) };
}
function usePlatform(notify: Ctx["notify"]) {
  const [report, setReport] = useState<Report | null>(null);
  const load = useCallback(() => api("/api/platform").then(setReport).catch((e) => notify(e.message, "error")), [notify]);
  useEffect(() => {
    load();
  }, [load]);
  const act = async (action: string, data?: unknown, id?: string, done = "Saved.") => {
    try {
      const result = await api("/api/platform", { action, data, id });
      await load();
      notify(done);
      return result;
    } catch (e) {
      notify((e as Error).message, "error");
      throw e;
    }
  };
  return { report, load, act };
}

export function Clients({ ctx }: { ctx: Ctx }) {
  const { notify, ask, switchPanel } = ctx;
  const { report, act } = usePlatform(notify);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(
    () =>
      (report?.clients || []).filter(
        (client) =>
          (!status || client.status === status) &&
          (!term || [client.name, client.owner?.email, client.owner?.name, client.customDomain].some((value) => value?.toLowerCase().includes(term.toLowerCase()))),
      ),
    [report, term, status],
  );
  if (!report) return <div className="skeleton" style={{ height: 320 }} />;
  const client = report.clients.find((item) => item.id === open);
  const t = report.totals;
  return (
    <div className="page-stack">
      <div className="stats-grid">
        {[
          ["Clients", t.clients, "Accounts that signed up, not counting yours"],
          ["Paying now", t.active, `${t.expiring} end within 7 days`],
          ["Revenue, 30 days", rupees(t.revenue30), `${rupees(t.revenueAll)} in total`],
          ["Expired", t.expired, `${t.suspended} suspended`],
        ].map(([label, value, note]) => (
          <div className="stat" key={label as string}>
            <span className="stat-label">{label}</span>
            <strong>{typeof value === "number" ? value.toLocaleString() : value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="panel flush">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input type="search" aria-label="Search clients" placeholder="Search by name, email or domain…" value={term} onChange={(event) => setTerm(event.target.value)} />
          </div>
          <div className="segmented" role="group" aria-label="Status">
            {[["", "All"], ["active", "Active"], ["expiring", "Ends soon"], ["expired", "Expired"], ["free", "Free"], ["suspended", "Suspended"]].map(([value, label]) => (
              <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>
                {label}
              </button>
            ))}
          </div>
          <span className="grow" />
          <button className="button" onClick={() => act("maintenance.run", undefined, undefined, "Reminders sent and domains checked.")}>
            <Bell size={15} /> Send reminders now
          </button>
          <Info text={`Clients whose plan ends within 7 days, or ended in the last 3, get an email reminder (at most every 2 days, only if email sending is set up). Client domains are re-checked too. This also runs on its own every 6 hours while anyone uses the panel.${report.maintenanceRun ? ` Last run: ${formatDateTime(String(report.maintenanceRun))}.` : ""}`} />
        </div>
        {shown.length ? (
          <div className="table-scroll">
            <table className="cards">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Plan</th>
                  <th>QR codes</th>
                  <th>Storage</th>
                  <th>Last active</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => {
                  const limits = limitsOf(item, report.plans);
                  return (
                    <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => setOpen(item.id)}>
                      <td>
                        <div className="row-title">
                          <span className="qr-tile">
                            <Building2 size={16} />
                          </span>
                          <span className="grow">
                            {item.name} {item.isPlatform && <span className="badge">You</span>}
                            <small>{item.owner?.email || "No owner"}</small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Plan">
                        <span>
                          <span className="badge">{item.effectivePlan === "owner" ? "Owner" : report.plans.find((plan) => plan.id === item.effectivePlan)?.name || item.effectivePlan}</span>
                          {item.paidUntil && item.effectivePlan !== "free" && <small> to {formatDate(item.paidUntil)}</small>}
                        </span>
                      </td>
                      <td data-label="QR codes" className="num">
                        {item.usage.codes.toLocaleString()} / {limitText(limits.codes)}
                      </td>
                      <td data-label="Storage" className="num">
                        {formatBytes(item.usage.storageBytes)}
                      </td>
                      <td data-label="Last active">{item.usage.lastActive ? formatDate(item.usage.lastActive) : "—"}</td>
                      <td data-label="Status">
                        <span className={`badge ${statusClass[item.status]}`}>{statusLabel[item.status]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Building2} title="No clients match" text="Try another search or status." />
        )}
      </div>
      <AnimatePresence>{client && <ClientDetail client={client} report={report} act={act} ask={ask} switchPanel={switchPanel} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  );
}

function ClientDetail({ client, report, act, ask, switchPanel, onClose }: { client: Client; report: Report; act: ReturnType<typeof usePlatform>["act"]; ask: Ctx["ask"]; switchPanel: Ctx["switchPanel"]; onClose: () => void }) {
  const [tab, setTab] = useState("overview");
  const limits = limitsOf(client, report.plans);
  const paid = report.plans.filter((plan) => plan.id !== "free");
  const [planId, setPlanId] = useState(client.plan === "owner" ? "free" : client.plan);
  const [days, setDays] = useState(report.plans.find((plan) => plan.id === client.plan)?.days || 30);
  const [custom, setCustom] = useState<Partial<Limits>>(client.customLimits || {});
  const [notes, setNotes] = useState(client.notes || "");
  const self = client.isPlatform;
  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await act("client.payment", { amount: Number(form.get("amount")), method: form.get("method"), note: String(form.get("note") || "") || undefined, plan: String(form.get("plan")), days: Number(form.get("days")) }, client.id, "Payment recorded.").catch(() => {});
  }
  return (
    <Modal wide title={client.name} onClose={onClose}>
      <div className="tabs" role="group" aria-label="Client sections">
        {[["overview", "Overview"], ["plan", "Plan and limits"], ["payments", "Payments"], ["email", "Email"], ["notes", "Notes"]].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="stack">
          <p className="muted">
            {client.owner ? `${client.owner.name} · ${client.owner.email}` : "No owner account"} · joined {formatDate(client.createdAt)}
            {client.customDomain && ` · domain ${client.customDomain} (${client.domainStatus})`}
          </p>
          <div className="form-grid">
            <Meter label="QR codes" used={client.usage.codes} limit={limits.codes} />
            <Meter label="Systems" used={client.usage.systems} limit={limits.systems} />
            <Meter label="Records" used={client.usage.records} limit={limits.records} />
            <Meter label="Extra panels" used={client.usage.panels} limit={limits.panels} />
            <Meter label="Team members" used={client.usage.members} limit={limits.members} />
          </div>
          <Drive used={client.usage.storageBytes} limitMb={limits.storageMb} />
          <p className="muted num">
            {client.usage.scans.toLocaleString()} scans in total · {client.usage.folders.toLocaleString()} folders · last active {client.usage.lastActive ? formatDateTime(client.usage.lastActive) : "never"}
          </p>
          <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
            {!self && (
              <button className="button primary" onClick={() => switchPanel(client.id)}>
                <LogIn size={15} /> Open their panel
              </button>
            )}
            {!self && (
              <button
                className={`button ${client.suspended ? "" : "danger"}`}
                onClick={async () =>
                  (await ask({
                    title: `${client.suspended ? "Restore" : "Suspend"} ${client.name}?`,
                    body: client.suspended ? "They can sign in again and all their QR codes start working." : "Everyone in this account is signed out, and every QR code in it, including its panels, stops working until you restore it.",
                    action: client.suspended ? "Restore" : "Suspend",
                    danger: !client.suspended,
                  })) && act("client.suspend", !client.suspended, client.id, client.suspended ? "Client restored." : "Client suspended.").catch(() => {})
                }
              >
                {client.suspended ? "Restore access" : "Suspend"}
              </button>
            )}
          </div>
        </div>
      )}
      {tab === "plan" &&
        (self ? (
          <p className="notice info">This is your own workspace. It always has every feature with no limits.</p>
        ) : (
          <div className="stack">
            <div className="inline-form">
              <label>
                Plan
                <select value={planId} onChange={(event) => (setPlanId(event.target.value), setDays(report.plans.find((plan) => plan.id === event.target.value)?.days || 30))}>
                  {report.plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              {planId !== "free" && (
                <label style={{ flex: "0 1 140px" }}>
                  Days from today
                  <input type="number" min={1} max={3660} value={days} onChange={(event) => setDays(Number(event.target.value))} />
                </label>
              )}
              <button className="button primary" onClick={() => act("client.plan", { plan: planId, days }, client.id, "Plan updated.").catch(() => {})}>
                Set plan
              </button>
            </div>
            {client.plan !== "free" && (
              <div className="row-actions">
                <span className="muted">
                  Extend {report.plans.find((plan) => plan.id === client.plan)?.name || client.plan}
                  {client.paidUntil && ` (now to ${formatDate(client.paidUntil)})`}:
                </span>
                {[30, 90, 365].map((value) => (
                  <button key={value} className="button small" onClick={() => act("client.extend", value, client.id, `Extended by ${value} days.`).catch(() => {})}>
                    +{value} days
                  </button>
                ))}
              </div>
            )}
            <div>
              <h3 style={{ marginBottom: 4 }}>
                Limits for this client only
                <Info text="Leave a limit on Plan to follow the plan. Choose Unlimited or type a number to give this one client something different, for example more storage. Clearing everything returns them to the plan." />
              </h3>
              <div className="limit-grid">
                {LIMITS.map(([key, label]) => {
                  const value = custom[key];
                  const mode = value === undefined ? "plan" : value === null ? "unlimited" : "custom";
                  const plan = report.plans.find((item) => item.id === client.effectivePlan);
                  return (
                    <div className="limit-field" key={key}>
                      <span className="field-label">{label}</span>
                      <div className="row-actions">
                        <select aria-label={`${label} limit`} value={mode} onChange={(event) => setCustom({ ...custom, [key]: event.target.value === "plan" ? undefined : event.target.value === "unlimited" ? null : (plan?.[key] ?? 0) })}>
                          <option value="plan">Plan ({limitText(plan?.[key] ?? null)})</option>
                          <option value="unlimited">Unlimited</option>
                          <option value="custom">Custom</option>
                        </select>
                        {mode === "custom" && <input type="number" min={0} aria-label={`${label} custom limit`} value={value ?? 0} onChange={(event) => setCustom({ ...custom, [key]: Math.max(0, Math.floor(Number(event.target.value))) })} style={{ width: 100 }} />}
                      </div>
                    </div>
                  );
                })}
                {FEATURES.map(([key, label]) => (
                  <div className="limit-field" key={key}>
                    <span className="field-label">{label}</span>
                    <select aria-label={label} value={custom[key] === undefined ? "plan" : custom[key] ? "on" : "off"} onChange={(event) => setCustom({ ...custom, [key]: event.target.value === "plan" ? undefined : event.target.value === "on" })}>
                      <option value="plan">Plan ({report.plans.find((item) => item.id === client.effectivePlan)?.[key] ? "on" : "off"})</option>
                      <option value="on">Allowed</option>
                      <option value="off">Not allowed</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="button" onClick={() => setCustom({})}>
                  Back to plan
                </button>
                <button className="button primary" onClick={() => act("client.limits", Object.fromEntries(Object.entries(custom).filter(([, value]) => value !== undefined)), client.id, "Limits saved.").catch(() => {})}>
                  Save limits
                </button>
              </div>
            </div>
          </div>
        ))}
      {tab === "payments" && (
        <div className="stack">
          {!self && (
            <form className="stack" onSubmit={pay}>
              <h3>
                Record a payment
                <Info text="For money received outside the website: cash, UPI or a bank transfer. It is added to the client's payment history and your revenue. Set days to extend their plan at the same time; leave 0 to only record the money." />
              </h3>
              <div className="form-grid">
                <label>
                  Amount (₹)
                  <input name="amount" type="number" min={1} step="0.01" required />
                </label>
                <label>
                  Method
                  <select name="method" defaultValue="upi">
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  For plan
                  <select name="plan" defaultValue={paid.some((plan) => plan.id === client.plan) ? client.plan : paid[0]?.id}>
                    {paid.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Extend by (days)
                  <input name="days" type="number" min={0} max={3660} defaultValue={report.plans.find((plan) => plan.id === client.plan)?.days || 30} />
                </label>
              </div>
              <label>
                Note
                <input name="note" maxLength={190} placeholder="e.g. UPI ref 1234, paid by Ravi" />
              </label>
              <button className="button primary" style={{ justifySelf: "start" }}>
                Record payment
              </button>
            </form>
          )}
          <div className="feature-list">
            {client.payments.map((payment) => (
              <div className="feature-row" key={payment.id}>
                <div>
                  <strong>
                    {rupees(payment.amount)} · {report.plans.find((plan) => plan.id === payment.plan)?.name || payment.plan}
                  </strong>
                  <small>
                    {formatDate(payment.createdAt)} · {payment.method}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </small>
                </div>
              </div>
            ))}
            {!client.payments.length && <small>No payments yet.</small>}
          </div>
        </div>
      )}
      {tab === "email" && (
        <div className="stack">
          <p className="muted">Sends now to {client.owner?.email || "the account owner"}. Reminders and receipts also go out on their own.</p>
          <div className="row-actions">
            <button className="button" onClick={() => act("client.email", { kind: "reminder" }, client.id, "Reminder sent.").catch(() => {})}>
              Plan ending reminder
            </button>
            <button className="button" onClick={() => act("client.email", { kind: "expired" }, client.id, "Plan-ended email sent.").catch(() => {})}>
              Plan ended
            </button>
            <button className="button" onClick={() => act("client.email", { kind: "receipt" }, client.id, "Receipt sent.").catch(() => {})}>
              Last payment receipt
            </button>
          </div>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              act("client.email", { kind: "custom", subject: form.get("subject"), text: form.get("text") }, client.id, "Email sent.").catch(() => {});
            }}
          >
            <label>
              Subject
              <input name="subject" required maxLength={150} />
            </label>
            <label>
              Message
              <textarea name="text" required rows={6} maxLength={4000} />
            </label>
            <button className="button primary" style={{ justifySelf: "start" }}>
              Send email
            </button>
          </form>
        </div>
      )}
      {tab === "notes" && (
        <div className="stack">
          <textarea aria-label="Private notes about this client" value={notes} maxLength={5000} rows={8} onChange={(event) => setNotes(event.target.value)} placeholder="Only you can see these notes." />
          <button className="button primary" style={{ justifySelf: "start" }} onClick={() => act("client.notes", notes, client.id, "Notes saved.").catch(() => {})}>
            Save notes
          </button>
        </div>
      )}
    </Modal>
  );
}

const blankPlan: Plan = { id: "", name: "", description: "", pricePaise: 0, days: 30, codes: 100, systems: 5, records: 1000, storageMb: 1024, panels: 1, members: 5, allowApi: true, allowBooks: true, allowDomain: false, isPublic: true, sort: 10 };
export function Plans({ ctx }: { ctx: Ctx }) {
  const { notify, ask } = ctx;
  const { report, act } = usePlatform(notify);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);
  if (!report) return <div className="skeleton" style={{ height: 320 }} />;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    await act("plan.save", editing, undefined, "Plan saved.").then(() => setEditing(null), () => {});
  }
  return (
    <div className="page-stack">
      <div className="row-actions">
        <p className="muted grow">Plans are what clients buy. Changes apply straight away to every client on the plan and to the pricing on your website.</p>
        <button className="button primary" onClick={() => (setIsNew(true), setEditing({ ...blankPlan }))}>
          <Plus size={16} /> New plan
        </button>
      </div>
      <div className="plans-grid">
        {report.plans.map((plan) => (
          <div className="panel plan" key={plan.id}>
            <div className="row-actions" style={{ justifyContent: "space-between" }}>
              <h2>{plan.name}</h2>
              <span className={`badge ${plan.isPublic ? "success" : "neutral"}`}>{plan.isPublic ? "On website" : "Hidden"}</span>
            </div>
            <p className="price">
              {rupees(plan.pricePaise)}
              <small className="muted"> /{plan.id === "free" ? "forever" : `${plan.days} days`}</small>
            </p>
            <ul>
              {LIMITS.map(([key, label]) => (
                <li key={key}>
                  {label}: <strong>{limitText(plan[key])}</strong>
                </li>
              ))}
              {FEATURES.map(([key, label]) => (
                <li key={key} style={{ opacity: plan[key] ? 1 : 0.5 }}>
                  {plan[key] ? <Check size={15} /> : <X size={15} />} {label}
                </li>
              ))}
            </ul>
            <small>{plan.clients} {plan.clients === 1 ? "client" : "clients"} on this plan</small>
            <button className="button" onClick={() => (setIsNew(false), setEditing({ ...plan }))}>
              Edit plan
            </button>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {editing && (
          <Modal wide title={isNew ? "New plan" : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
            <form className="stack" onSubmit={save}>
              <div className="form-grid">
                <label>
                  Name
                  <input required maxLength={100} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value, id: isNew ? event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) : editing.id })} />
                </label>
                <label>
                  Short id
                  <input required readOnly={!isNew} value={editing.id} pattern="[a-z][a-z0-9-]{1,30}" onChange={(event) => setEditing({ ...editing, id: event.target.value })} />
                </label>
                <label>
                  Price (₹)
                  <input type="number" min={0} step="1" value={editing.pricePaise / 100} onChange={(event) => setEditing({ ...editing, pricePaise: Math.round(Number(event.target.value) * 100) })} />
                </label>
                <label>
                  Lasts (days)
                  <input type="number" min={1} max={3660} value={editing.days} onChange={(event) => setEditing({ ...editing, days: Number(event.target.value) })} />
                </label>
              </div>
              <label>
                Short description
                <input maxLength={200} value={editing.description || ""} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
              </label>
              <div className="limit-grid">
                {LIMITS.map(([key, label]) => (
                  <div className="limit-field" key={key}>
                    <span className="field-label">{label}</span>
                    <div className="row-actions">
                      <input type="number" min={0} aria-label={label} disabled={editing[key] === null} value={editing[key] ?? ""} onChange={(event) => setEditing({ ...editing, [key]: Math.max(0, Math.floor(Number(event.target.value))) })} />
                      <label className="toggle-row">
                        <input type="checkbox" checked={editing[key] === null} onChange={(event) => setEditing({ ...editing, [key]: event.target.checked ? null : 0 })} /> Unlimited
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="row-actions">
                {FEATURES.map(([key, label]) => (
                  <label className="checkbox" key={key}>
                    <input type="checkbox" checked={editing[key]} onChange={(event) => setEditing({ ...editing, [key]: event.target.checked })} /> {label}
                  </label>
                ))}
                <label className="checkbox">
                  <input type="checkbox" checked={editing.isPublic} onChange={(event) => setEditing({ ...editing, isPublic: event.target.checked })} /> Show on website and billing page
                </label>
              </div>
              <label style={{ maxWidth: 200 }}>
                Order on the page
                <input type="number" min={0} max={1000} value={editing.sort} onChange={(event) => setEditing({ ...editing, sort: Number(event.target.value) })} />
              </label>
              <div className="modal-actions">
                {!isNew && editing.id !== "free" && (
                  <button
                    type="button"
                    className="button danger"
                    style={{ marginRight: "auto" }}
                    onClick={async () => (await ask({ title: `Delete ${editing.name}?`, body: "Only plans with no clients on them can be deleted. Hiding a plan is usually better.", action: "Delete plan" })) && act("plan.delete", undefined, editing.id, "Plan deleted.").then(() => setEditing(null), () => {})}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
                <button type="button" className="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="button primary">
                  <Gem size={15} /> Save plan
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Website({ ctx }: { ctx: Ctx }) {
  const { notify } = ctx;
  const { report, act } = usePlatform(notify);
  const [site, setSite] = useState<Site | null>(null);
  useEffect(() => {
    if (report && !site) setSite(report.site);
  }, [report, site]);
  if (!site) return <div className="skeleton" style={{ height: 320 }} />;
  const set = (patch: Partial<Site>) => setSite({ ...site, ...patch });
  return (
    <form
      className="page-stack"
      onSubmit={(event) => {
        event.preventDefault();
        void act("site.save", site, undefined, "Website updated. It is live now.").catch(() => {});
      }}
    >
      <div className="row-actions">
        <p className="muted grow">Edit the words on your home page. Prices and plan details come from Plans.</p>
        <a className="button" href="/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} /> View website
        </a>
        <button className="button primary">Publish changes</button>
      </div>
      <div className="panel stack">
        <h2>Top of the page</h2>
        <div className="form-grid">
          <label>
            Headline, first line
            <input required maxLength={60} value={site.heroLine1} onChange={(event) => set({ heroLine1: event.target.value })} />
          </label>
          <label>
            Headline, second line (in colour)
            <input required maxLength={60} value={site.heroLine2} onChange={(event) => set({ heroLine2: event.target.value })} />
          </label>
        </div>
        <label>
          Text under the headline
          <textarea required maxLength={400} rows={3} value={site.heroText} onChange={(event) => set({ heroText: event.target.value })} />
        </label>
        <div className="form-grid">
          <label>
            Main button
            <input required maxLength={40} value={site.ctaLabel} onChange={(event) => set({ ctaLabel: event.target.value })} />
          </label>
          <label>
            Use cases (one per line)
            <textarea rows={3} value={site.useCases.join("\n")} onChange={(event) => set({ useCases: event.target.value.split("\n").map((line) => line.trimStart()).slice(0, 12) })} onBlur={() => set({ useCases: site.useCases.map((line) => line.trim()).filter(Boolean) })} />
          </label>
        </div>
      </div>
      <div className="panel stack">
        <h2>Sections to show</h2>
        <div className="row-actions">
          {(
            [
              ["features", "Features"],
              ["steps", "How it works"],
              ["safety", "Safe by default"],
              ["pricing", "Pricing"],
              ["faq", "Questions"],
            ] as const
          ).map(([key, label]) => (
            <label className="checkbox" key={key}>
              <input type="checkbox" checked={site.show[key]} onChange={(event) => set({ show: { ...site.show, [key]: event.target.checked } })} /> {label}
            </label>
          ))}
        </div>
      </div>
      <div className="panel stack">
        <div className="panel-heading" style={{ marginBottom: 0 }}>
          <h2>Questions and answers</h2>
          <button type="button" className="button small" disabled={site.faq.length >= 20} onClick={() => set({ faq: [...site.faq, { q: "", a: "" }] })}>
            <Plus size={14} /> Add question
          </button>
        </div>
        {site.faq.map((item, index) => (
          <div className="limit-field" key={index}>
            <div className="row-actions">
              <input aria-label={`Question ${index + 1}`} required maxLength={160} value={item.q} placeholder="Question" onChange={(event) => set({ faq: site.faq.map((row, i) => (i === index ? { ...row, q: event.target.value } : row)) })} />
              <button type="button" className="icon-button danger" aria-label={`Remove question ${index + 1}`} onClick={() => set({ faq: site.faq.filter((_, i) => i !== index) })}>
                <Trash2 size={15} />
              </button>
            </div>
            <textarea aria-label={`Answer ${index + 1}`} required maxLength={800} rows={2} value={item.a} placeholder="Answer" onChange={(event) => set({ faq: site.faq.map((row, i) => (i === index ? { ...row, a: event.target.value } : row)) })} />
          </div>
        ))}
      </div>
      <div className="panel stack">
        <h2>Closing banner</h2>
        <div className="form-grid">
          <label>
            Title
            <input required maxLength={80} value={site.ctaTitle} onChange={(event) => set({ ctaTitle: event.target.value })} />
          </label>
          <label>
            Text
            <input required maxLength={200} value={site.ctaText} onChange={(event) => set({ ctaText: event.target.value })} />
          </label>
        </div>
      </div>
    </form>
  );
}

type Order = { id: string; workspaceId: string; client: string; email: string; orderId: string; paymentId: string | null; status: string; plan: string; amount: number; method: string; note: string | null; createdAt: string; paidAt: string | null };
type Extra = {
  orders: Order[];
  gateway: { source: "env" | "panel" | "none"; keyId: string; live: boolean; webhook: boolean; webhookUrl: string };
  email: { configured: boolean; source: string; from: string; saved: { provider: "smtp" | "resend"; from: string; host: string; port: number; user: string; hasSecret: boolean } | null };
  security: { loginOtp: "off" | "owners" | "all" };
  notifications: { id: string; workspaceId: string | null; title: string; body: string; link: string | null; kind: string; createdAt: string }[];
};

/** Every purchase: Razorpay orders (paid or pending) and payments recorded by hand. */
export function Payments({ ctx }: { ctx: Ctx }) {
  const { report, act } = usePlatform(ctx.notify);
  const [status, setStatus] = useState("");
  const [term, setTerm] = useState("");
  if (!report) return <div className="skeleton" style={{ height: 320 }} />;
  const { orders, gateway } = report as Report & Extra;
  const shown = orders.filter((order) => (!status || order.status === status) && (!term || `${order.client} ${order.email} ${order.orderId} ${order.paymentId || ""}`.toLowerCase().includes(term.toLowerCase())));
  const paid = orders.filter((order) => order.status === "paid");
  const month = paid.filter((order) => Date.now() - Date.parse(order.paidAt || order.createdAt) < 30 * 86400000);
  function exportCsv() {
    const cell = (value: unknown) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
    const rows = [["Date", "Client", "Email", "Plan", "Amount (₹)", "Method", "Status", "Order", "Payment", "Note"], ...shown.map((o) => [o.createdAt, o.client, o.email, o.plan, o.amount / 100, o.method, o.status, o.orderId, o.paymentId, o.note])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "payments.csv" }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="page-stack">
      {gateway.source === "none" && (
        <div className="banner warn">
          <span className="grow">Razorpay is not connected, so clients cannot buy plans on the website yet. You can still record cash, UPI or bank payments from Clients.</span>
          <button className="button small" onClick={() => ctx.go("configuration")}>
            Connect Razorpay
          </button>
        </div>
      )}
      <div className="stats-grid panel">
        {[
          ["Last 30 days", rupees(month.reduce((sum, order) => sum + order.amount, 0))],
          ["All time", rupees(paid.reduce((sum, order) => sum + order.amount, 0))],
          ["Paid orders", paid.length.toLocaleString()],
          ["Pending", orders.filter((order) => order.status === "created").length.toLocaleString()],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <small>{label}</small>
            <strong className="num">{value}</strong>
          </div>
        ))}
      </div>
      <div className="panel flush">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input type="search" aria-label="Search payments" placeholder="Client, email, order or payment id…" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="created">Pending (checkout opened, not paid)</option>
          </select>
          <span className="grow" />
          <button className="button" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
        {shown.length ? (
          <div className="table-scroll">
            <table className="cards">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.client}</strong>
                      <small className="muted" style={{ display: "block" }}>
                        {order.email}
                      </small>
                    </td>
                    <td data-label="Plan">{report.plans.find((plan) => plan.id === order.plan)?.name || order.plan}</td>
                    <td data-label="Amount" className="num">
                      {rupees(order.amount)}
                      <small className="muted" style={{ display: "block", textTransform: "uppercase" }}>
                        {order.method}
                      </small>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${order.status === "paid" ? "success" : "warn"}`}>{order.status === "paid" ? "Paid" : "Pending"}</span>
                    </td>
                    <td data-label="Date">
                      <small>{formatDateTime(order.paidAt || order.createdAt)}</small>
                      <small className="muted num" style={{ display: "block" }} title="Razorpay payment or order id">
                        {order.paymentId || (order.method === "razorpay" ? order.orderId : order.note) || ""}
                      </small>
                    </td>
                    <td className="actions">
                      <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                        {order.status !== "paid" && order.method === "razorpay" && (
                          <button className="button small" title="Ask Razorpay whether this order was paid and activate the plan if it was" onClick={() => act("order.check", undefined, order.id, "Payment found and the plan is active.").catch(() => {})}>
                            Check with Razorpay
                          </button>
                        )}
                        {order.status === "paid" && (
                          <button className="button small" onClick={() => act("client.email", { kind: "receipt" }, order.workspaceId, "Receipt sent.").catch(() => {})}>
                            Send receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Gem} title="No payments yet" text="Purchases from your website and payments you record from Clients show up here." />
        )}
      </div>
    </div>
  );
}

/** Platform settings in one place: Razorpay, email, sign-in security and notifications. */
export function Configuration({ ctx }: { ctx: Ctx }) {
  const { report, act } = usePlatform(ctx.notify);
  const [mail, setMail] = useState<{ provider: "smtp" | "resend"; from: string; host: string; port: number; user: string; pass: string; resendKey: string; to: string } | null>(null);
  useEffect(() => {
    const saved = (report as (Report & Extra) | null)?.email.saved;
    if (report && !mail) setMail({ provider: saved?.provider || "smtp", from: saved?.from || "", host: saved?.host || "smtp.hostinger.com", port: saved?.port || 465, user: saved?.user || "", pass: "", resendKey: "", to: "" });
  }, [report, mail]);
  if (!report || !mail) return <div className="skeleton" style={{ height: 320 }} />;
  const { gateway, email, security, notifications } = report as Report & Extra;
  const mailData = { provider: mail.provider, from: mail.from, host: mail.host, port: mail.port, user: mail.user, pass: mail.pass || undefined, resendKey: mail.resendKey || undefined };
  return (
    <div className="page-stack">
      <section className="panel stack">
        <div>
          <h2>
            Payments · Razorpay <Info text="Razorpay Dashboard → Account & Settings → API Keys gives the Key ID and Key Secret. Use test keys first, then live keys. Keys in the server environment (RAZORPAY_KEY_ID) take priority over keys saved here." />
          </h2>
          <p className="muted">
            {gateway.source === "none" ? "Not connected: website checkout is off." : `Connected (${gateway.live ? "live" : "test"} keys, ${gateway.source === "env" ? "from server settings" : "saved here"}): ${gateway.keyId}`}
          </p>
        </div>
        {gateway.source !== "env" && (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const element = event.currentTarget;
              const form = new FormData(element);
              act("razorpay.save", { keyId: form.get("keyId"), keySecret: form.get("keySecret"), webhookSecret: form.get("webhookSecret") || undefined }, undefined, "Razorpay connected. Clients can now buy plans.").then(() => element.reset(), () => {});
            }}
          >
            <div className="form-grid">
              <label>
                Key ID
                <input name="keyId" required placeholder="rzp_live_…" autoComplete="off" />
              </label>
              <label>
                Key Secret
                <input name="keySecret" required type="password" autoComplete="new-password" />
              </label>
            </div>
            <label>
              Webhook secret (recommended)
              <Info text={`In Razorpay → Webhooks, add ${gateway.webhookUrl} with the events payment.captured and order.paid, choose a secret, and paste the same secret here. Then plans activate even if a buyer closes the page right after paying.`} />
              <input name="webhookSecret" type="password" autoComplete="new-password" />
              <small>
                Webhook URL: <code>{gateway.webhookUrl}</code>
              </small>
            </label>
            <div className="row-actions">
              <button className="button primary">Save and test</button>
              {gateway.source === "panel" && (
                <>
                  <button type="button" className="button" onClick={() => act("razorpay.test", undefined, undefined, "Razorpay answered: the keys work.").catch(() => {})}>
                    Test connection
                  </button>
                  <button type="button" className="button danger" onClick={async () => (await ctx.ask({ title: "Disconnect Razorpay?", body: "Website checkout stops until you connect it again. Past payments stay.", action: "Disconnect" })) && act("razorpay.remove", undefined, undefined, "Razorpay disconnected.").catch(() => {})}>
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="panel stack">
        <div>
          <h2>
            Email <Info text="Used for sign-in codes, password resets, invitations, plan reminders, receipts and your notifications. With Hostinger email: host smtp.hostinger.com, port 465, your full mailbox address as user, and its password." />
          </h2>
          <p className="muted">{email.configured ? `Sending as ${email.from}${email.source === "env" ? " (Resend, from server settings)" : ""}.` : "Not set up: no emails are sent yet."}</p>
        </div>
        <div className="segmented" role="group" aria-label="Email service">
          {(["smtp", "resend"] as const).map((provider) => (
            <button key={provider} aria-pressed={mail.provider === provider} onClick={() => setMail({ ...mail, provider })}>
              {provider === "smtp" ? "SMTP (Hostinger, Gmail…)" : "Resend"}
            </button>
          ))}
        </div>
        <label>
          From address
          <input value={mail.from} placeholder="QR Manager <support@yourdomain.com>" onChange={(e) => setMail({ ...mail, from: e.target.value })} />
        </label>
        {mail.provider === "smtp" ? (
          <div className="form-grid">
            <label>
              SMTP host
              <input value={mail.host} onChange={(e) => setMail({ ...mail, host: e.target.value })} />
            </label>
            <label>
              Port
              <input type="number" value={mail.port} onChange={(e) => setMail({ ...mail, port: Number(e.target.value) })} />
            </label>
            <label>
              User (mailbox)
              <input value={mail.user} autoComplete="off" onChange={(e) => setMail({ ...mail, user: e.target.value })} />
            </label>
            <label>
              Password
              <input type="password" autoComplete="new-password" placeholder={email.saved?.hasSecret ? "Saved — leave empty to keep" : ""} value={mail.pass} onChange={(e) => setMail({ ...mail, pass: e.target.value })} />
            </label>
          </div>
        ) : (
          <label>
            Resend API key
            <input type="password" autoComplete="new-password" placeholder={email.saved?.hasSecret ? "Saved — leave empty to keep" : "re_…"} value={mail.resendKey} onChange={(e) => setMail({ ...mail, resendKey: e.target.value })} />
          </label>
        )}
        <div className="row-actions">
          <input aria-label="Send the test to" style={{ maxWidth: 260 }} placeholder="Test to (default: your email)" value={mail.to} onChange={(e) => setMail({ ...mail, to: e.target.value })} />
          <button className="button" onClick={() => act("email.test", { ...mailData, to: mail.to || undefined }, undefined, "Test email sent. Check the inbox (and spam).").catch(() => {})}>
            Send test
          </button>
          <button className="button primary" onClick={() => act("email.save", mailData, undefined, "Email settings saved.").catch(() => {})}>
            Save
          </button>
        </div>
      </section>

      <section className="panel stack">
        <div>
          <h2>
            Sign-in security <Info text="After the password, we email a 6-digit code that works for 10 minutes. People who use an authenticator app enter that code instead. While email is not set up, no code is asked, so nobody gets locked out." />
          </h2>
          <p className="muted">Email code at sign-in</p>
        </div>
        <div className="segmented" role="group" aria-label="Email code at sign-in">
          {[
            ["off", "Off"],
            ["owners", "Account owners and me"],
            ["all", "Everyone"],
          ].map(([value, label]) => (
            <button key={value} aria-pressed={security.loginOtp === value} onClick={() => act("security.save", { loginOtp: value }, undefined, "Sign-in security saved.").catch(() => {})}>
              {label}
            </button>
          ))}
        </div>
        {security.loginOtp !== "off" && !email.configured && <p className="notice warn flat">Set up email above first; until then no code is asked at sign-in.</p>}
      </section>

      <section className="panel stack">
        <div>
          <h2>
            Notifications <Info text="Shown under the bell in every client's panel (or one client's). Tick email to also send it to account owners. Plan reminders and payment confirmations are added automatically." />
          </h2>
        </div>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const element = event.currentTarget;
            const form = new FormData(element);
            act("notification.send", { title: form.get("title"), body: form.get("body"), link: form.get("link") || undefined, kind: form.get("kind"), audience: form.get("audience"), email: form.get("email") === "on" }, undefined, "Notification sent.").then(() => element.reset(), () => {});
          }}
        >
          <div className="form-grid">
            <label>
              Send to
              <select name="audience" defaultValue="all">
                <option value="all">Every client</option>
                {report.clients
                  .filter((client) => !client.isPlatform)
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Type
              <select name="kind" defaultValue="feature">
                <option value="feature">New feature</option>
                <option value="update">Update</option>
                <option value="alert">Important</option>
                <option value="billing">Billing</option>
              </select>
            </label>
          </div>
          <label>
            Title
            <input name="title" required maxLength={120} placeholder="New: QR codes from YouTube playlists" />
          </label>
          <label>
            Message
            <textarea name="body" required rows={4} maxLength={2000} />
          </label>
          <label>
            Link (optional)
            <input name="link" maxLength={190} placeholder="https://… or #codes to open a panel page" />
          </label>
          <label className="toggle-row">
            <input type="checkbox" name="email" /> Also email it to account owners
          </label>
          <button className="button primary" style={{ justifySelf: "start" }}>
            <Bell size={15} /> Send notification
          </button>
        </form>
        <div className="feature-list">
          {notifications.map((item) => (
            <div className="feature-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {formatDateTime(item.createdAt)} · {item.workspaceId ? report.clients.find((client) => client.id === item.workspaceId)?.name || "One client" : "Every client"} · {item.kind}
                </small>
              </div>
              <button className="icon-button danger" aria-label={`Delete notification ${item.title}`} onClick={() => act("notification.delete", undefined, item.id, "Notification removed.").catch(() => {})}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
