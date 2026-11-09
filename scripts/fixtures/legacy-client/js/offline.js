import { t } from "./strings.js";

export async function prepareOffline() {
  const status = document.getElementById("offline-status");
  let key = "offlinePending";
  const update = () => { status.textContent = t(key); };
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  update();
  if (!("serviceWorker" in navigator)) { key = "offlineUnavailable"; update(); return; }
  try {
    // No skipWaiting: a new release must not replace an active game's assets.
    const registration = await navigator.serviceWorker.register("./sw.js");
    const refresh = () => { key = registration.active ? "offlineReady" : "offlinePending"; update(); };
    registration.addEventListener("updatefound", () => {
      registration.installing?.addEventListener("statechange", refresh);
    });
    navigator.serviceWorker.addEventListener("controllerchange", refresh);
    navigator.serviceWorker.ready.then(refresh);
    refresh();
  } catch {
    key = "offlineUnavailable";
    update();
  }
}
