export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, { ...init, redirect: "manual" });
  if (res.type === "opaqueredirect") {
    window.location.reload();
    return new Promise(() => {});
  }
  return res;
}
