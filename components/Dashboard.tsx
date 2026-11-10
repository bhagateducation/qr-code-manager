"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  Check,
  Code2,
  CreditCard,
  HelpCircle,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  QrCode,
  RefreshCw,
  Settings,
  Tag,
  Users,
  X,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { api, Ctx, Data, Modal, QR, ThemeControl, viewMotion } from "./ui";
import Overview from "./Overview";
import QRCodes from "./QRCodes";
import { ApiKeys, Campaigns, Tags, Webhooks } from "./Connect";
import { AuditLog, Billing, Clients, Help, SettingsPanel, Team } from "./Workspace";

// The heavier views load only when opened, keeping the first dashboard paint small.
const loading = () => <div className="skeleton" style={{ height: 320 }} />;
const QRStudio = dynamic(() => import("./QRStudio"), { loading });
const Systems = dynamic(() => import("./Systems"), { loading });
const Analytics = dynamic(() => import("./Analytics"), { loading });

const navigation = [
  { id: "overview", tone: "#6b54d8", label: "Overview", icon: LayoutDashboard, group: "Workspace", hint: "Your workspace at a glance" },
  { id: "codes", tone: "#2563eb", label: "QR codes", icon: QrCode, group: "Workspace", hint: "Create, edit and download codes" },
  { id: "systems", tone: "#7c3aed", label: "Systems & records", icon: Layers, group: "Workspace", hint: "Structured business data" },
  { id: "campaigns", tone: "#db2777", label: "Campaigns", icon: Megaphone, group: "Workspace", hint: "Group codes by campaign" },
  { id: "tags", tone: "#d97706", label: "Tags", icon: Tag, group: "Workspace", hint: "Labels for organising codes" },
  { id: "analytics", tone: "#059669", label: "Analytics", icon: BarChart3, group: "Workspace", hint: "Scan activity and trends" },
  { id: "webhooks", tone: "#0d9488", label: "Webhooks", icon: Code2, group: "Developers", hint: "Signed scan events" },
  { id: "apiKeys", tone: "#ea580c", label: "API keys", icon: KeyRound, group: "Developers", hint: "Programmatic access" },
  { id: "team", tone: "#2563eb", label: "Team", icon: Users, group: "Manage", hint: "Members, roles and invitations" },
  { id: "billing", tone: "#059669", label: "Billing", icon: CreditCard, group: "Manage", hint: "Plan and payments" },
  { id: "activity", tone: "#64748b", label: "Audit log", icon: Activity, group: "Manage", hint: "Every saved change" },
  { id: "settings", tone: "#475569", label: "Settings", icon: Settings, group: "Manage", hint: "Workspace name, password and two-step sign-in" },
  { id: "help", tone: "#0d9488", label: "Help", icon: HelpCircle, group: "Manage", hint: "Guides and support" },
  { id: "clients", tone: "#db2777", label: "Clients", icon: Building2, group: "Platform", hint: "All customer workspaces", platform: true },
];
type Toast = { id: number; message: string; kind: "ok" | "error" };
type Confirm = Parameters<Ctx["ask"]>[0] & { resolve: (value: boolean) => void };

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState("overview"),
    [loadError, setLoadError] = useState(""),
    [drawer, setDrawer] = useState(false),
    [editing, setEditing] = useState<QR | null | undefined>(undefined),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [toasts, setToasts] = useState<Toast[]>([]),
    [confirm, setConfirm] = useState<Confirm | null>(null),
    [profile, setProfile] = useState(false);
  const toastId = useRef(0);

  const notify = useCallback<Ctx["notify"]>((message, kind = "ok") => {
    const id = ++toastId.current;
    setToasts((items) => [...items.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), kind === "error" ? 6000 : 3000);
  }, []);
  const reload = useCallback(async () => {
    try {
      setData(await api(`/api/workspace?page=${page}&search=${encodeURIComponent(query)}`));
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [page, query]);
  useEffect(() => {
    reload();
  }, [reload]);

  // The open tab lives in the URL hash so refresh and the back button keep your place.
  const go = useCallback((id: string) => {
    setTab(id);
    setEditing(undefined);
    setDrawer(false);
    if (window.location.hash.slice(1) !== id) window.history.pushState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    const sync = () => {
      const id = window.location.hash.slice(1);
      setTab(navigation.some((item) => item.id === id) ? id : "overview");
      setEditing(undefined);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!data)
    return (
      <main className="loading-screen">
        <span className="brand-mark">{loadError ? <AlertCircle size={22} /> : <RefreshCw size={22} className="spin" />}</span>
        <h1>{loadError ? "Your workspace could not be opened" : "Opening your workspace…"}</h1>
        {loadError && (
          <>
            <p role="alert">{loadError}</p>
            <button className="button primary" onClick={reload}>
              Try again
            </button>
          </>
        )}
      </main>
    );

  const role = data.user.role;
  const ctx: Ctx = {
    data,
    canWrite: ["owner", "admin", "editor"].includes(role),
    isAdmin: ["owner", "admin"].includes(role),
    isOwner: role === "owner",
    notify,
    reload,
    go,
    ask: (options) => new Promise((resolve) => setConfirm({ ...options, resolve })),
    mutate: async (action, payload, id) => {
      try {
        const result = await api("/api/workspace", { action, data: payload, id });
        await reload();
        notify(/\.(delete|remove|revoke)$/.test(action) ? "Removed." : "Changes saved.");
        return result;
      } catch (e) {
        notify((e as Error).message, "error");
        throw e;
      }
    },
  };
  const items = navigation.filter((item) => !item.platform || data.user.platformAdmin);
  const current = items.find((item) => item.id === tab) || items[0];
  // Render from the resolved item so a hash the user may not open (e.g. #clients) falls back to Overview.
  const view = current.id;
  const openStudio = (qr: QR | null) => {
    go("codes");
    setEditing(qr);
  };
  async function logout() {
    try {
      await api("/api/auth/logout", {});
      window.location.assign("/login");
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }
  const settle = (value: boolean) => {
    confirm?.resolve(value);
    setConfirm(null);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="shell">
        <aside className={`rail ${drawer ? "open" : ""}`} aria-label="Workspace navigation">
          <Link href="/" className="brand" title={BRAND}>
            <span className="brand-mark">
              <QrCode size={20} />
            </span>
            <span>{BRAND}</span>
          </Link>
          <button className="rail-close icon-button" aria-label="Close navigation" onClick={() => setDrawer(false)}>
            <X size={18} />
          </button>
          <nav>
            {items.map((item, index) => (
              <div key={item.id}>
                {(index === 0 || items[index - 1].group !== item.group) && <div className="rail-group">{item.group}</div>}
                <button className="rail-item" title={item.label} aria-current={current.id === item.id ? "page" : undefined} onClick={() => go(item.id)}>
                  {current.id === item.id && <motion.span layoutId="rail-pill" className="rail-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <item.icon size={18} />
                  <span className="rail-label">{item.label}</span>
                  {item.id === "codes" && <span className="rail-label rail-count">{data.active}</span>}
                </button>
              </div>
            ))}
          </nav>
          <div className="rail-foot">
            <button className="rail-item" title="Sign out" onClick={logout}>
              <LogOut size={18} />
              <span className="rail-label">Sign out</span>
            </button>
          </div>
        </aside>
        {drawer && <button className="rail-backdrop" aria-label="Close navigation" onClick={() => setDrawer(false)} />}

        <div>
          <header className="topbar">
            <button className="menu-toggle icon-button" aria-label="Open navigation" onClick={() => setDrawer(true)}>
              <Menu size={20} />
            </button>
            <div className="topbar-title">
              <strong className="truncate">{current.label}</strong>
              <small className="truncate">{data.workspace.name}</small>
            </div>
            {ctx.canWrite && (
              <button className="button primary" onClick={() => openStudio(null)}>
                <Plus size={17} />
                <span className="hide-sm">Create QR code</span>
              </button>
            )}
            <ThemeControl />
            <button className="avatar" aria-label="Account menu" onClick={() => setProfile(true)}>
              {data.user.name.slice(0, 1)}
            </button>
          </header>

          <main className="content">
            <AnimatePresence mode="wait">
              <motion.div key={view + (editing !== undefined ? `-studio-${editing?.id || "new"}` : "")} {...viewMotion}>
                {view !== "overview" && editing === undefined && (
                  <div className="page-head">
                    <div className="page-title">
                      <span className="page-icon" style={{ "--tone": current.tone } as React.CSSProperties}>
                        <current.icon size={20} />
                      </span>
                      <div>
                        <h1>{current.label}</h1>
                        <p>{current.hint}</p>
                      </div>
                    </div>
                  </div>
                )}
                {view === "overview" && <Overview ctx={ctx} openStudio={openStudio} />}
                {view === "codes" &&
                  (editing !== undefined ? (
                    <QRStudio key={editing?.id || "new"} ctx={ctx} qr={editing} onClose={() => setEditing(undefined)} />
                  ) : (
                    <QRCodes ctx={ctx} page={page} setPage={setPage} query={query} setQuery={setQuery} openStudio={openStudio} />
                  ))}
                {view === "systems" && <Systems ctx={ctx} />}
                {view === "campaigns" && <Campaigns ctx={ctx} />}
                {view === "tags" && <Tags ctx={ctx} />}
                {view === "analytics" && <Analytics ctx={ctx} />}
                {view === "webhooks" && <Webhooks ctx={ctx} />}
                {view === "apiKeys" && <ApiKeys ctx={ctx} />}
                {view === "team" && <Team ctx={ctx} />}
                {view === "billing" && <Billing ctx={ctx} />}
                {view === "activity" && <AuditLog ctx={ctx} />}
                {view === "settings" && <SettingsPanel ctx={ctx} />}
                {view === "help" && <Help ctx={ctx} />}
                {view === "clients" && data.user.platformAdmin && <Clients ctx={ctx} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <AnimatePresence>
          {profile && (
            <Modal title="Your account" onClose={() => setProfile(false)}>
              <div className="profile-card">
                <span className="avatar large">{data.user.name.slice(0, 1)}</span>
                <strong>{data.user.name}</strong>
                <small>{data.user.email}</small>
                <span className="badge">
                  {role} · {data.workspace.plan} plan
                </span>
              </div>
              <div className="stack">
                <button
                  className="button block"
                  onClick={() => {
                    setProfile(false);
                    go("settings");
                  }}
                >
                  <Settings size={16} /> Account settings
                </button>
                <button className="button danger block" onClick={logout}>
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </Modal>
          )}
          {confirm && (
            <Modal title={confirm.title} onClose={() => settle(false)}>
              <p className="muted">{confirm.body}</p>
              <div className="modal-actions">
                <button className="button" onClick={() => settle(false)}>
                  Cancel
                </button>
                <button className={`button ${confirm.danger === false ? "primary" : "danger"}`} onClick={() => settle(true)}>
                  {confirm.action}
                </button>
              </div>
            </Modal>
          )}
        </AnimatePresence>

        <div className="toasts" role="status" aria-live="polite">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div key={toast.id} layout className={`toast ${toast.kind === "error" ? "error" : ""}`} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}>
                {toast.kind === "error" ? <AlertCircle size={17} /> : <Check size={17} />}
                {toast.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
