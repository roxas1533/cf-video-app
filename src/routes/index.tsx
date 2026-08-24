import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import VideoGrid from "~/components/VideoGrid";
import { videosQuery } from "~/lib/videosQuery";

export const route = {
  preload: () => videosQuery(),
};

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
