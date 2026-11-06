"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Download, Copy, CheckCircle2, QrCode } from "lucide-react";
import { QR, saveFile } from "./Dashboard";
import { buildVCardPayload, buildWifiPayload, QRType } from "@/lib/qr-payload";
type Styling = {
  dark: string;
  light: string;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
};
export default function QRStudio({
  qr,
  appUrl,
  canWrite,
  tags,
  campaigns,
  onSave,
  onClose,
}: {
  qr: QR | null;
  appUrl: string;
  canWrite: boolean;
  tags: { id: string; name: string; color: string }[];
  campaigns: { id: string; name: string; status: string }[];
  onSave: (value: unknown, id?: string) => Promise<any>;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(qr),
    [title, setTitle] = useState(qr?.title || ""),
    [qrType, setQrType] = useState<QRType>(qr?.type || "dynamic_url"),
    [target, setTarget] = useState(qr?.targetUrl || ""),
    [ssid, setSsid] = useState(""),
    [wifiPassword, setWifiPassword] = useState(""),
    [wifiSecurity, setWifiSecurity] = useState<"WPA" | "WEP" | "nopass">("WPA"),
    [wifiHidden, setWifiHidden] = useState(false),
    [vcardName, setVcardName] = useState(""),
    [vcardOrganization, setVcardOrganization] = useState(""),
    [vcardPhone, setVcardPhone] = useState(""),
    [vcardEmail, setVcardEmail] = useState(""),
    [vcardUrl, setVcardUrl] = useState(""),
    [ios, setIos] = useState(qr?.routingRules?.ios || ""),
    [android, setAndroid] = useState(qr?.routingRules?.android || ""),
    [campaignId, setCampaignId] = useState(qr?.campaignId || ""),
    [tagIds, setTagIds] = useState<string[]>(qr?.tagIds || qr?.tags?.map((item) => item.tag.id) || []),
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
  const staticPayload = qrType === "wifi"
    ? (ssid.trim() ? buildWifiPayload({ ssid, password: wifiPassword, security: wifiSecurity, hidden: wifiHidden }) : "")
    : qrType === "vcard"
      ? (vcardName.trim() ? buildVCardPayload({ name: vcardName, organization: vcardOrganization, phone: vcardPhone, email: vcardEmail, url: vcardUrl }) : "")
      : qrType === "text" ? target : "";
  const payload = qrType === "dynamic_url"
    ? (saved ? `${appUrl}/s/${saved.shortCode}` : "")
    : (staticPayload || (saved?.type === qrType ? saved.targetUrl : ""));
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
        type: qrType,
        targetUrl: qrType === "dynamic_url" ? target : (staticPayload || target),
        isActive: saved?.isActive ?? true,
        styling: style,
        recordId: saved?.recordId || null,
        campaignId: campaignId || null,
        tagIds,
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
            QR type
            <select value={qrType} onChange={(e) => setQrType(e.target.value as QRType)}>
              <option value="dynamic_url">Dynamic URL</option>
              <option value="vcard">vCard / Contact</option>
              <option value="wifi">Wi-Fi access</option>
              <option value="text">Plain text</option>
            </select>
          </label>
          {qrType === "dynamic_url" && (
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
          )}
          {qrType === "wifi" && (
            <div className="stack">
              <div className="form-grid">
                <label>Network name (SSID)<input value={ssid} onChange={(e) => setSsid(e.target.value)} required={!target} maxLength={100} /></label>
                <label>Security<select value={wifiSecurity} onChange={(e) => setWifiSecurity(e.target.value as typeof wifiSecurity)}><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">No password</option></select></label>
              </div>
              {wifiSecurity !== "nopass" && <label>Password<input type="password" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} maxLength={100} /></label>}
              <label className="checkbox-row"><input type="checkbox" checked={wifiHidden} onChange={(e) => setWifiHidden(e.target.checked)} /> Hidden network</label>
              {!ssid && target && <small className="muted">Existing payload preserved. Enter a network name to replace it.</small>}
            </div>
          )}
          {qrType === "vcard" && (
            <div className="stack">
              <div className="form-grid">
                <label>Full name<input value={vcardName} onChange={(e) => setVcardName(e.target.value)} required={!target} maxLength={120} /></label>
                <label>Organisation<input value={vcardOrganization} onChange={(e) => setVcardOrganization(e.target.value)} maxLength={120} /></label>
              </div>
              <div className="form-grid">
                <label>Phone<input type="tel" value={vcardPhone} onChange={(e) => setVcardPhone(e.target.value)} maxLength={40} /></label>
                <label>Email<input type="email" value={vcardEmail} onChange={(e) => setVcardEmail(e.target.value)} maxLength={190} /></label>
              </div>
              <label>Website<input type="url" value={vcardUrl} onChange={(e) => setVcardUrl(e.target.value)} maxLength={2048} /></label>
              {!vcardName && target && <small className="muted">Existing vCard payload preserved. Enter a name to replace it.</small>}
            </div>
          )}
          {qrType === "text" && (
            <label>
              Text payload
              <textarea value={target} onChange={(e) => setTarget(e.target.value)} required maxLength={4096} rows={5} placeholder="Enter text to encode" />
            </label>
          )}
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
          <div className="form-grid">
            <label>
              Campaign (optional)
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">No campaign</option>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>)}
              </select>
            </label>
            <label>
              Tags (Ctrl/Cmd-click for multiple)
              <select multiple value={tagIds} onChange={(e) => setTagIds(Array.from(e.target.selectedOptions, (option) => option.value))}>
                {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
            </label>
          </div>
          {qrType === "dynamic_url" && <details>
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
          </details>}
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
