import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

// Secrets saved from the panel are encrypted with a key that exists only in the server environment, never in the database.
const cipherKey = () => createHash("sha256").update(`panel-secret|${process.env.DATABASE_URL}`).digest();
export function sealSecret(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cipherKey(), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64")).join(".");
}
export function openSecret(sealed: string | undefined) {
  if (!sealed) return "";
  try {
    const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", cipherKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
export async function setting<T>(key: string): Promise<T | undefined> {
  return (await prisma.siteSetting.findUnique({ where: { key } }))?.value as T | undefined;
}
export async function saveSetting(key: string, value: object) {
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
