import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { body, failure, json, ApiError } from "@/lib/http";
import { digest, COOKIE_NAME, SESSION_SECONDS, createSession, hashPassword, cookieOptions } from "@/lib/auth";
import { name, password } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const input = z.object({ token: z.string().min(20).max(160), name, password }).parse(await body(request));
    const invitation = await prisma.invitation.findUnique({ where: { tokenHash: digest(input.token) }, include: { workspace: true } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date() || invitation.workspace.suspended)
      throw new ApiError(400, "This invitation is invalid or has expired.");
    const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) throw new ApiError(409, "This email already has an account. Sign in instead.");
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email: invitation.email, name: input.name, role: invitation.role, passwordHash: await hashPassword(input.password), workspaceId: invitation.workspaceId } });
      await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      return created;
    });
    const token = await createSession(user.id);
    const response = json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_SECONDS });
    return response;
  } catch (error) {
    return failure(error);
  }
}
