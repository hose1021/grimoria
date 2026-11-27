export function parseReferenceRoute(path: string): { roleId: string | null } | null {
  if (path === "/reference") return { roleId: null };
  const raw = /^\/reference\/([^/]+)$/.exec(path)?.[1];
  if (!raw) return null;
  try {
    const roleId = decodeURIComponent(raw);
    return roleId.includes("/") ? null : { roleId };
  } catch {
    return null;
  }
}
