import { env } from "cloudflare:workers";
import { Title } from "@solidjs/meta";
import { A, createAsync, query, redirect, useParams } from "@solidjs/router";
import { Show, Suspense } from "solid-js";
import VideoPlayer from "~/components/VideoPlayer";
import { signVideoUrl } from "~/lib/r2Sign";
import { getVideoById } from "~/lib/videos";

const loadVideo = query(async (id: string) => {
  "use server";
  const t0 = Date.now();
  const video = await getVideoById(env.VIDEO_DB, id);
  const dbTime = Date.now() - t0;
  if (!video) throw redirect("/");
  const t1 = Date.now();
  const streamUrl = await signVideoUrl(id);
  const signTime = Date.now() - t1;
  void dbTime;
  void signTime;
  return { id, name: video.name, streamUrl };
}, "video");

export const route = {
  preload: ({ params }: { params: { id: string } }) => loadVideo(params.id),
};

export default function Watch() {
  const params = useParams<{ id: string }>();
  const data = createAsync(() => loadVideo(params.id));
  return (
    <Suspense>
      <Show when={data()}>
        {(v) => (
          <>
            <Title>{v().name}</Title>
            <div class="container">
              <div class="header">
                <A href="/" class="btn-icon-circle">
                  <span class="i-feather-chevron-left text-lg" />
                </A>
                <h1 class="text-2xl font-semibold">{v().name}</h1>
              </div>
              <VideoPlayer
                videoId={v().id}
                videoName={v().name}
                streamUrl={v().streamUrl}
              />
            </div>
          </>
        )}
      </Show>
    </Suspense>
  );
}
