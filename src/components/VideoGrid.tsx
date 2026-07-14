import { createResource, For, Show } from "solid-js";
import { apiFetch } from "../lib/fetch";
import type { Video } from "../lib/videos";

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function Skeleton() {
	return (
		<div class="video-grid">
			<For each={[0, 1, 2]}>
				{() => (
					<div class="video-card">
						<div class="video-card-thumb">
							<div class="skeleton skeleton-thumb" />
						</div>
						<div class="video-card-title">
							<div class="skeleton skeleton-text" />
						</div>
					</div>
				)}
			</For>
		</div>
	);
}

export default function VideoGrid() {
	const [videos] = createResource(async () => {
		const res = await apiFetch("/api/videos");
		const data = (await res.json()) as { videos: Video[] };
		return data.videos;
	});

	return (
		<Show when={videos()} fallback={<Skeleton />}>
			{(list) => (
				<div class="video-grid">
					<For each={list()}>
						{(video) => (
							<a href={`/watch/${video.id}`}>
								<div class="video-card">
									<div class="video-card-thumb">
										<img
											src={`/api/videos/${video.id}/thumbnail`}
											alt={video.name}
											loading="lazy"
										/>
										<Show when={video.duration}>
											{(d) => (
												<span class="video-card-duration">
													{formatDuration(d())}
												</span>
											)}
										</Show>
									</div>
									<div class="video-card-title">{video.name}</div>
								</div>
							</a>
						)}
					</For>
				</div>
			)}
		</Show>
	);
}
