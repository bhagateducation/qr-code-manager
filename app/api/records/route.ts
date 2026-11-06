import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize, json, failure } from "@/lib/http";
export async function GET(request: NextRequest) {
  try {
    const user = await authorize();
    const systemId = request.nextUrl.searchParams.get("systemId") || "";
    const page = Math.max(
      1,
      Math.min(
        10000,
        Math.floor(Number(request.nextUrl.searchParams.get("page")) || 1),
      ),
    );
    const where = { systemId, system: { workspaceId: user.workspaceId } };
    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where,
        skip: (page - 1) * 25,
        take: 25,
        orderBy: { createdAt: "desc" },
      }),
      prisma.record.count({ where }),
    ]);
    return json({ records, total, page });
  } catch (error) {
    return failure(error);
  }
}
