import { env } from "cloudflare:workers";
import { query } from "@solidjs/router";
import type { Video } from "./videos";
import { getVideoList } from "./videos";

export const videosQuery = query(async (): Promise<Video[]> => {
  "use server";
  return getVideoList(env.VIDEO_DB);
}, "videos");
