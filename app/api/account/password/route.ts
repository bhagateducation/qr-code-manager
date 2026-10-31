import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authorize,
  body,
  json,
  failure,
  ApiError,
  rateLimit,
} from "@/lib/http";
import { password } from "@/lib/validation";
import {
  hashPassword,
  verifyPassword,
  createSession,
  cookieOptions,
  COOKIE_NAME,
  SESSION_SECONDS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(request: NextRequest) {
  try {
    const user = await authorize();
    const data = z
      .object({ currentPassword: z.string().max(72), newPassword: password })
      .parse(await body(request));
    await rateLimit(`password:${user.id}`, 5);
    if (!(await verifyPassword(data.currentPassword, user.passwordHash)))
      throw new ApiError(400, "Current password is incorrect.");
    const passwordHash = await hashPassword(data.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.auditLog.create({
        data: {
          workspaceId: user.workspaceId,
          actorId: user.id,
          action: "account.password-changed",
        },
      }),
    ]);
    const token = await createSession(user.id);
    const response = json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
