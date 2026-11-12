import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  return origin ? [{ url: origin.href }] : [];
}
