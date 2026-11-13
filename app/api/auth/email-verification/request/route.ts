import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, body, failure, json, rateLimit } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { email } from "@/lib/validation";
import { emailDeliveryConfigured, sendEmailVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const input = z.object({ email }).parse(await body(request));
    if (!(await emailDeliveryConfigured())) throw new ApiError(503, "Verification email is currently unavailable.");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await rateLimit(`email-verification:${ip}`, 10);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (user && !user.emailVerifiedAt) {
      const token = `verify_${randomBytes(32).toString("base64url")}`;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationTokenHash: createHash("sha256").update(token).digest("hex"),
          emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      const link = `${process.env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
      await sendEmailVerificationEmail(user.email, link);
    }
    return json({ ok: true, message: "If an unverified account exists for that email, check your inbox and spam folder for a verification link." });
  } catch (error) {
    return failure(error);
  }
}
