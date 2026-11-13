import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { BRAND } from "@/lib/brand";
import { qrNumber, sharedCode } from "@/lib/qr-share";

export const dynamic = "force-dynamic";
export const metadata = { title: "QR code", robots: { index: false, follow: false } };

/** The share page: shows the QR image itself (not its destination), with download buttons. */
export default async function SharedQr({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ state?: string }> }) {
  const { code } = await params;
  const { state } = await searchParams;
  const found = await sharedCode(code);
  if (!found) notFound();
  const { qr, payload } = found;
  const svg = await QRCode.toString(payload, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  const waiting = qr.type === "dynamic_url" && qr.targetUrl.endsWith(`/q/${qr.shortCode}`);
  const note = state === "paused" ? "This QR code is paused by its owner for now. Please check again later." : waiting || state === "waiting" ? "The content for this code is being prepared. Please check again soon." : "";
  return (
    <main className="auth-shell">
      <div className="auth-card panel share-card">
        <div className="share-qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <h1>{qr.title}</h1>
        <p className="muted num">
          {qrNumber(qr.number)}
          {qr.folder ? ` · ${qr.folder.name}` : ""}
        </p>
        {note && <p className="notice info">{note}</p>}
        <div className="row-actions" style={{ justifyContent: "center" }}>
          <a className="button primary" href={`/q/${qr.shortCode}/image?format=png&size=2048&download=1`}>
            Download PNG
          </a>
          <a className="button" href={`/q/${qr.shortCode}/image?format=svg&download=1`}>
            Download SVG
          </a>
        </div>
        <small className="muted">Powered by {BRAND}</small>
      </div>
    </main>
  );
}
