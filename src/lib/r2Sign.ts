import { env } from "cloudflare:workers";
import { AwsClient } from "aws4fetch";

const BUCKET_HOST = () =>
  `${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export async function signVideoUrl(
  id: string,
  expiresSeconds = 3600,
): Promise<string> {
  const r2 = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  });
  const url = new URL(
    `https://${BUCKET_HOST()}/my-video/videos/${id}/video.mp4`,
  );
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await r2.sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}
