import { publicOverview } from "@/lib/public-discovery";
import { getSiteOrigin } from "@/lib/site-origin";

export function GET() {
  const origin = getSiteOrigin();
  const overview = publicOverview();
  const text = origin ? overview.replace(/\]\((\/[^)]*)\)/g, (_, path: string) => `](${new URL(path, origin).href})`) : overview;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
