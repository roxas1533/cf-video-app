function videoListCacheKey(request: Request): Request {
  const listUrl = new URL("/api/videos", new URL(request.url).origin);
  return new Request(listUrl.toString(), { method: "GET" });
}

export async function matchVideoListCache(
  request: Request,
): Promise<Response | undefined> {
  return caches.default.match(videoListCacheKey(request));
}

export async function putVideoListCache(
  request: Request,
  response: Response,
): Promise<void> {
  await caches.default.put(videoListCacheKey(request), response);
}

export async function invalidateVideoListCache(
  request: Request,
): Promise<void> {
  await caches.default.delete(videoListCacheKey(request));
}
