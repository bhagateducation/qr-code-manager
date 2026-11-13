"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  Code2,
  CreditCard,
  Gem,
  Globe,
  LayoutGrid,
  HelpCircle,
  Home,
  KeyRound,
  Layers,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Tag,
  UserPlus,
  Users,
  Wallet,
  X,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { QR_TYPES, type QrTool } from "@/lib/qr-types";
import { BRAND } from "@/lib/brand";
import { api, Ctx, Data, Filters, Info, Modal, QR, ThemeControl, formatDate, formatDateTime, noFilters, viewMotion } from "./ui";
import Overview from "./Overview";
import QRCodes from "./QRCodes";
import { ApiKeys, Tags, Webhooks } from "./Connect";
import { AuditLog, Billing, Help, SettingsPanel, Team } from "./Workspace";
import { Panels } from "./Account";

// The heavier views load only when opened, keeping the first dashboard paint small.
const loading = () => <div className="skeleton" style={{ height: 320 }} />;
const QRStudio = dynamic(() => import("./QRStudio"), { loading });
const Systems = dynamic(() => import("./Systems"), { loading });
const Analytics = dynamic(() => import("./Analytics"), { loading });
const Books = dynamic(() => import("./Books"), { loading });
// Platform-owner screens are only downloaded by the platform owner.
const Clients = dynamic(() => import("./Owner").then((module) => module.Clients), { loading });
const Plans = dynamic(() => import("./Owner").then((module) => module.Plans), { loading });
const Website = dynamic(() => import("./Owner").then((module) => module.Website), { loading });
const Payments = dynamic(() => import("./Owner").then((module) => module.Payments), { loading });
const Configuration = dynamic(() => import("./Owner").then((module) => module.Configuration), { loading });

