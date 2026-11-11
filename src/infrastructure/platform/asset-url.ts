// Asset URLs use the base Vite injects, so one build serves at the root, under
// a project subpath and on a custom domain.

export function basePath(): string {
  const env = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ? env.BASE_URL : "/";
}

export function assetUrl(name?: string): string {
  return basePath() + String(name || "").replace(/^\/+/, "");
}
