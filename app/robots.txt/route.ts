import { getSiteOrigin } from "@/lib/site-origin";

export function GET() {
  const origin = getSiteOrigin();
  const lines = ["User-agent: *", "Allow: /", "Disallow: /api/", "Disallow: /s/", "Content-Signal: search=yes, ai-train=no"];
  if (origin) lines.push(`Sitemap: ${new URL("/sitemap.xml", origin).href}`);
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
