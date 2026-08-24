function thumbnailCacheKey(request: Request, id: string): Request {
	const url = new URL(
		`/api/videos/${id}/thumbnail`,
		new URL(request.url).origin,
	);
	return new Request(url.toString(), { method: "GET" });
}

function cache(): Cache | undefined {
	return typeof caches === "undefined" ? undefined : caches.default;
}

export async function matchThumbnailCache(
	request: Request,
	id: string,
): Promise<Response | undefined> {
	return cache()?.match(thumbnailCacheKey(request, id));
}

export async function putThumbnailCache(
	request: Request,
	id: string,
	response: Response,
): Promise<void> {
	await cache()?.put(thumbnailCacheKey(request, id), response);
}

export async function invalidateThumbnailCache(
	request: Request,
	id: string,
): Promise<void> {
	await cache()?.delete(thumbnailCacheKey(request, id));
}
