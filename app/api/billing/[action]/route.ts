import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  authorize,
  body,
  json,
  failure,
  ApiError,
  rateLimit,
  boundedText,
} from "@/lib/http";
import { paymentKeys, razorpay, settle } from "@/lib/payments";
import { validSignature } from "@/lib/payment-signature";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const keys = await paymentKeys();
    if (action === "webhook") {
      if (!keys.webhookSecret)
        throw new ApiError(503, "Webhook is not configured.");
      if (Number(request.headers.get("content-length") || 0) > 65536)
        throw new ApiError(413, "Payload too large.");
      const raw = await boundedText(request);
      if (
        !validSignature(
          raw,
          request.headers.get("x-razorpay-signature") || "",
          keys.webhookSecret,
        )
      )
        throw new ApiError(401, "Invalid signature.");
      const event = JSON.parse(raw);
      if (event.event === "payment.captured" || event.event === "order.paid") {
        const payment = event.payload?.payment?.entity;
        if (!payment?.order_id || !payment?.id)
          throw new ApiError(400, "Missing payment details.");
        await settle(payment.order_id, payment.id);
      }
      return json({ received: true });
    }
    const user = await authorize(true);
    if (user.role !== "owner" || user.workspace.parentId || user.workspaceId !== user.homeWorkspaceId)
      throw new ApiError(403, "Only the account owner can manage billing, from the main panel.");
    const input = await body(request);
    await rateLimit(`billing:${user.id}`, 10, 60);
    if (action === "order") {
      const { plan } = z.object({ plan: z.string().max(40) }).parse(input);
      const row = await prisma.plan.findFirst({ where: { id: plan, isPublic: true } });
      if (!row || row.id === "free") throw new ApiError(404, "Plan not found.");
      const amount = row.pricePaise;
      if (
        !Number.isSafeInteger(amount) ||
        amount < 100 ||
        !keys.keySecret
      )
        throw new ApiError(503, "Paid plans are not available yet.");
      const order = await razorpay("orders", {
        amount,
        currency: "INR",
        receipt: randomUUID(),
      }, keys);
      await prisma.payment.create({
        data: {
          workspaceId: user.workspaceId,
          orderId: order.id,
          amount,
          currency: "INR",
          plan,
        },
      });
      return json({
        orderId: order.id,
        amount,
        currency: "INR",
        key: keys.keyId,
      });
    }
    if (action === "verify") {
      const data = z
        .object({
          razorpay_order_id: z.string().max(100),
          razorpay_payment_id: z.string().max(100),
          razorpay_signature: z.string().max(128),
        })
        .parse(input);
      const order = await prisma.payment.findFirst({
        where: {
          orderId: data.razorpay_order_id,
          workspaceId: user.workspaceId,
        },
      });
      if (
        !order ||
        !validSignature(
          `${order.orderId}|${data.razorpay_payment_id}`,
          data.razorpay_signature,
          keys.keySecret,
        )
      )
        throw new ApiError(400, "Payment signature could not be verified.");
      return json(
        await settle(order.orderId, data.razorpay_payment_id, user.workspaceId),
      );
    }
    throw new ApiError(404, "Not found.");
  } catch (error) {
    return failure(error);
  }
}
