import { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  authorize,
  body,
  json,
  failure,
  ApiError,
  rateLimit,
} from "@/lib/http";
import {
  name,
  qrSchema,
  systemSchema,
  validateRecord,
  limits,
  effectivePlan,
} from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const user = await authorize();
    const workspaceId = user.workspaceId;
    const page = Math.max(
      1,
      Math.min(
        10000,
        Math.floor(Number(request.nextUrl.searchParams.get("page")) || 1),
      ),
    );
    const search = (request.nextUrl.searchParams.get("search") || "").slice(
      0,
      100,
    );
    const where = {
      workspaceId,
      ...(search ? { title: { contains: search } } : {}),
    };
    const [
      qrCodes,
      total,
      active,
      scans,
      systems,
      logs,
      audit,
      payments,
      members,
    ] = await Promise.all([
      prisma.qRCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * 25,
        take: 25,
      }),
      prisma.qRCode.count({ where }),
      prisma.qRCode.count({ where: { workspaceId, isActive: true } }),
      prisma.qRCode.aggregate({
        where: { workspaceId },
        _sum: { scanCount: true },
      }),
      prisma.system.findMany({
        where: { workspaceId },
        include: {
          fields: { orderBy: { order: "asc" } },
          _count: { select: { records: true } },
        },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
      prisma.scanLog.findMany({
        where: { qrCode: { workspaceId } },
        include: { qrCode: { select: { title: true } } },
        take: 100,
        orderBy: { scannedAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { workspaceId },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { workspaceId },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          plan: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        where: { workspaceId },
        select: { id: true, name: true, email: true, role: true },
        take: 100,
      }),
    ]);
    const plan = effectivePlan(user.workspace);
    const prices = {
      pro: Number(process.env.PLAN_PRO_PAISE || 0),
      business: Number(process.env.PLAN_BUSINESS_PAISE || 0),
    };
    return json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        platformAdmin: user.platformAdmin,
      },
      workspace: {
        name: user.workspace.name,
        plan,
        paidUntil: user.workspace.paidUntil,
      },
      qrCodes,
      total,
      page,
      active,
      scans: scans._sum.scanCount || 0,
      systems,
      logs,
      audit,
      payments,
      members,
      limits: limits[plan],
      prices,
      checkoutReady: !!(
        process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET &&
        process.env.RAZORPAY_WEBHOOK_SECRET
      ),
      appUrl: process.env.APP_URL,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authorize(true);
    const input = z
      .object({
        action: z.string(),
        id: z.string().max(100).optional(),
        data: z.unknown().optional(),
      })
      .parse(await body(request));
    await rateLimit(`write:${user.id}`, 120, 60);
    const workspaceId = user.workspaceId;
    const result = await prisma.$transaction(async (tx) => {
      // A workspace row lock serializes quota checks and creates in every instance.
      const workspace = await tx.workspace.update({
        where: { id: workspaceId },
        data: { updatedAt: new Date() },
      });
      if (workspace.suspended)
        throw new ApiError(403, "This workspace is suspended.");
      const quota = limits[effectivePlan(workspace)];
      let entity: { id: string } | null = null;
      if (input.action === "qr.create" || input.action === "qr.update") {
        const data = qrSchema.parse(input.data);
        const app = new URL(process.env.APP_URL!);
        if (
          [
            data.targetUrl,
            data.routingRules.ios,
            data.routingRules.android,
          ].some(
            (url) =>
              url &&
              new URL(url).origin === app.origin &&
              new URL(url).pathname.startsWith("/s/"),
          )
        )
          throw new ApiError(
            400,
            "A QR cannot redirect to another QR resolver on this site.",
          );
        if (
          data.recordId &&
          !(await tx.record.findFirst({
            where: { id: data.recordId, system: { workspaceId } },
          }))
        )
          throw new ApiError(404, "Record not found.");
        if (input.action === "qr.create") {
          if (
            (await tx.qRCode.count({ where: { workspaceId } })) >= quota.codes
          )
            throw new ApiError(409, "Your plan QR limit has been reached.");
          entity = await tx.qRCode.create({
            data: {
              ...data,
              workspaceId,
              shortCode: randomBytes(9).toString("base64url"),
            },
          });
        } else {
          if (
            !input.id ||
            !(await tx.qRCode.findFirst({
              where: { id: input.id, workspaceId },
            }))
          )
            throw new ApiError(404, "QR not found.");
          entity = await tx.qRCode.update({ where: { id: input.id }, data });
        }
      } else if (input.action === "qr.pause") {
        if (!input.id) throw new ApiError(400, "QR is required.");
        const qr = await tx.qRCode.findFirst({
          where: { id: input.id, workspaceId },
        });
        if (!qr) throw new ApiError(404, "QR not found.");
        entity = await tx.qRCode.update({
          where: { id: qr.id },
          data: { isActive: !qr.isActive },
        });
      } else if (input.action === "system.create") {
        const data = systemSchema.parse(input.data);
        if (
          (await tx.system.count({ where: { workspaceId } })) >= quota.systems
        )
          throw new ApiError(409, "Your plan system limit has been reached.");
        entity = await tx.system.create({
          data: {
            name: data.name,
            description: data.description,
            workspaceId,
            fields: {
              create: data.fields.map((f, order) => ({ ...f, order })),
            },
          },
        });
      } else if (
        input.action === "record.create" ||
        input.action === "record.update"
      ) {
        const data = z
          .object({ systemId: z.string(), title: name, data: z.unknown() })
          .parse(input.data);
        const system = await tx.system.findFirst({
          where: { id: data.systemId, workspaceId },
          include: { fields: true },
        });
        if (!system) throw new ApiError(404, "System not found.");
        let values;
        try {
          values = validateRecord(system.fields, data.data);
        } catch (error) {
          throw new ApiError(
            400,
            error instanceof Error ? error.message : "Invalid record.",
          );
        }
        if (input.action === "record.create") {
          if (
            (await tx.record.count({ where: { system: { workspaceId } } })) >=
            quota.records
          )
            throw new ApiError(409, "Your plan record limit has been reached.");
          entity = await tx.record.create({
            data: { systemId: system.id, title: data.title, data: values },
          });
        } else {
          if (
            !input.id ||
            !(await tx.record.findFirst({
              where: { id: input.id, systemId: system.id },
            }))
          )
            throw new ApiError(404, "Record not found.");
          entity = await tx.record.update({
            where: { id: input.id },
            data: { title: data.title, data: values },
          });
        }
      } else if (input.action === "workspace.rename") {
        if (user.role !== "owner")
          throw new ApiError(
            403,
            "Only the workspace owner can change settings.",
          );
        entity = await tx.workspace.update({
          where: { id: workspaceId },
          data: { name: name.parse(input.data) },
        });
      } else throw new ApiError(400, "Unsupported action.");
      await tx.auditLog.create({
        data: {
          workspaceId,
          actorId: user.id,
          action: input.action,
          entityId: entity.id,
        },
      });
      return entity;
    });
    return json({ ok: true, entity: result });
  } catch (error) {
    return failure(error);
  }
}
