import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  if (!id) return new Response("Not found", { status: 404 });

  const t0 = Date.now();
  const object = await env.VIDEO_BUCKET.get(`videos/${id}/thumbnail.jpg`);
  const r2Time = Date.now() - t0;
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "Server-Timing": `r2;dur=${r2Time}`,
    },
  });
};
