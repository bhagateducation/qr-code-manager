import "server-only";
import { prisma } from "./prisma";
import { ApiError } from "./http";
export function checkoutConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_WEBHOOK_SECRET,
  );
}

export async function razorpay(path: string, data?: unknown) {
  const key = process.env.RAZORPAY_KEY_ID,
    secret = process.env.RAZORPAY_KEY_SECRET;
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
  return prisma.$transaction(async (tx) => {
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
}
