import { NextRequest } from "next/server";
import { authorize, failure, json, rateLimit, ApiError } from "@/lib/http";
import { playlistId, readPlaylist } from "@/lib/youtube";

/** Lists the videos of a public YouTube playlist so the panel can make one code per video. */
export async function GET(request: NextRequest) {
  try {
    const user = await authorize(true);
    await rateLimit(`youtube:${user.id}`, 20, 60);
    const id = playlistId(request.nextUrl.searchParams.get("list") || "");
    if (!id) throw new ApiError(400, "Paste a YouTube playlist link (it contains list=…).");
    return json(await readPlaylist(id).catch((error) => {
      throw new ApiError(502, error instanceof Error ? error.message : "The playlist could not be read.");
    }));
  } catch (error) {
    return failure(error);
  }
}
