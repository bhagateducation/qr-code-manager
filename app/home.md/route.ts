import { publicOverview } from "@/lib/public-discovery";

export function GET() {
  return new Response(publicOverview(), { headers: {
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "private, no-store",
    Vary: "Accept",
  } });
}
