import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "./prisma";
import { digest, getSessionUser } from "./auth";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json({ error: error.issues[0]?.message || "Invalid input." }, 400);
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  )
    return json({ error: "This value is already in use." }, 409);
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "Unknown",
  );
  return json(
    {
      error:
        "The service is temporarily unavailable. Your change was not confirmed.",
    },
    503,
  );
}
export async function body(request: NextRequest) {
  if (
    !process.env.APP_URL ||
    request.headers.get("origin") !== new URL(process.env.APP_URL).origin
  )
    throw new ApiError(403, "Request origin is not allowed.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "JSON is required.");
  try {
    return JSON.parse(await boundedText(request));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Invalid JSON.");
  }
}
export async function boundedText(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "A request body is required.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 65536) {
      await reader.cancel();
      throw new ApiError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function authorize(write = false) {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Sign in to continue.");
  if (write && !["owner", "admin", "editor"].includes(user.role))
    throw new ApiError(403, "You do not have permission to make this change.");
  return user;
}
export async function rateLimit(key: string, maximum: number, seconds = 900) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const row = await prisma.rateLimit.upsert({
    where: { key: digest(`${key}:${window}`) },
    create: {
      key: digest(`${key}:${window}`),
      count: 1,
      expiresAt: new Date((window + 1) * seconds * 1000),
    },
    update: { count: { increment: 1 } },
  });
  if (row.count > maximum)
    throw new ApiError(429, "Too many attempts. Please try again later.");
}
export function audit(
  workspaceId: string,
  actorId: string,
  action: string,
  entityId?: string,
) {
  return prisma.auditLog.create({
    data: { workspaceId, actorId, action, entityId },
  });
}
