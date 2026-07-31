type Row = Record<string, number | string>;

function serverTimingMap(entries: readonly PerformanceServerTiming[] = []) {
	const out: Record<string, number> = {};
	for (const e of entries) out[e.name] = Math.round(e.duration);
	return out;
}

function logNavigation() {
	const nav = performance.getEntriesByType("navigation")[0] as
		| PerformanceNavigationTiming
		| undefined;
	if (!nav) return;

	const st = serverTimingMap(nav.serverTiming);
	const workerReported =
		(st.ssr ?? 0) + (st.db ?? 0) + (st.r2 ?? 0) + (st.sign ?? 0);
	const ttfb = nav.responseStart - nav.requestStart;

	const row: Row = {
		DNS: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
		TCP: Math.round(nav.connectEnd - nav.connectStart),
		TLS:
			nav.secureConnectionStart > 0
				? Math.round(nav.connectEnd - nav.secureConnectionStart)
				: 0,
		TTFB: Math.round(ttfb),
		Download: Math.round(nav.responseEnd - nav.responseStart),
		DOMReady: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
		Load: Math.round(nav.loadEventEnd - nav.fetchStart),
		"Access+Net(est)": Math.max(0, Math.round(ttfb) - workerReported),
		...st,
	};
	console.groupCollapsed(
		`%c[perf] navigation ${nav.name}`,
		"color:#4da6ff;font-weight:bold",
	);
	console.table(row);
	console.groupEnd();
}

function logResource(entry: PerformanceResourceTiming) {
	if (!entry.name.includes("/api/")) return;
	const st = serverTimingMap(entry.serverTiming);
	const ttfb = Math.round(entry.responseStart - entry.requestStart);
	console.log(`%c[perf] ${new URL(entry.name).pathname}`, "color:#888", {
		ttfb,
		total: Math.round(entry.duration),
		...st,
	});
}

export function startPerfLogger() {
	if (document.readyState === "complete") logNavigation();
	else window.addEventListener("load", logNavigation, { once: true });

	const obs = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			logResource(entry as PerformanceResourceTiming);
		}
	});
	obs.observe({ type: "resource", buffered: true });
}
