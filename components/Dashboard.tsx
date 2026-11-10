"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  Code2,
  CreditCard,
  HelpCircle,
  Home,
  KeyRound,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Tag,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { api, Ctx, Data, Filters, Modal, QR, ThemeControl, noFilters, viewMotion } from "./ui";
import Overview from "./Overview";
import QRCodes from "./QRCodes";
import { ApiKeys, Campaigns, Tags, Webhooks } from "./Connect";
import { AuditLog, Billing, Clients, Help, SettingsPanel, Team } from "./Workspace";

// The heavier views load only when opened, keeping the first dashboard paint small.
const loading = () => <div className="skeleton" style={{ height: 320 }} />;
const QRStudio = dynamic(() => import("./QRStudio"), { loading });
const Systems = dynamic(() => import("./Systems"), { loading });
const Analytics = dynamic(() => import("./Analytics"), { loading });

// Each module owns one hue, used for its icon everywhere it appears.
const navigation = [
  { id: "overview", label: "Home", icon: Home, tone: "var(--brand)", group: "", hint: "Your workspace at a glance" },
  { id: "codes", label: "QR codes", icon: QrCode, tone: "var(--c-blue)", group: "", hint: "Create, edit and download your codes" },
  { id: "analytics", label: "Analytics", icon: BarChart3, tone: "var(--c-green)", group: "", hint: "Scans, devices and busiest times" },
  { id: "systems", label: "Systems & records", icon: Layers, tone: "var(--c-violet)", group: "Organise", hint: "Your own tables, with a public page per record" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, tone: "var(--c-pink)", group: "Organise", hint: "Group codes that belong to one campaign" },
  { id: "tags", label: "Tags", icon: Tag, tone: "var(--c-amber)", group: "Organise", hint: "Colour labels for sorting codes" },
  { id: "webhooks", label: "Webhooks", icon: Code2, tone: "var(--c-teal)", group: "Developers", hint: "Get a signed event on every scan" },
  { id: "apiKeys", label: "API keys", icon: KeyRound, tone: "var(--c-orange)", group: "Developers", hint: "Create and list codes from your own software" },
  { id: "team", label: "Team", icon: Users, tone: "var(--c-sky)", group: "Workspace", hint: "Members, roles and invitations" },
  { id: "billing", label: "Plan & billing", icon: CreditCard, tone: "var(--c-green)", group: "Workspace", hint: "Your plan, usage and payments" },
  { id: "activity", label: "Audit log", icon: Activity, tone: "var(--c-slate)", group: "Workspace", hint: "Every saved change, newest first" },
  { id: "settings", label: "Settings", icon: Settings, tone: "var(--c-slate)", group: "Workspace", hint: "Workspace name, password and two-step sign-in" },
  { id: "help", label: "Help", icon: HelpCircle, tone: "var(--c-teal)", group: "Workspace", hint: "Answers and support" },
  { id: "clients", label: "Clients", icon: Building2, tone: "var(--c-pink)", group: "Platform", hint: "Every customer workspace", platform: true },
];
type Toast = { id: number; message: string; kind: "ok" | "error" };
type Confirm = Parameters<Ctx["ask"]>[0] & { resolve: (value: boolean) => void };
type Command = { label: string; icon: LucideIcon; tone?: string; group: string; run: () => void };
const toneStyle = (tone?: string) => ({ "--tone": tone }) as React.CSSProperties;

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState("overview"),
    [loadError, setLoadError] = useState(""),
    [drawer, setDrawer] = useState(false),
    [editing, setEditing] = useState<QR | null | undefined>(undefined),
    [page, setPage] = useState(1),
    [filters, setFilters] = useState<Filters>(noFilters),
    [toasts, setToasts] = useState<Toast[]>([]),
    [confirm, setConfirm] = useState<Confirm | null>(null),
    [profile, setProfile] = useState(false),
    [newMenu, setNewMenu] = useState(false),
    [palette, setPalette] = useState(false),
    [search, setSearch] = useState(""),
    [cursor, setCursor] = useState(0);
  const toastId = useRef(0);

  const notify = useCallback<Ctx["notify"]>((message, kind = "ok") => {
    const id = ++toastId.current;
    setToasts((items) => [...items.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), kind === "error" ? 6000 : 3000);
  }, []);
  const reload = useCallback(async () => {
    try {
      setData(await api(`/api/workspace?${new URLSearchParams({ page: String(page), ...filters })}`));
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [page, filters]);
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
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch("");
        setCursor(0);
        setPalette((open) => !open);
      }
      if (event.key === "Escape") {
        setDrawer(false);
        setNewMenu(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openStudio = useCallback(
    (qr: QR | null) => {
      go("codes");
      setEditing(qr);
    },
    [go],
  );
  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", {});
      window.location.assign("/login");
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }, [notify]);

  const role = data?.user.role || "viewer";
  const canWrite = ["owner", "admin", "editor"].includes(role);
  const items = useMemo(() => navigation.filter((item) => !item.platform || data?.user.platformAdmin), [data?.user.platformAdmin]);
  // Everything you can create, in one list. Shared by the New menu and the command palette.
  const creators = useMemo<Command[]>(
    () =>
      canWrite
        ? [
            { label: "New QR code", icon: QrCode, tone: "var(--c-blue)", group: "Create", run: () => openStudio(null) },
            { label: "New system", icon: Layers, tone: "var(--c-violet)", group: "Create", run: () => go("systems") },
            { label: "New campaign", icon: Megaphone, tone: "var(--c-pink)", group: "Create", run: () => go("campaigns") },
            { label: "New tag", icon: Tag, tone: "var(--c-amber)", group: "Create", run: () => go("tags") },
            ...(role === "owner" ? [{ label: "Invite a teammate", icon: UserPlus, tone: "var(--c-sky)", group: "Create", run: () => go("team") }] : []),
          ]
        : [],
    [canWrite, role, go, openStudio],
  );
  const commands = useMemo<Command[]>(() => {
    const term = search.trim().toLowerCase();
    const all: Command[] = [
      ...creators,
      ...items.map((item) => ({ label: item.label, icon: item.icon, tone: item.tone, group: "Go to", run: () => go(item.id) })),
      {
        label: "Switch light / dark",
        icon: Moon,
        group: "More",
        run: () => {
          const mode = document.documentElement.dataset.mode === "dark" ? "light" : "dark";
          document.documentElement.dataset.mode = mode;
          try {
            localStorage.setItem("qrm-mode", mode);
          } catch {}
        },
      },
      { label: "Sign out", icon: LogOut, group: "More", run: logout },
    ].filter((command) => command.label.toLowerCase().includes(term));
    if (term)
      all.push({
        label: `Search QR codes for “${search.trim()}”`,
        icon: Search,
        tone: "var(--c-blue)",
        group: "Search",
        run: () => {
          setPage(1);
          setFilters({ ...noFilters, search: search.trim() });
          go("codes");
        },
      });
    return all;
  }, [search, creators, items, go, logout]);

  if (!data)
    return (
      <main className="loading-screen">
        <span className="brand-mark">{loadError ? <AlertCircle size={18} /> : <RefreshCw size={18} className="spin" />}</span>
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

  const ctx: Ctx = {
    data,
    canWrite,
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
  const current = items.find((item) => item.id === tab) || items[0];
  // Render from the resolved item so a hash the user may not open (e.g. #clients) falls back to Home.
  const view = current.id;
  const settle = (value: boolean) => {
    confirm?.resolve(value);
    setConfirm(null);
  };
  const runCommand = (command?: Command) => {
    if (!command) return;
    setPalette(false);
    setNewMenu(false);
    command.run();
  };
  const usage = Math.min(100, Math.round((data.codeCount / data.limits.codes) * 100));

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <aside className={`side ${drawer ? "open" : ""}`} aria-label="Workspace navigation">
          <div className="side-head">
            <Link href="/" className="brand-mark" aria-label={`${BRAND} home`}>
              <QrCode size={18} />
            </Link>
            <div className="grow">
              <strong className="truncate">{data.workspace.name}</strong>
              <small>{data.workspace.plan} plan</small>
            </div>
            <button className="side-close icon-button" aria-label="Close navigation" onClick={() => setDrawer(false)}>
              <X size={18} />
            </button>
          </div>
          <button
            className="side-search"
            onClick={() => {
              setDrawer(false);
              setSearch("");
              setCursor(0);
              setPalette(true);
            }}
          >
            <Search size={15} />
            <span className="grow">Search or jump to…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <nav>
            {items.map((item, index) => (
              <div key={item.id}>
                {item.group && items[index - 1]?.group !== item.group && <div className="nav-group">{item.group}</div>}
                <button className="nav-item" aria-current={view === item.id ? "page" : undefined} onClick={() => go(item.id)}>
                  {view === item.id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 520, damping: 40 }} />}
                  <span className="nav-ico" style={toneStyle(item.tone)}>
                    <item.icon size={15} />
                  </span>
                  <span className="grow truncate">{item.label}</span>
                  {item.id === "codes" && <span className="nav-count">{data.codeCount.toLocaleString()}</span>}
                </button>
              </div>
            ))}
          </nav>
          <div className="side-foot">
            {data.workspace.plan !== "business" && (
              <div className="side-plan">
                <div className="meter-row">
                  <span>QR codes used</span>
                  <span className="muted">
                    {data.codeCount.toLocaleString()} / {data.limits.codes.toLocaleString()}
                  </span>
                </div>
                <div className="meter-track">
                  <div className={`meter-fill ${usage >= 100 ? "full" : ""}`} style={{ width: `${usage}%` }} />
                </div>
                <button className="button small" onClick={() => go("billing")}>
                  See plans
                </button>
              </div>
            )}
            <button className="side-user" onClick={() => setProfile(true)}>
              <span className="avatar">{data.user.name.slice(0, 1)}</span>
              <span className="grow">
                <strong className="truncate">{data.user.name}</strong>
                <small className="truncate" style={{ display: "block", textTransform: "capitalize" }}>
                  {role}
                </small>
              </span>
              <ChevronRight size={15} className="muted" />
            </button>
          </div>
        </aside>
        {drawer && <button className="side-backdrop" aria-label="Close navigation" onClick={() => setDrawer(false)} />}

        <div>
          <header className="head">
            <button className="menu-toggle icon-button" aria-label="Open navigation" onClick={() => setDrawer(true)}>
              <Menu size={20} />
            </button>
            <div className="crumbs">
              <span className="truncate hide-sm">{data.workspace.name}</span>
              <ChevronRight size={14} className="hide-sm" />
              <strong className="truncate">{editing !== undefined && view === "codes" ? (editing ? editing.title : "New QR code") : current.label}</strong>
            </div>
            {creators.length > 0 && (
              <div className="popover-wrap hide-sm" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setNewMenu(false)}>
                <button className="button primary" aria-expanded={newMenu} aria-haspopup="menu" onClick={() => setNewMenu(!newMenu)}>
                  <Plus size={16} /> New
                </button>
                <AnimatePresence>
                  {newMenu && (
                    <motion.div className="popover menu" role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}>
                      {creators.map((command) => (
                        <button key={command.label} role="menuitem" className="menu-item" onClick={() => runCommand(command)}>
                          <span className="nav-ico" style={toneStyle(command.tone)}>
                            <command.icon size={15} />
                          </span>
                          {command.label.replace("New ", "").replace(/^./, (letter) => letter.toUpperCase())}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <ThemeControl />
          </header>

          <main className="content">
            <AnimatePresence mode="wait">
              <motion.div key={view + (editing !== undefined ? `-studio-${editing?.id || "new"}` : "")} {...viewMotion}>
                {view !== "overview" && editing === undefined && (
                  <div className="page-head">
                    <div className="page-title">
                      <span className="page-icon" style={toneStyle(current.tone)}>
                        <current.icon size={20} />
                      </span>
                      <div>
                        <h1>{current.label}</h1>
                        <p>{current.hint}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div style={toneStyle(current.tone)}>
                  {view === "overview" && <Overview ctx={ctx} openStudio={openStudio} />}
                  {view === "codes" &&
                    (editing !== undefined ? (
                      <QRStudio key={editing?.id || "new"} ctx={ctx} qr={editing} onClose={() => setEditing(undefined)} />
                    ) : (
                      <QRCodes ctx={ctx} page={page} setPage={setPage} filters={filters} setFilters={setFilters} openStudio={openStudio} />
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
                </div>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <nav className="tabbar" aria-label="Quick navigation">
          {[items[0], items[1]].map((item) => (
            <button key={item.id} className="tab" aria-current={view === item.id ? "page" : undefined} onClick={() => go(item.id)}>
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
          {canWrite ? (
            <button className="tab create" aria-label="New QR code" onClick={() => openStudio(null)}>
              <span>
                <Plus size={20} />
              </span>
            </button>
          ) : (
            <span />
          )}
          <button className="tab" aria-current={view === "analytics" ? "page" : undefined} onClick={() => go("analytics")}>
            <BarChart3 size={20} />
            Analytics
          </button>
          <button className="tab" onClick={() => setDrawer(true)}>
            <Menu size={20} />
            More
          </button>
        </nav>

        <AnimatePresence>
          {palette && (
            <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setPalette(false)}>
              <motion.div className="cmdk" role="dialog" aria-modal="true" aria-label="Search and commands" initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
                <div className="cmdk-input">
                  <Search size={17} />
                  <input
                    autoFocus
                    aria-label="Search pages, actions and QR codes"
                    placeholder="Type a page, an action, or a QR code name…"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCursor(0);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") (event.preventDefault(), setCursor((cursor + 1) % commands.length));
                      if (event.key === "ArrowUp") (event.preventDefault(), setCursor((cursor - 1 + commands.length) % commands.length));
                      if (event.key === "Enter") runCommand(commands[cursor]);
                      if (event.key === "Escape") setPalette(false);
                    }}
                  />
                  <kbd>Esc</kbd>
                </div>
                <div className="cmdk-list">
                  {commands.map((command, index) => (
                    <div key={command.group + command.label}>
                      {commands[index - 1]?.group !== command.group && <small>{command.group}</small>}
                      <button className="menu-item" data-active={index === cursor} onMouseEnter={() => setCursor(index)} onClick={() => runCommand(command)}>
                        <span className="nav-ico" style={toneStyle(command.tone || "var(--c-slate)")}>
                          <command.icon size={15} />
                        </span>
                        {command.label}
                      </button>
                    </div>
                  ))}
                  {!commands.length && <p className="empty">Nothing matches “{search}”.</p>}
                </div>
              </motion.div>
            </motion.div>
          )}
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
