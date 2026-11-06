"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  QrCode,
  LayoutDashboard,
  Layers,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Plus,
  ArrowUpRight,
  Search,
  Download,
  ShieldCheck,
  Menu,
  X,
  Check,
  Pause,
  Play,
  Pencil,
  ExternalLink,
  Users,
  Activity,
  List,
  Tag,
  Zap,
  GitBranch,
  Megaphone,
  Puzzle,
  Code2,
  HelpCircle,
} from "lucide-react";
import QRStudio from "./QRStudio";
import Systems from "./Systems";
import PasswordSettings from "./PasswordSettings";
import FeaturePanel from "./FeaturePanel";
import TeamPanel from "./TeamPanel";
import MfaSettings from "./MfaSettings";

export type QR = {
  id: string;
  title: string;
  shortCode: string;
  targetUrl: string;
  type?: "dynamic_url" | "wifi" | "vcard" | "text";
  isActive: boolean;
  scanCount: number;
  styling: { dark: string; light: string; errorCorrectionLevel: string };
  routingRules: { ios?: string; android?: string; expiresAt?: string };
  recordId?: string | null;
  campaignId?: string | null;
  campaign?: { id: string; name: string } | null;
  tagIds?: string[];
  tags?: { tag: { id: string; name: string; color: string } }[];
};
export type Field = {
  key: string;
  label: string;
  type: string;
  isRequired: boolean;
};
export type System = {
  id: string;
  name: string;
  description: string;
  fields: Field[];
  _count: { records: number };
};
type Data = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    platformAdmin: boolean;
  };
  workspace: { name: string; plan: string; paidUntil: string | null };
  qrCodes: QR[];
  systems: System[];
  total: number;
  page: number;
  scans: number;
  active: number;
  limits: { codes: number; systems: number; records: number };
  appUrl: string;
  prices: { pro: number; business: number };
  checkoutReady: boolean;
  logs: {
    id: string;
    scannedAt: string;
    device: string;
    os: string;
    browser: string;
    qrCode: { title: string };
  }[];
  audit: { id: string; action: string; createdAt: string }[];
  payments: {
    id: string;
    plan: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  members: { id: string; name: string; email: string; role: string }[];
  tags: { id: string; name: string; color: string; createdAt: string }[];
  automations: { id: string; name: string; kind: string; config: unknown; isActive: boolean; createdAt: string }[];
  campaigns: { id: string; name: string; description: string | null; status: string; createdAt: string }[];
  integrations: { id: string; provider: string; name: string; status: string; createdAt: string }[];
  webhooks: { id: string; url: string; events: unknown; isActive: boolean; createdAt: string }[];
  apiKeys: { id: string; label: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }[];
  webhookDeliveries: { id: string; eventType: string; status: string; responseCode: number | null; attempts: number; lastError: string | null; createdAt: string; deliveredAt: string | null; webhook: { url: string } }[];
  invitations: { id: string; email: string; role: string; expiresAt: string; createdAt: string }[];
};
export async function api(path: string, data?: unknown) {
  const response = await fetch(path, {
    ...(data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {}),
    cache: "no-store",
  });
  const result = await response.json();
  if (response.status === 401) window.location.assign("/login");
  if (!response.ok)
    throw new Error(result.error || "Unable to complete this request.");
  return result;
}
export function saveFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Main" },
  { id: "systems", label: "Systems", icon: Layers, group: "Main" },
  { id: "records", label: "Records", icon: List, group: "Main" },
  { id: "codes", label: "QR codes", icon: QrCode, group: "Main" },
  { id: "tags", label: "Tags", icon: Tag, group: "Main" },
  { id: "functions", label: "Functions", icon: Zap, group: "Main" },
  { id: "workflows", label: "Workflows", icon: GitBranch, group: "Main" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, group: "Main" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Main" },
  { id: "integrations", label: "Integrations", icon: Puzzle, group: "Connect" },
  { id: "webhooks", label: "API & Webhooks", icon: Code2, group: "Connect" },
  { id: "apiKeys", label: "API keys", icon: ShieldCheck, group: "Connect" },
  { id: "team", label: "Team & roles", icon: Users, group: "Manage" },
  { id: "billing", label: "Billing", icon: CreditCard, group: "Manage" },
  { id: "activity", label: "Audit log", icon: Activity, group: "Manage" },
  { id: "settings", label: "Settings", icon: Settings, group: "Manage" },
  { id: "help", label: "Help & support", icon: HelpCircle, group: "Manage", planned: true },
];

