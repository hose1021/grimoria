// One normalized application base, shared by the Vite config, the fallback
// generator and the router. Exactly one leading and one trailing slash; repeated
// slashes collapsed; "" and "/" both become "/".
export function normalizeBasePath(value: unknown): string {
  const raw = String(value ?? "").trim();
  const trimmed = raw.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  const segments = trimmed.split("/").filter(Boolean);
  return segments.length ? `/${segments.join("/")}/` : "/";
}
