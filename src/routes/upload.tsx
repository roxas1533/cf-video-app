import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";

const UploadForm = clientOnly(() => import("~/components/UploadForm"));

export default function Upload() {
  return (
    <>
      <Title>アップロード</Title>
      <div class="container">
        <div class="header">
          <A href="/" class="btn-icon-circle">
            <span class="i-feather-chevron-left text-lg" />
          </A>
          <h1 class="text-2xl font-semibold">アップロード</h1>
        </div>
        <UploadForm />
      </div>
    </>
  );
}
