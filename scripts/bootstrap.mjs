import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
const prisma = new PrismaClient();
try {
  const email = process.env.OWNER_EMAIL?.toLowerCase();
  const password = process.env.OWNER_INITIAL_PASSWORD;
  if (!email || !password || password.length < 16)
    throw new Error("Owner bootstrap configuration is missing.");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !existing.platformAdmin)
    throw new Error(
      "An existing account cannot be promoted automatically. Review its ownership first.",
    );
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        name: "Rahul Bhagat",
        role: "owner",
        platformAdmin: true,
        passwordHash: await bcrypt.hash(password, 12),
        workspace: {
          create: {
            name: "QR Code Generator Studio",
            slug: `owner-${randomBytes(8).toString("hex")}`,
            qrCodes: {
              create: [
                {
                  title: "Sample — QR Code Generator website",
                  shortCode: randomBytes(9).toString("base64url"),
                  targetUrl: process.env.APP_URL,
                  styling: {
                    dark: "#17161D",
                    light: "#FFFFFF",
                    errorCorrectionLevel: "M",
                  },
                },
                {
                  title: "Sample — Documentation",
                  shortCode: randomBytes(9).toString("base64url"),
                  targetUrl: "https://nextjs.org/docs",
                  styling: {
                    dark: "#5B43D6",
                    light: "#FFFFFF",
                    errorCorrectionLevel: "M",
                  },
                },
              ],
            },
          },
        },
      },
    });
  } else if (!existing.emailVerifiedAt) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { emailVerifiedAt: new Date() },
    });
  }
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log("Owner bootstrap and expired-session cleanup completed.");
} finally {
  await prisma.$disconnect();
}
