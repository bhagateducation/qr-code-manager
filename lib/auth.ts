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
  return session.user;
}
export async function revokeSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token)
    await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
}
