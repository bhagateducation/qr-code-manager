import { NextRequest, NextResponse } from "next/server";
import { authorize, failure, ApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { account, linkBase } from "@/lib/plans";
import { officeExport, officeTemplate } from "@/lib/office";

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export async function GET(request: NextRequest) {
  try {
    const user = await authorize();
    const kind = request.nextUrl.searchParams.get("kind") || "qr";
    const base = linkBase((await account(prisma, user.workspace)).root);
    if (kind === "qr") {
      const rows = await prisma.qRCode.findMany({
        where: { workspaceId: user.workspaceId, deletedAt: null },
        include: { campaign: { select: { name: true } }, tags: { include: { tag: { select: { name: true } } } } },
        orderBy: { number: "asc" },
        take: 50000,
      });
      const content = csv([
        ["Number", "Title", "Type", "QR link", "Short code", "Destination or payload", "Status", "Scans", "Campaign", "Tags", "Created"],
        ...rows.map((qr) => [
          qr.number,
          qr.title,
          qr.type,
          qr.type === "dynamic_url" ? `${base}/s/${qr.shortCode}` : "",
          qr.shortCode,
          qr.targetUrl,
          qr.isActive ? "Active" : "Paused",
          qr.scanCount,
          qr.campaign?.name || "",
          qr.tags.map((item) => item.tag.name).join(" | "),
          qr.createdAt.toISOString(),
        ]),
      ]);
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="qr-manager-codes.csv"',
          "Cache-Control": "no-store",
        },
      });
    }
    if (kind === "xlsx" || kind === "docx") return officeExport(kind, user.workspaceId, base, request.nextUrl.searchParams.get("folder"));
    if (kind === "template-xlsx" || kind === "template-docx") return officeTemplate(kind === "template-xlsx" ? "xlsx" : "docx");
    if (kind === "sheet") {
      const all = await prisma.folder.findMany({ where: { workspaceId: user.workspaceId }, select: { id: true, parentId: true, name: true } });
      const root = all.find((folder) => folder.id === request.nextUrl.searchParams.get("folder"));
      if (!root) throw new ApiError(404, "Folder not found.");
      const ids = [root.id];
      for (const id of ids) ids.push(...all.filter((folder) => folder.parentId === id).map((folder) => folder.id));
      const rows = await prisma.qRCode.findMany({
        where: { workspaceId: user.workspaceId, deletedAt: null, folderId: { in: ids } },
        orderBy: [{ position: "asc" }, { number: "asc" }],
        take: 2000,
        select: { number: true, title: true, type: true, shortCode: true, targetUrl: true },
      });
      return NextResponse.json(
        { title: root.name, codes: rows.map((qr) => ({ number: qr.number, title: qr.title, payload: qr.type === "dynamic_url" ? `${base}/s/${qr.shortCode}` : qr.targetUrl })) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (kind === "scans") {
      const rows = await prisma.scanLog.findMany({
        where: { qrCode: { workspaceId: user.workspaceId } },
        include: { qrCode: { select: { title: true, shortCode: true } } },
        orderBy: { scannedAt: "desc" },
        take: 10000,
      });
      const content = csv([
        ["QR code", "Short code", "Time", "Device", "OS", "Browser", "Country", "City"],
        ...rows.map((scan) => [
          scan.qrCode.title,
          scan.qrCode.shortCode,
          scan.scannedAt.toISOString(),
          scan.device,
          scan.os,
          scan.browser,
          scan.country,
          scan.city,
        ]),
      ]);
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="qr-manager-scans.csv"',
          "Cache-Control": "no-store",
        },
      });
    }
    throw new ApiError(400, "Unknown export type.");
  } catch (error) {
    return failure(error);
  }
}
