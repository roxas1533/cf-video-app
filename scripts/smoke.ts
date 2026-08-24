import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const CHROME =
	process.env.PLAYWRIGHT_CHROMIUM ??
	"/nix/store/zpz1i4yvw469siqssfnpfk4snwz29m3x-chromium-150.0.7871.128/bin/chromium";

async function main() {
	const browser = await chromium.launch({ executablePath: CHROME });
	const ctx = await browser.newContext({ viewport: { width: 400, height: 700 } });
	const page = await ctx.newPage();

	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
	page.on("console", (m) => {
		if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
		console.log(`  [${m.type()}] ${m.text()}`);
	});
	page.on("response", (r) => {
		if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
	});

	console.log("→ /");
	await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

	const grid = await page.locator(".video-grid").count();
	console.log(`  .video-grid count: ${grid}`);

	const cssApplied = await page.evaluate(() => {
		const grid = document.querySelector(".video-grid");
		if (!grid) return null;
		return getComputedStyle(grid).display;
	});
	console.log(`  .video-grid display: ${cssApplied}`);

	const searchIcon = await page.evaluate(() => {
		const el = document.querySelector(".i-feather-search");
		if (!el) return null;
		const s = getComputedStyle(el);
		return { bg: s.backgroundImage, mask: s.maskImage, w: s.width };
	});
	console.log(`  search icon:`, searchIcon);

	const cards = await page.locator(".video-card").count();
	console.log(`  video-card count: ${cards}`);

	if (cards > 0) {
		console.log("→ scroll then navigate (uses @solidjs/router's built-in scrollRestoration)");
		const restoration = await page.evaluate(() => history.scrollRestoration);
		console.log(`  history.scrollRestoration: ${restoration}`);

		await page.evaluate(() => window.scrollTo(0, 300));
		await page.waitForTimeout(200);
		const scrollYBeforeNav = await page.evaluate(() => window.scrollY);
		console.log(`  scrollY before nav: ${scrollYBeforeNav}`);

		// Click via the DOM directly rather than locator.click(), which would
		// auto-scroll the target into view first and change scrollYBeforeNav.
		await page.evaluate(() => {
			document
				.querySelector<HTMLAnchorElement>(".video-card-link-overlay")
				?.click();
		});
		await page.waitForURL(/\/watch\//);
		console.log(`  navigated to ${page.url()}`);

		await page.goBack();
		await page.waitForURL(`${BASE}/`);
		await page.waitForTimeout(500);
		const scrollAfter = await page.evaluate(() => window.scrollY);
		console.log(`  scrollY after back: ${scrollAfter}`);

		if (
			scrollYBeforeNav > 50 &&
			Math.abs(scrollAfter - scrollYBeforeNav) > 20
		) {
			errors.push(`scroll not restored: ${scrollYBeforeNav} → ${scrollAfter}`);
		}
	}

	await browser.close();

	if (errors.length) {
		console.error("\nFAIL");
		for (const e of errors) console.error("  -", e);
		process.exit(1);
	}
	console.log("\nOK");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
