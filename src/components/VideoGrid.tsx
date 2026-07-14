import {
	createEffect,
	createResource,
	createSignal,
	For,
	Show,
} from "solid-js";
import IconMoreVertical from "~icons/feather/more-vertical";
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
	const [videos, { refetch }] = createResource(async () => {
		const res = await apiFetch("/api/videos");
		const data = (await res.json()) as { videos: Video[] };
		return data.videos;
	});

	const [renameTarget, setRenameTarget] = createSignal<Video | null>(null);
	const [renameInput, setRenameInput] = createSignal("");
	const [renameError, setRenameError] = createSignal("");
	const [renameSaving, setRenameSaving] = createSignal(false);

	let dialogRef: HTMLDialogElement | undefined;

	const openRename = (e: MouseEvent, video: Video) => {
		const popover = (e.currentTarget as HTMLElement).closest("[popover]");
		(popover as HTMLElement | null)?.hidePopover();
		setRenameTarget(video);
		setRenameInput(video.name);
		setRenameError("");
	};

	const closeRename = () => {
		setRenameTarget(null);
		setRenameError("");
	};

	createEffect(() => {
		if (renameTarget()) dialogRef?.showModal();
		else dialogRef?.close();
	});

	const submitRename = async () => {
		const target = renameTarget();
		if (!target) return;
		const name = renameInput().trim();
		if (!name) {
			setRenameError("名前を入力してください");
			return;
		}
		if (name === target.name) {
			closeRename();
			return;
		}
		setRenameSaving(true);
		try {
			const res = await apiFetch(`/api/videos/${target.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				setRenameError(data.error ?? `保存に失敗しました (${res.status})`);
				return;
			}
			closeRename();
			refetch();
		} finally {
			setRenameSaving(false);
		}
	};

	return (
		<>
			<Show when={videos()} fallback={<Skeleton />}>
				{(list) => (
					<div class="video-grid">
						<For each={list()}>
							{(video) => {
								const popoverId = `menu-${video.id}`;
								const anchor = `--${popoverId}`;
								return (
									<div class="video-card">
										<div class="video-card-thumb">
											<img
												src={`/api/videos/${video.id}/thumbnail`}
												alt={video.name}
												loading="lazy"
											/>
											<button
												type="button"
												class="video-card-menu-btn"
												aria-label="メニュー"
												popovertarget={popoverId}
												style={{ "anchor-name": anchor }}
											>
												<IconMoreVertical />
											</button>
											<div
												id={popoverId}
												class="video-card-menu"
												popover="auto"
												role="menu"
												style={{ "position-anchor": anchor }}
											>
												<button
													type="button"
													role="menuitem"
													onClick={(e) => openRename(e, video)}
												>
													名前を変更
												</button>
											</div>
											<Show when={video.duration}>
												{(d) => (
													<span class="video-card-duration">
														{formatDuration(d())}
													</span>
												)}
											</Show>
										</div>
										<a
											href={`/watch/${video.id}`}
											class="video-card-title video-card-link"
										>
											{video.name}
										</a>
									</div>
								);
							}}
						</For>
					</div>
				)}
			</Show>

			{/* biome-ignore lint/a11y/useKeyWithClickEvents: dialog handles Escape natively */}
			<dialog
				ref={dialogRef}
				class="modal"
				onClose={closeRename}
				onClick={(e) => {
					if (e.target === dialogRef) closeRename();
				}}
			>
				<Show when={renameTarget()}>
					{(target) => (
						<form
							class="modal-content"
							onSubmit={(e) => {
								e.preventDefault();
								submitRename();
							}}
						>
							<h2 class="modal-title">名前を変更</h2>
							<p class="modal-hint">現在: {target().name}</p>
							<input
								class="modal-input"
								type="text"
								value={renameInput()}
								onInput={(e) => setRenameInput(e.currentTarget.value)}
								maxLength={200}
								autofocus
							/>
							<Show when={renameError()}>
								{(msg) => <p class="modal-error">{msg()}</p>}
							</Show>
							<div class="modal-actions">
								<button
									type="button"
									class="modal-btn modal-btn-secondary"
									onClick={closeRename}
									disabled={renameSaving()}
								>
									キャンセル
								</button>
								<button
									type="submit"
									class="modal-btn modal-btn-primary"
									disabled={renameSaving()}
								>
									{renameSaving() ? "保存中..." : "保存"}
								</button>
							</div>
						</form>
					)}
				</Show>
			</dialog>
		</>
	);
}
