import "server-only";
import { resolveTxt } from "node:dns/promises";
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { BRAND } from "./brand";

const DAY = 86400000;

/** A domain is ready when it carries our TXT token and serves this app over HTTPS. */
export async function probeDomain(domain: string, token?: string | null) {
  const txt = token ? (await resolveTxt(`_qrm.${domain}`).catch(() => [] as string[][])).flat().includes(token) : true;
  let live = false;
  try {
    const response = await fetch(`https://${domain}/api/health`, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(6000) });
    live = response.ok && (await response.json()).service === "qr-manager";
  } catch {}
  return { txt, live };
}

/**
 * Daily housekeeping: renewal reminders and custom-domain health. Runs at most every six hours,
 * triggered by ordinary panel traffic, so no cron job or secret is needed.
 */
export async function runMaintenance(force = false) {
  const key = "maintenance.lastRun";
  const last = await prisma.siteSetting.findUnique({ where: { key } });
  if (!force && last && Date.now() - Date.parse(String(last.value)) < 6 * 3600000) return null;
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value: new Date().toISOString() }, update: { value: new Date().toISOString() } });

  const due = await prisma.workspace.findMany({
    where: {
      parentId: null,
      suspended: false,
      plan: { notIn: ["free", "owner"] },
      paidUntil: { gte: new Date(Date.now() - 3 * DAY), lte: new Date(Date.now() + 7 * DAY) },
      OR: [{ remindedAt: null }, { remindedAt: { lt: new Date(Date.now() - 2 * DAY) } }],
    },
    include: { users: { where: { role: "owner" }, select: { email: true } } },
    take: 200,
  });
  let emailed = 0;
  for (const workspace of due) {
    const ended = workspace.paidUntil! < new Date();
    const date = workspace.paidUntil!.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    for (const owner of workspace.users)
      if (
        await sendEmail(
          owner.email,
          ended ? `Your ${BRAND} plan has ended` : `Your ${BRAND} plan ends on ${date}`,
          `${ended ? "Your plan ended" : "Your plan ends"} on ${date}. Your QR codes keep working, but new codes are limited to the Free plan until you renew.\n\nRenew here: ${process.env.APP_URL}/dashboard#billing`,
        )
      )
        emailed++;
    await prisma.workspace.update({ where: { id: workspace.id }, data: { remindedAt: new Date() } });
    await prisma.auditLog.create({ data: { workspaceId: workspace.id, actorId: "system", action: "subscription.reminder" } });
  }

  const domains = await prisma.workspace.findMany({ where: { customDomain: { not: null }, domainStatus: { in: ["verified", "failing"] } }, select: { id: true, customDomain: true }, take: 200 });
  let failing = 0;
  for (const workspace of domains) {
    const { live } = await probeDomain(workspace.customDomain!);
    if (!live) failing++;
    await prisma.workspace.update({ where: { id: workspace.id }, data: { domainStatus: live ? "verified" : "failing", domainCheckedAt: new Date() } });
  }
  return { reminded: due.length, emailed, domainsChecked: domains.length, domainsFailing: failing };
}
