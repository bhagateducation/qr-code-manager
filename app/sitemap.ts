import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-origin";

export const revalidate = 3600;
const published = new Date("2026-11-13T00:00:00+05:30");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  if (!origin) return [];
  const settings = await prisma.siteSetting.findUnique({
    where: { key: "site" }, select: { updatedAt: true },
  }).catch(() => null);
  const homeModified = settings && settings.updatedAt > published ? settings.updatedAt : published;
  return ["/", "/about", "/contact"].map((path) => ({
    url: new URL(path, origin).href,
    lastModified: path === "/" ? homeModified : published,
  }));
}
