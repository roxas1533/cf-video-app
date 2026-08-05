import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { getVideoList } from "../../../lib/videos";
import { VIDEO_LIST_CACHE_KEY } from "../../../lib/videosCache";

export const GET: APIRoute = async ({ locals }) => {
  const cache = caches.default;

  const cached = await cache.match(VIDEO_LIST_CACHE_KEY);
  if (cached) {
    const res = new Response(cached.body, cached);
    const existing = res.headers.get("Server-Timing") ?? "";
    res.headers.set(
      "Server-Timing",
      existing ? `${existing}, src;desc=cache` : "src;desc=cache",
    );
    return res;
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

  locals.runtime.ctx.waitUntil(
    cache.put(VIDEO_LIST_CACHE_KEY, response.clone()),
  );
  return response;
};
