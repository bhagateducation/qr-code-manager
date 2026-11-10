"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Moon, Palette, Sun, X, type LucideIcon } from "lucide-react";

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
  tags?: { tag: { id: string; name: string; color: string } }[];
};
export type Field = { key: string; label: string; type: string; isRequired: boolean };
export type System = { id: string; name: string; description: string; fields: Field[]; _count: { records: number } };
export type Data = {
  user: { id: string; name: string; email: string; role: string; platformAdmin: boolean };
  workspace: { name: string; plan: string; paidUntil: string | null };
  qrCodes: QR[];
  systems: System[];
  total: number;
  page: number;
  scans: number;
  active: number;
  recordCount: number;
  topCodes: { id: string; title: string; scanCount: number }[];
  limits: { codes: number; systems: number; records: number };
  appUrl: string;
  prices: { pro: number; business: number };
  checkoutReady: boolean;
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

const themes = [
  { id: "violet", color: "#7660dc" },
  { id: "blue", color: "#4289df" },
  { id: "emerald", color: "#219c88" },
  { id: "rose", color: "#d86095" },
];
/** Accent + light/dark picker. Saved per browser; the layout script applies it before paint. */
export function ThemeControl() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("violet");
  const [mode, setMode] = useState("light");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "violet");
    setMode(document.documentElement.dataset.mode || "light");
  }, []);
  const apply = (key: "theme" | "mode", value: string) => {
    document.documentElement.dataset[key] = value;
    try {
      localStorage.setItem(`qrm-${key}`, value);
    } catch {}
    key === "theme" ? setTheme(value) : setMode(value);
  };
  const controls = (
    <>
      <small>Accent colour</small>
      <div className="swatches">
        {themes.map((item) => (
          <button key={item.id} type="button" className="swatch" style={{ background: item.color }} aria-label={`${item.id} theme`} aria-pressed={theme === item.id} onClick={() => apply("theme", item.id)} />
        ))}
      </div>
      <small>Appearance</small>
      <div className="segmented" style={{ marginTop: 8, display: "flex" }}>
        {["light", "dark"].map((value) => (
          <button key={value} type="button" className="grow" aria-pressed={mode === value} onClick={() => apply("mode", value)} style={{ textTransform: "capitalize" }}>
            {value}
          </button>
        ))}
      </div>
    </>
  );
  return (
    <div className="popover-wrap" onKeyDown={(event) => event.key === "Escape" && setOpen(false)} onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}>
      <button type="button" className="icon-button" aria-label="Theme and appearance" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <Palette size={18} /> : mode === "dark" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="popover" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            {controls}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
