import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { body, failure, json, ApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const input = z.object({ token: z.string().min(20).max(160) }).parse(await body(request));
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const user = await prisma.user.findFirst({
      where: { emailVerificationTokenHash: tokenHash, emailVerificationExpiresAt: { gt: new Date() } },
    });
    if (!user) throw new ApiError(400, "This verification link is invalid or expired.");
    const updated = await prisma.user.updateMany({
      where: { id: user.id, emailVerificationTokenHash: tokenHash, emailVerificationExpiresAt: { gt: new Date() } },
      data: { emailVerifiedAt: new Date(), emailVerificationTokenHash: null, emailVerificationExpiresAt: null },
    });
    if (updated.count !== 1) throw new ApiError(400, "This verification link is invalid or expired.");
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
