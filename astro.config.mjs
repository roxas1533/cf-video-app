import cloudflare from "@astrojs/cloudflare";
import solidJs from "@astrojs/solid-js";
import { defineConfig } from "astro/config";
import Icons from "unplugin-icons/vite";

export default defineConfig({
	integrations: [solidJs()],
	adapter: cloudflare({
		platformProxy: { enabled: true },
	}),
	output: "server",
	vite: {
		plugins: [Icons({ compiler: "solid" })],
		ssr: {
			external: ["cookie"],
		},
	},
});
