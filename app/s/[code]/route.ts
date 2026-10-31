import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { destination } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const message = (text: string, status: number) =>
    new NextResponse(text, {
      status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(code))
    return message("QR code not found.", 404);
  try {
    const qr = await prisma.qRCode.findUnique({
      where: { shortCode: code },
      include: { workspace: { select: { suspended: true } } },
    });
    if (!qr) return message("QR code not found.", 404);
    const rules = (qr.routingRules || {}) as {
      ios?: string;
      android?: string;
      expiresAt?: string;
    };
    if (
      !qr.isActive ||
      qr.workspace.suspended ||
      (rules.expiresAt && Date.parse(rules.expiresAt) <= Date.now())
    )
      return message(
        "This QR code is currently unavailable. Contact its owner.",
        410,
      );
    const ua = (request.headers.get("user-agent") || "").slice(0, 512);
    const os = /iPhone|iPad|iPod/i.test(ua)
      ? "iOS"
      : /Android/i.test(ua)
        ? "Android"
        : "Desktop";
    const target = destination.safeParse(
      (os === "iOS" && rules.ios) ||
        (os === "Android" && rules.android) ||
        qr.targetUrl,
    );
    if (!target.success)
      return message(
        "This QR destination needs to be updated by its owner.",
        410,
      );
    const parsed = new URL(target.data);
    if (
      parsed.origin === new URL(process.env.APP_URL!).origin &&
      parsed.pathname.startsWith("/s/")
    )
      return message("Invalid QR destination.", 410);
    // Persist both events together before returning; serverless fire-and-forget loses events.
    if (
      !/bot|crawler|spider|preview|headless/i.test(ua) &&
      !request.headers.has("purpose") &&
      !request.headers.has("next-router-prefetch")
    ) {
      await prisma.$transaction([
        prisma.scanLog.create({
          data: {
            qrCodeId: qr.id,
            os,
            device: /Mobile|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop",
            browser: /Edg/i.test(ua)
              ? "Edge"
              : /Firefox/i.test(ua)
                ? "Firefox"
                : /Chrome/i.test(ua)
                  ? "Chrome"
                  : /Safari/i.test(ua)
                    ? "Safari"
                    : "Other",
            country: "Unknown",
            city: "Unknown",
          },
        }),
        prisma.qRCode.update({
          where: { id: qr.id },
          data: { scanCount: { increment: 1 } },
        }),
      ]);
      const webhooks = await prisma.webhook.findMany({
        where: { workspaceId: qr.workspaceId, isActive: true },
        select: { url: true, secret: true, events: true },
      });
      const event = {
        id: randomUUID(),
        type: "scan.created",
        createdAt: new Date().toISOString(),
        data: {
          qrCodeId: qr.id,
          shortCode: qr.shortCode,
          os,
          targetUrl: target.data,
        },
      };
      await Promise.allSettled(
        webhooks
          .filter((hook) => Array.isArray(hook.events) && (hook.events as unknown[]).map(String).includes("scan.created"))
          .map(async (hook) => {
            const endpoint = destination.safeParse(hook.url);
            if (!endpoint.success) return;
            const payload = JSON.stringify(event);
            const signature = createHmac("sha256", hook.secret).update(payload).digest("hex");
            await fetch(endpoint.data, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "QR-Manager-Webhook/1.0",
                "X-QR-Manager-Event": event.type,
                "X-QR-Manager-Signature": `sha256=${signature}`,
              },
              body: payload,
              signal: AbortSignal.timeout(1500),
            });
          }),
      );
    }
    const response = NextResponse.redirect(target.data, 302);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  } catch {
    return message("QR service is temporarily unavailable.", 503);
  }
}
export async function HEAD() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}