const plannedFeatures: Record<string, { title: string; description: string; scope: string }> = {
  tags: {
    title: "Tags & collections",
    description: "Organise QR codes with reusable tags and campaign folders.",
    scope: "Tag creation, filtering, bulk assignment and workspace-level permissions.",
  },
  functions: {
    title: "Business functions",
    description: "Turn a scan into a validated business action.",
    scope: "Check-ins, inventory updates, voucher redemption and authenticated actions.",
  },
  workflows: {
    title: "Workflows",
    description: "Connect QR scans to repeatable multi-step processes.",
    scope: "Triggers, conditions, approvals, retries and execution history.",
  },
  campaigns: {
    title: "Campaigns",
    description: "Group QR codes and measure campaign performance in one place.",
    scope: "Campaign attribution, UTM tracking, scheduling and exports.",
  },
  integrations: {
    title: "Integrations",
    description: "Connect QR Manager with the tools your team already uses.",
    scope: "Provider connections, encrypted credentials and per-workspace permissions.",
  },
  webhooks: {
    title: "API & Webhooks",
    description: "Build secure integrations on top of your QR workspace.",
    scope: "Scoped API keys, signed webhooks, delivery retries and request logs.",
  },
  help: {
    title: "Help & support",
    description: "Guides and support channels for your QR Manager workspace.",
    scope: "Product documentation, onboarding checklist and support requests.",
  },
};
const managedFeatures = new Set(["tags", "functions", "workflows", "campaigns", "integrations", "webhooks", "apiKeys"]);

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState("overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [mobile, setMobile] = useState(false),
    [editing, setEditing] = useState<QR | null | undefined>(undefined),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(
        await api(
          `/api/workspace?page=${page}&search=${encodeURIComponent(query)}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }, [page, query]);
  useEffect(() => {
    load();
  }, [load]);
  async function mutate(action: string, payload?: unknown, id?: string) {
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/workspace", { action, data: payload, id });
      await load();
      setNotice("Changes saved.");
      return result;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  function select(id: string) {
    setTab(id);
    setEditing(undefined);
    setMobile(false);
    setNotice("");
  }
  async function logout() {
    try {
      await api("/api/auth/logout", {});
      window.location.assign("/login");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!data)
    return (
      <main className="loading-screen">
        <QrCode size={36} />
        <h1>Opening your workspace…</h1>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  const canWrite = ["owner", "admin", "editor"].includes(data.user.role);
  const table = (
    <div className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Your QR codes</h2>
          <p className="muted">
            Printed once. Update destinations whenever you need.
          </p>
        </div>
        <div className="table-heading-actions">
          <button
            className="button small"
            type="button"
            onClick={() =>
              saveFile(
                "qr-manager-codes.csv",
                [
                  ["Title", "Type", "Short code", "QR link", "Destination", "Status", "Scans", "Campaign", "Tags"],
                  ...data.qrCodes.map((qr) => [
                    qr.title,
                    qr.type || "dynamic_url",
                    qr.shortCode,
                    `${data.appUrl}/s/${qr.shortCode}`,
                    qr.targetUrl,
                    qr.isActive ? "Active" : "Paused",
                    qr.scanCount,
                    qr.campaign?.name || "",
                    qr.tags?.map((item) => item.tag.name).join(" | ") || "",
                  ]),
                ]
                  .map((row) => row.map(csvCell).join(","))
                  .join("\r\n"),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download size={15} />
            Export page
          </button>
          <a className="button small" href="/api/workspace/export?kind=qr">
            <Download size={15} />
            Export all
          </a>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQuery(search);
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search QR codes"
              placeholder="Search codes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="button small" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>QR code</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Scans</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.qrCodes.map((qr) => (
              <tr key={qr.id}>
                <td>
                  <button
                    className="row-title"
                    onClick={() => {
                      setEditing(qr);
                      setTab("codes");
                    }}
                  >
                    <span className="qr-tile">
                      <QrCode size={20} />
                    </span>
                    <span>
                      {qr.title}
                      <small>/{qr.shortCode}</small>
                    </span>
                  </button>
                </td>
                <td>
                  {(!qr.type || qr.type === "dynamic_url") ? (
                    <a
                      className="destination"
                      href={qr.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {qr.targetUrl}
                      <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    <code className="destination-payload">{qr.type} payload</code>
                  )}
                </td>
                <td>
                  <span className={`status ${qr.isActive ? "active" : ""}`}>
                    {qr.isActive ? "Active" : "Paused"}
                  </span>
                </td>
                <td>{qr.scanCount.toLocaleString()}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${qr.title}`}
                      onClick={() => {
                        setEditing(qr);
                        setTab("codes");
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    {canWrite && (
                      <button
                        className="icon-button"
                        disabled={busy}
                        aria-label={`${qr.isActive ? "Pause" : "Resume"} ${qr.title}`}
                        onClick={() =>
                          void mutate("qr.pause", undefined, qr.id).catch(
                            () => {},
                          )
                        }
                      >
                        {qr.isActive ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.qrCodes.length && (
        <div className="empty">
          <QrCode size={32} />
          <h3>
            {query ? "No matching codes" : "Your first connection starts here."}
          </h3>
          <p>Create a QR code for a website, menu or business record.</p>
          {canWrite && (
            <button
              className="button primary"
              onClick={() => {
                setEditing(null);
                setTab("codes");
              }}
            >
              Create QR code
            </button>
          )}
        </div>
      )}
      <div className="pagination">
        <span>
          {data.total} codes{" "}
          {query ? "matching your search" : "in your workspace"}
        </span>
        <div>
          <button
            className="button small"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button small"
            disabled={page * 25 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <QrCode size={22} />
          </span>
          QR Manager
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="workspace-label">
          <span className="workspace-avatar">
            {data.workspace.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{data.workspace.name}</strong>
            <small>{data.workspace.plan} workspace</small>
          </div>
        </div>
        <nav aria-label="Workspace navigation">
          {navigation.map((item, index) => (
            <div key={item.id}>
              {(index === 0 || navigation[index - 1].group !== item.group) && (
                <div className="nav-section-label">{item.group}</div>
              )}
              <button
                aria-current={tab === item.id ? "page" : undefined}
                className={`${tab === item.id ? "selected" : ""}${item.planned ? " planned" : ""}`}
                onClick={() => select(item.id)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.id === "codes" && (
                  <span className="nav-count">{data.active}</span>
                )}
                {item.planned && <span className="nav-planned">Soon</span>}
              </button>
            </div>
          ))}
          {data.user.platformAdmin && (
            <button
              className={tab === "platform" ? "selected" : ""}
              onClick={() => select("platform")}
            >
              <ShieldCheck size={19} />
              Platform controls
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <strong>Room to grow.</strong>
            <p>Manage more codes and business systems as your team grows.</p>
            <button className="button" onClick={() => select("billing")}>
              View plans <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="user-row">
            <span className="user-avatar">{data.user.name.slice(0, 1)}</span>
            <div>
              <strong>{data.user.name}</strong>
              <small>{data.user.role}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace-main">
        <header className="topbar">
          <button
            className="mobile-toggle icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {navigation.find((n) => n.id === tab)?.label ||
                "Platform controls"}
            </strong>
          </div>
          <Link href="/" className="public-link">
            View website <ExternalLink size={14} />
          </Link>
        </header>
        <main className="workspace-content">
          <div className="page-heading">
            <div>
              <p className="muted">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date())}
              </p>
              <h1>
                {tab === "overview"
                  ? `Good to see you, ${data.user.name.split(" ")[0]}.`
                  : navigation.find((n) => n.id === tab)?.label ||
                    "Platform controls"}
              </h1>
              <p className="muted">
                {tab === "overview"
                  ? "Every code, every connection. All in one place."
                  : data.workspace.name}
              </p>
            </div>
            {canWrite && (
              <button
                className="button primary"
                onClick={() => {
                  setEditing(null);
                  setTab("codes");
                }}
              >
                <Plus size={18} />
                Create QR code
              </button>
            )}
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={17} />
              {notice}
              <button
                className="icon-button"
                aria-label="Dismiss notice"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div key={tab} className="view-enter">
            {tab === "overview" && (
              <>
                <div className="stats-grid">
                  {[
                    {
                      label: "Total scans",
                      value: data.scans,
                      icon: BarChart3,
                      note: "Recorded scan events",
                      tone: "mint",
                    },
                    {
                      label: "Active QR codes",
                      value: data.active,
                      icon: QrCode,
                      note: `Up to ${data.limits.codes} codes on your plan`,
                      tone: "blue",
                    },
                    {
                      label: "Business systems",
                      value: data.systems.length,
                      icon: Layers,
                      note: `${data.limits.systems} systems included`,
                      tone: "violet",
                    },
                    {
                      label: "All QR codes",
                      value: data.total,
                      icon: Activity,
                      note: "Active and paused codes",
                      tone: "amber",
                    },
                    {
                      label: "Team members",
                      value: data.members.length,
                      icon: Users,
                      note: "Workspace collaborators",
                      tone: "lavender",
                    },
                    {
                      label: "Current plan",
                      value: data.workspace.plan,
                      icon: CreditCard,
                      note: data.workspace.paidUntil
                        ? `Paid until ${new Date(data.workspace.paidUntil).toLocaleDateString("en-IN")}`
                        : "Free plan",
                      tone: "teal",
                    },
                  ].map((stat) => (
                    <div className={`stat stat-${stat.tone}`} key={stat.label}>
                      <div className="stat-label">
                        {stat.label}
                        <span className="stat-icon"><stat.icon size={17} /></span>
                      </div>
                      <strong>{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</strong>
                      <small>{stat.note}</small>
                    </div>
                  ))}
                </div>
                <div className="workspace-banner">
                  <div>
                    <span className="badge">Make your next connection</span>
                    <h2>One code. A destination that can evolve.</h2>
                    <p>
                      Keep the same printed QR when your website, menu or
                      campaign changes.
                    </p>
                    <button
                      className="button"
                      onClick={() => {
                        setTab("codes");
                        setEditing(null);
                      }}
                    >
                      Open QR studio <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="banner-qr">
                    <QrCode size={116} strokeWidth={1.4} />
                    <span>Scan · connect · measure</span>
                  </div>
                </div>
                {table}
              </>
            )}
            {tab === "codes" &&
              (editing !== undefined ? (
                <QRStudio
                  qr={editing}
                  appUrl={data.appUrl}
                  canWrite={canWrite}
                  tags={data.tags}
                  campaigns={data.campaigns}
                  onSave={(value, id) =>
                    mutate(id ? "qr.update" : "qr.create", value, id)
                  }
                  onClose={() => setEditing(undefined)}
                />
              ) : (
                table
              ))}
            {tab === "systems" && (
              <Systems
                systems={data.systems}
                canWrite={canWrite}
                mutate={mutate}
              />
            )}
            {tab === "records" && (
              <Systems
                systems={data.systems}
                canWrite={canWrite}
                mutate={mutate}
              />
            )}
            {tab === "analytics" && (
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent scan activity</h2>
                    <p className="muted">
                      Latest 100 scans. Device details are inferred from the
                      browser; previews and known bots are filtered.
                    </p>
                  </div>
                  <button
                    className="button"
                    onClick={() =>
                      saveFile(
                        "qr-manager-recent-scans.csv",
                        [
                          ["QR code", "Time", "Device", "OS", "Browser"],
                          ...data.logs.map((l) => [
                            l.qrCode.title,
                            l.scannedAt,
                            l.device,
                            l.os,
                            l.browser,
                          ]),
                        ]
                          .map((row) => row.map(csvCell).join(","))
                          .join("\r\n"),
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <Download size={17} />
                    Export shown scans
                  </button>
                  <a className="button small" href="/api/workspace/export?kind=scans">
                    <Download size={15} />
                    Export all scans
                  </a>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>QR code</th>
                        <th>Time</th>
                        <th>Device</th>
                        <th>OS</th>
                        <th>Browser</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.logs.map((l) => (
                        <tr key={l.id}>
                          <td>{l.qrCode.title}</td>
                          <td>{new Date(l.scannedAt).toLocaleString()}</td>
                          <td>{l.device}</td>
                          <td>{l.os}</td>
                          <td>{l.browser}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!data.logs.length && (
                  <p className="empty">
                    Scan a saved QR code to see activity here.
                  </p>
                )}
              </div>
            )}
            {tab === "team" && (
              <TeamPanel data={data} canWrite={canWrite} mutate={mutate} />
            )}
            {tab === "billing" && (
              <Billing data={data} reload={load} onError={setError} />
            )}
            {tab === "activity" && (
              <div className="panel">
                <h2>Workspace audit log</h2>
                <p className="muted">Latest 50 saved changes.</p>
                {data.audit.map((event) => (
                  <div className="audit-row" key={event.id}>
                    <span>
                      <Check size={16} />
                      {event.action}
                    </span>
                    <time>{new Date(event.createdAt).toLocaleString()}</time>
                  </div>
                ))}
                {!data.audit.length && (
                  <p className="empty">Saved changes will appear here.</p>
                )}
              </div>
            )}
            {tab === "settings" && (
              <div className="panel narrow">
                <h2>Workspace settings</h2>
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void mutate(
                      "workspace.rename",
                      new FormData(e.currentTarget).get("name"),
                    ).catch(() => {});
                  }}
                >
                  <label>
                    Workspace name
                    <input
                      name="name"
                      defaultValue={data.workspace.name}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Account email
                    <input readOnly value={data.user.email} />
                  </label>
                  <button
                    disabled={busy || data.user.role !== "owner"}
                    className="button primary"
                  >
                    Save changes
                  </button>
                </form>
                <p className="muted">
                  Your session expires after seven days. Sign out to revoke it
                  immediately.
                </p>
              </div>
            )}
            {tab === "settings" && (
              <div className="panel narrow" style={{ marginTop: 20 }}>
                <PasswordSettings />
              </div>
            )}
            {tab === "settings" && <MfaSettings />}
            {tab === "platform" && data.user.platformAdmin && <Platform />}
            {managedFeatures.has(tab) && (
              <FeaturePanel
                feature={tab as "tags" | "functions" | "workflows" | "campaigns" | "integrations" | "webhooks" | "apiKeys"}
                data={data}
                canWrite={canWrite}
                mutate={mutate}
              />
            )}
            {plannedFeatures[tab] && !managedFeatures.has(tab) && (
              <PlannedFeature feature={plannedFeatures[tab]} />
            )}
          </div>
          <footer className="panel-footer">
            QR Manager <span>One workspace. Every connection.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function PlannedFeature({
  feature,
}: {
  feature: { title: string; description: string; scope: string };
}) {
  return (
    <div className="panel feature-roadmap">
      <span className="badge">Coming in the next release</span>
      <h2>{feature.title}</h2>
      <p className="muted">{feature.description}</p>
      <div className="roadmap-scope">
        <strong>Planned scope</strong>
        <p>{feature.scope}</p>
      </div>
      <p className="muted">
        This section is visible now so the full QR Manager structure stays intact. It will be enabled only after its server-side permissions, persistence and audit trail are complete.
      </p>
    </div>
  );
}

function Billing({
  data,
  reload,
  onError,
}: {
  data: Data;
  reload: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function checkout(plan: string) {
    setBusy(true);
    onError("");
    try {
      const order = await api("/api/billing/order", { plan });
      if (!(window as any).Razorpay)
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Payment checkout could not load."));
          document.head.appendChild(script);
        });
      const checkout = new (window as any).Razorpay({
        key: order.key,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "QR Manager",
        description: `${plan} — 30 days, manual renewal`,
        theme: { color: "#5B43D6" },
        handler: async (response: unknown) => {
          try {
            await api("/api/billing/verify", response);
            await reload();
          } catch (e) {
            onError((e as Error).message);
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on("payment.failed", () => {
        onError("Payment did not complete. No plan has been activated.");
        setBusy(false);
      });
      checkout.open();
    } catch (e) {
      onError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="notice">
        Current plan: <strong>{data.workspace.plan}</strong>
        {data.workspace.paidUntil && (
          <>
            {" "}
            · Paid until{" "}
            {new Date(data.workspace.paidUntil).toLocaleDateString()}
          </>
        )}
      </div>
      <div className="plans-grid">
        {[
          { id: "free", name: "Free", price: 0, codes: 10, systems: 1 },
          {
            id: "pro",
            name: "Pro",
            price: data.prices.pro || 49900,
            codes: 500,
            systems: 10,
          },
          {
            id: "business",
            name: "Business",
            price: data.prices.business || 149900,
            codes: 2500,
            systems: 50,
          },
        ].map((plan) => (
          <div
            className={`panel plan ${plan.id === data.workspace.plan ? "current" : ""}`}
            key={plan.id}
          >
            <h2>{plan.name}</h2>
            <p className="price">
              ₹{(plan.price / 100).toLocaleString("en-IN")}
              <small>/{plan.id === "free" ? "forever" : "30 days"}</small>
            </p>
            <ul>
              <li>
                <Check size={16} />
                {plan.codes} dynamic QR codes
              </li>
              <li>
                <Check size={16} />
                {plan.systems} business systems
              </li>
              <li>
                <Check size={16} />
                PNG and vector SVG export
              </li>
              <li>
                <Check size={16} />
                Scan activity and device routing
              </li>
            </ul>
            {plan.id !== "free" ? (
              <button
                disabled={
                  busy ||
                  !data.checkoutReady ||
                  data.user.role !== "owner" ||
                  (data.workspace.plan === "business" && plan.id === "pro")
                }
                className="button primary"
                onClick={() => checkout(plan.id)}
              >
                {!data.checkoutReady
                  ? "Payments not activated yet"
                  : plan.id === data.workspace.plan
                    ? "Renew for 30 days"
                    : "Choose plan"}
              </button>
            ) : (
              <span className="badge">
                {data.workspace.plan === "free"
                  ? "Current plan"
                  : "Available after paid access expires"}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="muted">
        Paid access is a one-time payment for 30 days. Automatic renewals are
        not enabled. Changing tiers starts a new 30-day period; unused days on a
        different tier are not carried over.
      </p>
      <div className="panel">
        <h2>Payment history</h2>
        {data.payments.map((p) => (
          <div className="audit-row" key={p.id}>
            <span>
              {p.plan} · ₹{(p.amount / 100).toLocaleString("en-IN")}
            </span>
            <span>{p.status}</span>
            <time>{new Date(p.createdAt).toLocaleDateString()}</time>
          </div>
        ))}
        {!data.payments.length && <p className="muted">No payments yet.</p>}
      </div>
    </>
  );
}
function Platform() {
  const [items, setItems] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      api("/api/platform")
        .then((data) => setItems(data.workspaces))
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="panel">
      <h2>Platform workspaces</h2>
      <p className="muted">
        Latest 100 workspaces. Suspension blocks login and QR resolution;
        restoring a workspace re-enables access.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Plan</th>
              <th>Users</th>
              <th>QR codes</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id}>
                <td>{w.name}</td>
                <td>{w.plan}</td>
                <td>{w._count.users}</td>
                <td>{w._count.qrCodes}</td>
                <td>
                  <button
                    disabled={busy}
                    className="button small"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `${w.suspended ? "Restore" : "Suspend"} access for ${w.name}?`,
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        await api("/api/platform", {
                          id: w.id,
                          suspended: !w.suspended,
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {w.suspended ? "Restore" : "Suspend"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
