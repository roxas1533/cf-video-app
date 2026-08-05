import Plyr from "plyr";
import "plyr/dist/plyr.css";
import { onCleanup, onMount } from "solid-js";
import { apiFetch } from "../lib/fetch";

interface Props {
  videoId: string;
  videoName: string;
  streamUrl: string;
}

async function fetchStreamUrl(id: string): Promise<string> {
  const res = await apiFetch(`/api/videos/${id}/stream-url`);
  const data = (await res.json()) as { url: string };
  return data.url;
}

export default function VideoPlayer(props: Props) {
  const thumbnailUrl = () => `/api/videos/${props.videoId}/thumbnail`;
  let streamUrl = props.streamUrl;
  let refreshing = false;

  let videoEl!: HTMLVideoElement;
  let player: Plyr | undefined;

  async function refreshUrl() {
    if (refreshing) return;
    refreshing = true;
    try {
      const pos = videoEl.currentTime;
      const url = await fetchStreamUrl(props.videoId);
      streamUrl = url;
      videoEl.src = url;
      videoEl.currentTime = pos;
      videoEl.play();
    } finally {
      refreshing = false;
    }
  }

  function handleError() {
    if (streamUrl && videoEl.currentTime > 0) {
      refreshUrl();
    }
  }

  function setupMediaSession() {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: props.videoName,
      artwork: [{ src: thumbnailUrl(), type: "image/jpeg" }],
    });

    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => videoEl.play()],
      ["pause", () => videoEl.pause()],
      [
        "seekbackward",
        (d) => {
          videoEl.currentTime = Math.max(
            0,
            videoEl.currentTime - (d.seekOffset ?? 10),
          );
        },
      ],
      [
        "seekforward",
        (d) => {
          videoEl.currentTime = Math.min(
            videoEl.duration,
            videoEl.currentTime + (d.seekOffset ?? 10),
          );
        },
      ],
      [
        "seekto",
        (d) => {
          if (d.seekTime != null) videoEl.currentTime = d.seekTime;
        },
      ],
    ];

    for (const [action, handler] of actions) {
      navigator.mediaSession.setActionHandler(action, handler);
    }

    function updatePositionState() {
      if (videoEl.duration && Number.isFinite(videoEl.duration)) {
        navigator.mediaSession.setPositionState({
          duration: videoEl.duration,
          playbackRate: videoEl.playbackRate,
          position: videoEl.currentTime,
        });
      }
    }

    videoEl.addEventListener("timeupdate", updatePositionState);
    videoEl.addEventListener("playing", updatePositionState);
    videoEl.addEventListener("pause", updatePositionState);

    onCleanup(() => {
      videoEl.removeEventListener("timeupdate", updatePositionState);
      videoEl.removeEventListener("playing", updatePositionState);
      videoEl.removeEventListener("pause", updatePositionState);
      for (const [action] of actions) {
        navigator.mediaSession.setActionHandler(action, null);
      }
    });
  }

  onMount(() => {
    player = new Plyr(videoEl, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "settings",
        "pip",
        "airplay",
        "fullscreen",
      ],
      settings: ["speed"],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      fullscreen: { enabled: true, fallback: true, iosNative: true },
    });
    setupMediaSession();
    videoEl.addEventListener("error", handleError);
  });

  onCleanup(() => {
    videoEl.removeEventListener("error", handleError);
    player?.destroy();
  });

  return (
    <video
      ref={videoEl}
      src={streamUrl}
      class="w-full aspect-video"
      playsinline
      preload="none"
      poster={thumbnailUrl()}
    >
      <track kind="captions" label="No captions" src="data:," />
    </video>
  );
}
