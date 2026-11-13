/** Reads a public YouTube playlist: its title and videos in order. */
export type Video = { id: string; title: string };

export function playlistId(input: string) {
  const text = input.trim();
  return /[?&]list=([\w-]{10,64})/.exec(text)?.[1] || (/^[\w-]{10,64}$/.test(text) ? text : null);
}

// Collects videos from the playlist page data, whatever layout YouTube uses.
function walk(node: unknown, videos: Video[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((item) => walk(item, videos));
  const item = node as Record<string, any>;
  const lockup = item.lockupViewModel;
  if (lockup?.contentId && lockup.contentType !== "LOCKUP_CONTENT_TYPE_PLAYLIST")
    return void videos.push({ id: lockup.contentId, title: lockup.metadata?.lockupMetadataViewModel?.title?.content || "" });
  const renderer = item.playlistVideoRenderer;
  if (renderer?.videoId)
    return void videos.push({ id: renderer.videoId, title: renderer.title?.runs?.map((run: { text: string }) => run.text).join("") || renderer.title?.simpleText || "" });
  for (const value of Object.values(item)) walk(value, videos);
}

/** With YOUTUBE_API_KEY set, the official Data API reads the whole playlist; without it, the public page gives the first 100 videos. */
export async function readPlaylist(id: string, max = 1000): Promise<{ title: string; videos: Video[]; partial: boolean }> {
  const key = process.env.YOUTUBE_API_KEY;
  const videos: Video[] = [];
  let title = "YouTube playlist";
  let partial = false;
  if (key) {
    const api = (path: string) => fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("YouTube did not return this playlist. Check that it is public."))));
    title = (await api(`playlists?part=snippet&id=${encodeURIComponent(id)}`)).items?.[0]?.snippet?.title || title;
    let page = "";
    do {
      const result = await api(`playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(id)}${page ? `&pageToken=${page}` : ""}`);
      for (const item of result.items || []) videos.push({ id: item.snippet?.resourceId?.videoId, title: item.snippet?.title || "" });
      page = result.nextPageToken || "";
    } while (page && videos.length < max);
  } else {
    const response = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(id)}&hl=en`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", "Accept-Language": "en" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("YouTube did not return this playlist.");
    const raw = /var ytInitialData = (\{.+?\});<\/script>/s.exec(await response.text())?.[1];
    if (!raw) throw new Error("This playlist could not be read. Check that it is public.");
    const data = JSON.parse(raw);
    title = data.metadata?.playlistMetadataRenderer?.title || title;
    walk(data.contents, videos);
    partial = videos.length >= 100;
  }
  const seen = new Set<string>();
  // Private and deleted videos have no usable title; skip them.
  const clean = videos.filter((video) => /^[\w-]{11}$/.test(video.id || "") && video.title && !/^(Private|Deleted) video$/.test(video.title) && !seen.has(video.id) && seen.add(video.id));
  return { title, videos: clean.slice(0, max), partial };
}
