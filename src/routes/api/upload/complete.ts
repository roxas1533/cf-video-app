import { env } from "cloudflare:workers";
import type { APIEvent } from "@solidjs/start/server";
import { insertVideo } from "~/lib/videos";
import { invalidateVideoListCache } from "~/lib/videosCache";

export async function POST(event: APIEvent) {
	const body = (await event.request.json()) as {
		id: string;
		name: string;
		duration: number;
	};

	const { id, name, duration } = body;
	if (!id || !name) {
		return Response.json({ error: "Missing id or name" }, { status: 400 });
	}

	const head = await env.VIDEO_BUCKET.head(`videos/${id}/video.mp4`);
	if (!head) {
		return Response.json(
			{ error: "Video file not found in R2" },
			{ status: 400 },
		);
	}

	await insertVideo(env.VIDEO_DB, { id, name, duration, size: head.size });
	await invalidateVideoListCache(event.request);

	return Response.json({ id });
}
