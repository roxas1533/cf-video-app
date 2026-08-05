import { createResource, createSignal, onCleanup, Show } from "solid-js";
import { apiFetch } from "../lib/fetch";

type Step = "select" | "uploading" | "done" | "error";

function extractVideoInfo(
  file: File,
): Promise<{ duration: number; thumbnail: Blob }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Video metadata load timed out"));
    }, 15000);

    video.addEventListener("loadedmetadata", () => {
      const seekTarget = Math.min(video.duration * 0.25, 2);
      video.currentTime = seekTarget;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        clearTimeout(timeout);
        cleanup();
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          clearTimeout(timeout);
          cleanup();
          if (!blob) {
            reject(new Error("Failed to create thumbnail"));
            return;
          }
          resolve({ duration: video.duration, thumbnail: blob });
        },
        "image/jpeg",
        0.8,
      );
    });

    video.addEventListener("error", () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("Failed to load video"));
    });
  });
}

function uploadWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.send(body);
  });
}

export default function UploadForm() {
  const [storageSize] = createResource(async () => {
    const res = await apiFetch("/api/storage");
    const data = (await res.json()) as { totalSize: number };
    return data.totalSize;
  });
  const [file, setFile] = createSignal<File | null>(null);
  const [name, setName] = createSignal("");
  const [duration, setDuration] = createSignal<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = createSignal<string | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = createSignal<Blob | null>(null);
  const [step, setStep] = createSignal<Step>("select");
  const [progress, setProgress] = createSignal(0);
  const [error, setError] = createSignal("");
  const [processing, setProcessing] = createSignal(false);

  onCleanup(() => {
    const url = thumbnailUrl();
    if (url) URL.revokeObjectURL(url);
  });

  async function handleFile(f: File) {
    if (f.size > 5 * 1024 * 1024 * 1024) {
      setError("File size exceeds 5GB limit");
      return;
    }
    setFile(f);
    setError("");
    const baseName = f.name.replace(/\.[^.]+$/, "");
    if (!name()) setName(baseName);

    setProcessing(true);
    try {
      const info = await extractVideoInfo(f);
      setDuration(info.duration);
      const prevUrl = thumbnailUrl();
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      const url = URL.createObjectURL(info.thumbnail);
      setThumbnailUrl(url);
      setThumbnailBlob(info.thumbnail);
    } catch (e) {
      setError(
        `Failed to process video: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f) handleFile(f);
  }

  async function handleUpload() {
    const f = file();
    const n = name().trim();
    const d = duration();
    const tb = thumbnailBlob();
    if (!f || !n || d == null || !tb) return;

    setStep("uploading");
    setProgress(0);
    setError("");

    try {
      const initRes = await apiFetch("/api/upload/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, duration: d }),
      });
      if (!initRes.ok) {
        const data = (await initRes.json()) as { error: string };
        throw new Error(data.error || `Server error: ${initRes.status}`);
      }
      const { id, videoUploadUrl, thumbnailUploadUrl } =
        (await initRes.json()) as {
          id: string;
          videoUploadUrl: string;
          thumbnailUploadUrl: string;
        };

      await uploadWithProgress(videoUploadUrl, f, "video/mp4", setProgress);

      await fetch(thumbnailUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: tb,
      });

      const completeRes = await apiFetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: n, duration: d }),
      });
      if (!completeRes.ok) {
        const data = (await completeRes.json()) as { error: string };
        throw new Error(data.error || "Failed to complete upload");
      }

      setStep("done");
      window.location.href = `/watch/${id}`;
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  const canSubmit = () =>
    file() !== null &&
    name().trim() !== "" &&
    duration() != null &&
    thumbnailBlob() !== null &&
    !processing();

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div class="upload-form">
      <button
        class="upload-dropzone"
        type="button"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "video/*";
          input.addEventListener("change", () => {
            const f = input.files?.[0];
            if (f) handleFile(f);
          });
          input.click();
        }}
      >
        <Show
          when={file()}
          fallback={
            <p class="text-text-secondary text-[0.95rem]">
              クリックまたはドラッグで動画ファイルを選択
            </p>
          }
        >
          {(f) => (
            <p class="text-text-secondary text-[0.95rem]">
              {f().name} ({formatSize(f().size)})
            </p>
          )}
        </Show>
      </button>

      <Show when={processing()}>
        <p class="text-text-secondary text-sm">動画を処理中...</p>
      </Show>

      <Show when={thumbnailUrl()}>
        {(url) => (
          <div class="relative rounded-xl overflow-hidden bg-black">
            <img
              class="w-full block aspect-video object-cover"
              src={url()}
              alt="サムネイルプレビュー"
            />
            <Show when={duration()}>
              {(d) => <span class="badge-overlay">{formatDuration(d())}</span>}
            </Show>
          </div>
        )}
      </Show>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-text-secondary">
        動画名
        <input
          class="upload-input"
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="動画名を入力"
          maxLength={200}
        />
      </label>

      <Show when={error()}>
        {(msg) => <p class="text-danger text-sm">{msg()}</p>}
      </Show>

      <Show when={step() === "uploading"}>
        <div class="h-1.5 rounded bg-surface overflow-hidden">
          <div
            class="h-full bg-accent transition-[width] duration-200"
            style={{ width: `${progress()}%` }}
          />
        </div>
        <p class="text-sm text-text-secondary text-center">
          {Math.round(progress())}%
        </p>
      </Show>

      <button
        class="upload-btn"
        disabled={!canSubmit() || step() === "uploading"}
        onClick={handleUpload}
        type="button"
      >
        {step() === "uploading" ? "アップロード中..." : "アップロード"}
      </button>

      <Show when={storageSize()}>
        {(size) => (
          <p class="text-sm text-text-secondary text-center">
            使用容量: {formatSize(size())}
          </p>
        )}
      </Show>
    </div>
  );
}
