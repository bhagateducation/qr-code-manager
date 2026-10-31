import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ status: "ok", service: "qr-manager" });
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
