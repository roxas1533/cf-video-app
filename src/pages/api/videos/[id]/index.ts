import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { deleteVideo, renameVideo } from "../../../../lib/videos";
import { invalidateVideoListCache } from "../../../../lib/videosCache";

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id ?? "";
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name || name.length > 200 || /[/\\\0]/.test(name)) {
    return Response.json({ error: "Invalid name" }, { status: 400 });
  }

  const result = await renameVideo(env.VIDEO_DB, id, name);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ error: "Name already exists" }, { status: 409 });
  }
  await invalidateVideoListCache(request);

  return Response.json({ id, name });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const id = params.id ?? "";
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  await env.VIDEO_BUCKET.delete([
    `videos/${id}/video.mp4`,
    `videos/${id}/thumbnail.jpg`,
  ]);

  const removed = await deleteVideo(env.VIDEO_DB, id);
  if (!removed) return Response.json({ error: "Not found" }, { status: 404 });
  await invalidateVideoListCache(request);

  return Response.json({ id });
};
