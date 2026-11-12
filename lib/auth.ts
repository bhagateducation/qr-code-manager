import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
export const COOKIE_NAME = "qrm_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      tokenHash: digest(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
    },
  });
  return token;
}
export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: { include: { workspace: true } } },
  });
  if (
    !session ||
    session.expiresAt.getTime() <= Date.now() ||
    session.user.workspace.suspended
  )
    return null;
  const user = { ...session.user, homeWorkspaceId: session.user.workspaceId, homeWorkspaceName: session.user.workspace.name };
  if (session.workspaceId && session.workspaceId !== user.workspaceId) {
    const panel = await prisma.workspace.findUnique({ where: { id: session.workspaceId } });
    if (panel && !panel.suspended && canEnter(user, panel))
      // The platform owner works in a client's panel with full rights; an account owner keeps their own role.
      return { ...user, workspaceId: panel.id, workspace: panel, role: user.platformAdmin && panel.parentId !== user.workspaceId ? "owner" : user.role };
  }
  return user;
}
/** Who may open a panel other than their own: the platform owner anywhere, an account's owner or admin in its panels. */
export const canEnter = (user: { platformAdmin: boolean; workspaceId: string; role: string }, panel: { id: string; parentId: string | null }) =>
  user.platformAdmin || (panel.parentId === user.workspaceId && ["owner", "admin"].includes(user.role));
/** Ends every session of this user except the one making the request. */
export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return prisma.session.deleteMany({ where: { userId, NOT: { tokenHash: digest(token || "") } } });
}
export async function revokeSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token)
    await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
}
