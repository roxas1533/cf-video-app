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
		'  bunx wrangler d1 execute my-video --remote --json --command "SELECT id, name FROM videos" | bun scripts/cleanup-r2-old-paths.ts [--dry-run]',
	);
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
console.log(
	`${dryRun ? "[DRY-RUN] " : ""}Cleaning up old paths for ${videos.length} videos\n`,
);

function encodeKey(key: string): string {
	return key.split("/").map(encodeURIComponent).join("/");
}

function decodeXmlEntities(s: string): string {
	return s
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&amp;", "&");
}

async function headOk(key: string): Promise<boolean> {
	const url = new URL(`${endpoint}/${encodeKey(key)}`);
	const signed = await r2.sign(new Request(url, { method: "HEAD" }));
	const res = await fetch(signed);
	return res.ok;
}

async function listPrefix(prefix: string): Promise<string[]> {
	const url = new URL(endpoint);
	url.searchParams.set("list-type", "2");
	url.searchParams.set("prefix", prefix);
	const signed = await r2.sign(new Request(url, { method: "GET" }));
	const res = await fetch(signed);
	if (!res.ok) throw new Error(`List failed: ${res.status}`);
	const xml = await res.text();
	const keys: string[] = [];
	for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) {
		keys.push(decodeXmlEntities(m[1]));
	}
	return keys;
}

async function deleteObject(key: string): Promise<void> {
	const url = new URL(`${endpoint}/${encodeKey(key)}`);
	const signed = await r2.sign(new Request(url, { method: "DELETE" }));
	const res = await fetch(signed);
	if (!res.ok && res.status !== 404) {
		throw new Error(`${res.status} ${await res.text()}`);
	}
}

let cleaned = 0;
let skipped = 0;
let fail = 0;
let totalDeleted = 0;
for (const v of videos) {
	try {
		const [mp4Ok, thumbOk] = await Promise.all([
			headOk(`videos/${v.id}/video.mp4`),
			headOk(`videos/${v.id}/thumbnail.jpg`),
		]);
		if (!mp4Ok || !thumbOk) {
			console.error(
				`⤳ skip ${v.name} (${v.id}): new paths incomplete (mp4=${mp4Ok}, thumb=${thumbOk})`,
			);
			skipped++;
			continue;
		}
		const oldKeys = await listPrefix(`videos/${v.name}/`);
		if (oldKeys.length === 0) {
			console.log(`✓ ${v.name}: already clean`);
			cleaned++;
			continue;
		}
		if (dryRun) {
			console.log(
				`[dry] ${v.name}: would delete ${oldKeys.length} keys (${oldKeys.map((k) => k.split("/").pop()).join(", ")})`,
			);
		} else {
			for (const key of oldKeys) await deleteObject(key);
			console.log(`✓ ${v.name}: deleted ${oldKeys.length} keys`);
		}
		cleaned++;
		totalDeleted += oldKeys.length;
	} catch (e) {
		console.error(`✗ ${v.name} (${v.id}): ${(e as Error).message}`);
		fail++;
	}
}

console.log(
	`\n${dryRun ? "[DRY-RUN] " : ""}Done: ${cleaned} processed, ${skipped} skipped, ${fail} failed${dryRun ? "" : `, ${totalDeleted} keys deleted`}`,
);
process.exit(fail > 0 ? 1 : 0);
