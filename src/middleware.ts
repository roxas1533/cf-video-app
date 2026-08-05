import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (_context, next) => {
  const t0 = Date.now();
  const response = await next();
  const ssrMs = Date.now() - t0;

  const existing = response.headers.get("Server-Timing");
  const value = existing ? `${existing}, ssr;dur=${ssrMs}` : `ssr;dur=${ssrMs}`;
  response.headers.set("Server-Timing", value);
  return response;
});
