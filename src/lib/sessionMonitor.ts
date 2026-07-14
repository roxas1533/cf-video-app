import { apiFetch } from "./fetch";

const THROTTLE_MS = 60 * 1000;
let lastCheck = 0;

export function startSessionMonitor(): void {
	const check = () => {
		const now = Date.now();
		if (now - lastCheck < THROTTLE_MS) return;
		lastCheck = now;
		apiFetch("/api/ping").catch(() => {});
	};

	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") check();
	});
	window.addEventListener("focus", check);
	document.addEventListener("pointerdown", check, { passive: true });
	document.addEventListener("keydown", check, { passive: true });
}
