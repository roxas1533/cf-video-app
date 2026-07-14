import { AwsClient } from "aws4fetch";

const dryRun = process.argv.includes("--dry-run");
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
	console.error("Pipe the video list in via wrangler:");
	console.error(
		'  bunx wrangler d1 execute my-video --remote --json --command "SELECT id, name FROM videos" | bun scripts/migrate-r2-paths.ts [--dry-run]',
	);
	process.exit(1);
}

const raw = await Bun.stdin.text();
let parsed: unknown;
try {
	parsed = JSON.parse(raw);
} catch (e) {
	console.error("Failed to parse stdin as JSON:", (e as Error).message);
	console.error("Received:", raw.slice(0, 200));
	process.exit(1);
}
const videos = (
	(Array.isArray(parsed) ? parsed[0]?.results : null) ?? []
) as Array<{ id: string; name: string }>;
if (videos.length === 0) {
	console.error("No videos found in input JSON. Aborting.");
	process.exit(1);
}
console.log(
	`${dryRun ? "[DRY-RUN] " : ""}Found ${videos.length} videos to migrate\n`,
);

function encodeKey(key: string): string {
	return key.split("/").map(encodeURIComponent).join("/");
}

async function headObject(
	key: string,
): Promise<{ ok: boolean; status: number }> {
	const url = new URL(`${endpoint}/${encodeKey(key)}`);
	const signed = await r2.sign(new Request(url, { method: "HEAD" }));
	const res = await fetch(signed);
	return { ok: res.ok, status: res.status };
}

function decodeXmlEntities(s: string): string {
	return s
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&amp;", "&");
}

async function findMp4Key(name: string): Promise<string | null> {
	const url = new URL(endpoint);
	url.searchParams.set("list-type", "2");
	url.searchParams.set("prefix", `videos/${name}/`);
	const signed = await r2.sign(new Request(url, { method: "GET" }));
	const res = await fetch(signed);
	if (!res.ok) return null;
	const xml = await res.text();
	for (const m of xml.matchAll(/<Key>([^<]+\.mp4)<\/Key>/g)) {
		return decodeXmlEntities(m[1]);
	}
	return null;
}

async function copyObject(src: string, dest: string): Promise<void> {
	const url = new URL(`${endpoint}/${encodeKey(dest)}`);
	const req = new Request(url, {
		method: "PUT",
		headers: { "x-amz-copy-source": `/${bucket}/${encodeKey(src)}` },
	});
	const signed = await r2.sign(req);
	const res = await fetch(signed);
	if (!res.ok) {
		throw new Error(`${res.status} ${await res.text()}`);
	}
}

let ok = 0;
let fail = 0;
let missing = 0;
for (const v of videos) {
	try {
		const mp4Src = await findMp4Key(v.name);
		const thumbSrc = `videos/${v.name}/thumbnail.jpg`;
		if (!mp4Src) {
			console.error(`✗ ${v.name} (${v.id}): no .mp4 found under prefix`);
			missing++;
			continue;
		}
		const pairs: [string, string][] = [
			[mp4Src, `videos/${v.id}/video.mp4`],
			[thumbSrc, `videos/${v.id}/thumbnail.jpg`],
		];
		if (dryRun) {
			const results = await Promise.all(
				pairs.map(async ([src]) => ({ src, ...(await headObject(src)) })),
			);
			const bad = results.filter((r) => !r.ok);
			if (bad.length === 0) {
				const label = mp4Src === `videos/${v.name}/${v.name}.mp4` ? "" : ` (mp4=${mp4Src.split("/").pop()})`;
				console.log(`✓ ${v.name} → ${v.id}${label}`);
				ok++;
			} else {
				console.error(
					`✗ ${v.name} (${v.id}): ${bad
						.map((r) => `${r.src} → ${r.status}`)
						.join(", ")}`,
				);
				missing++;
			}
		} else {
			for (const [src, dest] of pairs) await copyObject(src, dest);
			console.log(`✓ ${v.name} → ${v.id}`);
			ok++;
		}
	} catch (e) {
		console.error(`✗ ${v.name} (${v.id}): ${(e as Error).message}`);
		fail++;
	}
}

console.log(
	`\n${dryRun ? "[DRY-RUN] " : ""}Done: ${ok} ok, ${fail} failed${dryRun ? `, ${missing} missing source` : ""}`,
);
process.exit(fail > 0 || missing > 0 ? 1 : 0);
