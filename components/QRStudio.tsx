"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Contact, Download, FolderPlus, Link2, QrCode, Trash2, Type, Wifi } from "lucide-react";
import { buildVCardPayload, buildWifiPayload, QRType } from "@/lib/qr-payload";
import { CopyButton, Ctx, QR, folderPath, qrNumber, saveFile } from "./ui";

type Styling = { dark: string; light: string; errorCorrectionLevel: "L" | "M" | "Q" | "H" };
const types: { id: QRType; label: string; icon: typeof Link2 }[] = [
  { id: "dynamic_url", label: "Website link", icon: Link2 },
  { id: "vcard", label: "Contact card", icon: Contact },
  { id: "wifi", label: "Wi-Fi", icon: Wifi },
  { id: "text", label: "Plain text", icon: Type },
];
// The server only accepts these four inks; each keeps enough contrast to scan reliably.
const inks = [
  { value: "#17161D", label: "Ink" },
  { value: "#5B43D6", label: "Purple" },
  { value: "#124D35", label: "Forest" },
  { value: "#173D70", label: "Blue" },
];
// datetime-local works in the viewer's own time zone; the server stores UTC.
const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function QRStudio({ ctx, qr, defaultFolder = "", onClose }: { ctx: Ctx; qr: QR | null; defaultFolder?: string; onClose: () => void }) {
  const { data, canWrite, mutate, notify, ask } = ctx;
  const [saved, setSaved] = useState(qr),
    [title, setTitle] = useState(qr?.title || ""),
    [qrType, setQrType] = useState<QRType>(qr?.type || "dynamic_url"),
    [target, setTarget] = useState(qr?.targetUrl || ""),
    [wifi, setWifi] = useState({ ssid: "", password: "", security: "WPA" as "WPA" | "WEP" | "nopass", hidden: false }),
    [card, setCard] = useState({ name: "", organization: "", phone: "", email: "", url: "" }),
    [ios, setIos] = useState(qr?.routingRules?.ios || ""),
    [android, setAndroid] = useState(qr?.routingRules?.android || ""),
    [campaignId, setCampaignId] = useState(qr?.campaignId || ""),
    [folderId, setFolderId] = useState(qr ? qr.folderId || "" : defaultFolder),
    [naming, setNaming] = useState<string | null>(null),
    [tagIds, setTagIds] = useState<string[]>(qr?.tags?.map((item) => item.tag.id) || []),
    [expiry, setExpiry] = useState(toLocalInput(qr?.routingRules?.expiresAt)),
    [style, setStyle] = useState<Styling>((qr?.styling as Styling) || { dark: "#17161D", light: "#FFFFFF", errorCorrectionLevel: "M" }),
    [image, setImage] = useState(""),
    [previewError, setPreviewError] = useState(""),
    [busy, setBusy] = useState(false);

  const keepsSavedPayload = saved?.type === qrType && qrType !== "dynamic_url" && qrType !== "text";
  const staticPayload =
    qrType === "wifi" ? (wifi.ssid.trim() ? buildWifiPayload(wifi) : "") : qrType === "vcard" ? (card.name.trim() ? buildVCardPayload(card) : "") : qrType === "text" ? target : "";
  const payload = qrType === "dynamic_url" ? (saved?.type === "dynamic_url" || (saved && !saved.type) ? `${data.appUrl}/s/${saved.shortCode}` : "") : staticPayload || (keepsSavedPayload ? saved!.targetUrl : "");

  useEffect(() => {
    let active = true;
    setImage("");
    setPreviewError("");
    if (!payload) return;
    QRCode.toDataURL(payload, { width: 1024, margin: 4, errorCorrectionLevel: style.errorCorrectionLevel, color: { dark: style.dark, light: style.light } })
      .then(async (source) => {
        // Decode the exact PNG we are about to offer, so a download is never unscannable.
        const { default: jsQR } = await import("jsqr");
        const bitmap = new Image();
        bitmap.src = source;
        await bitmap.decode();
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("QR preview is not supported in this browser.");
        context.drawImage(bitmap, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        if (jsQR(pixels.data, pixels.width, pixels.height)?.data !== payload) throw new Error("This QR could not be verified. Try a higher error correction level.");
        if (active) setImage(source);
      })
      .catch((e) => active && setPreviewError(e.message?.includes("too big") ? "This content is too long for a QR code. Shorten it." : e.message));
    return () => {
      active = false;
    };
  }, [payload, style]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await mutate(
        saved ? "qr.update" : "qr.create",
        {
          title,
          type: qrType,
          targetUrl: qrType === "dynamic_url" || qrType === "text" ? target : staticPayload || saved?.targetUrl || "",
          isActive: saved?.isActive ?? true,
          styling: style,
          recordId: saved?.recordId || null,
          campaignId: campaignId || null,
          folderId: folderId || null,
          tagIds,
          routingRules: qrType === "dynamic_url" ? { ...(ios ? { ios } : {}), ...(android ? { android } : {}), ...(expiry ? { expiresAt: new Date(expiry).toISOString() } : {}) } : {},
        },
        saved?.id,
      );
      setSaved(result.entity);
    } catch {
      // mutate already showed the reason
    } finally {
      setBusy(false);
    }
  }
  async function download(format: "png" | "svg") {
    const filename = (title || "qr-code").replace(/[^a-z0-9_-]/gi, "-").slice(0, 80);
    if (format === "png") {
      const link = document.createElement("a");
      link.href = image;
      link.download = `${filename}.png`;
      link.click();
      return;
    }
    try {
      saveFile(`${filename}.svg`, await QRCode.toString(payload, { type: "svg", margin: 4, errorCorrectionLevel: style.errorCorrectionLevel, color: { dark: style.dark, light: style.light } }), "image/svg+xml");
    } catch {
      notify("The SVG could not be generated.", "error");
    }
  }
  // Make a category without leaving the form; it is created inside the folder currently chosen.
  async function addFolder() {
    if (!naming?.trim()) return;
    try {
      const result = await mutate("folder.create", { name: naming.trim(), parentId: folderId || null });
      setFolderId(result.entity.id);
      setNaming(null);
    } catch {}
  }
  async function remove() {
    if (saved && (await ask({ title: `Move “${saved.title}” to the trash?`, body: "It stops working when scanned. You can restore it from the trash for 30 days.", action: "Move to trash" })))
      await mutate("qr.delete", undefined, saved.id).then(onClose, () => {});
  }

  return (
    <>
      <button className="back-link" onClick={onClose}>
        <ArrowLeft size={16} /> All QR codes
      </button>
      <div className="studio-grid">
        <form className="panel stack" onSubmit={submit}>
          <div className="panel-heading" style={{ marginBottom: 0 }}>
            <div>
              <h1>{saved ? `Edit ${qrNumber(saved.number)}` : "New QR code"}</h1>
              <p className="muted">{qrType === "dynamic_url" ? "The printed code never changes. You can update where it leads at any time." : "This content is stored inside the code itself, so reprint it after changes."}</p>
            </div>
            {saved && canWrite && (
              <button type="button" className="icon-button danger" aria-label="Move this code to the trash" title="Move to trash" onClick={remove}>
                <Trash2 size={17} />
              </button>
            )}
          </div>
          <fieldset disabled={!canWrite} className="stack" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="type-grid" role="group" aria-label="QR type">
              {types.map((item) => (
                <button type="button" key={item.id} className="type-option" aria-pressed={qrType === item.id} onClick={() => setQrType(item.id)}>
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
            </div>
            <label>
              Name
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer menu" required maxLength={100} />
            </label>
            {qrType === "dynamic_url" && (
              <label>
                Destination URL
                <input type="url" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="https://your-website.com/menu" required maxLength={2048} />
              </label>
            )}
            {qrType === "wifi" && (
              <>
                <div className="form-grid">
                  <label>
                    Network name (SSID)
                    <input value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} required={!keepsSavedPayload} maxLength={100} />
                  </label>
                  <label>
                    Security
                    <select value={wifi.security} onChange={(e) => setWifi({ ...wifi, security: e.target.value as typeof wifi.security })}>
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">No password</option>
                    </select>
                  </label>
                </div>
                {wifi.security !== "nopass" && (
                  <label>
                    Wi-Fi password
                    <input value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} maxLength={100} autoComplete="off" />
                  </label>
                )}
                <label className="checkbox-row">
                  <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} /> Hidden network
                </label>
              </>
            )}
            {qrType === "vcard" && (
              <>
                <div className="form-grid">
                  <label>
                    Full name
                    <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} required={!keepsSavedPayload} maxLength={120} />
                  </label>
                  <label>
                    Organisation
                    <input value={card.organization} onChange={(e) => setCard({ ...card, organization: e.target.value })} maxLength={120} />
                  </label>
                  <label>
                    Phone
                    <input type="tel" value={card.phone} onChange={(e) => setCard({ ...card, phone: e.target.value })} maxLength={40} />
                  </label>
                  <label>
                    Email
                    <input type="email" value={card.email} onChange={(e) => setCard({ ...card, email: e.target.value })} maxLength={190} />
                  </label>
                </div>
                <label>
                  Website
                  <input type="url" value={card.url} onChange={(e) => setCard({ ...card, url: e.target.value })} maxLength={2048} placeholder="https://" />
                </label>
              </>
            )}
            {keepsSavedPayload && !staticPayload && <p className="notice info">The saved details stay as they are. Fill the fields above only if you want to replace them.</p>}
            {qrType === "text" && (
              <label>
                Text
                <textarea value={target} onChange={(e) => setTarget(e.target.value)} required maxLength={2000} rows={5} placeholder="Text shown when the code is scanned" />
              </label>
            )}
            <div className="form-grid">
              <div>
                <span className="field-label">Colour</span>
                <div className="color-row" role="group" aria-label="QR colour">
                  {inks.map((ink) => (
                    <button type="button" key={ink.value} className="color-dot" style={{ background: ink.value }} title={ink.label} aria-label={ink.label} aria-pressed={style.dark === ink.value} onClick={() => setStyle({ ...style, dark: ink.value })} />
                  ))}
                </div>
              </div>
              <label>
                Error correction
                <select value={style.errorCorrectionLevel} onChange={(e) => setStyle({ ...style, errorCorrectionLevel: e.target.value as Styling["errorCorrectionLevel"] })}>
                  <option value="L">Low — smallest code</option>
                  <option value="M">Medium — recommended</option>
                  <option value="Q">High — outdoor print</option>
                  <option value="H">Highest — may get damaged</option>
                </select>
              </label>
            </div>
            <div>
              <span className="field-label">Folder</span>
              <div className="row-actions" style={{ marginTop: 6, flexWrap: "nowrap" }}>
                <select aria-label="Folder" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                  <option value="">No folder</option>
                  {data.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folderPath(data.folders, folder.id)}
                    </option>
                  ))}
                </select>
                <button type="button" className="button" onClick={() => setNaming(naming === null ? "" : null)}>
                  <FolderPlus size={15} /> New
                </button>
              </div>
              {naming !== null && (
                <div className="row-actions" style={{ marginTop: 8, flexWrap: "nowrap" }}>
                  <input autoFocus aria-label="New folder name" value={naming} maxLength={100} placeholder={folderId ? `New folder inside ${data.folders.find((folder) => folder.id === folderId)?.name}` : "New folder name"} onChange={(e) => setNaming(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFolder())} />
                  <button type="button" className="button primary" onClick={addFolder}>
                    Add
                  </button>
                </div>
              )}
            </div>
            <label>
              Campaign
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">No campaign</option>
                {data.campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            {data.tags.length > 0 && (
              <div>
                <span className="field-label">Tags</span>
                <div className="chips" style={{ marginTop: 6 }}>
                  {data.tags.map((tag) => (
                    <button type="button" key={tag.id} className="chip" aria-pressed={tagIds.includes(tag.id)} onClick={() => setTagIds(tagIds.includes(tag.id) ? tagIds.filter((id) => id !== tag.id) : [...tagIds, tag.id])}>
                      <span className="tag-dot" style={{ background: tag.color }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {qrType === "dynamic_url" && (
              <details open={!!(ios || android || expiry)}>
                <summary>Device routing and expiry</summary>
                <div className="stack details-content">
                  <div className="form-grid">
                    <label>
                      iPhone and iPad go to
                      <input type="url" value={ios} onChange={(e) => setIos(e.target.value)} placeholder="https://apps.apple.com/…" maxLength={2048} />
                    </label>
                    <label>
                      Android goes to
                      <input type="url" value={android} onChange={(e) => setAndroid(e.target.value)} placeholder="https://play.google.com/…" maxLength={2048} />
                    </label>
                  </div>
                  <label>
                    Stop working after (your local time)
                    <input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                  </label>
                  <small>Leave these empty to send everyone to the main destination with no end date.</small>
                </div>
              </details>
            )}
          </fieldset>
          {canWrite ? (
            <button disabled={busy} className="button primary">
              {busy ? "Saving…" : saved ? "Save changes" : "Save and generate QR"}
            </button>
          ) : (
            <p className="notice info">Your role can view and download codes but not change them.</p>
          )}
        </form>

        <div className={`panel qr-preview ${image ? "ready" : ""}`}>
          <div className="preview-frame">
            {image ? (
              <motion.img key={image} src={image} width={256} height={256} alt={`QR code for ${title}`} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} />
            ) : (
              <div className="preview-empty">
                <QrCode size={64} />
                <p>{previewError || (qrType === "dynamic_url" ? "Save to generate your permanent QR code." : "Fill in the details to preview your code.")}</p>
              </div>
            )}
          </div>
          <h3>{title || "Untitled code"}</h3>
          {image && (
            <span className="verified">
              <CheckCircle2 size={15} /> Scan-tested and ready to print
            </span>
          )}
          {payload && qrType === "dynamic_url" && (
            <>
              <code className="qr-link">{payload}</code>
              <CopyButton value={payload} label="Copy link" notify={notify} />
            </>
          )}
          <div className="download-actions">
            <button className="button primary" disabled={!image} onClick={() => download("png")}>
              <Download size={16} /> PNG
            </button>
            <button className="button" disabled={!image} onClick={() => download("svg")}>
              <Download size={16} /> SVG
            </button>
          </div>
          <small>Keep the white margin when printing, and test one print before a large batch.</small>
        </div>
      </div>
    </>
  );
}