// Each module owns one hue, used for its icon everywhere it appears.
const navigation: { id: string; label: string; icon: LucideIcon; tone: string; group: string; hint: string; help: string; platform?: boolean; account?: boolean }[] = [
  { id: "overview", label: "Home", icon: Home, tone: "var(--brand)", group: "", hint: "Your workspace at a glance", help: "A summary of this panel: scans this week, your most scanned codes, what your plan allows and how much storage is used." },
  { id: "codes", label: "QR codes", icon: QrCode, tone: "var(--c-blue)", group: "", hint: "Create, find, copy and download your codes", help: "Every code has a number such as QR-00042. Open folders by clicking them, search by number, name or link, and tick several codes to pause, move or trash them together. Changing a website code's link never changes its image." },
  { id: "books", label: "Book QR", icon: BookOpen, tone: "var(--c-orange)", group: "Create QR", hint: "A QR code for every question of a book, sorted by chapter", help: "For books and question banks. Enter the book's name, a link pattern and how many questions each chapter has; one click makes a folder per chapter and a numbered QR for every question." },
  { id: "analytics", label: "Analytics", icon: BarChart3, tone: "var(--c-green)", group: "", hint: "Scans, devices and busiest times", help: "How often your codes are scanned, from which kinds of phone, and at what times. Choose a period at the top; export every scan as CSV." },
  { id: "systems", label: "Systems & records", icon: Layers, tone: "var(--c-violet)", group: "Manage", hint: "Your own tables, with a public page per record", help: "Make your own table (a system), such as Products or Students, with the fields you need. Publish a record to get a public page, then point a QR code at it." },
  { id: "tags", label: "Tags", icon: Tag, tone: "var(--c-amber)", group: "Manage", hint: "Colour labels for sorting codes", help: "Tags are coloured labels that work across folders, like Print or Urgent. Add them to codes in the editor and filter the list by them." },
  { id: "webhooks", label: "Webhooks", icon: Code2, tone: "var(--c-teal)", group: "Developers", hint: "Get a signed event on every scan", help: "For developers: we send a signed message to your server each time one of your codes is scanned." },
  { id: "apiKeys", label: "API keys", icon: KeyRound, tone: "var(--c-orange)", group: "Developers", hint: "Create and list codes from your own software", help: "For developers: a key lets your own software create and list codes in this panel." },
  { id: "team", label: "Team", icon: Users, tone: "var(--c-sky)", group: "Workspace", hint: "Members, roles and invitations", help: "Invite people to this panel. Admins manage almost everything, editors create and change codes, viewers can only look and download." },
  { id: "panels", label: "Panels", icon: LayoutGrid, tone: "var(--c-violet)", group: "Workspace", hint: "Separate panels for branches, teams or employees", help: "A panel is a separate workspace inside your account, with its own codes, folders and members. Make one per branch or department; your plan's limits are shared across all panels.", account: true },
  { id: "billing", label: "Plan & billing", icon: CreditCard, tone: "var(--c-green)", group: "Workspace", hint: "Your plan, usage, storage and payments", help: "See what your plan allows and how much you use, including storage. Paid plans do not renew on their own; renew here before the end date." },
  { id: "activity", label: "Audit log", icon: Activity, tone: "var(--c-slate)", group: "Workspace", hint: "Every saved change, newest first", help: "A record of who changed what in this panel." },
  { id: "settings", label: "Settings", icon: Settings, tone: "var(--c-slate)", group: "Workspace", hint: "Name, password, two-step sign-in and your domain", help: "Rename the workspace, change your password, protect sign-in with a code from your phone, and connect your own domain." },
  { id: "help", label: "Help", icon: HelpCircle, tone: "var(--c-teal)", group: "Workspace", hint: "Answers and support", help: "Short answers to common questions, and how to reach support." },
  { id: "clients", label: "Clients", icon: Building2, tone: "var(--c-pink)", group: "Platform", hint: "Every customer account, their usage and payments", help: "Only you, the platform owner, see this. Open a client to change their plan, extend it, record a payment, give them custom limits or storage, add notes, open their panel or suspend them.", platform: true },
  { id: "payments", label: "Payments", icon: Wallet, tone: "var(--c-green)", group: "Platform", hint: "Every purchase from your website, paid or pending", help: "All orders: Razorpay purchases and payments you recorded by hand. Filter by status, check a pending order with Razorpay again, send a receipt, or export the list.", platform: true },
  { id: "plans", label: "Plans", icon: Gem, tone: "var(--c-amber)", group: "Platform", hint: "What each plan costs and allows", help: "Create and edit the plans clients buy: price, length, limits (or unlimited), storage, panels and features. Changes apply at once to every client on the plan.", platform: true },
  { id: "website", label: "Website", icon: Globe, tone: "var(--c-sky)", group: "Platform", hint: "Edit your public home page", help: "Change the headline, text, sections and questions on your home page. Prices on the website come from Plans.", platform: true },
  { id: "configuration", label: "Configuration", icon: SlidersHorizontal, tone: "var(--c-slate)", group: "Platform", hint: "Payments, email, sign-in security and notifications in one place", help: "Connect Razorpay so clients can buy plans, set up email (Hostinger mail or Resend), turn on an email code at sign-in, and send notifications to every client or one client.", platform: true },
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
    [tool, setTool] = useState<QrTool | undefined>(undefined),
    [chooser, setChooser] = useState(false),
    [openGroups, setOpenGroups] = useState<Record<string, boolean>>({}),
    [page, setPage] = useState(1),
    [filters, setFilters] = useState<Filters>(noFilters),
    [toasts, setToasts] = useState<Toast[]>([]),
    [confirm, setConfirm] = useState<Confirm | null>(null),
    [profile, setProfile] = useState(false),
    [newMenu, setNewMenu] = useState(false),
    [palette, setPalette] = useState(false),
    [search, setSearch] = useState(""),
    [cursor, setCursor] = useState(0),
    [bell, setBell] = useState(false),
    [sideMode, setSideMode] = useState<"auto" | "full" | "mini">("auto"),
    [sideWidth, setSideWidth] = useState(252),
    [narrow, setNarrow] = useState(false);
  const toastId = useRef(0);
  // Sidebar: auto shows icons only on mid-size screens; the choice and width are remembered per browser.
  useEffect(() => {
    try {
      const mode = localStorage.getItem("qrm-side");
      if (mode === "full" || mode === "mini") setSideMode(mode);
      const width = Number(localStorage.getItem("qrm-side-w"));
      if (width >= 200 && width <= 360) setSideWidth(width);
    } catch {}
    const query = window.matchMedia("(max-width: 1279px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const mini = sideMode === "mini" || (sideMode === "auto" && narrow);
  const toggleSide = () => {
    const next = mini ? "full" : "mini";
    setSideMode(next);
    try {
      localStorage.setItem("qrm-side", next);
    } catch {}
  };
  const startResize = (event: React.PointerEvent) => {
    const start = event.clientX - sideWidth;
    let width = sideWidth;
    const move = (e: PointerEvent) => setSideWidth((width = Math.min(360, Math.max(200, e.clientX - start))));
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      try {
        localStorage.setItem("qrm-side-w", String(width));
      } catch {}
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

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
      // A new code first asks which kind to make; the chooser then opens the studio.
      if (!qr) return setChooser(true);
      go("codes");
      setTool(undefined);
      setEditing(qr);
    },
    [go],
  );
  // A sidebar tool opens the studio set up for that kind of code; books and CSV have their own screens.
  const openTool = useCallback(
    (next: QrTool) => {
      go(next.base === "books" ? "books" : "codes");
      setTool(next);
      if (next.base !== "books" && next.base !== "csv") setEditing(null);
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
  const showPanels = !!data && (data.account.manages || data.account.panels.length > 0);
  const items = useMemo(() => navigation.filter((item) => (!item.platform || data?.user.platformAdmin) && (!item.account || showPanels)), [data?.user.platformAdmin, showPanels]);
  // Everything you can create, in one list. Shared by the New menu and the command palette.
  const creators = useMemo<Command[]>(
    () =>
      canWrite
        ? [
            { label: "New QR code", icon: QrCode, tone: "var(--c-blue)", group: "Create", run: () => openStudio(null) },
            { label: "New book QR set", icon: BookOpen, tone: "var(--c-orange)", group: "Create", run: () => go("books") },
            { label: "New system", icon: Layers, tone: "var(--c-violet)", group: "Create", run: () => go("systems") },
            { label: "New tag", icon: Tag, tone: "var(--c-amber)", group: "Create", run: () => go("tags") },
            ...(data?.account.manages ? [{ label: "New panel", icon: LayoutGrid, tone: "var(--c-violet)", group: "Create", run: () => go("panels") }] : []),
            ...(role === "owner" ? [{ label: "Invite a teammate", icon: UserPlus, tone: "var(--c-sky)", group: "Create", run: () => go("team") }] : []),
          ]
        : [],
    [canWrite, role, go, openStudio, data?.account.manages],
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
    openFolder: (id) => {
      setPage(1);
      setFilters({ ...noFilters, folder: id, sort: "position" });
      go("codes");
    },
    switchPanel: async (id) => {
      try {
        await api("/api/auth/switch", { workspaceId: id });
        window.location.assign("/dashboard");
      } catch (e) {
        notify((e as Error).message, "error");
      }
    },
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
  const usage = data.limits.codes ? Math.min(100, Math.round((data.usage.codes / data.limits.codes) * 100)) : 0;
  const daysLeft = data.workspace.paidUntil ? Math.ceil((Date.parse(data.workspace.paidUntil) - Date.now()) / 86400000) : null;
  // Every panel this person can open: their own, the client's main panel when visiting, and the account's panels.
  const places = [{ id: data.account.homeId, name: `${data.account.homeName}${data.user.platformAdmin ? " (yours)" : ""}` }, ...(data.account.rootId !== data.account.homeId ? [{ id: data.account.rootId, name: `${data.workspace.accountName} · main` }] : []), ...data.account.panels.map((panel) => ({ id: panel.id, name: panel.name }))];

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${mini ? "mini" : ""}`} style={{ "--side-w": `${sideWidth}px` } as React.CSSProperties}>
        <aside className={`side ${drawer ? "open" : ""}`} aria-label="Workspace navigation">
          <div className="side-head">
            <Link href="/" className="brand-mark" aria-label={`${BRAND} home`}>
              <QrCode size={18} />
            </Link>
            <div className="grow">
              <strong className="truncate">{data.workspace.name}</strong>
              <small>{data.workspace.isPanel ? `Panel of ${data.workspace.accountName}` : `${data.workspace.planName} plan`}</small>
            </div>
            <button className="side-close icon-button" aria-label="Close navigation" onClick={() => setDrawer(false)}>
              <X size={18} />
            </button>
            <button className="side-toggle icon-button" title={mini ? "Keep the menu open" : "Show icons only (opens when you point at it)"} aria-label={mini ? "Expand the menu" : "Collapse the menu to icons"} onClick={toggleSide}>
              {mini ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>
          {places.length > 1 && (
            <select className="panel-switch" aria-label="Switch panel" value={data.workspace.id} onChange={(event) => ctx.switchPanel(event.target.value === data.account.homeId ? null : event.target.value)}>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          )}
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
            <span className="grow truncate">Search…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <nav>
            {["", "Create QR", "Manage", "Developers", "Workspace", "Platform"].map((group) => {
              const members = items.filter((item) => item.group === group && item.id !== "books");
              if (!members.length && group !== "Create QR") return null;
              // The group holding the open page starts expanded; a click on the heading shows or hides it.
              const holdsCurrent = group === "Create QR" ? view === "books" || (view === "codes" && editing === null && !!tool) : members.some((item) => item.id === view);
              const open = !group || (openGroups[group] ?? holdsCurrent);
              return (
                <div key={group || "top"}>
                  {group && (
                    <button className="nav-group" aria-expanded={open} onClick={() => setOpenGroups((state) => ({ ...state, [group]: !open }))}>
                      {group === "Create QR" && !open ? "Create QR · show all" : group}
                      <ChevronDown size={14} />
                    </button>
                  )}
                  {group === "Create QR" &&
                    QR_TYPES.filter((item, index) => open || index < 5 || tool?.id === item.id).map((item) => (
                      <button className="nav-item nav-sub" key={item.id} title={item.name} aria-current={tool?.id === item.id && holdsCurrent ? "page" : undefined} onClick={() => openTool(item)}>
                        <span className="nav-ico" style={toneStyle(item.tone)}>
                          <item.icon size={15} />
                        </span>
                        <span className="grow truncate">{item.name.replace(/ QR Codes?$| to QR Code$/, "")}</span>
                      </button>
                    ))}
                  {open &&
                    members.map((item) => (
                      <button className={`nav-item ${group ? "nav-sub" : ""}`} key={item.id} title={item.label} aria-current={view === item.id && !(item.id === "codes" && editing === null && tool) ? "page" : undefined} onClick={() => (setTool(undefined), go(item.id))}>
                        {view === item.id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 520, damping: 40 }} />}
                        <span className="nav-ico" style={toneStyle(item.tone)}>
                          <item.icon size={15} />
                        </span>
                        <span className="grow truncate">{item.label}</span>
                        {item.id === "codes" && <span className="nav-count">{data.codeCount.toLocaleString()}</span>}
                      </button>
                    ))}
                </div>
              );
            })}
          </nav>
          <div className="side-foot">
            {data.limits.codes !== null && (
              <div className="side-plan">
                <div className="meter-row">
                  <span>QR codes used</span>
                  <span className="muted">
                    {data.usage.codes.toLocaleString()} / {data.limits.codes.toLocaleString()}
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
          {!mini && <div className="side-resize" role="separator" aria-orientation="vertical" aria-label="Drag to resize the menu" onPointerDown={startResize} onDoubleClick={() => setSideWidth(252)} />}
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
            <div className="popover-wrap" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setBell(false)}>
              <button
                className="icon-button bell"
                aria-label={`Notifications${data.notifications.unread ? `, ${data.notifications.unread} new` : ""}`}
                aria-expanded={bell}
                onClick={() => {
                  setBell(!bell);
                  if (!bell && data.notifications.unread) {
                    setData({ ...data, notifications: { ...data.notifications, unread: 0 } });
                    api("/api/notifications", {}).catch(() => {});
                  }
                }}
              >
                <Bell size={18} />
                {data.notifications.unread > 0 && <span className="bell-dot">{Math.min(9, data.notifications.unread)}</span>}
              </button>
              <AnimatePresence>
                {bell && (
                  <motion.div className="popover notices" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}>
                    <strong className="notices-head">Notifications</strong>
                    {data.notifications.items.length ? (
                      data.notifications.items.map((item) => (
                        <div key={item.id} className={`notice-item ${item.kind}`}>
                          <strong>{item.title}</strong>
                          <p>{item.body}</p>
                          <small className="muted">
                            {formatDateTime(item.createdAt)}
                            {item.link && (
                              <>
                                {" · "}
                                {item.link.startsWith("#") ? (
                                  <button className="link-button" onClick={() => (setBell(false), go(item.link!.slice(1)))}>
                                    Open
                                  </button>
                                ) : (
                                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                                    Open
                                  </a>
                                )}
                              </>
                            )}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p className="muted" style={{ padding: "8px 4px" }}>
                        No notifications yet. Updates and alerts appear here.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ThemeControl />
          </header>

          <main className="content">
            {data.account.visiting && data.user.platformAdmin && data.account.rootId !== data.account.homeId && (
              <div className="banner info">
                <span className="grow">You are working inside {data.workspace.accountName}&apos;s account as the platform owner. Changes you make here are saved in their workspace.</span>
                <button className="button small" onClick={() => ctx.switchPanel(null)}>
                  Back to my panel
                </button>
              </div>
            )}
            {data.account.manages && !data.account.visiting && (data.workspace.lapsedPlan || (daysLeft !== null && daysLeft <= 7 && data.workspace.plan !== "free" && data.workspace.plan !== "owner")) && (
              <div className="banner warn">
                <span className="grow">
                  {data.workspace.lapsedPlan
                    ? "Your paid plan has ended, so Free limits apply. Your QR codes still work."
                    : `Your ${data.workspace.planName} plan ends on ${formatDate(data.workspace.paidUntil!)}${daysLeft! <= 0 ? "" : ` — ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}.`}
                </span>
                <button className="button small" onClick={() => go("billing")}>
                  Renew
                </button>
              </div>
            )}
            {data.domain?.use && data.domain.status === "failing" && (
              <div className="banner warn">
                <span className="grow">Your domain {data.domain.name} is not working. New QR images use our domain until it is fixed.</span>
                <button className="button small" onClick={() => go("settings")}>
                  Check domain
                </button>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div key={view + (editing !== undefined ? `-studio-${editing?.id || "new"}` : "")} {...viewMotion}>
                {view !== "overview" && editing === undefined && (
                  <div className="page-head">
                    <div className="page-title">
                      <span className="page-icon" style={toneStyle(current.tone)}>
                        <current.icon size={20} />
                      </span>
                      <div>
                        <h1>
                          {current.label}
                          <Info text={current.help} label={`About ${current.label}`} />
                        </h1>
                        <p>{current.hint}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div style={toneStyle(current.tone)}>
                  {view === "overview" && <Overview ctx={ctx} openStudio={openStudio} />}
                  {view === "codes" &&
                    (editing !== undefined ? (
                      <QRStudio key={editing?.id || `new-${tool?.id || ""}`} ctx={ctx} qr={editing} tool={tool} defaultFolder={filters.folder === "none" ? "" : filters.folder} onClose={() => setEditing(undefined)} />
                    ) : (
                      <QRCodes ctx={ctx} page={page} setPage={setPage} filters={filters} setFilters={setFilters} openStudio={openStudio} />
                    ))}
                  {view === "books" && <Books ctx={ctx} />}
                  {view === "systems" && <Systems ctx={ctx} />}
                  {view === "panels" && <Panels ctx={ctx} />}
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
                  {view === "plans" && data.user.platformAdmin && <Plans ctx={ctx} />}
                  {view === "website" && data.user.platformAdmin && <Website ctx={ctx} />}
                  {view === "payments" && data.user.platformAdmin && <Payments ctx={ctx} />}
                  {view === "configuration" && data.user.platformAdmin && <Configuration ctx={ctx} />}
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
          {chooser && (
            <Modal title="What kind of QR code do you want?" wide onClose={() => setChooser(false)}>
              <div className="choose-grid">
                {QR_TYPES.map((item) => (
                  <button key={item.id} className="choose-item" onClick={() => (setChooser(false), openTool(item))}>
                    <span className="nav-ico" style={toneStyle(item.tone)}>
                      <item.icon size={16} />
                    </span>
                    {item.name.replace(/ QR Codes?$| to QR Code$/, "")}
                  </button>
                ))}
              </div>
            </Modal>
          )}
          {profile && (
            <Modal title="Your account" onClose={() => setProfile(false)}>
              <div className="profile-card">
                <span className="avatar large">{data.user.name.slice(0, 1)}</span>
                <strong>{data.user.name}</strong>
                <small>{data.user.email}</small>
                <span className="badge">
                  {data.user.platformAdmin ? "Platform owner" : role === "owner" ? "Account holder" : role} · {data.workspace.planName} plan
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
