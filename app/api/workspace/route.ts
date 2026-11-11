import { NextRequest } from "next/server";
import { z } from "zod";
import { createHash, randomBytes, randomUUID } from "node:crypto";
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
  email,
  destination,
  qrSchema,
  systemSchema,
  validateRecord,
  limits,
  effectivePlan,
} from "@/lib/validation";
import { sendWorkspaceInvitationEmail } from "@/lib/email";

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
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const size = [25, 50, 100].includes(Number(params.get("size"))) ? Number(params.get("size")) : 25;
    const live = { workspaceId, deletedAt: null };
    const term = search.trim();
    // "#42", "42" and "QR-00042" all find code number 42.
    const number = /^(?:qr-?|#)?0*(\d{1,9})$/i.exec(term)?.[1];
    let folderIds: string[] | undefined;
    if (params.get("folder") && params.get("folder") !== "none") {
      const tree = await prisma.folder.findMany({ where: { workspaceId }, select: { id: true, parentId: true } });
      folderIds = [params.get("folder")!];
      for (const id of folderIds) folderIds.push(...tree.filter((folder) => folder.parentId === id).map((folder) => folder.id));
    }
    const where = {
      workspaceId,
      deletedAt: status === "trash" ? { not: null } : null,
      ...(term
        ? {
            OR: [
              ...(number ? [{ number: Number(number) }] : []),
              { title: { contains: term } },
              { shortCode: { contains: term } },
              { targetUrl: { contains: term } },
            ],
          }
        : {}),
      ...(status === "active" ? { isActive: true } : status === "paused" ? { isActive: false } : {}),
      ...(params.get("tag") ? { tags: { some: { tagId: params.get("tag")! } } } : {}),
      ...(params.get("campaign") ? { campaignId: params.get("campaign")! } : {}),
      ...(folderIds ? { folderId: { in: folderIds } } : params.get("folder") === "none" ? { folderId: null } : {}),
      ...(["dynamic_url", "wifi", "vcard", "text"].includes(params.get("type") || "") ? { type: params.get("type")! } : {}),
    };
    const orderBy =
      (
        {
          oldest: { createdAt: "asc" },
          scans: { scanCount: "desc" },
          name: { title: "asc" },
          number: { number: "asc" },
        } as const
      )[params.get("sort") || ""] || ({ createdAt: "desc" } as const);
    // Trash empties itself: anything binned more than 30 days ago is removed for good.
    if (status === "trash")
      await prisma.qRCode.deleteMany({ where: { workspaceId, deletedAt: { lt: new Date(Date.now() - 30 * 86400000) } } });
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
      campaigns,
      webhooks,
      apiKeys,
      webhookDeliveries,
      invitations,
      topCodes,
      recordCount,
      codeCount,
      trashCount,
      folders,
    ] = await Promise.all([
      prisma.qRCode.findMany({
        where,
        include: { tags: { include: { tag: true } }, campaign: { select: { id: true, name: true } } },
        orderBy,
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.qRCode.count({ where }),
      prisma.qRCode.count({ where: { ...live, isActive: true } }),
      prisma.qRCode.aggregate({
        where: live,
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
        take: 20,
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
      prisma.campaign.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.webhook.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, url: true, events: true, isActive: true, createdAt: true } }),
      prisma.apiKey.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, label: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true } }),
      prisma.webhookDelivery.findMany({ where: { webhook: { workspaceId } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, eventType: true, status: true, responseCode: true, attempts: true, lastError: true, createdAt: true, deliveredAt: true, webhook: { select: { url: true } } } }),
      prisma.invitation.findMany({ where: { workspaceId, acceptedAt: null }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, email: true, role: true, expiresAt: true, createdAt: true } }),
      prisma.qRCode.findMany({ where: { ...live, scanCount: { gt: 0 } }, orderBy: { scanCount: "desc" }, take: 5, select: { id: true, title: true, scanCount: true } }),
      prisma.record.count({ where: { system: { workspaceId } } }),
      prisma.qRCode.count({ where: live }),
      prisma.qRCode.count({ where: { workspaceId, deletedAt: { not: null } } }),
      prisma.folder.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, take: 2000, select: { id: true, parentId: true, name: true, kind: true, _count: { select: { qrCodes: { where: { deletedAt: null } } } } } }),
    ]);
    // The configured owner's existing account becomes the platform owner on installs that have none yet.
    // New registrations of that address are gated separately (see the auth route).
    if (!user.platformAdmin && user.role === "owner" && process.env.OWNER_EMAIL?.toLowerCase() === user.email && !(await prisma.user.count({ where: { platformAdmin: true } }))) {
      await prisma.user.update({ where: { id: user.id }, data: { platformAdmin: true } });
      user.platformAdmin = true;
    }
    // The platform owner's own workspace is never limited by a plan.
    if (user.platformAdmin && effectivePlan(user.workspace) !== "business")
      user.workspace = await prisma.workspace.update({ where: { id: workspaceId }, data: { plan: "business", paidUntil: new Date("2099-12-31") } });
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
      campaigns,
      webhooks,
      apiKeys,
      webhookDeliveries,
      invitations,
      topCodes,
      recordCount,
      codeCount,
      trashCount,
      folders,
      pageSize: size,
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
    let invitationEmail = "";
    let invitationRole = "";
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
      // Outbound credentials and endpoints can leak workspace data, so editors cannot manage them.
      if (/^(webhook|apiKey)./.test(input.action) && !["owner", "admin"].includes(user.role))
        throw new ApiError(403, "Only owners and admins can manage API keys and webhooks.");
      if (input.action === "qr.create" || input.action === "qr.update") {
        const data = qrSchema.parse(input.data);
        const { tagIds, campaignId, ...qrData } = data;
        const app = new URL(process.env.APP_URL!);
        if (
          data.type === "dynamic_url" &&
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
        if (qrData.folderId && !(await tx.folder.findFirst({ where: { id: qrData.folderId, workspaceId } })))
          throw new ApiError(404, "Folder not found.");
        const validTags = tagIds.length
          ? await tx.tag.findMany({ where: { id: { in: tagIds }, workspaceId }, select: { id: true } })
          : [];
        if (validTags.length !== new Set(tagIds).size)
          throw new ApiError(404, "One or more tags were not found.");
        if (input.action === "qr.create") {
          if (
            (await tx.qRCode.count({ where: { workspaceId, deletedAt: null } })) >= quota.codes
          )
            throw new ApiError(409, "Your plan QR limit has been reached.");
          // The workspace row is locked by this transaction, so numbers never repeat or skip under load.
          const { qrSeq } = await tx.workspace.update({ where: { id: workspaceId }, data: { qrSeq: { increment: 1 } } });
          entity = await tx.qRCode.create({
            data: {
              ...qrData,
              number: qrSeq,
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
              where: { id: input.id, workspaceId, deletedAt: null },
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
          where: { id: input.id, workspaceId, deletedAt: null },
        });
        if (!qr) throw new ApiError(404, "QR not found.");
        entity = await tx.qRCode.update({
          where: { id: qr.id },
          data: { isActive: !qr.isActive },
        });
      } else if (input.action === "qr.delete") {
        if (!input.id) throw new ApiError(400, "QR is required.");
        // Delete moves the code to the trash; it stops resolving but can be restored for 30 days.
        entity = await tx.qRCode.updateMany({ where: { id: input.id, workspaceId, deletedAt: null }, data: { deletedAt: new Date() } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "QR not found.");
      } else if (input.action === "qr.bulk") {
        const data = z
          .object({ ids: z.array(z.string().max(100)).min(1).max(100), op: z.enum(["pause", "resume", "trash", "restore", "purge", "move"]), folderId: z.string().max(80).nullable().optional() })
          .parse(input.data);
        if (data.op === "move" && data.folderId && !(await tx.folder.findFirst({ where: { id: data.folderId, workspaceId } })))
          throw new ApiError(404, "Folder not found.");
        const trashed = data.op === "restore" || data.op === "purge";
        const scope = { id: { in: data.ids }, workspaceId, deletedAt: trashed ? { not: null } : null };
        if (data.op === "purge") {
          if (!["owner", "admin"].includes(user.role)) throw new ApiError(403, "Only owners and admins can delete permanently.");
          await tx.qRCode.deleteMany({ where: scope });
        } else {
          if (data.op === "restore" && (await tx.qRCode.count({ where: { workspaceId, deletedAt: null } })) + (await tx.qRCode.count({ where: scope })) > quota.codes)
            throw new ApiError(409, "Restoring these would go over your plan QR limit.");
          await tx.qRCode.updateMany({
            where: scope,
            data: data.op === "move" ? { folderId: data.folderId || null } : data.op === "pause" ? { isActive: false } : data.op === "resume" ? { isActive: true } : { deletedAt: data.op === "trash" ? new Date() : null },
          });
        }
        input.action = `qr.bulk.${data.op}`;
        entity = { id: workspaceId };
      } else if (input.action === "folder.create") {
        const data = z.object({ name, parentId: z.string().max(80).nullable().optional() }).parse(input.data);
        let depth = 1;
        for (let id = data.parentId; id; depth++) {
          const parent: { parentId: string | null } | null = await tx.folder.findFirst({ where: { id, workspaceId }, select: { parentId: true } });
          if (!parent) throw new ApiError(404, "Parent folder not found.");
          id = parent.parentId;
        }
        if (depth > 5) throw new ApiError(400, "Folders can be nested up to five levels.");
        if ((await tx.folder.count({ where: { workspaceId } })) >= 2000) throw new ApiError(409, "This workspace has reached 2,000 folders.");
        entity = await tx.folder.create({ data: { name: data.name, parentId: data.parentId || null, workspaceId } });
      } else if (input.action === "folder.rename") {
        if (!input.id) throw new ApiError(400, "Folder is required.");
        entity = await tx.folder.updateMany({ where: { id: input.id, workspaceId }, data: { name: name.parse(input.data) } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Folder not found.");
      } else if (input.action === "folder.delete") {
        if (!input.id) throw new ApiError(400, "Folder is required.");
        // Sub-folders go with it; the codes inside are kept and simply become unfiled.
        entity = await tx.folder.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Folder not found.");
      } else if (input.action === "book.create") {
        // One book = one folder, one sub-folder per chapter, one dynamic code per question.
        const data = z
          .object({
            title: name,
            urlTemplate: z.string().trim().min(1).max(1500),
            chapters: z.array(z.object({ name, questions: z.number().int().min(1).max(200) })).min(1).max(60),
          })
          .parse(input.data);
        const total = data.chapters.reduce((sum, chapter) => sum + chapter.questions, 0);
        if (total > 1000) throw new ApiError(400, "Create at most 1,000 codes at a time. Split the book into two parts.");
        const fill = (chapter: number, question: number) => data.urlTemplate.replaceAll("{chapter}", String(chapter)).replaceAll("{question}", String(question));
        if (!destination.safeParse(fill(1, 1)).success) throw new ApiError(400, "Use a public http or https address for the link.");
        if (new URL(fill(1, 1)).origin === new URL(process.env.APP_URL!).origin && new URL(fill(1, 1)).pathname.startsWith("/s/"))
          throw new ApiError(400, "A QR cannot redirect to another QR resolver on this site.");
        if ((await tx.qRCode.count({ where: { workspaceId, deletedAt: null } })) + total > quota.codes)
          throw new ApiError(409, `This book needs ${total} codes, which is more than your plan has left.`);
        const book = await tx.folder.create({ data: { name: data.title, kind: "book", workspaceId } });
        const chapters = data.chapters.map((chapter) => ({ id: randomUUID(), name: chapter.name, kind: "chapter", parentId: book.id, workspaceId }));
        await tx.folder.createMany({ data: chapters });
        const { qrSeq } = await tx.workspace.update({ where: { id: workspaceId }, data: { qrSeq: { increment: total } } });
        let number = qrSeq - total;
        await tx.qRCode.createMany({
          data: data.chapters.flatMap((chapter, index) =>
            Array.from({ length: chapter.questions }, (_, question) => ({
              workspaceId,
              folderId: chapters[index].id,
              number: ++number,
              title: `${chapter.name} · Q${question + 1}`.slice(0, 100),
              targetUrl: fill(index + 1, question + 1),
              shortCode: randomBytes(9).toString("base64url"),
              styling: { dark: "#17161D", light: "#FFFFFF", errorCorrectionLevel: "M" },
              routingRules: {},
            })),
          ),
        });
        entity = book;
      } else if (input.action === "trash.empty") {
        if (!["owner", "admin"].includes(user.role)) throw new ApiError(403, "Only owners and admins can empty the trash.");
        await tx.qRCode.deleteMany({ where: { workspaceId, deletedAt: { not: null } } });
        entity = { id: workspaceId };
      } else if (input.action === "system.delete") {
        if (!input.id) throw new ApiError(400, "System is required.");
        entity = await tx.system.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "System not found.");
      } else if (input.action === "record.delete") {
        if (!input.id) throw new ApiError(400, "Record is required.");
        entity = await tx.record.deleteMany({ where: { id: input.id, system: { workspaceId } } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Record not found.");
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
      } else if (input.action === "record.publish") {
        if (!input.id) throw new ApiError(400, "Record is required.");
        const record = await tx.record.findFirst({ where: { id: input.id, system: { workspaceId } } });
        if (!record) throw new ApiError(404, "Record not found.");
        entity = await tx.record.update({ where: { id: record.id }, data: { isPublic: !record.isPublic } });
      } else if (input.action === "tag.create") {
        const data = z
          .object({ name: name, color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#5B43D6") })
          .parse(input.data);
        entity = await tx.tag.create({ data: { ...data, workspaceId } });
      } else if (input.action === "tag.delete") {
        if (!input.id) throw new ApiError(400, "Tag is required.");
        entity = await tx.tag.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Tag not found.");
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
      } else if (input.action === "webhook.create") {
        const data = z.object({ url: destination, events: z.array(z.literal("scan.created")).min(1).max(1).default(["scan.created"]) }).parse(input.data);
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
      } else if (input.action === "team.invite") {
        if (user.role !== "owner") throw new ApiError(403, "Only the workspace owner can invite members.");
        const data = z.object({ email, role: z.enum(["admin", "editor", "viewer"]).default("editor") }).parse(input.data);
        invitationEmail = data.email;
        invitationRole = data.role;
        if (await tx.user.findUnique({ where: { email: data.email } })) throw new ApiError(409, "That email already has an account.");
        const token = `invite_${randomBytes(32).toString("base64url")}`;
        oneTimeSecret = token;
        entity = await tx.invitation.create({ data: { ...data, workspaceId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
      } else if (input.action === "team.role") {
        if (user.role !== "owner") throw new ApiError(403, "Only the workspace owner can change roles.");
        if (!input.id || input.id === user.id) throw new ApiError(400, "Choose another workspace member.");
        const data = z.object({ role: z.enum(["admin", "editor", "viewer"]) }).parse(input.data);
        entity = await tx.user.updateMany({ where: { id: input.id, workspaceId }, data }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Member not found.");
      } else if (input.action === "team.remove") {
        if (user.role !== "owner") throw new ApiError(403, "Only the workspace owner can remove members.");
        if (!input.id || input.id === user.id) throw new ApiError(400, "You cannot remove yourself.");
        entity = await tx.user.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Member not found.");
      } else if (input.action === "invitation.revoke") {
        if (user.role !== "owner") throw new ApiError(403, "Only the workspace owner can revoke invitations.");
        if (!input.id) throw new ApiError(400, "Invitation is required.");
        entity = await tx.invitation.deleteMany({ where: { id: input.id, workspaceId, acceptedAt: null } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Invitation not found.");
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
    if (input.action === "team.invite" && oneTimeSecret && invitationEmail) {
      const link = `${process.env.APP_URL}/invite?token=${encodeURIComponent(oneTimeSecret)}`;
      await sendWorkspaceInvitationEmail(invitationEmail, link, user.workspace.name, invitationRole);
    }
    return json({ ok: true, entity: result, oneTimeSecret });
  } catch (error) {
    return failure(error);
  }
}
