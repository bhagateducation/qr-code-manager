import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { body, failure, json, ApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { password } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const input = z.object({ token: z.string().min(20).max(160), password }).parse(await body(request));
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const user = await prisma.user.findFirst({ where: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: new Date() } } });
    if (!user) throw new ApiError(400, "This password reset link is invalid or expired.");
    const updated = await prisma.user.updateMany({
      where: { id: user.id, passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: new Date() } },
      data: { passwordHash: await hashPassword(input.password), passwordResetTokenHash: null, passwordResetExpiresAt: null },
    });
    if (updated.count !== 1) throw new ApiError(400, "This password reset link is invalid or expired.");
    await prisma.session.deleteMany({ where: { userId: user.id } });
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
