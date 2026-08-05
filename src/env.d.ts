/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />
/// <reference types="unocss/astro" />

declare namespace Cloudflare {
  interface Env {
    VIDEO_BUCKET: R2Bucket;
    VIDEO_DB: D1Database;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    CLOUDFLARE_ACCOUNT_ID: string;
  }
}

// CF Workers augments the standard CacheStorage with a `default` cache.
interface CacheStorage {
  readonly default: Cache;
}
