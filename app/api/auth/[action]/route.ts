import { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { body, json, failure, ApiError, rateLimit } from "@/lib/http";
import { email, name, password } from "@/lib/validation";
import {
  COOKIE_NAME,
  cookieOptions,
  SESSION_SECONDS,
  createSession,
  hashPassword,
  verifyPassword,
  revokeSession,
} from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const input = await body(request);
    if (action === "logout") {
      await revokeSession();
      const response = json({ ok: true });
      response.cookies.set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (!["login", "register"].includes(action))
      throw new ApiError(404, "Not found.");
    const credentials = z
      .object({ email, password: z.string().min(1).max(72) })
      .parse(input);
    await rateLimit(`auth:${credentials.email}`, 10);
    await rateLimit("auth:global", 500, 60);
    let user;
    if (action === "register") {
      await rateLimit("register:global", 100, 3600);
      const data = z
        .object({ email, password, name, workspace: name })
        .parse(input);
      const passwordHash = await hashPassword(data.password);
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: "owner",
          workspace: {
            create: {
              name: data.workspace,
              slug: `ws-${randomBytes(10).toString("hex")}`,
            },
          },
        },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: { workspace: true },
      });
      // Always run a costly comparison, including for unknown accounts.
      const fallback =
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx4lMuId/9hIPcYxNjlM.5T6j3u";
      const valid = await verifyPassword(
        credentials.password,
        user?.passwordHash || fallback,
      );
      if (!user || !valid || user.workspace.suspended)
        throw new ApiError(401, "Invalid email or password.");
    }
    const token = await createSession(user.id);
    const response = json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
