import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { insertVideo } from "../../../lib/videos";

export const POST: APIRoute = async ({ request }) => {
	const body = (await request.json()) as {
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

	await insertVideo(env.VIDEO_DB, { id, name, duration });

	return Response.json({ id });
};
