import { defineConfig, presetIcons, presetWind3 } from "unocss";

const shortcuts = {
	container: "max-w-[960px] mx-auto py-4 px-3",
	header: "flex items-center gap-4 mb-6",
	"btn-icon-circle":
		"inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-border text-text transition-colors hover:bg-card-hover flex-shrink-0",
	"video-grid":
		"grid grid-cols-[repeat(auto-fill,minmax(min(260px,45%),1fr))] gap-2",
	"video-card":
		"relative rounded-xl overflow-hidden bg-surface border border-border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
	"video-card-thumb-img": "w-full block aspect-video object-cover bg-black",
	"badge-overlay":
		"absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded",
	"video-card-menu-btn":
		"absolute top-1.5 right-1.5 z-2 w-8 h-8 inline-flex items-center justify-center bg-black/60 text-white border-none rounded-full cursor-pointer p-0 opacity-0 transition-all duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/80 [@media(hover:none)]:opacity-100",
	"video-card-menu":
		"absolute inset-[unset] top-[calc(anchor(bottom)+0.25rem)] right-[anchor(right)] m-0 p-0 min-w-[10rem] bg-bg text-text border border-border rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden",
	"video-card-menu-item":
		"block w-full text-left px-3 py-2.5 bg-transparent text-text border-none cursor-pointer font-inherit hover:bg-card-hover",
	"video-card-menu-item-danger":
		"video-card-menu-item text-danger hover:bg-[rgba(238,85,85,0.12)]",
	"video-card-link-overlay":
		"block px-2 py-1.5 text-sm font-medium truncate before:content-[''] before:absolute before:inset-0 before:z-1",
	modal:
		"bg-bg text-text border-none rounded-xl p-5 w-[min(420px,calc(100%-2rem))] m-auto shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop:bg-black/50",
	"modal-title": "text-lg font-semibold mb-2",
	"modal-hint": "text-sm text-text-secondary mb-3 break-all",
	"modal-warn":
		"text-sm text-danger bg-[rgba(238,85,85,0.1)] border border-[rgba(238,85,85,0.3)] rounded-md px-3 py-2 mb-3",
	"modal-input":
		"appearance-none w-full px-3 py-2 border border-border rounded-lg bg-surface text-text text-[0.95rem] outline-none transition-colors focus:border-accent",
	"modal-error": "text-danger text-sm mt-2",
	"modal-actions": "flex justify-end gap-2 mt-4",
	"modal-btn":
		"px-4 py-2 border-none rounded-lg text-sm font-medium cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:not-disabled:opacity-90",
	"modal-btn-primary": "modal-btn bg-accent text-white",
	"modal-btn-secondary": "modal-btn bg-surface text-text border border-border",
	"modal-btn-danger": "modal-btn bg-danger text-white",
	skeleton:
		"bg-surface rounded-lg animate-[skeleton-pulse_1.2s_ease-in-out_infinite]",
	"upload-form": "flex flex-col gap-4 max-w-[600px] mx-auto",
	"upload-dropzone":
		"w-full border-2 border-dashed border-border rounded-xl px-6 py-12 text-center cursor-pointer bg-transparent text-inherit transition-colors hover:border-accent",
	"upload-input":
		"appearance-none px-3 py-2 border border-border rounded-lg bg-surface text-text text-[0.95rem] outline-none transition-colors focus:border-accent",
	"upload-btn":
		"px-6 py-2.5 border-none rounded-lg bg-accent text-white text-[0.95rem] font-medium cursor-pointer transition-opacity hover:not-disabled:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed",
};

export default defineConfig({
	presets: [
		presetWind3(),
		presetIcons({
			scale: 1.2,
			extraProperties: {
				display: "inline-block",
				"vertical-align": "middle",
			},
		}),
	],
	theme: {
		colors: {
			bg: "var(--bg)",
			surface: "var(--bg-surface)",
			text: "var(--text)",
			"text-secondary": "var(--text-secondary)",
			border: "var(--border)",
			accent: "var(--accent)",
			"card-hover": "var(--card-hover)",
			danger: "var(--danger)",
		},
	},
	safelist: Object.keys(shortcuts),
	shortcuts,
});
