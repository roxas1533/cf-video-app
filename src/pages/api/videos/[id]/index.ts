import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { renameVideo } from "../../../../lib/videos";

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

	return Response.json({ id, name });
};
