import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";

const VideoGrid = clientOnly(() => import("~/components/VideoGrid"));

export default function Home() {
  return (
    <>
      <Title>my-video</Title>
      <div class="container">
        <div class="header">
          <h1 class="text-2xl font-semibold">Videos</h1>
          <A href="/upload" class="btn-icon-circle ml-auto" title="Upload">
            <span class="i-feather-upload text-lg" />
          </A>
        </div>
        <VideoGrid />
      </div>
    </>
  );
}
