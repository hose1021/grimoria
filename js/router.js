// Path routing for static hosting. ROOT is the app folder, "/" or a project
// subpath such as "/pocket-grimoire-go/".
const DEFAULT = "/table";
const ROOT = new URL("../", import.meta.url).pathname;

let onRoute = null;

function dispatch() {
  if (onRoute) onRoute(current());
}

export function current() {
  const name = window.location.pathname.startsWith(ROOT)
    ? window.location.pathname.slice(ROOT.length)
    : window.location.pathname;
  const route = "/" + name.replace(/^\/+|\/+$/g, "");
  return route === "/" ? DEFAULT : route;
}

export function path(name) {
  return ROOT + String(name || "").replace(/^\/+/, "");
}

export function go(name) {
  const route = "/" + String(name || "").replace(/^\/+/, "");
  const next = route === "/" ? DEFAULT : route;
  if (current() === next) {
    dispatch();
    return;
  }
  window.history.pushState(null, "", path(next));
  dispatch();
}

export function start(handler) {
  onRoute = handler;
  try {
    const redirected = sessionStorage.getItem("pg.redirect");
    if (redirected) {
      sessionStorage.removeItem("pg.redirect");
      if (redirected.startsWith(ROOT)) window.history.replaceState(null, "", redirected);
    }
  } catch (error) { /* private mode */ }
  if (window.location.hash.startsWith("#/")) {
    window.history.replaceState(null, "", path(window.location.hash.slice(1)));
  }
  if (current() === DEFAULT) window.history.replaceState(null, "", path(DEFAULT));
  window.addEventListener("popstate", dispatch);
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith(ROOT)) return;
    event.preventDefault();
    go(url.pathname.slice(ROOT.length - 1) + url.search);
  }, true);
  dispatch();
}
