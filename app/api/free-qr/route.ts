import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { digest } from "@/lib/auth";
import { ApiError, body, failure, rateLimit } from "@/lib/http";
import { QR_TYPES } from "@/lib/qr-types";

const COOKIE = "qr_free";
const USED = "You have used your free QR code. Create a free account to make more.";
const input = z.object({ type: z.string().max(40), content: z.string().trim().min(1).max(2000) });

/** Records the one free QR code a visitor may make without an account. The image itself is drawn in the browser. */
export async function POST(request: NextRequest) {
  try {
    const data = input.parse(await body(request));
    const tool = QR_TYPES.find((item) => item.id === data.type && item.base !== "books" && item.base !== "csv");
    if (!tool) throw new ApiError(400, "Choose a QR type.");
    const isLink = tool.base === "dynamic_url";
    if (isLink && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(data.content)) throw new ApiError(400, "Enter a full link, such as https://example.com.");

    const visitor = request.cookies.get(COOKIE)?.value;
    if (visitor && (await prisma.freeQrCredit.findUnique({ where: { visitorId: visitor } }))) throw new ApiError(409, USED);
    // The cookie can be cleared, so the network address is limited too (a few per day, as offices and phones share one).
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await rateLimit(`free-qr:${ip}`, 3, 86400).catch(() => {
      throw new ApiError(409, USED);
    });

    const visitorId = randomUUID();
    // Only links are kept. Wi-Fi passwords, contacts and private text never reach the database.
    await prisma.freeQrCredit.create({ data: { visitorId, type: tool.id, content: isLink ? data.content : null, ipHash: digest(ip) } });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE, visitorId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 31536000 });
    return response;
  } catch (error) {
    return failure(error);
  }
}
