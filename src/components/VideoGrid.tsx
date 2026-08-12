import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
} from "solid-js";
import { apiFetch } from "../lib/fetch";
import type { Video } from "../lib/videos";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function Skeleton() {
  return (
    <div class="video-grid">
      <For each={[0, 1, 2]}>
        {() => (
          <div class="video-card group">
            <div class="relative">
              <div class="skeleton w-full aspect-video" />
            </div>
            <div class="px-2 py-1.5">
              <div class="skeleton h-4 w-3/5" />
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

  const [query, setQuery] = createSignal("");
  const [searchFocused, setSearchFocused] = createSignal(false);
  const filteredVideos = createMemo(() => {
    const q = query().trim().toLowerCase();
    const list = videos() ?? [];
    if (!q) return list;
    return list.filter((v) => v.name.toLowerCase().includes(q));
  });
  let searchInputRef: HTMLInputElement | undefined;

  const [renameTarget, setRenameTarget] = createSignal<Video | null>(null);
  const [renameInput, setRenameInput] = createSignal("");
  const [renameError, setRenameError] = createSignal("");
  const [renameSaving, setRenameSaving] = createSignal(false);

  const [deleteTarget, setDeleteTarget] = createSignal<Video | null>(null);
  const [deleteConfirm, setDeleteConfirm] = createSignal("");
  const [deleteError, setDeleteError] = createSignal("");
  const [deleteSaving, setDeleteSaving] = createSignal(false);

  let dialogRef: HTMLDialogElement | undefined;
  let deleteDialogRef: HTMLDialogElement | undefined;

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

  const openDelete = (e: MouseEvent, video: Video) => {
    const popover = (e.currentTarget as HTMLElement).closest("[popover]");
    (popover as HTMLElement | null)?.hidePopover();
    setDeleteTarget(video);
    setDeleteConfirm("");
    setDeleteError("");
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteError("");
    setDeleteConfirm("");
  };

  createEffect(() => {
    if (renameTarget()) dialogRef?.showModal();
    else dialogRef?.close();
  });

  createEffect(() => {
    if (deleteTarget()) deleteDialogRef?.showModal();
    else deleteDialogRef?.close();
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

  const deleteConfirmed = () => {
    const target = deleteTarget();
    return !!target && deleteConfirm() === target.name;
  };

  const submitDelete = async () => {
    const target = deleteTarget();
    if (!target || !deleteConfirmed()) return;
    setDeleteSaving(true);
    try {
      const res = await apiFetch(`/api/videos/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setDeleteError(data.error ?? `削除に失敗しました (${res.status})`);
        return;
      }
      closeDelete();
      refetch();
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <>
      <Show when={videos()} fallback={<Skeleton />}>
        <div class="video-grid">
          <For each={filteredVideos()}>
            {(video) => {
              const popoverId = `menu-${video.id}`;
              const anchor = `--${popoverId}`;
              return (
                <div class="video-card group">
                  <div class="relative">
                    <img
                      class="video-card-thumb-img"
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
                      <span class="i-feather-more-vertical text-base" />
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
                        class="video-card-menu-item"
                        onClick={(e) => openRename(e, video)}
                      >
                        名前を変更
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        class="video-card-menu-item-danger"
                        onClick={(e) => openDelete(e, video)}
                      >
                        削除
                      </button>
                    </div>
                    <Show when={video.duration}>
                      {(d) => (
                        <span class="badge-overlay">{formatDuration(d())}</span>
                      )}
                    </Show>
                  </div>
                  <a
                    href={`/watch/${video.id}`}
                    class="video-card-link-overlay"
                  >
                    <span class="video-card-name">{video.name}</span>
                    <span class="video-card-size">
                      {formatSize(video.size)}
                    </span>
                  </a>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
      <div class="search-spacer" />

      <label class="search-fab-shell">
        <Show when={searchFocused() && query()}>
          <div class="search-suggest-panel">
            <Show
              when={filteredVideos().length > 0}
              fallback={<span class="search-suggest-empty">No matches</span>}
            >
              <For each={filteredVideos().slice(0, 8)}>
                {(v) => <span class="search-suggest-item">{v.name}</span>}
              </For>
            </Show>
          </div>
        </Show>
        <span class="search-fab-icon" aria-hidden="true">
          <span class="i-feather-search" />
          <Show when={!searchFocused() && query()}>
            <span class="search-fab-badge" />
          </Show>
        </span>
        <input
          ref={searchInputRef}
          class="search-fab-input"
          type="search"
          placeholder="Search videos..."
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              searchInputRef?.blur();
            }
          }}
          aria-label="Search videos"
        />
      </label>

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
                  class="modal-btn-secondary"
                  onClick={closeRename}
                  disabled={renameSaving()}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  class="modal-btn-primary"
                  disabled={renameSaving()}
                >
                  {renameSaving() ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          )}
        </Show>
      </dialog>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: dialog handles Escape natively */}
      <dialog
        ref={deleteDialogRef}
        class="modal"
        onClose={closeDelete}
        onClick={(e) => {
          if (e.target === deleteDialogRef) closeDelete();
        }}
      >
        <Show when={deleteTarget()}>
          {(target) => (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitDelete();
              }}
            >
              <h2 class="modal-title">動画を削除</h2>
              <p class="modal-warn">
                この操作は取り消せません。動画ファイルとメタデータが完全に削除されます。
              </p>
              <p class="modal-hint">
                削除するには <strong>{target().name}</strong> と入力してください
              </p>
              <input
                class="modal-input"
                type="text"
                value={deleteConfirm()}
                onInput={(e) => setDeleteConfirm(e.currentTarget.value)}
                maxLength={200}
                autocomplete="off"
                autofocus
              />
              <Show when={deleteError()}>
                {(msg) => <p class="modal-error">{msg()}</p>}
              </Show>
              <div class="modal-actions">
                <button
                  type="button"
                  class="modal-btn-secondary"
                  onClick={closeDelete}
                  disabled={deleteSaving()}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  class="modal-btn-danger"
                  disabled={!deleteConfirmed() || deleteSaving()}
                >
                  {deleteSaving() ? "削除中..." : "削除"}
                </button>
              </div>
            </form>
          )}
        </Show>
      </dialog>
    </>
  );
}
