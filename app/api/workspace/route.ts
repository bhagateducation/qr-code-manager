import { NextRequest } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
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
  destination,
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
      tags,
      automations,
      campaigns,
      integrations,
      webhooks,
      apiKeys,
      webhookDeliveries,
    ] = await Promise.all([
      prisma.qRCode.findMany({
        where,
        include: { tags: { include: { tag: true } }, campaign: { select: { id: true, name: true } } },
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
      prisma.tag.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
      prisma.automation.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.campaign.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.integration.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.webhook.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, url: true, events: true, isActive: true, createdAt: true } }),
      prisma.apiKey.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, label: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true } }),
      prisma.webhookDelivery.findMany({ where: { webhook: { workspaceId } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, eventType: true, status: true, responseCode: true, attempts: true, lastError: true, createdAt: true, deliveredAt: true, webhook: { select: { url: true } } } }),
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
      tags,
      automations,
      campaigns,
      integrations,
      webhooks,
      apiKeys,
      webhookDeliveries,
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
    let oneTimeSecret: string | undefined;
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
        const { tagIds, campaignId, ...qrData } = data;
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
          qrData.recordId &&
          !(await tx.record.findFirst({
            where: { id: qrData.recordId, system: { workspaceId } },
          }))
        )
          throw new ApiError(404, "Record not found.");
        if (
          campaignId &&
          !(await tx.campaign.findFirst({ where: { id: campaignId, workspaceId } }))
        )
          throw new ApiError(404, "Campaign not found.");
        const validTags = tagIds.length
          ? await tx.tag.findMany({ where: { id: { in: tagIds }, workspaceId }, select: { id: true } })
          : [];
        if (validTags.length !== new Set(tagIds).size)
          throw new ApiError(404, "One or more tags were not found.");
        if (input.action === "qr.create") {
          if (
            (await tx.qRCode.count({ where: { workspaceId } })) >= quota.codes
          )
            throw new ApiError(409, "Your plan QR limit has been reached.");
          entity = await tx.qRCode.create({
            data: {
              ...qrData,
              campaignId: campaignId || null,
              workspaceId,
              shortCode: randomBytes(9).toString("base64url"),
              tags: { create: tagIds.map((tagId) => ({ tagId })) },
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
          entity = await tx.qRCode.update({
            where: { id: input.id },
            data: {
              ...qrData,
              campaignId: campaignId || null,
              tags: {
                deleteMany: {},
                create: tagIds.map((tagId) => ({ tagId })),
              },
            },
          });
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
      } else if (input.action === "tag.create") {
        const data = z
          .object({ name: name, color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#5B43D6") })
          .parse(input.data);
        entity = await tx.tag.create({ data: { ...data, workspaceId } });
      } else if (input.action === "tag.delete") {
        if (!input.id) throw new ApiError(400, "Tag is required.");
        entity = await tx.tag.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Tag not found.");
      } else if (input.action === "automation.create") {
        const data = z
          .object({ name, kind: z.enum(["function", "workflow"]), config: z.unknown().optional() })
          .parse(input.data);
        entity = await tx.automation.create({ data: { ...data, config: data.config as any, workspaceId } });
      } else if (input.action === "automation.toggle") {
        if (!input.id) throw new ApiError(400, "Automation is required.");
        const automation = await tx.automation.findFirst({ where: { id: input.id, workspaceId } });
        if (!automation) throw new ApiError(404, "Automation not found.");
        entity = await tx.automation.update({ where: { id: automation.id }, data: { isActive: !automation.isActive } });
      } else if (input.action === "automation.delete") {
        if (!input.id) throw new ApiError(400, "Automation is required.");
        entity = await tx.automation.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Automation not found.");
      } else if (input.action === "campaign.create") {
        const data = z.object({ name, description: z.string().max(500).optional(), status: z.enum(["draft", "active", "paused"]).default("draft") }).parse(input.data);
        entity = await tx.campaign.create({ data: { ...data, workspaceId } });
      } else if (input.action === "campaign.status") {
        if (!input.id) throw new ApiError(400, "Campaign is required.");
        const data = z.object({ status: z.enum(["draft", "active", "paused", "completed"]) }).parse(input.data);
        entity = await tx.campaign.updateMany({ where: { id: input.id, workspaceId }, data }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Campaign not found.");
      } else if (input.action === "campaign.delete") {
        if (!input.id) throw new ApiError(400, "Campaign is required.");
        entity = await tx.campaign.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Campaign not found.");
      } else if (input.action === "integration.create") {
        const data = z.object({ provider: name, name, config: z.unknown().optional() }).parse(input.data);
        entity = await tx.integration.create({ data: { ...data, config: data.config as any, workspaceId } });
      } else if (input.action === "integration.toggle") {
        if (!input.id) throw new ApiError(400, "Integration is required.");
        const integration = await tx.integration.findFirst({ where: { id: input.id, workspaceId } });
        if (!integration) throw new ApiError(404, "Integration not found.");
        entity = await tx.integration.update({ where: { id: integration.id }, data: { status: integration.status === "active" ? "paused" : "active" } });
      } else if (input.action === "integration.delete") {
        if (!input.id) throw new ApiError(400, "Integration is required.");
        entity = await tx.integration.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Integration not found.");
      } else if (input.action === "webhook.create") {
        const data = z.object({ url: destination, events: z.array(z.string().min(1).max(80)).min(1).max(20) }).parse(input.data);
        oneTimeSecret = `whsec_${randomBytes(24).toString("base64url")}`;
        entity = await tx.webhook.create({ data: { ...data, workspaceId, secret: oneTimeSecret } });
      } else if (input.action === "webhook.toggle") {
        if (!input.id) throw new ApiError(400, "Webhook is required.");
        const webhook = await tx.webhook.findFirst({ where: { id: input.id, workspaceId } });
        if (!webhook) throw new ApiError(404, "Webhook not found.");
        entity = await tx.webhook.update({ where: { id: webhook.id }, data: { isActive: !webhook.isActive } });
      } else if (input.action === "webhook.delete") {
        if (!input.id) throw new ApiError(400, "Webhook is required.");
        entity = await tx.webhook.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Webhook not found.");
      } else if (input.action === "apiKey.create") {
        const data = z.object({ label: name }).parse(input.data);
        oneTimeSecret = `qrm_live_${randomBytes(24).toString("base64url")}`;
        entity = await tx.apiKey.create({ data: { ...data, workspaceId, prefix: oneTimeSecret.slice(0, 18), tokenHash: createHash("sha256").update(oneTimeSecret).digest("hex") } });
      } else if (input.action === "apiKey.revoke") {
        if (!input.id) throw new ApiError(400, "API key is required.");
        entity = await tx.apiKey.updateMany({ where: { id: input.id, workspaceId, revokedAt: null }, data: { revokedAt: new Date() } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "API key not found.");
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
    return json({ ok: true, entity: result, oneTimeSecret });
  } catch (error) {
    return failure(error);
  }
}
