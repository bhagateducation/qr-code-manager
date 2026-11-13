"use client";
export { default as ThemeControl } from "./ThemeControl";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, HardDrive, Info as InfoIcon, X, type LucideIcon } from "lucide-react";

export type QR = {
  id: string;
  number: number;
  folderId?: string | null;
  deletedAt?: string | null;
  position?: number;
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
  tags?: { tag: { id: string; name: string; color: string } }[];
};
/** A category. Folders nest (Book > Chapter); a code sits in at most one. */
export type Folder = { id: string; parentId: string | null; name: string; kind: string; position?: number; _count: { qrCodes: number } };
/** The folder and its ancestors, outermost first. */
export function folderTrail(folders: Folder[], id?: string | null) {
  const trail: Folder[] = [];
  for (let folder = folders.find((item) => item.id === id); folder; folder = folders.find((item) => item.id === folder!.parentId)) trail.unshift(folder);
  return trail;
}
export const folderPath = (folders: Folder[], id?: string | null) => folderTrail(folders, id).map((folder) => folder.name).join(" / ");
export type Field = { key: string; label: string; type: string; isRequired: boolean };
export type System = { id: string; name: string; description: string; fields: Field[]; _count: { records: number } };
/** Plan limits; null means unlimited. */
export type Limits = { codes: number | null; systems: number | null; records: number | null; storageMb: number | null; panels: number | null; members: number | null; allowApi: boolean; allowBooks: boolean; allowDomain: boolean };
export type Plan = Omit<Limits, never> & { id: string; name: string; description: string | null; pricePaise: number; days: number; isPublic: boolean; sort: number };
export type Usage = { codes: number; systems: number; records: number; folders: number; members: number; invites: number; scans: number; panels: number; storageBytes: number };
export type Data = {
  user: { id: string; name: string; email: string; role: string; platformAdmin: boolean };
  workspace: { id: string; name: string; plan: string; planName: string; paidUntil: string | null; lapsedPlan: string | null; isPanel: boolean; accountName: string };
  account: { manages: boolean; panels: { id: string; name: string; createdAt: string; current: boolean; _count: { qrCodes: number; users: number } }[]; rootId: string; homeId: string; homeName: string; visiting: boolean };
  usage: Usage;
  plans: Plan[];
  domain: { name: string | null; status: string; token: string | null; use: boolean; checkedAt: string | null; target: string } | null;
  linkBase: string;
  qrCodes: QR[];
  systems: System[];
  total: number;
  page: number;
  scans: number;
  active: number;
  recordCount: number;
  codeCount: number;
  trashCount: number;
  folders: Folder[];
  pageSize: number;
  topCodes: { id: string; title: string; scanCount: number }[];
  limits: Limits;
  appUrl: string;
  checkoutReady: boolean;
  notifications: { items: Notice[]; unread: number };
  logs: { id: string; scannedAt: string; device: string; os: string; browser: string; qrCode: { title: string } }[];
  audit: { id: string; action: string; createdAt: string }[];
  payments: { id: string; plan: string; amount: number; status: string; createdAt: string }[];
  members: { id: string; name: string; email: string; role: string }[];
  tags: { id: string; name: string; color: string; createdAt: string }[];
  campaigns: { id: string; name: string; description: string | null; status: string; createdAt: string }[];
  webhooks: { id: string; url: string; isActive: boolean; createdAt: string }[];
  apiKeys: { id: string; label: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }[];
  webhookDeliveries: { id: string; eventType: string; status: string; responseCode: number | null; lastError: string | null; createdAt: string; webhook: { url: string } }[];
  invitations: { id: string; email: string; role: string; expiresAt: string }[];
};
export type Notice = { id: string; title: string; body: string; link: string | null; kind: string; createdAt: string; workspaceId?: string | null };
/** How the QR list is narrowed and ordered. Sent to the server as query parameters. */
export type Filters = { search: string; status: string; tag: string; campaign: string; type: string; folder: string; sort: string; size: string };
export const noFilters: Filters = { search: "", status: "", tag: "", campaign: "", type: "", folder: "", sort: "", size: "25" };
/** QR-00042: fixed width so numbers sort and scan well on printed lists. */
export const qrNumber = (value: number) => `QR-${String(value).padStart(5, "0")}`;
export type Ask = (options: { title: string; body: string; action: string; danger?: boolean }) => Promise<boolean>;
/** Everything a panel needs from the shell. */
export type Ctx = {
  data: Data;
  canWrite: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  mutate: (action: string, payload?: unknown, id?: string) => Promise<any>;
  notify: (message: string, kind?: "ok" | "error") => void;
  ask: Ask;
  reload: () => Promise<void>;
  go: (tab: string) => void;
  /** Opens the QR list showing one folder and everything inside it. */
  openFolder: (id: string) => void;
  /** Moves this session into one of the account's panels, or back home with null. */
  switchPanel: (id: string | null) => Promise<void>;
};

