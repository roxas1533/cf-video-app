import type { APIEvent } from "@solidjs/start/server";
import { signVideoUrl } from "~/lib/r2Sign";

export async function GET(event: APIEvent) {
  const id = event.params.id ?? "";
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const t0 = Date.now();
  const url = await signVideoUrl(id);
  const signTime = Date.now() - t0;

  return Response.json(
    { url },
    { headers: { "Server-Timing": `sign;dur=${signTime}` } },
  );
}
