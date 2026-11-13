import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, body, failure, json } from "@/lib/http";

/** Marks every notification as read for the signed-in person. Any role may do this. */
export async function POST(request: NextRequest) {
  try {
    const user = await authorize();
    await body(request);
    await prisma.user.update({ where: { id: user.id }, data: { notificationsSeenAt: new Date() } });
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
