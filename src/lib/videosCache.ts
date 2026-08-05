export const VIDEO_LIST_CACHE_KEY = new Request(
  "https://cache-key.internal/videos:list",
);

export async function invalidateVideoListCache(): Promise<void> {
  await caches.default.delete(VIDEO_LIST_CACHE_KEY);
}
