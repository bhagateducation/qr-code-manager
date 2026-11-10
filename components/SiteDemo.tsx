"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Contact, Link2, QrCode, Wifi } from "lucide-react";

const kinds = [
  { id: "link", label: "Link", icon: Link2, tone: "var(--c-blue)", field: "Website address", start: "yourshop.com/menu", note: "In your workspace this becomes a dynamic code: change where it leads later without reprinting." },
  { id: "wifi", label: "Wi-Fi", icon: Wifi, tone: "var(--c-teal)", field: "Network name", start: "Cafe Guest", note: "Guests scan and join. No more spelling out the password." },
  { id: "card", label: "Contact", icon: Contact, tone: "var(--c-pink)", field: "Full name", start: "Asha Verma", note: "One scan saves your name, phone and email to their phone." },
] as const;
const payload = (kind: string, value: string) =>
  kind === "wifi" ? `WIFI:T:WPA;S:${value};P:welcome123;H:false;;` : kind === "card" ? `BEGIN:VCARD\nVERSION:3.0\nFN:${value}\nEND:VCARD` : /^https?:\/\//.test(value) ? value : `https://${value}`;

/** A real generator on the home page: what you type is the code you see. */
export function LiveDemo() {
  const [kind, setKind] = useState<(typeof kinds)[number]>(kinds[0]);
  const [value, setValue] = useState<string>(kinds[0].start);
  const [path, setPath] = useState({ d: "", size: 29 });
  useEffect(() => {
    let active = true;
    import("qrcode").then(({ default: QRCode }) => {
      if (!active) return;
      try {
        const { modules } = QRCode.create(payload(kind.id, value.trim() || kind.start), { errorCorrectionLevel: "M" });
        let d = "";
        for (let y = 0; y < modules.size; y++) for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
        setPath({ d, size: modules.size });
      } catch {
        // too long to encode: keep the last good code on screen
      }
    });
    return () => {
      active = false;
    };
  }, [kind, value]);
  return (
    <div className="demo" style={{ "--tone": kind.tone } as React.CSSProperties}>
      <span className="demo-float a">
        <i /> Scan-tested before download
      </span>
      <div className="demo-tabs" role="group" aria-label="Code type">
        {kinds.map((item) => (
          <button
            key={item.id}
            aria-pressed={kind.id === item.id}
            onClick={() => {
              setKind(item);
              setValue(item.start);
            }}
          >
            <item.icon size={15} /> {item.label}
          </button>
        ))}
      </div>
      <label>
        {kind.field}
        <input value={value} maxLength={120} onChange={(event) => setValue(event.target.value)} spellCheck={false} autoComplete="off" />
      </label>
      <div className="demo-stage">
        <div className="demo-qr">
          {path.d ? (
            <svg viewBox={`-2 -2 ${path.size + 4} ${path.size + 4}`} role="img" aria-label={`QR code for ${value}`} shapeRendering="crispEdges">
              <path d={path.d} fill="#15161a" />
            </svg>
          ) : (
            <QrCode size={64} color="#c9ccd3" />
          )}
        </div>
        <div className="demo-side">
          <strong>Try it. This code is real.</strong>
          <p>{kind.note}</p>
          <Link href="/register" className="button primary small" style={{ justifySelf: "start" }}>
            Save and download <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <span className="demo-float b">
        <QrCode size={14} /> QR-00042 · Summer menu
      </span>
    </div>
  );
}

const destinations = ["yourshop.com/menu-summer", "yourshop.com/menu-monsoon", "yourshop.com/diwali-offer", "yourshop.com/menu-winter"];
/** The core idea, shown: the printed link stays, only the destination behind it changes. */
export function SwapDemo() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => (value + 1) % destinations.length), 2400);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="swap" aria-hidden>
      <div className="swap-line">
        <span className="badge neutral">Printed</span>
        <code>your-site.com/s/k3Xp9a</code>
        <span className="grow" />
        <small>never changes</small>
      </div>
      <div className="swap-line">
        <span className="badge">Leads to</span>
        <span className="grow" style={{ overflow: "hidden", minHeight: 20 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.code key={index} style={{ display: "block" }} initial={{ y: 14, opacity: 0, filter: "blur(4px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} exit={{ y: -14, opacity: 0, filter: "blur(4px)" }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              {destinations[index]}
            </motion.code>
          </AnimatePresence>
        </span>
        <small>edit any time</small>
      </div>
    </div>
  );
}
