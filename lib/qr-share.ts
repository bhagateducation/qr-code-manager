import "server-only";
import { prisma } from "./prisma";
import { account, linkBase } from "./plans";

/** A code by its short code with the link printed in its image (custom domain only while it works). */
export async function sharedCode(code: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) return null;
  const qr = await prisma.qRCode.findUnique({ where: { shortCode: code }, include: { workspace: true, folder: { select: { name: true } } } });
  if (!qr || qr.deletedAt) return null;
  const base = linkBase((await account(prisma, qr.workspace)).root);
  return { qr, payload: qr.type === "dynamic_url" ? `${base}/s/${qr.shortCode}` : qr.targetUrl };
}
export const qrNumber = (value: number) => `QR-${String(value).padStart(5, "0")}`;
