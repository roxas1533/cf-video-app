import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
	let totalSize = 0;
	let cursor: string | undefined;

	do {
		const list = await env.VIDEO_BUCKET.list({ cursor });
		for (const obj of list.objects) {
			totalSize += obj.size;
		}
		cursor = list.truncated ? list.cursor : undefined;
	} while (cursor);

	return Response.json({ totalSize });
};
