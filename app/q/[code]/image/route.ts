import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { sharedCode, qrNumber } from "@/lib/qr-share";

export const dynamic = "force-dynamic";

/** The QR image of a shared code as PNG (up to 4096 px) or vector SVG. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const found = await sharedCode((await params).code);
  if (!found) return new NextResponse("QR code not found.", { status: 404 });
  const query = request.nextUrl.searchParams;
  const svg = query.get("format") === "svg";
  const size = Math.min(4096, Math.max(256, Number(query.get("size")) || 1024));
  const name = `${qrNumber(found.qr.number)}-${found.qr.title.replace(/[^a-z0-9_-]/gi, "-").slice(0, 60)}.${svg ? "svg" : "png"}`;
  const options = { margin: 4, errorCorrectionLevel: "M" as const, color: { dark: "#000000", light: "#ffffff" } };
  const body = svg ? await QRCode.toString(found.payload, { ...options, type: "svg" }) : new Uint8Array(await QRCode.toBuffer(found.payload, { ...options, width: size }));
  return new NextResponse(body, {
    headers: {
      "Content-Type": svg ? "image/svg+xml" : "image/png",
      "Cache-Control": "public, max-age=300",
      ...(query.get("download") ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}
