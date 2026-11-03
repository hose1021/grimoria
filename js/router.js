const DEFAULT = "/table";

export function current() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return DEFAULT;
  return hash.startsWith("/") ? hash : "/" + hash;
}

export function go(path) {
  const next = path.startsWith("/") ? path : "/" + path;
  if (current() === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = "#" + next;
}

export function start(handler) {
  const run = () => handler(current());
  window.addEventListener("hashchange", run);
  run();
}
