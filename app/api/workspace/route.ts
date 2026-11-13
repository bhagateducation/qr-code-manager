import { NextRequest, after } from "next/server";
import { Prisma } from "@prisma/client";
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
} from "@/lib/validation";
import { account, linkBase, over, requireFeature, requireStorage, usage } from "@/lib/plans";
import { probeDomain, runMaintenance } from "@/lib/maintenance";
import { sendWorkspaceInvitationEmail } from "@/lib/email";
import { checkoutConfigured } from "@/lib/payments";

const newCode = () => randomBytes(9).toString("base64url");
// A code made without a link points at its own QR page on this site, so a scan never errors before the link is set.
const pending = (shortCode: string) => `${process.env.APP_URL}/q/${shortCode}`;
const plainStyle = { dark: "#17161D", light: "#FFFFFF", errorCorrectionLevel: "M" };
type Tx = Prisma.TransactionClient;
async function folderDepth(tx: Tx, workspaceId: string, id: string | null | undefined) {
  let depth = 0;
  for (; id; depth++) {
    const parent: { parentId: string | null } | null = await tx.folder.findFirst({ where: { id, workspaceId }, select: { parentId: true } });
    if (!parent) throw new ApiError(404, "Folder not found.");
    id = parent.parentId;
  }
  return depth;
}
/** Finds or creates each folder of a path such as "Book / Chapter 1" under a starting folder. */
async function folderPathId(tx: Tx, workspaceId: string, path: string, base: string | null, cache: Map<string, string | null>) {
  const key = `${base}|${path}`;
  if (cache.has(key)) return cache.get(key)!;
  let parentId = base;
  for (const part of path.split("/").map((item) => item.trim()).filter(Boolean).slice(0, 4)) {
    const found = await tx.folder.findFirst({ where: { workspaceId, parentId, name: part.slice(0, 100) }, select: { id: true } });
    parentId = (found || (await tx.folder.create({ data: { workspaceId, parentId, name: part.slice(0, 100) } }))).id;
  }
  cache.set(key, parentId);
  return parentId;
}
/** Every folder id in a folder's tree. */
async function folderTree(tx: Tx, workspaceId: string, id: string) {
  const all = await tx.folder.findMany({ where: { workspaceId }, select: { id: true, parentId: true } });
  const ids = [id];
  for (const item of ids) ids.push(...all.filter((folder) => folder.parentId === item).map((folder) => folder.id));
  return ids;
}
/** Moves one row to a 1-based place, reusing the list's own position values, and returns only rows that change. */
function place<T extends { id: string; position: number }>(rows: T[], id: string, index: number) {
  const slots = rows.map((row) => row.position).sort((a, b) => a - b);
  for (let i = 1; i < slots.length; i++) if (slots[i] <= slots[i - 1]) slots[i] = slots[i - 1] + 1;
  const from = rows.findIndex((row) => row.id === id);
  if (from < 0) throw new ApiError(404, "Item not found.");
  const order = rows.slice();
  const [moved] = order.splice(from, 1);
  order.splice(Math.min(order.length, Math.max(0, index - 1)), 0, moved);
  return order.map((row, i) => ({ id: row.id, position: slots[i] })).filter((row, i) => row.position !== order[i].position);
}

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
          position: [{ position: "asc" }, { number: "asc" }] as Prisma.QRCodeOrderByWithRelationInput[],
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
      prisma.folder.findMany({ where: { workspaceId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], take: 2000, select: { id: true, parentId: true, name: true, kind: true, position: true, _count: { select: { qrCodes: { where: { deletedAt: null } } } } } }),
    ]);
    const atHome = user.workspaceId === user.homeWorkspaceId;
    // The platform owner's own workspace has no limits at all.
    if (atHome && user.platformAdmin && user.workspace.plan !== "owner")
      user.workspace = await prisma.workspace.update({ where: { id: workspaceId }, data: { plan: "owner", paidUntil: null } });
    const acct = await account(prisma, user.workspace);
    const manages = user.platformAdmin || (user.homeWorkspaceId === acct.root.id && user.role === "owner");
    const [used, plans, panels] = await Promise.all([
      usage(prisma, acct.ids),
      prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sort: "asc" } }),
      manages || (user.homeWorkspaceId === acct.root.id && user.role === "admin")
        ? prisma.workspace.findMany({ where: { parentId: acct.root.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, createdAt: true, _count: { select: { qrCodes: { where: { deletedAt: null } }, users: true } } } })
        : [],
    ]);
    // Renewal reminders and domain health checks ride on panel traffic, after the response is sent.
    after(() => runMaintenance().catch(() => {}));
    return json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        platformAdmin: user.platformAdmin,
      },
      workspace: {
        id: user.workspace.id,
        name: user.workspace.name,
        plan: acct.planId,
        planName: acct.planId === "owner" ? "Owner" : plans.find((item) => item.id === acct.planId)?.name || acct.planId,
        paidUntil: acct.root.paidUntil,
        lapsedPlan: acct.planId === "free" && acct.root.plan !== "free" ? acct.root.plan : null,
        isPanel: !!user.workspace.parentId,
        accountName: acct.root.name,
      },
      account: {
        manages,
        panels: panels.map((panel) => ({ ...panel, current: panel.id === user.workspaceId })),
        rootId: acct.root.id,
        homeId: user.homeWorkspaceId,
        homeName: user.homeWorkspaceName,
        visiting: !atHome,
      },
      usage: used,
      plans,
      domain: manages
        ? { name: acct.root.customDomain, status: acct.root.domainStatus, token: acct.root.domainToken, use: acct.root.useCustomDomain, checkedAt: acct.root.domainCheckedAt, target: new URL(process.env.APP_URL!).hostname }
        : null,
      linkBase: linkBase(acct.root),
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
      limits: acct.limits,
      checkoutReady: await checkoutConfigured(),
      appUrl: process.env.APP_URL,
      notifications: await prisma.notification
        .findMany({ where: { OR: [{ workspaceId: null }, { workspaceId: acct.root.id }] }, orderBy: { createdAt: "desc" }, take: 30 })
        .then((items) => ({ items, unread: items.filter((item) => !user.notificationsSeenAt || item.createdAt > user.notificationsSeenAt).length })),
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
    if (input.action.startsWith("domain.")) return json(await domainAction(user, input));
    const result = await prisma.$transaction(async (tx) => {
      // A workspace row lock serializes quota checks and creates in every instance.
      const workspace = await tx.workspace.update({
        where: { id: workspaceId },
        data: { updatedAt: new Date() },
      });
      if (workspace.suspended)
        throw new ApiError(403, "This workspace is suspended.");
      // Limits belong to the client's whole account (main panel plus its panels), so lock its root too.
      const acct = await account(tx, workspace);
      if (acct.root.id !== workspace.id) await tx.workspace.update({ where: { id: acct.root.id }, data: { updatedAt: new Date() } });
      const quota = acct.limits;
      const ids = acct.ids;
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
          const now = await usage(tx, ids);
          if (over(quota.codes, now.codes)) throw new ApiError(409, "Your plan QR limit has been reached. Upgrade your plan under Plan & billing to make more.");
          requireStorage(quota, now.storageBytes, 600);
          // The workspace row is locked by this transaction, so numbers never repeat or skip under load.
          const { qrSeq } = await tx.workspace.update({ where: { id: workspaceId }, data: { qrSeq: { increment: 1 } } });
          entity = await tx.qRCode.create({
            data: {
              ...qrData,
              number: qrSeq,
              position: qrSeq,
              campaignId: campaignId || null,
              workspaceId,
              shortCode: newCode(),
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
          if (data.op === "restore" && over(quota.codes, await tx.qRCode.count({ where: { workspaceId: { in: ids }, deletedAt: null } }), await tx.qRCode.count({ where: scope })))
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
        // Sub-folders go with it. The codes inside are kept unfiled, or moved to the trash when asked.
        if (z.object({ trashCodes: z.boolean() }).safeParse(input.data).data?.trashCodes) {
          if (!(await tx.folder.findFirst({ where: { id: input.id, workspaceId } }))) throw new ApiError(404, "Folder not found.");
          await tx.qRCode.updateMany({ where: { workspaceId, deletedAt: null, folderId: { in: await folderTree(tx, workspaceId, input.id) } }, data: { deletedAt: new Date() } });
        }
        entity = await tx.folder.deleteMany({ where: { id: input.id, workspaceId } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "Folder not found.");
      } else if (input.action === "folder.place") {
        // Drag-and-drop or a typed number: put a folder at a place among its siblings.
        const data = z.object({ index: z.number().int().min(1).max(5000) }).parse(input.data);
        const folder = await tx.folder.findFirst({ where: { id: input.id, workspaceId }, select: { parentId: true } });
        if (!folder) throw new ApiError(404, "Folder not found.");
        const siblings = await tx.folder.findMany({ where: { workspaceId, parentId: folder.parentId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
        const order = siblings.filter((item) => item.id !== input.id);
        order.splice(Math.min(order.length, data.index - 1), 0, { id: input.id! });
        for (const [i, item] of order.entries()) await tx.folder.update({ where: { id: item.id }, data: { position: i + 1 } });
        entity = { id: input.id! };
      } else if (input.action === "qr.place") {
        // Manual order inside a folder (and its sub-folders): move one code to a 1-based place.
        const data = z.object({ index: z.number().int().min(1).max(100000), folder: z.string().max(80) }).parse(input.data);
        const scope = data.folder === "none" ? { folderId: null } : { folderId: { in: await folderTree(tx, workspaceId, data.folder) } };
        const rows = await tx.qRCode.findMany({ where: { workspaceId, deletedAt: null, ...scope }, orderBy: [{ position: "asc" }, { number: "asc" }], select: { id: true, position: true }, take: 20000 });
        for (const row of place(rows, input.id || "", data.index)) await tx.qRCode.update({ where: { id: row.id }, data: { position: row.position } });
        entity = { id: input.id! };
      } else if (input.action === "codes.bulk") {
        // Many numbered codes in one folder, e.g. questions 21 to 40 of a chapter.
        const data = z
          .object({
            folderId: z.string().max(80).nullable(),
            start: z.number().int().min(0).max(100000),
            count: z.number().int().min(1).max(1000),
            title: z.string().trim().min(1).max(90),
            urlTemplate: z.string().trim().max(1500).optional().default(""),
          })
          .parse(input.data);
        if (data.folderId) await folderDepth(tx, workspaceId, data.folderId);
        const fill = (n: number) => data.urlTemplate.replaceAll("{n}", String(n)).replaceAll("{question}", String(n));
        if (data.urlTemplate && !destination.safeParse(fill(data.start)).success) throw new ApiError(400, "Use a public http or https address for the link.");
        if (data.urlTemplate && new URL(fill(data.start)).origin === new URL(process.env.APP_URL!).origin && new URL(fill(data.start)).pathname.startsWith("/s/"))
          throw new ApiError(400, "A QR cannot redirect to another QR resolver on this site.");
        const now = await usage(tx, ids);
        requireStorage(quota, now.storageBytes, data.count * 600);
        if (over(quota.codes, now.codes, data.count)) throw new ApiError(409, `These ${data.count} codes would go over your plan's QR limit.`);
        const { qrSeq } = await tx.workspace.update({ where: { id: workspaceId }, data: { qrSeq: { increment: data.count } } });
        let number = qrSeq - data.count;
        await tx.qRCode.createMany({
          data: Array.from({ length: data.count }, (_, i) => {
            const shortCode = newCode();
            const title = data.title.includes("{n}") ? data.title.replaceAll("{n}", String(data.start + i)) : `${data.title} ${data.start + i}`;
            number++;
            return { workspaceId, folderId: data.folderId, number, position: number, title: title.slice(0, 100), targetUrl: data.urlTemplate ? fill(data.start + i) : pending(shortCode), shortCode, styling: plainStyle, routingRules: {} };
          }),
        });
        entity = { id: data.folderId || workspaceId };
      } else if (input.action === "book.create") {
        // One book = one folder, one sub-folder per chapter, one dynamic code per question.
        const data = z
          .object({
            title: name,
            urlTemplate: z.string().trim().max(1500).optional().default(""),
            parentId: z.string().max(80).nullable().optional(),
            chapters: z.array(z.object({ name, questions: z.number().int().min(1).max(200) })).min(1).max(60),
          })
          .parse(input.data);
        const total = data.chapters.reduce((sum, chapter) => sum + chapter.questions, 0);
        if (total > 1000) throw new ApiError(400, "Create at most 1,000 codes at a time. Split the book into two parts.");
        const fill = (chapter: number, question: number) => data.urlTemplate.replaceAll("{chapter}", String(chapter)).replaceAll("{question}", String(question));
        if (data.parentId && (await folderDepth(tx, workspaceId, data.parentId)) > 3) throw new ApiError(400, "Folders can be nested up to five levels, so pick a higher folder for this book.");
        if (data.urlTemplate && !destination.safeParse(fill(1, 1)).success) throw new ApiError(400, "Use a public http or https address for the link.");
        if (data.urlTemplate && new URL(fill(1, 1)).origin === new URL(process.env.APP_URL!).origin && new URL(fill(1, 1)).pathname.startsWith("/s/"))
          throw new ApiError(400, "A QR cannot redirect to another QR resolver on this site.");
        requireFeature(quota, "allowBooks", "Book QR");
        const now = await usage(tx, ids);
        requireStorage(quota, now.storageBytes, total * 600);
        if (over(quota.codes, now.codes, total))
          throw new ApiError(409, `This book needs ${total} codes, which is more than your plan has left.`);
        const book = await tx.folder.create({ data: { name: data.title, kind: "book", parentId: data.parentId || null, workspaceId } });
        const chapters = data.chapters.map((chapter, index) => ({ id: randomUUID(), name: chapter.name, kind: "chapter", parentId: book.id, workspaceId, position: index + 1 }));
        await tx.folder.createMany({ data: chapters });
        const { qrSeq } = await tx.workspace.update({ where: { id: workspaceId }, data: { qrSeq: { increment: total } } });
        let number = qrSeq - total;
        await tx.qRCode.createMany({
          data: data.chapters.flatMap((chapter, index) =>
            Array.from({ length: chapter.questions }, (_, question) => {
              const shortCode = newCode();
              number++;
              return {
                workspaceId,
                folderId: chapters[index].id,
                number,
                position: number,
                title: `${chapter.name} · Q${question + 1}`.slice(0, 100),
                targetUrl: data.urlTemplate ? fill(index + 1, question + 1) : pending(shortCode),
                shortCode,
                styling: plainStyle,
                routingRules: {},
              };
            }),
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
          over(quota.systems, await tx.system.count({ where: { workspaceId: { in: ids } } }))
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
            over(quota.records, await tx.record.count({ where: { system: { workspaceId: { in: ids } } } }))
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
        requireFeature(quota, "allowApi", "API access");
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
        requireFeature(quota, "allowApi", "API access");
        const data = z.object({ label: name }).parse(input.data);
        oneTimeSecret = `qrm_live_${randomBytes(24).toString("base64url")}`;
        entity = await tx.apiKey.create({ data: { ...data, workspaceId, prefix: oneTimeSecret.slice(0, 18), tokenHash: createHash("sha256").update(oneTimeSecret).digest("hex") } });
      } else if (input.action === "apiKey.revoke") {
        if (!input.id) throw new ApiError(400, "API key is required.");
        entity = await tx.apiKey.updateMany({ where: { id: input.id, workspaceId, revokedAt: null }, data: { revokedAt: new Date() } }).then((r) => (r.count ? { id: input.id! } : null));
        if (!entity) throw new ApiError(404, "API key not found.");
      } else if (input.action === "team.invite") {
        if (user.role !== "owner") throw new ApiError(403, "Only the workspace owner can invite members.");
        const now = await usage(tx, ids);
        if (over(quota.members, now.members + now.invites)) throw new ApiError(409, "Your plan's team member limit has been reached.");
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
      } else if (input.action.startsWith("panel.")) {
        if (!(user.platformAdmin || (user.homeWorkspaceId === acct.root.id && user.role === "owner")))
          throw new ApiError(403, "Only the account owner can manage panels.");
        if (input.action === "panel.create") {
          if (over(quota.panels, ids.length - 1)) throw new ApiError(409, "Your plan's panel limit has been reached.");
          entity = await tx.workspace.create({ data: { name: name.parse(input.data), slug: `panel-${randomBytes(10).toString("hex")}`, parentId: acct.root.id } });
        } else if (input.action === "panel.rename" || input.action === "panel.delete") {
          if (!input.id) throw new ApiError(400, "Panel is required.");
          if (input.action === "panel.delete" && input.id === workspaceId) throw new ApiError(400, "Switch to another panel before deleting this one.");
          const scope = { id: input.id, parentId: acct.root.id };
          const changed = input.action === "panel.rename" ? await tx.workspace.updateMany({ where: scope, data: { name: name.parse(input.data) } }) : await tx.workspace.deleteMany({ where: scope });
          entity = changed.count ? { id: input.id } : null;
          if (!entity) throw new ApiError(404, "Panel not found.");
        } else throw new ApiError(400, "Unsupported action.");
      } else if (input.action === "qr.duplicate") {
        const source = await tx.qRCode.findFirst({ where: { id: input.id, workspaceId, deletedAt: null }, include: { tags: true } });
        if (!source) throw new ApiError(404, "QR not found.");
        const now = await usage(tx, ids);
        if (over(quota.codes, now.codes)) throw new ApiError(409, "Your plan QR limit has been reached. Upgrade your plan under Plan & billing to make more.");
        requireStorage(quota, now.storageBytes, 600);
        const { qrSeq } = await tx.workspace.update({ where: { id: workspaceId }, data: { qrSeq: { increment: 1 } } });
        entity = await tx.qRCode.create({
          data: {
            workspaceId,
            number: qrSeq,
            position: source.position,
            title: `${source.title} (copy)`.slice(0, 100),
            type: source.type,
            targetUrl: source.targetUrl,
            routingRules: (source.routingRules ?? {}) as Prisma.InputJsonValue,
            styling: (source.styling ?? {}) as Prisma.InputJsonValue,
            folderId: source.folderId,
            recordId: source.recordId,
            campaignId: source.campaignId,
            shortCode: randomBytes(9).toString("base64url"),
            tags: { create: source.tags.map((item) => ({ tagId: item.tagId })) },
          },
        });
      } else if (input.action === "qr.import") {
        // Rows from CSV, Excel, Word or a YouTube playlist. A row with the number of an existing code updates it.
        const data = z
          .object({
            folderId: z.string().max(80).nullable().optional(),
            rows: z
              .array(
                z.object({
                  number: z.number().int().positive().optional(),
                  title: name,
                  url: z.string().trim().max(2048).optional().transform((value) => value || undefined).pipe(destination.optional()),
                  folder: z.string().trim().max(400).optional().transform((value) => value || undefined),
                }),
              )
              .min(1)
              .max(250),
          })
          .parse(Array.isArray(input.data) ? { rows: input.data } : input.data);
        const app = new URL(process.env.APP_URL!);
        if (data.rows.some((row) => row.url && new URL(row.url).origin === app.origin && new URL(row.url).pathname.startsWith("/s/")))
          throw new ApiError(400, "A QR cannot redirect to another QR resolver on this site.");
        const base = data.folderId || null;
        if (base) await folderDepth(tx, workspaceId, base);
        const cache = new Map<string, string | null>();
        const existing = new Map(
          (await tx.qRCode.findMany({ where: { workspaceId, deletedAt: null, number: { in: data.rows.flatMap((row) => (row.number ? [row.number] : [])) } }, select: { id: true, number: true, type: true } })).map((qr) => [qr.number, qr]),
        );
        const fresh = data.rows.filter((row) => !row.number || !existing.has(row.number));
        const now = await usage(tx, ids);
        if (over(quota.codes, now.codes, fresh.length)) throw new ApiError(409, `These ${fresh.length} codes would go over your plan's QR limit.`);
        requireStorage(quota, now.storageBytes, fresh.length * 600);
        for (const row of data.rows) {
          const qr = row.number ? existing.get(row.number) : undefined;
          if (!qr) continue;
          await tx.qRCode.update({
            where: { id: qr.id },
            // Updates change only the title and link, so re-importing an export never moves codes between folders.
            data: { title: row.title, ...(row.url && qr.type === "dynamic_url" ? { targetUrl: row.url } : {}) },
          });
        }
        const { qrSeq } = await tx.workspace.update({ where: { id: workspaceId }, data: { qrSeq: { increment: fresh.length } } });
        let number = qrSeq - fresh.length;
        const created = [];
        for (const row of fresh) {
          const shortCode = newCode();
          number++;
          created.push({
            workspaceId,
            number,
            position: number,
            title: row.title,
            targetUrl: row.url || pending(shortCode),
            folderId: row.folder ? await folderPathId(tx, workspaceId, row.folder, base, cache) : base,
            shortCode,
            styling: plainStyle,
            routingRules: {},
          });
        }
        if (created.length) await tx.qRCode.createMany({ data: created });
        entity = { id: workspaceId };
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

/** Custom domain set-up. Runs outside the write transaction because it does DNS and HTTPS lookups. */
async function domainAction(user: Awaited<ReturnType<typeof authorize>>, input: { action: string; data?: unknown }) {
  const acct = await account(prisma, user.workspace);
  if (!(user.platformAdmin || (user.homeWorkspaceId === acct.root.id && user.role === "owner")))
    throw new ApiError(403, "Only the account owner can set up a custom domain.");
  requireFeature(acct.limits, "allowDomain", "Custom domains");
  const root = acct.root;
  let result: Record<string, unknown> = { ok: true };
  if (input.action === "domain.save") {
    const domain = z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "Enter a domain such as qr.yourbrand.com.")
      .parse(input.data);
    if (domain === new URL(process.env.APP_URL!).hostname) throw new ApiError(400, "That is already the main domain.");
    await prisma.workspace.update({ where: { id: root.id }, data: { customDomain: domain, domainToken: `qrm-${randomBytes(12).toString("hex")}`, domainStatus: "pending", useCustomDomain: false, domainCheckedAt: null } });
  } else if (input.action === "domain.check") {
    if (!root.customDomain) throw new ApiError(400, "Add a domain first.");
    await rateLimit(`domain:${root.id}`, 20, 3600);
    const { txt, live } = await probeDomain(root.customDomain, root.domainToken);
    const status = txt && live ? "verified" : root.domainStatus === "verified" ? "failing" : "pending";
    await prisma.workspace.update({ where: { id: root.id }, data: { domainStatus: status, domainCheckedAt: new Date() } });
    result = { ok: true, txt, live, status };
  } else if (input.action === "domain.use") {
    const on = z.boolean().parse(input.data);
    if (on && root.domainStatus !== "verified") throw new ApiError(409, "Verify the domain before using it in QR codes.");
    await prisma.workspace.update({ where: { id: root.id }, data: { useCustomDomain: on } });
  } else if (input.action === "domain.remove") {
    await prisma.workspace.update({ where: { id: root.id }, data: { customDomain: null, domainToken: null, domainStatus: "none", useCustomDomain: false, domainCheckedAt: null } });
  } else throw new ApiError(400, "Unsupported action.");
  await prisma.auditLog.create({ data: { workspaceId: user.workspaceId, actorId: user.id, action: input.action, entityId: root.id } });
  return result;
}
