import "server-only";
import { prisma } from "./prisma";
import { ApiError } from "./http";
import { openSecret, setting } from "./secrets";
import { sendPaymentReceipt } from "./email";

export type PaymentKeys = { keyId: string; keySecret: string; webhookSecret: string; source: "env" | "panel" | "none" };
/** Razorpay keys: the server environment wins; otherwise the keys the platform owner saved in the panel. */
export async function paymentKeys(): Promise<PaymentKeys> {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    return { keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "", source: "env" };
  // A database that is not reachable (e.g. while the site is being built) means checkout is simply off.
  const saved = await setting<{ keyId?: string; keySecret?: string; webhookSecret?: string }>("razorpay").catch(() => undefined);
  if (saved?.keyId && saved.keySecret)
    return { keyId: saved.keyId, keySecret: openSecret(saved.keySecret), webhookSecret: openSecret(saved.webhookSecret), source: "panel" };
  return { keyId: "", keySecret: "", webhookSecret: "", source: "none" };
}
/** Website checkout is on once Razorpay keys exist, from the environment or the panel. */
export async function checkoutConfigured() {
  return !!(await paymentKeys()).keySecret;
}
export async function razorpay(path: string, data?: unknown, keys?: PaymentKeys) {
  const { keyId: key, keySecret: secret } = keys || (await paymentKeys());
  if (!key || !secret)
    throw new ApiError(
      503,
      "Payments are not configured yet. Your Free plan remains available.",
    );
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: data ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new ApiError(
      502,
      "The payment provider could not complete this request.",
    );
  return response.json();
}
export async function settle(
  orderId: string,
  paymentId: string,
  workspaceId?: string,
) {
  if (
    !/^order_[A-Za-z0-9]+$/.test(orderId) ||
    !/^pay_[A-Za-z0-9]+$/.test(paymentId)
  )
    throw new ApiError(400, "Invalid payment reference.");
  const saved = await prisma.payment.findUnique({ where: { orderId } });
  if (!saved || (workspaceId && saved.workspaceId !== workspaceId))
    throw new ApiError(404, "Order not found.");
  const payment = await razorpay(`payments/${paymentId}`);
  if (
    payment.order_id !== saved.orderId ||
    payment.status !== "captured" ||
    payment.amount !== saved.amount ||
    payment.currency !== saved.currency
  )
    throw new ApiError(
      409,
      "Payment is not captured or does not match this order.",
    );
  let after: (() => Promise<unknown>) | null = null;
  const result = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.update({
      where: { id: saved.workspaceId },
      data: { updatedAt: new Date() },
    });
    const changed = await tx.payment.updateMany({
      where: { id: saved.id, status: "created" },
      data: { status: "paid", paymentId, paidAt: new Date() },
    });
    if (!changed.count) return { ok: true, alreadyProcessed: true };
    const start =
      workspace.plan === saved.plan &&
      workspace.paidUntil &&
      workspace.paidUntil > new Date()
        ? workspace.paidUntil.getTime()
        : Date.now();
    const days = (await tx.plan.findUnique({ where: { id: saved.plan } }))?.days || 30;
    await tx.workspace.update({
      where: { id: saved.workspaceId },
      data: { plan: saved.plan, paidUntil: new Date(start + days * 86400000) },
    });
    const until = new Date(start + days * 86400000);
    await tx.notification.create({ data: { workspaceId: saved.workspaceId, kind: "billing", title: "Payment received", body: `Thank you! Your ${saved.plan} plan is active until ${until.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`, link: "#billing" } });
    const owners = await tx.user.findMany({ where: { workspaceId: saved.workspaceId, role: "owner" }, select: { email: true } });
    // Receipts go out after the transaction commits.
    after = () => Promise.all(owners.map((owner) => sendPaymentReceipt(owner.email, { plan: saved.plan, amountPaise: saved.amount, until, reference: paymentId })));
    await tx.auditLog.create({
      data: {
        workspaceId: saved.workspaceId,
        actorId: "razorpay",
        action: "payment.captured",
        entityId: saved.id,
      },
    });
    return { ok: true };
  });
  await (after as (() => Promise<unknown>) | null)?.().catch(() => {});
  return result;
}
