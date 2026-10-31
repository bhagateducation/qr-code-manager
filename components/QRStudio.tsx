"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Download, Copy, CheckCircle2, QrCode } from "lucide-react";
import { QR, saveFile } from "./Dashboard";
type Styling = {
  dark: string;
  light: string;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
};
export default function QRStudio({
  qr,
  appUrl,
  canWrite,
  onSave,
  onClose,
}: {
  qr: QR | null;
  appUrl: string;
  canWrite: boolean;
  onSave: (value: unknown, id?: string) => Promise<any>;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(qr),
    [title, setTitle] = useState(qr?.title || ""),
    [target, setTarget] = useState(qr?.targetUrl || ""),
    [ios, setIos] = useState(qr?.routingRules?.ios || ""),
    [android, setAndroid] = useState(qr?.routingRules?.android || ""),
    [expiry, setExpiry] = useState(
      qr?.routingRules?.expiresAt?.slice(0, 16) || "",
    ),
    [style, setStyle] = useState<Styling>(
      (qr?.styling as Styling) || {
        dark: "#17161D",
        light: "#FFFFFF",
        errorCorrectionLevel: "M",
      },
    ),
    [image, setImage] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [verified, setVerified] = useState(false);
  const payload = saved ? `${appUrl}/s/${saved.shortCode}` : "";
  useEffect(() => {
    let active = true;
    setVerified(false);
    setImage("");
    if (!payload) return;
    QRCode.toDataURL(payload, {
      width: 768,
      margin: 4,
      ...style,
      color: { dark: style.dark, light: style.light },
    })
      .then(async (source) => {
        const { default: jsQR } = await import("jsqr");
        const bitmap = new Image();
        bitmap.src = source;
        await bitmap.decode();
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx)
          throw new Error("QR preview is not supported in this browser.");
        ctx.drawImage(bitmap, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(pixels.data, pixels.width, pixels.height);
        if (!decoded || decoded.data !== payload)
          throw new Error(
            "This QR could not be decoded. Choose another style.",
          );
        if (active) {
          setImage(source);
          setVerified(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [payload, style]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = {
        title,
        targetUrl: target,
        isActive: saved?.isActive ?? true,
        styling: style,
        recordId: saved?.recordId || null,
        routingRules: {
          ...(ios ? { ios } : {}),
          ...(android ? { android } : {}),
          ...(expiry
            ? { expiresAt: new Date(`${expiry}:00Z`).toISOString() }
            : {}),
        },
      };
      const result = await onSave(data, saved?.id);
      setSaved(result.entity);
      setMessage("Saved. Your QR link is ready to use.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download(format: "png" | "svg") {
    if (!verified) return;
    const filename = (title || "qr-code")
      .replace(/[^a-z0-9_-]/gi, "-")
      .slice(0, 80);
    try {
      if (format === "svg")
        saveFile(
          `${filename}.svg`,
          await QRCode.toString(payload, {
            type: "svg",
            margin: 4,
            errorCorrectionLevel: style.errorCorrectionLevel,
            color: { dark: style.dark, light: style.light },
          }),
          "image/svg+xml",
        );
      else {
        const a = document.createElement("a");
        a.href = image;
        a.download = `${filename}.png`;
        a.click();
      }
    } catch {
      setError("Download could not be generated.");
    }
  }
  return (
    <>
      <button className="back-link" onClick={onClose}>
        <ArrowLeft size={16} />
        Back to QR codes
      </button>
      <div className="studio-grid">
        <form className="panel stack" onSubmit={submit}>
          <div>
            <span className="badge">QR studio</span>
            <h2>{saved ? "Edit your QR code" : "Create a dynamic QR code"}</h2>
            <p className="muted">
              Save your destination first. Downloads keep the same permanent QR
              link.
            </p>
          </div>
          <label>
            Name
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer menu"
              required
              maxLength={100}
            />
          </label>
          <label>
            Destination URL
            <input
              type="url"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="https://your-website.com/menu"
              required
              maxLength={2048}
            />
          </label>
          <div className="form-grid">
            <label>
              QR colour
              <select
                value={style.dark}
                onChange={(e) => setStyle({ ...style, dark: e.target.value })}
              >
                <option value="#17161D">Ink</option>
                <option value="#5B43D6">Purple</option>
                <option value="#124D35">Forest</option>
                <option value="#173D70">Blue</option>
              </select>
            </label>
            <label>
              Error correction
              <select
                value={style.errorCorrectionLevel}
                onChange={(e) =>
                  setStyle({
                    ...style,
                    errorCorrectionLevel: e.target
                      .value as Styling["errorCorrectionLevel"],
                  })
                }
              >
                {["L", "M", "Q", "H"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <details>
            <summary>Device routing & expiry</summary>
            <div className="stack details-content">
              <label>
                iOS destination (optional)
                <input
                  type="url"
                  value={ios}
                  onChange={(e) => setIos(e.target.value)}
                  placeholder="https://apps.apple.com/…"
                />
              </label>
              <label>
                Android destination (optional)
                <input
                  type="url"
                  value={android}
                  onChange={(e) => setAndroid(e.target.value)}
                  placeholder="https://play.google.com/…"
                />
              </label>
              <label>
                Expires at (UTC, optional)
                <input
                  type="datetime-local"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </label>
              <small>
                Other devices use the main destination. An expired or paused
                code does not redirect.
              </small>
            </div>
          </details>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <button disabled={busy || !canWrite} className="button primary">
            {busy ? "Saving…" : saved ? "Save changes" : "Save & generate QR"}
          </button>
        </form>
        <div className="panel qr-preview">
          <span className="badge">Print preview</span>
          <div className="preview-frame">
            {image ? (
              <img
                src={image}
                width={280}
                height={280}
                alt={`QR code for ${title}`}
              />
            ) : (
              <div className="preview-empty">
                <QrCode size={90} />
                <p>Save your code to generate a working preview.</p>
              </div>
            )}
          </div>
          <h3>{title || "Your next connection"}</h3>
          {verified && (
            <p className="verified">
              <CheckCircle2 size={16} />
              PNG decoded and payload verified
            </p>
          )}
          {payload && (
            <>
              <code className="qr-link">{payload}</code>
              <button
                className="button"
                type="button"
                onClick={() =>
                  navigator.clipboard
                    .writeText(payload)
                    .then(() => setMessage("QR link copied."))
                    .catch(() =>
                      setError(
                        "Copy is unavailable. Select the link above to copy it.",
                      ),
                    )
                }
              >
                <Copy size={15} />
                Copy QR link
              </button>
            </>
          )}
          <div className="download-actions">
            <button
              className="button primary"
              disabled={!verified}
              onClick={() => download("png")}
            >
              <Download size={16} />
              PNG
            </button>
            <button
              className="button"
              disabled={!verified}
              onClick={() => download("svg")}
            >
              <Download size={16} />
              Vector SVG
            </button>
          </div>
          <p className="muted text-sm">
            Keep the white margin when printing. Test a physical print with your
            phone before a large batch.
          </p>
        </div>
      </div>
    </>
  );
}
