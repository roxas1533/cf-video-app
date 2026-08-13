function thumbnailCacheKey(request: Request, id: string): Request {
  const url = new URL(
    `/api/videos/${id}/thumbnail`,
    new URL(request.url).origin,
  );
  return new Request(url.toString(), { method: "GET" });
}

export async function matchThumbnailCache(
  request: Request,
  id: string,
): Promise<Response | undefined> {
  return caches.default.match(thumbnailCacheKey(request, id));
}

export async function putThumbnailCache(
  request: Request,
  id: string,
  response: Response,
): Promise<void> {
  await caches.default.put(thumbnailCacheKey(request, id), response);
}

export async function invalidateThumbnailCache(
  request: Request,
  id: string,
): Promise<void> {
  await caches.default.delete(thumbnailCacheKey(request, id));
}
