import cloudflare from "@astrojs/cloudflare";
import solidJs from "@astrojs/solid-js";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

export default defineConfig({
  integrations: [solidJs(), UnoCSS({ injectReset: false })],
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  output: "server",
  vite: {
    ssr: {
      external: ["cookie"],
    },
  },
});
