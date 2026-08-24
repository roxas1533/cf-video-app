import { solidStart } from "@solidjs/start/config";
import { nitro } from "nitro/vite";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		solidStart({ devOverlay: false }),
		nitro({ preset: "cloudflare-module" }),
		UnoCSS(),
	],
	build: {
		minify: false,
		rollupOptions: {
			external: [/^cloudflare:/],
		},
	},
});
