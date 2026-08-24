import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { onMount, Suspense } from "solid-js";
import "./styles.css";
import { MetaProvider, Title } from "@solidjs/meta";
import { startPerfLogger } from "./lib/perfLogger";
import { startSessionMonitor } from "./lib/sessionMonitor";

export default function App() {
	onMount(() => {
		startSessionMonitor();
		startPerfLogger();
	});
	return (
		<Router
			scrollRestoration
			root={(props) => (
				<MetaProvider>
					<Title>my-video</Title>
					<Suspense>{props.children}</Suspense>
				</MetaProvider>
			)}
		>
			<FileRoutes />
		</Router>
	);
}
