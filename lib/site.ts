import "server-only";
import { z } from "zod";
import { prisma } from "./prisma";

/** Everything on the home page the platform owner can edit from the panel. */
export const siteSchema = z.object({
  heroLine1: z.string().trim().min(1).max(60),
  heroLine2: z.string().trim().min(1).max(60),
  heroText: z.string().trim().min(1).max(400),
  ctaLabel: z.string().trim().min(1).max(40),
  useCases: z.array(z.string().trim().min(1).max(40)).max(12),
  faq: z.array(z.object({ q: z.string().trim().min(1).max(160), a: z.string().trim().min(1).max(800) })).max(20),
  show: z.object({ features: z.boolean(), steps: z.boolean(), safety: z.boolean(), pricing: z.boolean(), faq: z.boolean() }),
  ctaTitle: z.string().trim().min(1).max(80),
  ctaText: z.string().trim().min(1).max(200),
});
export type Site = z.infer<typeof siteSchema>;

export const defaultSite: Site = {
  heroLine1: "Print once.",
  heroLine2: "Update forever.",
  heroText: "QR codes whose destination you can change after they are printed. Number them, find any one in seconds, and watch every scan arrive.",
  ctaLabel: "Start free",
  useCases: ["Restaurant menus", "Product packaging", "Business cards", "Asset labels", "Event tickets", "Guest Wi-Fi"],
  faq: [
    { q: "What is a dynamic QR code?", a: "The printed code holds a short permanent link. When someone scans it, they are forwarded to your destination, and you can change that destination whenever you like. Nothing needs reprinting." },
    { q: "Can I manage thousands of codes?", a: "Yes. Every code gets its own number, such as QR-00042. Put codes in folders, search by number, name or link, and pause, move or trash many codes at once." },
    { q: "What if I delete a code by mistake?", a: "Deleted codes go to the trash and can be restored for 30 days. Only an owner or admin can delete them for good." },
    { q: "Do paid plans renew automatically?", a: "No. A paid plan runs for its period. When it ends your limits return to Free; nothing is deleted and your existing codes keep working." },
    { q: "Can I use my own domain?", a: "On plans that include it, yes. Your codes use your domain while it is healthy, and new codes switch back to ours automatically if it ever stops working." },
  ],
  show: { features: true, steps: true, safety: true, pricing: true, faq: true },
  ctaTitle: "Make your first code in a minute",
  ctaText: "Free to start. Change the destination whenever you need.",
};

export async function getSite(): Promise<Site> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "site" } });
    const parsed = siteSchema.safeParse({ ...defaultSite, ...((row?.value as object) || {}) });
    return parsed.success ? parsed.data : defaultSite;
  } catch {
    // The home page must render even if the database is briefly unreachable.
    return defaultSite;
  }
}

export async function getPublicPlans() {
  try {
    return await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sort: "asc" } });
  } catch {
    return [];
  }
}
