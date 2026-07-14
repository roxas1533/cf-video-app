import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { AwsClient } from "aws4fetch";
import { getVideoById } from "../../../../lib/videos";

export const GET: APIRoute = async ({ params }) => {
	const id = params.id ?? "";
	const t0 = Date.now();
	const video = await getVideoById(env.VIDEO_DB, id);
	const dbTime = Date.now() - t0;
	if (!video) return new Response("Not found", { status: 404 });

	const t1 = Date.now();
	const r2 = new AwsClient({
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	});

	const r2Url = new URL(
		`https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/my-video/videos/${id}/video.mp4`,
	);
	r2Url.searchParams.set("X-Amz-Expires", "3600");

	const signed = await r2.sign(new Request(r2Url, { method: "GET" }), {
		aws: { signQuery: true },
	});
	const signTime = Date.now() - t1;

	return Response.json(
		{ url: signed.url },
		{
			headers: {
				"Server-Timing": `db;dur=${dbTime}, sign;dur=${signTime}`,
			},
		},
	);
};
