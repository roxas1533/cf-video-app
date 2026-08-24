import { env, waitUntil } from "cloudflare:workers";
import type { APIEvent } from "@solidjs/start/server";
import { getVideoList } from "~/lib/videos";
import { matchVideoListCache, putVideoListCache } from "~/lib/videosCache";

export async function GET(event: APIEvent) {
  const cached = await matchVideoListCache(event.request);
  if (cached) {
    const headers = new Headers(cached.headers);
    const existing = headers.get("Server-Timing") ?? "";
    headers.set(
      "Server-Timing",
      existing ? `${existing}, src;desc=cache` : "src;desc=cache",
    );
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
  }

  const t0 = Date.now();
  const videos = await getVideoList(env.VIDEO_DB);
  const dbTime = Date.now() - t0;

  const body = JSON.stringify({ videos });
  const response = new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Server-Timing": `db;dur=${dbTime}, src;desc=d1`,
    },
  });

  waitUntil(putVideoListCache(event.request, response.clone()));
  return response;
}
