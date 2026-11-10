import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorize, body, json, failure, ApiError } from "@/lib/http";
import { effectivePlan } from "@/lib/validation";

async function admin() {
  const user = await authorize();
  if (!user.platformAdmin)
    throw new ApiError(403, "Platform owner access is required.");
  return user;
}
export async function GET(request: NextRequest) {
  try {
    await admin();
    const search = (request.nextUrl.searchParams.get("search") || "").slice(0, 100);
    const where = search
      ? { OR: [{ name: { contains: search } }, { users: { some: { email: { contains: search } } } }] }
      : {};
    const [rows, total, suspended, users, codes] = await Promise.all([
      prisma.workspace.findMany({
        where,
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          plan: true,
          paidUntil: true,
          suspended: true,
          createdAt: true,
          users: { where: { role: "owner" }, take: 1, select: { email: true } },
          _count: { select: { users: true, qrCodes: true } },
        },
      }),
      prisma.workspace.count(),
      prisma.workspace.count({ where: { suspended: true } }),
      prisma.user.count(),
      prisma.qRCode.count(),
    ]);
    return json({
      totals: { workspaces: total, suspended, users, codes },
      workspaces: rows.map(({ users: owners, ...w }) => ({
        ...w,
        plan: effectivePlan(w),
        ownerEmail: owners[0]?.email || "",
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await admin();
    const input = z
      .union([
        z.object({ id: z.string().max(100), suspended: z.boolean() }),
        // Manual plan grant for clients who pay outside the built-in checkout.
        z.object({
          id: z.string().max(100),
          plan: z.enum(["free", "pro", "business"]),
          days: z.number().int().min(1).max(3660).default(30),
        }),
      ])
      .parse(await body(request));
    if ("suspended" in input && input.id === user.workspaceId)
      throw new ApiError(400, "You cannot suspend your own workspace.");
    const data =
      "suspended" in input
        ? { suspended: input.suspended }
        : input.plan === "free"
          ? { plan: "free", paidUntil: null }
          : { plan: input.plan, paidUntil: new Date(Date.now() + input.days * 86400000) };
    await prisma.$transaction([
      prisma.workspace.update({ where: { id: input.id }, data }),
      prisma.auditLog.create({
        data: {
          workspaceId: user.workspaceId,
          actorId: user.id,
          action:
            "suspended" in input
              ? input.suspended
                ? "workspace.suspended"
                : "workspace.restored"
              : `workspace.plan.${input.plan}`,
          entityId: input.id,
        },
      }),
    ]);
    return json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025")
      return json({ error: "Workspace not found." }, 404);
    return failure(error);
  }
}
