import { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { body, json, failure, ApiError, rateLimit } from "@/lib/http";
import { email, name, password } from "@/lib/validation";
import {
  COOKIE_NAME,
  cookieOptions,
  SESSION_SECONDS,
  createSession,
  hashPassword,
  verifyPassword,
  revokeSession,
  revokeOtherSessions,
  getSessionUser,
  canEnter,
  digest,
} from "@/lib/auth";
import { cookies } from "next/headers";
import { verifyTotp } from "@/lib/mfa";
import { emailDeliveryConfigured, sendEmailVerificationEmail } from "@/lib/email";
import { createHash } from "node:crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const input = await body(request);
    if (action === "logout") {
      await revokeSession();
      const response = json({ ok: true });
      response.cookies.set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (action === "switch") {
      const current = await getSessionUser();
      if (!current) throw new ApiError(401, "Sign in to continue.");
      const target = z.object({ workspaceId: z.string().max(100).nullable() }).parse(input).workspaceId;
      if (target && target !== current.homeWorkspaceId) {
        const panel = await prisma.workspace.findUnique({ where: { id: target } });
        if (!panel || !canEnter({ ...current, workspaceId: current.homeWorkspaceId }, panel)) throw new ApiError(404, "Panel not found.");
        await prisma.auditLog.create({ data: { workspaceId: panel.id, actorId: current.id, action: current.platformAdmin && panel.parentId !== current.homeWorkspaceId ? "platform.enter" : "panel.enter" } });
      }
      const token = (await cookies()).get(COOKIE_NAME)?.value || "";
      await prisma.session.update({ where: { tokenHash: digest(token) }, data: { workspaceId: target && target !== current.homeWorkspaceId ? target : null } });
      return json({ ok: true });
    }
    if (action === "logout-others") {
      const current = await getSessionUser();
      if (!current) throw new ApiError(401, "Sign in to continue.");
      return json({ ok: true, ended: (await revokeOtherSessions(current.id)).count });
    }
    if (!["login", "register"].includes(action))
      throw new ApiError(404, "Not found.");
    const credentials = z
      .object({ email, password: z.string().min(1).max(72), mfaCode: z.string().max(20).optional() })
      .parse(input);
    await rateLimit(`auth:${credentials.email}`, 10);
    await rateLimit("auth:global", 500, 60);
    let user;
    if (action === "register") {
      await rateLimit("register:global", 100, 3600);
      const data = z
        .object({ email, password, name, workspace: name })
        .parse(input);
      // The owner address can only be registered by someone who also holds the secret from the hosting
      // environment; otherwise anyone who knows the address could claim the platform on a new install.
      const claimsOwner = data.email === process.env.OWNER_EMAIL?.toLowerCase() && !(await prisma.user.count({ where: { platformAdmin: true } }));
      if (claimsOwner && (!process.env.OWNER_INITIAL_PASSWORD || data.password !== process.env.OWNER_INITIAL_PASSWORD))
        throw new ApiError(403, "This address is reserved for the platform owner. Set OWNER_INITIAL_PASSWORD in the hosting environment and register with that password.");
      const passwordHash = await hashPassword(data.password);
      const verificationToken = `verify_${randomBytes(32).toString("base64url")}`;
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          emailVerificationTokenHash: createHash("sha256").update(verificationToken).digest("hex"),
          emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          role: "owner",
          platformAdmin: claimsOwner,
          workspace: {
            create: {
              name: data.workspace,
              slug: `ws-${randomBytes(10).toString("hex")}`,
            },
          },
        },
      });
      await sendEmailVerificationEmail(
        user.email,
        `${process.env.APP_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`,
      );
    } else {
      user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: { workspace: true },
      });
      // Always run a costly comparison, including for unknown accounts.
      const fallback =
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx4lMuId/9hIPcYxNjlM.5T6j3u";
      const valid = await verifyPassword(
        credentials.password,
        user?.passwordHash || fallback,
      );
      if (!user || !valid || user.workspace.suspended)
        throw new ApiError(401, "Invalid email or password.");
      if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && emailDeliveryConfigured() && !user.emailVerifiedAt)
        throw new ApiError(403, "Verify your email address before signing in.");
      if (user.mfaEnabled) {
        if (!credentials.mfaCode) return json({ mfaRequired: true });
        const code = credentials.mfaCode.trim().toUpperCase();
        const backups = Array.isArray(user.backupCodes) ? (user.backupCodes as string[]) : [];
        if (backups.includes(code))
          // Backup codes are single-use.
          await prisma.user.update({ where: { id: user.id }, data: { backupCodes: backups.filter((item) => item !== code) } });
        else if (!user.mfaSecret || !verifyTotp(user.mfaSecret, code))
          throw new ApiError(401, "Invalid authenticator code.");
      }
    }
    const verificationRequired =
      action === "register" &&
      process.env.REQUIRE_EMAIL_VERIFICATION === "true" &&
      emailDeliveryConfigured();
    if (verificationRequired)
      return json({ ok: true, emailVerificationRequired: true });
    const token = await createSession(user.id);
    const response = json({
      ok: true,
      emailVerificationRequired: false,
    });
    response.cookies.set(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
