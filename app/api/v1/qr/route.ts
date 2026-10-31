import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError, authorizeApiKey, boundedText, failure, json, rateLimit } from "@/lib/http";
import { effectivePlan, limits, qrSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const key = await authorizeApiKey(request);
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 25));
    const qrs = await prisma.qRCode.findMany({
      where: { workspaceId: key.workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, title: true, shortCode: true, targetUrl: true, isActive: true, scanCount: true, campaign: { select: { id: true, name: true } }, tags: { include: { tag: { select: { id: true, name: true, color: true } } } }, createdAt: true, updatedAt: true },
    });
    return json({ data: qrs });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const key = await authorizeApiKey(request);
    await rateLimit(`api:${key.id}`, 120, 60);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new ApiError(415, "JSON is required.");
    const input = qrSchema.parse(JSON.parse(await boundedText(request)));
    const { tagIds, campaignId, ...qrData } = input;
    const app = new URL(process.env.APP_URL!);
    if ([qrData.targetUrl, qrData.routingRules.ios, qrData.routingRules.android].some((url) => url && new URL(url).origin === app.origin && new URL(url).pathname.startsWith("/s/")))
      throw new ApiError(400, "A QR cannot redirect to another QR resolver on this site.");
    const workspace = await prisma.workspace.findUnique({ where: { id: key.workspaceId } });
    if (!workspace || workspace.suspended) throw new ApiError(403, "This workspace is suspended.");
    if (await prisma.qRCode.count({ where: { workspaceId: key.workspaceId } }) >= limits[effectivePlan(workspace)].codes)
      throw new ApiError(409, "Your plan QR limit has been reached.");
    if (campaignId && !(await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId: key.workspaceId } })))
      throw new ApiError(404, "Campaign not found.");
    const tags = tagIds.length ? await prisma.tag.findMany({ where: { id: { in: tagIds }, workspaceId: key.workspaceId }, select: { id: true } }) : [];
    if (tags.length !== new Set(tagIds).size) throw new ApiError(404, "One or more tags were not found.");
    const qr = await prisma.qRCode.create({ data: { ...qrData, workspaceId: key.workspaceId, campaignId: campaignId || null, shortCode: randomBytes(9).toString("base64url"), tags: { create: tagIds.map((tagId) => ({ tagId })) } }, include: { tags: { include: { tag: true } }, campaign: true } });
    return json({ data: qr }, 201);
  } catch (error) {
    return failure(error);
  }
}
