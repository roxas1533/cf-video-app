// @refresh reload
import "virtual:uno.css";
import { mount, StartClient } from "@solidjs/start/client";

// biome-ignore lint/style/noNonNullAssertion: element is always present
mount(() => <StartClient />, document.getElementById("app")!);
