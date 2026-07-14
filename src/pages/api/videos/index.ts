import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { getVideoList } from "../../../lib/videos";

export const GET: APIRoute = async () => {
	const t0 = Date.now();
	const videos = await getVideoList(env.VIDEO_DB);
	const dbTime = Date.now() - t0;
	return Response.json(
		{ videos },
		{ headers: { "Server-Timing": `db;dur=${dbTime}` } },
	);
};
