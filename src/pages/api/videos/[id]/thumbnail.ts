import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import {
  matchThumbnailCache,
  putThumbnailCache,
} from "../../../../lib/thumbnailCache";

export const GET: APIRoute = async ({ locals, params, request }) => {
  const id = params.id ?? "";
  if (!id) return new Response("Not found", { status: 404 });

  const cached = await matchThumbnailCache(request, id);
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
  let object: Awaited<ReturnType<typeof env.VIDEO_BUCKET.get>>;
  try {
    object = await env.VIDEO_BUCKET.get(`videos/${id}/thumbnail.jpg`);
  } catch (e) {
    console.warn(`Thumbnail R2 get failed for ${id}:`, e);
    return new Response("Upstream error", { status: 502 });
  }
  const r2Time = Date.now() - t0;
  if (!object) return new Response("Not found", { status: 404 });

  const response = new Response(object.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Server-Timing": `r2;dur=${r2Time}, src;desc=r2`,
    },
  });

  locals.cfContext.waitUntil(putThumbnailCache(request, id, response.clone()));
  return response;
};
