function videoListCacheKey(request: Request): Request {
	const listUrl = new URL("/api/videos", new URL(request.url).origin);
	return new Request(listUrl.toString(), { method: "GET" });
}

function cache(): Cache | undefined {
	return typeof caches === "undefined" ? undefined : caches.default;
}

export async function matchVideoListCache(
	request: Request,
): Promise<Response | undefined> {
	return cache()?.match(videoListCacheKey(request));
}

export async function putVideoListCache(
	request: Request,
	response: Response,
): Promise<void> {
	await cache()?.put(videoListCacheKey(request), response);
}

export async function invalidateVideoListCache(
	request: Request,
): Promise<void> {
	await cache()?.delete(videoListCacheKey(request));
}
