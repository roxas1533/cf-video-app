import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { AwsClient } from "aws4fetch";
import { nanoid } from "nanoid";
import { getVideoByName } from "../../../lib/videos";

export const POST: APIRoute = async ({ request }) => {
	const body = (await request.json()) as { name: string; duration: number };
	const name = body.name?.trim();

	if (!name || name.length > 200 || /[/\\\0]/.test(name)) {
		return Response.json({ error: "Invalid name" }, { status: 400 });
	}
	if (typeof body.duration !== "number" || !Number.isFinite(body.duration)) {
		return Response.json({ error: "Invalid duration" }, { status: 400 });
	}

	const existing = await getVideoByName(env.VIDEO_DB, name);
	if (existing) {
		return Response.json({ error: "Name already exists" }, { status: 409 });
	}

	const id = nanoid();
	const r2 = new AwsClient({
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	});

	const bucket = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/my-video`;

	const videoUrl = new URL(`${bucket}/videos/${name}/${name}.mp4`);
	videoUrl.searchParams.set("X-Amz-Expires", "3600");
	const signedVideo = await r2.sign(new Request(videoUrl, { method: "PUT" }), {
		aws: { signQuery: true },
	});

	const thumbUrl = new URL(`${bucket}/videos/${name}/thumbnail.jpg`);
	thumbUrl.searchParams.set("X-Amz-Expires", "3600");
	const signedThumb = await r2.sign(new Request(thumbUrl, { method: "PUT" }), {
		aws: { signQuery: true },
	});

	return Response.json({
		id,
		videoUploadUrl: signedVideo.url,
		thumbnailUploadUrl: signedThumb.url,
	});
};
