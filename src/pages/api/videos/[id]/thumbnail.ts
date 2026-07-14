import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { getVideoById } from "../../../../lib/videos";

export const GET: APIRoute = async ({ params }) => {
	const t0 = Date.now();
	const video = await getVideoById(env.VIDEO_DB, params.id ?? "");
	const dbTime = Date.now() - t0;
	if (!video) return new Response("Not found", { status: 404 });

	const t1 = Date.now();
	const object = await env.VIDEO_BUCKET.get(
		`videos/${video.name}/thumbnail.jpg`,
	);
	const r2Time = Date.now() - t1;
	if (!object) return new Response("Not found", { status: 404 });
	return new Response(object.body, {
		headers: {
			"Content-Type": "image/jpeg",
			"Cache-Control": "public, max-age=86400",
			"Server-Timing": `db;dur=${dbTime}, r2;dur=${r2Time}`,
		},
	});
};
