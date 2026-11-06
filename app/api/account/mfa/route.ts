import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authorize, body, failure, json, ApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { backupCodes, generateMfaSecret, verifyTotp } from "@/lib/mfa";

export async function GET() {
  try {
    const user = await authorize();
    return json({ enabled: user.mfaEnabled });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authorize(true);
    const input = z.object({ action: z.enum(["setup", "enable", "disable"]), secret: z.string().optional(), code: z.string().optional() }).parse(await body(request));
    if (input.action === "setup") {
      const secret = generateMfaSecret();
      const issuer = encodeURIComponent("QR Manager");
      const account = encodeURIComponent(user.email);
      return json({ secret, otpauth: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` });
    }
    if (input.action === "enable") {
      if (!input.secret || !input.code || !verifyTotp(input.secret, input.code)) throw new ApiError(400, "Enter the current six-digit authenticator code.");
      const codes = backupCodes();
      await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true, mfaSecret: input.secret, backupCodes: codes } });
      return json({ enabled: true, backupCodes: codes });
    }
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null, backupCodes: Prisma.JsonNull } });
    return json({ enabled: false });
  } catch (error) { return failure(error); }
}