export async function api(path: string, data?: unknown) {
  const response = await fetch(path, {
    ...(data ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}),
    cache: "no-store",
  });
  // A proxy or crash page is not JSON; never let that surface as a parser error.
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.startsWith("/api/auth/")) window.location.assign("/login");
  if (!response.ok) throw new Error(result.error || "Unable to complete this request.");
  return result;
}
/** A YouTube video id from a watch, short or youtu.be link. */
export const youtubeId = (url: string) => /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url)?.[1] || null;
/** True while a code has no link of its own yet and shows its QR page instead. */
export const isWaiting = (qr: QR) => qr.targetUrl.endsWith(`/q/${qr.shortCode}`);
export const shareLink = (data: Data, qr: QR) => `${data.linkBase}/q/${qr.shortCode}`;
/** A small dropdown built on <details>: closes when an item is chosen or on a click elsewhere. */
export function Menu({ label, icon: Icon, children, primary, align = "right" }: { label: string; icon?: LucideIcon; children: React.ReactNode; primary?: boolean; align?: "left" | "right" }) {
  useEffect(() => {
    const close = (event: MouseEvent) => document.querySelectorAll("details.dropdown[open]").forEach((menu) => !menu.contains(event.target as Node) && menu.removeAttribute("open"));
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <details className={`dropdown ${align}`}>
      <summary className={`button ${primary ? "primary" : ""}`}>
        {Icon && <Icon size={15} />} <span className="hide-sm">{label}</span>
      </summary>
      <div className="menu-pop" role="menu" onClick={(event) => (event.target as HTMLElement).closest("button,a") && event.currentTarget.parentElement?.removeAttribute("open")}>
        {children}
      </div>
    </details>
  );
}
export function saveFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
export const formatBytes = (bytes: number) =>
  bytes < 1048576 ? `${Math.max(0, Math.round(bytes / 1024))} KB` : bytes < 1073741824 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1073741824).toFixed(2)} GB`;
export const limitText = (limit: number | null) => (limit === null ? "Unlimited" : limit.toLocaleString());
export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

/** Shared motion presets so every list and view moves the same way. */
export const listMotion = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
export const itemMotion = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };
export const viewMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18 },
};

export function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose} autoFocus>
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Empty({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <Icon />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}

export function CopyButton({ value, label = "Copy", notify }: { value: string; label?: string; notify: Ctx["notify"] }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="button small"
      onClick={() =>
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          })
          .catch(() => notify("Copy is blocked by this browser. Select the text and copy it manually.", "error"))
      }
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? "Copied" : label}
    </button>
  );
}

/** A value shown once (API key, webhook secret, invite link, backup codes). */
export function Secret({ title, value, notify }: { title: string; value: string; notify: Ctx["notify"] }) {
  return (
    <motion.div className="notice info" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <strong>{title}</strong>
      <code className="secret-value">{value}</code>
      <CopyButton value={value} notify={notify} />
    </motion.div>
  );
}

/** A small (i) that explains a feature, on hover or tap. Positioned fixed so no panel edge can clip it. */
export function Info({ text, label = "How this works" }: { text: string; label?: string }) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const show = (target: HTMLElement) => {
    const box = target.getBoundingClientRect();
    setAt({ top: box.bottom + 8, left: Math.max(8, Math.min(box.left + box.width / 2 - 150, window.innerWidth - 308)) });
  };
  return (
    <span className="info" onMouseEnter={(event) => show(event.currentTarget)} onMouseLeave={() => setAt(null)}>
      <button
        type="button"
        className="info-dot"
        aria-label={label}
        aria-expanded={!!at}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          at ? setAt(null) : show(event.currentTarget);
        }}
        onBlur={() => setAt(null)}
      >
        <InfoIcon size={13} />
      </button>
      <AnimatePresence>
        {at && (
          <motion.span role="tooltip" className="info-pop" style={at} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** A storage drive, drawn like a disk in a file manager. */
export function Drive({ used, limitMb, label = "Storage" }: { used: number; limitMb: number | null; label?: string }) {
  const total = limitMb === null ? null : limitMb * 1048576;
  const share = total ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="drive">
      <span className="drive-icon">
        <HardDrive size={22} />
      </span>
      <div className="grow stack" style={{ gap: 6 }}>
        <div className="meter-row">
          <strong>{label}</strong>
          <span className="muted">
            {formatBytes(used)} of {total === null ? "unlimited" : formatBytes(total)}
          </span>
        </div>
        <div className="meter-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(share)} aria-valuemin={0} aria-valuemax={100}>
          <motion.div className={`meter-fill ${share >= 90 ? "full" : ""}`} initial={{ width: 0 }} animate={{ width: `${Math.max(share, used ? 1 : 0)}%` }} transition={{ duration: 0.6 }} />
        </div>
        <small>{total === null ? "No storage limit" : `${formatBytes(Math.max(0, total - used))} free`}</small>
      </div>
    </div>
  );
}

export type Label = { title: string; number?: number } | null;
/** The QR as a PNG, optionally with its name and number printed underneath. */
export async function qrPng(payload: string, style: { dark?: string; errorCorrectionLevel?: string } = {}, label: Label = null, width = 1024): Promise<Blob> {
  const { default: QRCode } = await import("qrcode");
  const code = document.createElement("canvas");
  await QRCode.toCanvas(code, payload, { width, margin: 4, errorCorrectionLevel: (style.errorCorrectionLevel as "M") || "M", color: { dark: style.dark || "#17161D", light: "#FFFFFF" } });
  let out = code;
  if (label) {
    const k = width / 1024;
    await document.fonts?.load("600 52px Poppins").catch(() => {});
    out = document.createElement("canvas");
    out.width = code.width;
    out.height = code.height + Math.round((label.number ? 150 : 96) * k);
    const pen = out.getContext("2d")!;
    pen.fillStyle = "#fff";
    pen.fillRect(0, 0, out.width, out.height);
    pen.drawImage(code, 0, 0);
    pen.textAlign = "center";
    pen.textBaseline = "top";
    pen.fillStyle = "#15161a";
    pen.font = `600 ${Math.round(52 * k)}px Poppins, sans-serif`;
    let title = label.title;
    while (title.length > 1 && pen.measureText(title).width > out.width - 96 * k) title = title.slice(0, -2) + "…";
    pen.fillText(title, out.width / 2, code.height - 24 * k);
    if (label.number) {
      pen.fillStyle = "#555863";
      pen.font = `500 ${Math.round(40 * k)}px Poppins, sans-serif`;
      pen.fillText(qrNumber(label.number), out.width / 2, code.height + 50 * k);
    }
  }
  return new Promise((resolve, reject) => out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The image could not be created."))), "image/png"));
}
/** Puts a PNG on the clipboard so it can be pasted into chats, documents or design tools. */
export async function copyImage(blob: Promise<Blob>) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error("This browser cannot copy images. Use Download instead.");
  // Passing the promise keeps Safari's user-gesture check happy while the image renders.
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Whether copies, downloads and prints include the name and number. Off by default, remembered per browser. */
export function useLabelPref(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(localStorage.getItem("qrm-label") === "on");
    } catch {}
  }, []);
  return [
    on,
    (value: boolean) => {
      setOn(value);
      try {
        localStorage.setItem("qrm-label", value ? "on" : "off");
      } catch {}
    },
  ];
}
