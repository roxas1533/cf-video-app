import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { AwsClient } from "aws4fetch";
import { getVideoById } from "../../../../lib/videos";

export const GET: APIRoute = async ({ params }) => {
	const t0 = Date.now();
	const video = await getVideoById(env.VIDEO_DB, params.id ?? "");
	const dbTime = Date.now() - t0;
	if (!video) return new Response("Not found", { status: 404 });

	const t1 = Date.now();
	const list = await env.VIDEO_BUCKET.list({
		prefix: `videos/${video.name}/`,
	});
	const r2ListTime = Date.now() - t1;
	const mp4 = list.objects.find((obj: { key: string }) =>
		obj.key.endsWith(".mp4"),
	);
	if (!mp4) return new Response("Not found", { status: 404 });

	const t2 = Date.now();
	const r2 = new AwsClient({
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	});

	const r2Url = new URL(
		`https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/my-video/${mp4.key}`,
	);
	r2Url.searchParams.set("X-Amz-Expires", "3600");

	const signed = await r2.sign(new Request(r2Url, { method: "GET" }), {
		aws: { signQuery: true },
	});
	const signTime = Date.now() - t2;

	return Response.json(
		{ url: signed.url },
		{
			headers: {
				"Server-Timing": `db;dur=${dbTime}, r2-list;dur=${r2ListTime}, sign;dur=${signTime}`,
			},
		},
	);
};
