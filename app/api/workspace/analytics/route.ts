import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, json, failure } from "@/lib/http";

const CAP = 20000;
export async function GET(request: NextRequest) {
  try {
    const user = await authorize();
    const params = request.nextUrl.searchParams;
    const days = [1, 7, 30, 90].includes(Number(params.get("days"))) ? Number(params.get("days")) : 7;
    // Minutes to add to UTC for the viewer's local time, so days and hours match their clock.
    const offset = Math.max(-840, Math.min(840, Math.round(Number(params.get("offset")) || 0))) * 60000;
    const localMidnight = Math.floor((Date.now() + offset) / 86400000) * 86400000 - offset;
    const since = new Date(localMidnight - (days - 1) * 86400000);
    // shortcut: aggregates in memory over at most CAP rows; move to SQL GROUP BY when a workspace exceeds that per period.
    const rows = await prisma.scanLog.findMany({
      where: { qrCode: { workspaceId: user.workspaceId }, scannedAt: { gte: since } },
      select: { scannedAt: true, device: true, os: true, browser: true, qrCode: { select: { title: true } } },
      orderBy: { scannedAt: "desc" },
      take: CAP,
    });
    const tally = (pick: (row: (typeof rows)[number]) => string) => {
      const counts = new Map<string, number>();
      for (const row of rows) counts.set(pick(row) || "Other", (counts.get(pick(row) || "Other") || 0) + 1);
      return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    };
    const daily = Array.from({ length: days }, (_, index) => ({
      date: new Date(since.getTime() + index * 86400000 + offset).toISOString().slice(0, 10),
      count: 0,
    }));
    const heat = Array<number>(84).fill(0);
    for (const row of rows) {
      const local = new Date(row.scannedAt.getTime() + offset);
      const day = Math.floor((row.scannedAt.getTime() - since.getTime()) / 86400000);
      if (daily[day]) daily[day].count++;
      heat[((local.getUTCDay() + 6) % 7) * 12 + Math.floor(local.getUTCHours() / 2)]++;
    }
    return json({
      days,
      total: rows.length,
      capped: rows.length === CAP,
      daily,
      heat,
      devices: tally((row) => row.device || ""),
      os: tally((row) => row.os || ""),
      browsers: tally((row) => row.browser || ""),
      codes: tally((row) => row.qrCode.title),
    });
  } catch (error) {
    return failure(error);
  }
}
