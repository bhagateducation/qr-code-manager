"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, QrCode } from "lucide-react";
import { buildVCardPayload, buildWifiPayload } from "@/lib/qr-payload";
import { QR_TYPES } from "@/lib/qr-types";

// Every type that makes a single code. Book sets and CSV imports need an account.
const kinds = QR_TYPES.filter((item) => item.base !== "books" && item.base !== "csv");
const SAMPLE = "https://example.com";
const fieldsOf = (kind: (typeof kinds)[number]) =>
  kind.base === "wifi"
    ? [{ key: "ssid", label: "Wi-Fi name", placeholder: "Cafe Guest" }, { key: "password", label: "Wi-Fi password", placeholder: "Leave empty if open" }]
    : kind.base === "vcard"
      ? [{ key: "name", label: "Full name", placeholder: "Asha Verma" }, { key: "phone", label: "Phone", placeholder: "+91 98765 43210" }, { key: "email", label: "Email", placeholder: "asha@example.com" }]
      : kind.base === "text"
        ? [{ key: "text", label: "Your text", placeholder: "Type a short message" }]
        : kind.fields || [{ key: "url", label: kind.urlLabel || "Website address", placeholder: kind.placeholder || "yourshop.com/menu" }];
function payloadOf(kind: (typeof kinds)[number], v: Record<string, string>) {
  const get = (key: string) => (v[key] || "").trim();
  if (kind.base === "wifi") return get("ssid") ? buildWifiPayload({ ssid: get("ssid"), password: get("password"), security: get("password") ? "WPA" : "nopass", hidden: false }) : "";
  if (kind.base === "vcard") return get("name") ? buildVCardPayload({ name: get("name"), organization: "", phone: get("phone"), email: get("email"), url: "" }) : "";
  if (kind.base === "text") return get("text");
  if (kind.build) return kind.build(v);
  return get("url") ? (/^https?:\/\//i.test(get("url")) ? get("url") : `https://${get("url")}`) : "";
}

/** A real generator on the home page: what you type is the code you see, and one code can be downloaded free. */
export function LiveDemo() {
  const [kind, setKind] = useState(kinds[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [path, setPath] = useState({ d: "", size: 29 });
  const [state, setState] = useState<{ kind: "idle" | "busy" | "done" | "used" | "error"; text?: string }>({ kind: "idle" });
  const payload = payloadOf(kind, values);
  useEffect(() => {
    let active = true;
    import("qrcode").then(({ default: QRCode }) => {
      if (!active) return;
      try {
        const { modules } = QRCode.create(payload || SAMPLE, { errorCorrectionLevel: "M" });
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
  }, [payload]);

  async function download() {
    if (!payload) return setState({ kind: "error", text: "Fill in the details first." });
    setState({ kind: "busy" });
    try {
      // The server records the visitor's one free code; only then is the image saved.
      const response = await fetch("/api/free-qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: kind.id, content: payload }) });
      if (!response.ok) {
        const text = ((await response.json().catch(() => null)) as { error?: string } | null)?.error || "Something went wrong. Please try again.";
        return setState({ kind: response.status === 409 ? "used" : "error", text });
      }
      const { default: QRCode } = await import("qrcode");
      const link = document.createElement("a");
      link.href = await QRCode.toDataURL(payload, { width: 1024, margin: 4, errorCorrectionLevel: "M" });
      link.download = `${kind.id}-qr-code.png`;
      link.click();
      setState({ kind: "done" });
    } catch {
      setState({ kind: "error", text: "Something went wrong. Please try again." });
    }
  }

  return (
    <div className="demo" id="free-qr" style={{ "--tone": kind.tone } as React.CSSProperties}>
      <span className="demo-float a">
        <i /> 1 QR code free, no sign-up
      </span>
      <label>
        QR type
        <select
          value={kind.id}
          onChange={(event) => {
            setKind(kinds.find((item) => item.id === event.target.value) || kinds[0]);
            setValues({});
            setState({ kind: "idle" });
          }}
        >
          {kinds.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {fieldsOf(kind).map((field) => (
        <label key={`${kind.id}-${field.key}`}>
          {field.label}
          <input value={values[field.key] || ""} placeholder={field.placeholder} maxLength={300} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} spellCheck={false} autoComplete="off" />
        </label>
      ))}
      <div className="demo-stage">
        <div className="demo-qr">
          {path.d ? (
            <svg viewBox={`-2 -2 ${path.size + 4} ${path.size + 4}`} role="img" aria-label={`${kind.name} preview`} shapeRendering="crispEdges">
              <path d={path.d} fill="#15161a" />
            </svg>
          ) : (
            <QrCode size={64} color="#c9ccd3" />
          )}
        </div>
        <div className="demo-side">
          <strong>{state.kind === "done" ? "Downloaded." : "Make 1 QR code free."}</strong>
          <p role="status">
            {state.kind === "done"
              ? "This free code cannot be edited later. Create a free account to change links after printing and see scans."
              : state.text || "No account needed. Pick a type, fill it in and download the PNG."}
          </p>
          {state.kind === "done" || state.kind === "used" ? (
            <Link href="/register" className="button primary small" style={{ justifySelf: "start" }}>
              Create free account <ArrowRight size={14} />
            </Link>
          ) : (
            <button type="button" className="button primary small" style={{ justifySelf: "start" }} disabled={state.kind === "busy"} onClick={download}>
              <Download size={14} /> {state.kind === "busy" ? "Preparing…" : "Download free QR"}
            </button>
          )}
        </div>
      </div>
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
          <code className="swap-destination">{destinations[index]}</code>
        </span>
        <small>edit any time</small>
      </div>
    </div>
  );
}
