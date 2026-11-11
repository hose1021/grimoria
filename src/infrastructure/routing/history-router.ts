// Path routing for static hosting. The root is injected by the entry point from
// the configured base, never derived from this module's URL.
import { normalizeBasePath } from "../../../scripts/base-path.mjs";

const DEFAULT = "/table";

let ROOT = "/";

type RouteHandler = (route: string) => void;

let onRoute: RouteHandler | null = null;

function dispatch(): void {
  if (onRoute) onRoute(current());
}

export function current(): string {
  const name = window.location.pathname.startsWith(ROOT)
    ? window.location.pathname.slice(ROOT.length)
    : window.location.pathname;
  const route = "/" + name.replace(/^\/+|\/+$/g, "");
  return route === "/" ? DEFAULT : route;
}

export function path(name?: string): string {
  return ROOT + String(name || "").replace(/^\/+/, "");
}

export function go(name?: string): void {
  const route = "/" + String(name || "").replace(/^\/+/, "");
  const next = route === "/" ? DEFAULT : route;
  if (current() === next) {
    dispatch();
    return;
  }
  window.history.pushState(null, "", path(next));
  dispatch();
}

export function restorePath(value: string): string | null {
  if (typeof value !== "string" || !value.startsWith(ROOT)) return null;
  let url;
  try {
    url = new URL(value, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (!url.pathname.startsWith(ROOT)) return null;
  if (url.pathname.includes("..") || url.pathname.includes("\\") || url.pathname.includes("//"))
    return null;
  const pathname =
    url.pathname !== ROOT && url.pathname.endsWith("/")
      ? url.pathname.replace(/\/+$/, "")
      : url.pathname;
  return pathname + url.search;
}

export function start({ root, handler }: { root?: string; handler: RouteHandler }): void {
  ROOT = normalizeBasePath(root);
  onRoute = handler;
  try {
    const redirected = sessionStorage.getItem("pg.redirect");
    if (redirected) {
      sessionStorage.removeItem("pg.redirect");
      const restored = restorePath(redirected);
      if (restored) window.history.replaceState(null, "", restored);
    }
  } catch {
    /* private mode */
  }
  if (window.location.hash.startsWith("#/")) {
    window.history.replaceState(null, "", path(window.location.hash.slice(1)));
  }
  if (window.location.pathname === ROOT) window.history.replaceState(null, "", path(DEFAULT));
  window.addEventListener("popstate", dispatch);
  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download"))
        return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith(ROOT)) return;
      event.preventDefault();
      go(url.pathname.slice(ROOT.length - 1) + url.search);
    },
    true,
  );
  dispatch();
}
