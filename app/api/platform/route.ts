import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize, body, json, failure, ApiError } from "@/lib/http";
export async function GET() {
  try {
    const user = await authorize();
    if (!user.platformAdmin)
      throw new ApiError(403, "Platform owner access is required.");
    return json({
      workspaces: await prisma.workspace.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          plan: true,
          suspended: true,
          createdAt: true,
          _count: { select: { users: true, qrCodes: true } },
        },
      }),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await authorize();
    if (!user.platformAdmin)
      throw new ApiError(403, "Platform owner access is required.");
    const input = z
      .object({ id: z.string(), suspended: z.boolean() })
      .parse(await body(request));
    if (input.id === user.workspaceId)
      throw new ApiError(400, "You cannot suspend your own workspace.");
    await prisma.$transaction([
      prisma.workspace.update({
        where: { id: input.id },
        data: { suspended: input.suspended },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId: user.workspaceId,
          actorId: user.id,
          action: input.suspended
            ? "workspace.suspended"
            : "workspace.restored",
          entityId: input.id,
        },
      }),
    ]);
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
