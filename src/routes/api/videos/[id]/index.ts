import { env } from "cloudflare:workers";
import type { APIEvent } from "@solidjs/start/server";
import { invalidateThumbnailCache } from "~/lib/thumbnailCache";
import { deleteVideo, renameVideo } from "~/lib/videos";
import { invalidateVideoListCache } from "~/lib/videosCache";

export async function PATCH(event: APIEvent) {
  const id = event.params.id ?? "";
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const body = (await event.request.json()) as { name?: unknown };
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
  await invalidateVideoListCache(event.request);

  return Response.json({ id, name });
}

export async function DELETE(event: APIEvent) {
  const id = event.params.id ?? "";
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  await env.VIDEO_BUCKET.delete([
    `videos/${id}/video.mp4`,
    `videos/${id}/thumbnail.jpg`,
  ]);

  const removed = await deleteVideo(env.VIDEO_DB, id);
  if (!removed) return Response.json({ error: "Not found" }, { status: 404 });
  await invalidateVideoListCache(event.request);
  await invalidateThumbnailCache(event.request, id);

  return Response.json({ id });
}
