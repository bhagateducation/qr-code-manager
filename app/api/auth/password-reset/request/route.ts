import { randomBytes, createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, body, failure, json, rateLimit } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { email } from "@/lib/validation";
import { emailDeliveryConfigured, sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const input = z.object({ email }).parse(await body(request));
    if (!(await emailDeliveryConfigured())) throw new ApiError(503, "Password reset email is currently unavailable.");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await rateLimit(`password-reset:${ip}`, 10);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user) {
      const token = `reset_${randomBytes(32).toString("base64url")}`;
      await prisma.user.update({ where: { id: user.id }, data: { passwordResetTokenHash: createHash("sha256").update(token).digest("hex"), passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
      const link = `${process.env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(user.email, link);
    }
    return json({ ok: true, message: "If an account exists for that email, check your inbox and spam folder for a reset link." });
  } catch (error) { return failure(error); }
}
