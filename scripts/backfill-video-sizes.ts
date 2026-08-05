import { AwsClient } from "aws4fetch";

const bucket = "my-video";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
	console.error(
		"Missing env: CLOUDFLARE_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY",
	);
	console.error("Source .dev.vars first: set -a && . .dev.vars && set +a");
	process.exit(1);
}

const r2 = new AwsClient({ accessKeyId, secretAccessKey });
const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;

if (process.stdin.isTTY) {
	console.error("Pipe the video list in via wrangler, then apply the output:");
	console.error(
		'  bunx wrangler d1 execute my-video --local --json --command "SELECT id, name FROM videos" | bun scripts/backfill-video-sizes.ts > scripts/.backfill-sizes.sql',
	);
	console.error(
		"  bunx wrangler d1 execute my-video --local --file=scripts/.backfill-sizes.sql",
	);
	console.error("(swap --local for --remote to target production)");
	process.exit(1);
}

const raw = await Bun.stdin.text();
let parsed: unknown;
try {
	parsed = JSON.parse(raw);
} catch (e) {
	console.error("Failed to parse stdin as JSON:", (e as Error).message);
	process.exit(1);
}
const videos = (
	(Array.isArray(parsed) ? parsed[0]?.results : null) ?? []
) as Array<{ id: string; name: string }>;
if (videos.length === 0) {
	console.error("No videos found in input JSON. Aborting.");
	process.exit(1);
}
console.error(`Found ${videos.length} videos\n`);

function encodeKey(key: string): string {
	return key.split("/").map(encodeURIComponent).join("/");
}

async function headSize(key: string): Promise<number | null> {
	const url = new URL(`${endpoint}/${encodeKey(key)}`);
	const signed = await r2.sign(new Request(url, { method: "HEAD" }));
	const res = await fetch(signed);
	if (!res.ok) return null;
	const len = res.headers.get("content-length");
	return len ? Number(len) : null;
}

let ok = 0;
let fail = 0;
for (const v of videos) {
	const size = await headSize(`videos/${v.id}/video.mp4`);
	if (size == null) {
		console.error(`✗ ${v.name} (${v.id}): head failed`);
		fail++;
		continue;
	}
	console.log(`UPDATE videos SET size = ${size} WHERE id = '${v.id}';`);
	console.error(`✓ ${v.name} (${v.id}): ${size} bytes`);
	ok++;
}

console.error(`\nDone: ${ok} ok, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
