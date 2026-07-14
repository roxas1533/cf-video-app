import { execSync } from "node:child_process";
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

const raw = execSync(
	`bunx wrangler d1 execute my-video --remote --json --command "SELECT id, name FROM videos ORDER BY name"`,
	{ encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
const videos = (JSON.parse(raw)[0].results ?? []) as Array<{
	id: string;
	name: string;
}>;
console.log(`Found ${videos.length} videos to migrate\n`);

async function copyObject(src: string, dest: string): Promise<void> {
	const url = new URL(`${endpoint}/${dest}`);
	const req = new Request(url, {
		method: "PUT",
		headers: { "x-amz-copy-source": `/${bucket}/${src}` },
	});
	const signed = await r2.sign(req);
	const res = await fetch(signed);
	if (!res.ok) {
		throw new Error(`${res.status} ${await res.text()}`);
	}
}

let ok = 0;
let fail = 0;
for (const v of videos) {
	const pairs: [string, string][] = [
		[`videos/${v.name}/${v.name}.mp4`, `videos/${v.id}/video.mp4`],
		[`videos/${v.name}/thumbnail.jpg`, `videos/${v.id}/thumbnail.jpg`],
	];
	try {
		for (const [src, dest] of pairs) await copyObject(src, dest);
		console.log(`✓ ${v.name} → ${v.id}`);
		ok++;
	} catch (e) {
		console.error(`✗ ${v.name} (${v.id}): ${(e as Error).message}`);
		fail++;
	}
}

console.log(`\nDone: ${ok} succeeded, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
