import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { authorize, body, json, failure, ApiError } from "@/lib/http";
import { effectivePlan, name } from "@/lib/validation";
import { FEATURE_KEYS, LIMIT_KEYS, storageOf } from "@/lib/plans";
import { getSite, siteSchema } from "@/lib/site";
import { runMaintenance } from "@/lib/maintenance";
import { paymentKeys, razorpay, settle } from "@/lib/payments";
import { openSecret, saveSetting, sealSecret, setting } from "@/lib/secrets";
import { emailStatus, sendEmail, sendPaymentReceipt, testEmail, type EmailSettings } from "@/lib/email";
import { BRAND } from "@/lib/brand";

const DAY = 86400000;
async function owner() {
  const user = await authorize();
  if (!user.platformAdmin) throw new ApiError(403, "Platform owner access is required.");
  return user;
}

export async function GET() {
  try {
    await owner();
    const [workspaces, owners, live, all, members, folders, systems, activity, plans, payments, lastRun, site] = await Promise.all([
      prisma.workspace.findMany({ select: { id: true, parentId: true, name: true, plan: true, paidUntil: true, suspended: true, createdAt: true, customLimits: true, notes: true, customDomain: true, domainStatus: true, remindedAt: true } }),
      prisma.user.findMany({ where: { role: "owner" }, select: { workspaceId: true, name: true, email: true, platformAdmin: true } }),
      prisma.qRCode.groupBy({ by: ["workspaceId"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.qRCode.groupBy({ by: ["workspaceId"], _count: { _all: true }, _sum: { scanCount: true } }),
      prisma.user.groupBy({ by: ["workspaceId"], _count: { _all: true } }),
      prisma.folder.groupBy({ by: ["workspaceId"], _count: { _all: true } }),
      prisma.system.findMany({ select: { workspaceId: true, _count: { select: { records: true } } } }),
      prisma.auditLog.groupBy({ by: ["workspaceId"], _max: { createdAt: true } }),
      prisma.plan.findMany({ orderBy: { sort: "asc" } }),
      prisma.payment.findMany({ where: { status: "paid" }, orderBy: { createdAt: "desc" }, take: 300, select: { id: true, workspaceId: true, plan: true, amount: true, method: true, note: true, createdAt: true, paidAt: true } }),
      prisma.siteSetting.findUnique({ where: { key: "maintenance.lastRun" } }),
      getSite(),
    ]);
    // Panels roll up into the client account (root workspace) they belong to.
    const rootOf = new Map(workspaces.map((workspace) => [workspace.id, workspace.parentId || workspace.id]));
    const tally = new Map<string, { codes: number; allCodes: number; scans: number; members: number; folders: number; systems: number; records: number; panels: number; lastActive: Date | null }>();
    const slot = (id: string) => {
      const root = rootOf.get(id) || id;
      if (!tally.has(root)) tally.set(root, { codes: 0, allCodes: 0, scans: 0, members: 0, folders: 0, systems: 0, records: 0, panels: 0, lastActive: null });
      return tally.get(root)!;
    };
    for (const row of live) slot(row.workspaceId).codes += row._count._all;
    for (const row of all) (slot(row.workspaceId).allCodes += row._count._all), (slot(row.workspaceId).scans += row._sum.scanCount || 0);
    for (const row of members) slot(row.workspaceId).members += row._count._all;
    for (const row of folders) slot(row.workspaceId).folders += row._count._all;
    for (const row of systems) (slot(row.workspaceId).systems += 1), (slot(row.workspaceId).records += row._count.records);
    for (const row of activity) {
      const entry = slot(row.workspaceId);
      if (row._max.createdAt && (!entry.lastActive || row._max.createdAt > entry.lastActive)) entry.lastActive = row._max.createdAt;
    }
    for (const workspace of workspaces) if (workspace.parentId) slot(workspace.id).panels += 1;
    const ownerOf = new Map(owners.map((user) => [user.workspaceId, user]));
    const now = Date.now();
    const clients = workspaces
      .filter((workspace) => !workspace.parentId)
      .map((workspace) => {
        const t = slot(workspace.id);
        const plan = effectivePlan(workspace);
        return {
          ...workspace,
          effectivePlan: plan,
          owner: ownerOf.get(workspace.id) || null,
          isPlatform: !!ownerOf.get(workspace.id)?.platformAdmin,
          status: workspace.suspended ? "suspended" : plan !== workspace.plan ? "expired" : workspace.paidUntil && workspace.paidUntil.getTime() - now < 7 * DAY ? "expiring" : plan === "free" ? "free" : "active",
          usage: { ...t, storageBytes: storageOf({ codes: t.allCodes, records: t.records, scans: t.scans, folders: t.folders, systems: t.systems }) },
          payments: payments.filter((payment) => payment.workspaceId === workspace.id).slice(0, 20),
        };
      })
      .sort((a, b) => +b.createdAt - +a.createdAt);
    const thirty = payments.filter((payment) => +payment.createdAt > now - 30 * DAY);
    return json({
      clients,
      plans: plans.map((plan) => ({ ...plan, clients: clients.filter((client) => client.effectivePlan === plan.id).length })),
      totals: {
        clients: clients.filter((client) => !client.isPlatform).length,
        active: clients.filter((client) => !client.isPlatform && (client.status === "active" || client.status === "expiring")).length,
        expiring: clients.filter((client) => client.status === "expiring").length,
        expired: clients.filter((client) => client.status === "expired").length,
        suspended: clients.filter((client) => client.status === "suspended").length,
        codes: clients.reduce((sum, client) => sum + client.usage.codes, 0),
        scans: clients.reduce((sum, client) => sum + client.usage.scans, 0),
        revenue30: thirty.reduce((sum, payment) => sum + payment.amount, 0),
        revenueAll: payments.reduce((sum, payment) => sum + payment.amount, 0),
      },
      maintenanceRun: lastRun?.value || null,
      site,
      // Every purchase, paid or not, for the Payments screen.
      orders: (
        await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 1000, select: { id: true, workspaceId: true, orderId: true, paymentId: true, status: true, plan: true, amount: true, currency: true, method: true, note: true, createdAt: true, paidAt: true } })
      ).map((order) => ({ ...order, client: workspaces.find((workspace) => workspace.id === order.workspaceId)?.name || "Deleted client", email: ownerOf.get(order.workspaceId)?.email || "" })),
      email: { ...(await emailStatus()), saved: await setting<EmailSettings>("email").then((saved) => (saved ? { provider: saved.provider, from: saved.from, host: saved.host || "", port: saved.port || 465, user: saved.user || "", hasSecret: !!(saved.pass || saved.resendKey) } : null)) },
      security: { loginOtp: (await setting<{ loginOtp?: string }>("security"))?.loginOtp || "off" },
      notifications: await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      gateway: await paymentKeys().then((keys) => ({ source: keys.source, keyId: keys.keyId ? `${keys.keyId.slice(0, 12)}…` : "", live: keys.keyId.startsWith("rzp_live_"), webhook: !!keys.webhookSecret, webhookUrl: `${process.env.APP_URL}/api/billing/webhook` })),
    });
  } catch (error) {
    return failure(error);
  }
}

const limitValue = z.number().int().min(0).max(100000000).nullable();
const planSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/, "Use a short id of lowercase letters, digits and dashes.").refine((id) => id !== "owner", "That id is reserved."),
  name,
  description: z.string().trim().max(200).nullable().optional(),
  pricePaise: z.number().int().min(0).max(100000000),
  days: z.number().int().min(1).max(3660),
  codes: limitValue,
  systems: limitValue,
  records: limitValue,
  storageMb: limitValue,
  panels: limitValue,
  members: limitValue,
  allowApi: z.boolean(),
  allowBooks: z.boolean(),
  allowDomain: z.boolean(),
  isPublic: z.boolean(),
  sort: z.number().int().min(0).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    const user = await owner();
    const input = z.object({ action: z.string(), id: z.string().max(100).optional(), data: z.unknown().optional() }).parse(await body(request));
    const client = async () => {
      const workspace = input.id ? await prisma.workspace.findFirst({ where: { id: input.id, parentId: null } }) : null;
      if (!workspace) throw new ApiError(404, "Client not found.");
      return workspace;
    };
    let result: unknown = { ok: true };
    if (input.action === "client.suspend") {
      const workspace = await client();
      if (workspace.id === user.homeWorkspaceId) throw new ApiError(400, "You cannot suspend your own workspace.");
      const suspended = z.boolean().parse(input.data);
      // A client's panels follow its main account, so their codes stop or resume together.
      await prisma.workspace.updateMany({ where: { OR: [{ id: workspace.id }, { parentId: workspace.id }] }, data: { suspended } });
      if (suspended) await prisma.session.deleteMany({ where: { user: { workspace: { OR: [{ id: workspace.id }, { parentId: workspace.id }] } } } });
    } else if (input.action === "client.plan") {
      const workspace = await client();
      const data = z.object({ plan: z.string().max(40), days: z.number().int().min(1).max(3660).default(30) }).parse(input.data);
      if (!(await prisma.plan.findUnique({ where: { id: data.plan } }))) throw new ApiError(404, "Plan not found.");
      await prisma.workspace.update({ where: { id: workspace.id }, data: data.plan === "free" ? { plan: "free", paidUntil: null } : { plan: data.plan, paidUntil: new Date(Date.now() + data.days * DAY), remindedAt: null } });
    } else if (input.action === "client.extend") {
      const workspace = await client();
      const days = z.number().int().min(1).max(3660).parse(input.data);
      if (["free", "owner"].includes(workspace.plan)) throw new ApiError(400, "Choose a paid plan for this client first.");
      const start = Math.max(Date.now(), workspace.paidUntil?.getTime() || 0);
      await prisma.workspace.update({ where: { id: workspace.id }, data: { paidUntil: new Date(start + days * DAY), remindedAt: null } });
    } else if (input.action === "client.payment") {
      // A payment received outside the site (cash, UPI, bank transfer), optionally extending the plan.
      const workspace = await client();
      const data = z
        .object({ amount: z.number().positive().max(10000000), method: z.enum(["cash", "upi", "bank", "card", "other"]), note: z.string().trim().max(190).optional(), plan: z.string().max(40).optional(), days: z.number().int().min(0).max(3660) })
        .parse(input.data);
      const plan = data.plan || workspace.plan;
      if (data.days && (plan === "free" || plan === "owner" || !(await prisma.plan.findUnique({ where: { id: plan } })))) throw new ApiError(400, "Choose a paid plan to extend.");
      await prisma.$transaction(async (tx) => {
        await tx.payment.create({ data: { workspaceId: workspace.id, orderId: `manual_${randomUUID()}`, plan, amount: Math.round(data.amount * 100), status: "paid", paidAt: new Date(), method: data.method, note: data.note || null } });
        if (data.days) {
          const start = workspace.plan === plan ? Math.max(Date.now(), workspace.paidUntil?.getTime() || 0) : Date.now();
          await tx.workspace.update({ where: { id: workspace.id }, data: { plan, paidUntil: new Date(start + data.days * DAY), remindedAt: null } });
        }
      });
      // The client gets a receipt by email and a notification in their panel.
      const fresh = await prisma.workspace.findUniqueOrThrow({ where: { id: workspace.id } });
      await prisma.notification.create({ data: { workspaceId: workspace.id, kind: "billing", title: "Payment received", body: `We received ₹${data.amount.toLocaleString("en-IN")} by ${data.method.toUpperCase()}. Thank you!`, link: "#billing" } });
      for (const owner of await prisma.user.findMany({ where: { workspaceId: workspace.id, role: "owner" }, select: { email: true } }))
        await sendPaymentReceipt(owner.email, { plan, amountPaise: Math.round(data.amount * 100), until: data.days ? fresh.paidUntil : null, reference: data.note });
    } else if (input.action === "client.limits") {
      const workspace = await client();
      // Keys left out follow the plan; a null limit means unlimited.
      const limits = z
        .object({ ...Object.fromEntries(LIMIT_KEYS.map((key) => [key, limitValue.optional()])), ...Object.fromEntries(FEATURE_KEYS.map((key) => [key, z.boolean().optional()])) })
        .strict()
        .parse(input.data);
      const clean = Object.fromEntries(Object.entries(limits).filter(([, value]) => value !== undefined));
      await prisma.workspace.update({ where: { id: workspace.id }, data: { customLimits: Object.keys(clean).length ? clean : undefined } });
      if (!Object.keys(clean).length) await prisma.$executeRaw`UPDATE workspaces SET customLimits = NULL WHERE id = ${workspace.id}`;
    } else if (input.action === "client.notes") {
      const workspace = await client();
      await prisma.workspace.update({ where: { id: workspace.id }, data: { notes: z.string().max(5000).parse(input.data) || null } });
    } else if (input.action === "plan.save") {
      const plan = planSchema.parse(input.data);
      await prisma.plan.upsert({ where: { id: plan.id }, create: plan, update: plan });
      revalidatePath("/");
    } else if (input.action === "plan.delete") {
      const id = z.string().max(40).parse(input.id);
      if (id === "free") throw new ApiError(400, "The Free plan is the fallback for every client and cannot be deleted.");
      const using = await prisma.workspace.count({ where: { plan: id } });
      if (using) throw new ApiError(409, `${using} ${using === 1 ? "client is" : "clients are"} on this plan. Move them first, or hide the plan instead.`);
      await prisma.plan.deleteMany({ where: { id } });
      revalidatePath("/");
    } else if (input.action === "site.save") {
      const site = siteSchema.parse(input.data);
      await prisma.siteSetting.upsert({ where: { key: "site" }, create: { key: "site", value: site }, update: { value: site } });
      revalidatePath("/");
    } else if (input.action === "razorpay.save") {
      // Saved encrypted; the secrets are never sent back to the browser.
      const data = z.object({ keyId: z.string().trim().regex(/^rzp_(test|live)_[A-Za-z0-9]{6,40}$/, "The Key ID starts with rzp_test_ or rzp_live_."), keySecret: z.string().trim().min(10).max(100), webhookSecret: z.string().trim().max(100).optional() }).parse(input.data);
      await razorpay("orders?count=1", undefined, { keyId: data.keyId, keySecret: data.keySecret, webhookSecret: "", source: "panel" }).catch(() => {
        throw new ApiError(400, "Razorpay refused these keys. Copy the Key ID and Key Secret again from Razorpay Dashboard → Account & Settings → API Keys.");
      });
      const value = { keyId: data.keyId, keySecret: sealSecret(data.keySecret), webhookSecret: data.webhookSecret ? sealSecret(data.webhookSecret) : "" };
      await saveSetting("razorpay", value);
    } else if (input.action === "email.save" || input.action === "email.test") {
      const data = z
        .object({
          provider: z.enum(["smtp", "resend"]),
          from: z.string().trim().min(3).max(200),
          resendKey: z.string().trim().max(200).optional(),
          host: z.string().trim().max(200).optional(),
          port: z.number().int().min(1).max(65535).optional(),
          user: z.string().trim().max(200).optional(),
          pass: z.string().max(200).optional(),
          to: z.string().email().optional(),
        })
        .parse(input.data);
      // A blank password or key keeps the one saved before.
      const saved = await setting<EmailSettings>("email");
      const plain: EmailSettings = { provider: data.provider, from: data.from, host: data.host, port: data.port, user: data.user, resendKey: data.resendKey || openSecret(saved?.resendKey), pass: data.pass || openSecret(saved?.pass) };
      if (input.action === "email.test") {
        await testEmail(plain, data.to || user.email).catch((error) => {
          throw new ApiError(400, `The test email failed: ${error instanceof Error ? error.message : "unknown error"}`);
        });
        result = { ok: true, sentTo: data.to || user.email };
      } else await saveSetting("email", { ...plain, resendKey: plain.resendKey ? sealSecret(plain.resendKey) : "", pass: plain.pass ? sealSecret(plain.pass) : "" });
    } else if (input.action === "security.save") {
      await saveSetting("security", z.object({ loginOtp: z.enum(["off", "owners", "all"]) }).parse(input.data));
    } else if (input.action === "notification.send") {
      const data = z
        .object({ title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(2000), link: z.string().trim().max(190).optional(), kind: z.enum(["update", "feature", "billing", "alert"]), audience: z.string().max(100), email: z.boolean().optional() })
        .parse(input.data);
      const target = data.audience === "all" ? null : (await prisma.workspace.findFirst({ where: { id: data.audience, parentId: null }, select: { id: true } }))?.id;
      if (target === undefined) throw new ApiError(404, "Client not found.");
      await prisma.notification.create({ data: { workspaceId: target, title: data.title, body: data.body, link: data.link || null, kind: data.kind } });
      let emailed = 0;
      if (data.email) {
        const owners = await prisma.user.findMany({ where: { role: "owner", platformAdmin: false, ...(target ? { workspaceId: target } : { workspace: { parentId: null } }) }, select: { email: true }, take: 5000 });
        for (const owner of owners) if (await sendEmail(owner.email, `${BRAND}: ${data.title}`, `${data.body}${data.link ? `

${data.link}` : ""}

Open your panel: ${process.env.APP_URL}/dashboard`)) emailed++;
      }
      result = { ok: true, emailed };
    } else if (input.action === "notification.delete") {
      await prisma.notification.deleteMany({ where: { id: input.id || "" } });
    } else if (input.action === "client.email") {
      // Manual emails to one client: renewal reminder, plan ended, payment receipt or a custom message.
      const workspace = await client();
      const data = z.object({ kind: z.enum(["reminder", "expired", "receipt", "custom"]), subject: z.string().trim().max(150).optional(), text: z.string().trim().max(4000).optional() }).parse(input.data);
      const owners = await prisma.user.findMany({ where: { workspaceId: workspace.id, role: "owner" }, select: { email: true } });
      const date = workspace.paidUntil?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) || "—";
      const renew = `${process.env.APP_URL}/dashboard#billing`;
      const last = await prisma.payment.findFirst({ where: { workspaceId: workspace.id, status: "paid" }, orderBy: { createdAt: "desc" } });
      if (data.kind === "receipt" && !last) throw new ApiError(409, "This client has no payment to confirm.");
      if (data.kind === "custom" && (!data.subject || !data.text)) throw new ApiError(400, "Write a subject and a message.");
      let sent = 0;
      for (const owner of owners) {
        const ok =
          data.kind === "receipt"
            ? await sendPaymentReceipt(owner.email, { plan: last!.plan, amountPaise: last!.amount, until: workspace.paidUntil, reference: last!.paymentId || last!.note })
            : await sendEmail(
                owner.email,
                data.kind === "custom" ? data.subject! : data.kind === "expired" ? `Your ${BRAND} plan has ended` : `Your ${BRAND} plan ends on ${date}`,
                data.kind === "custom" ? data.text! : data.kind === "expired" ? `Your plan ended on ${date}. Your QR codes keep working, but new codes are limited to the Free plan until you renew.

Renew here: ${renew}` : `Your plan ends on ${date}. Renew before then to keep your plan limits.

Renew here: ${renew}`,
              );
        if (ok) sent++;
      }
      if (!sent) throw new ApiError(503, "The email could not be sent. Set up email under Configuration first.");
      result = { ok: true, sent };
    } else if (input.action === "razorpay.remove") {
      await prisma.siteSetting.deleteMany({ where: { key: "razorpay" } });
    } else if (input.action === "razorpay.test") {
      await razorpay("orders?count=1");
    } else if (input.action === "order.check") {
      // Asks Razorpay again about an unpaid order, for payments whose confirmation never arrived.
      const order = await prisma.payment.findUnique({ where: { id: input.id || "" } });
      if (!order || order.method !== "razorpay") throw new ApiError(404, "Order not found.");
      const paid = ((await razorpay(`orders/${order.orderId}/payments`)).items || []).find((item: { status: string }) => item.status === "captured");
      if (!paid) throw new ApiError(409, "Razorpay has no captured payment for this order yet.");
      result = await settle(order.orderId, paid.id);
    } else if (input.action === "maintenance.run") {
      result = { ok: true, ...(await runMaintenance(true)) };
    } else throw new ApiError(400, "Unsupported action.");
    await prisma.auditLog.create({ data: { workspaceId: user.homeWorkspaceId, actorId: user.id, action: `platform.${input.action}`, entityId: input.id } });
    return json(result);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") return json({ error: "Not found." }, 404);
    return failure(error);
  }
}
