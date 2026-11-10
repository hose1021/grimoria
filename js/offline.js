// @ts-check
import { t } from "./strings.js";
import { assetUrl } from "./ui.js";
import { saveIfNeeded } from "./store.js";

// Opportunistic checks only; a background tab never polls the network.
const CHECK_INTERVAL = 30 * 60 * 1000;
// The waiting worker activates promptly; past this the prompt asks for a retry.
const ACTIVATION_TIMEOUT = 5000;
// Every controlled window must confirm it can save before one window activates.
const PREFLIGHT_TIMEOUT = 4000;
const PROBLEM_PHASES = new Set(["failed", "peerFailed", "unconfirmed", "activateFailed", "reloadBlocked"]);
/** @type {Record<string, string>} */
const PHASE_MESSAGES = {
  applying: "updateApplying",
  failed: "updateSaveFailed",
  peerFailed: "updateOtherWindowFailed",
  unconfirmed: "updateUnconfirmed",
  activateFailed: "updateActivateFailed",
  reloadBlocked: "updateReloadBlocked"
};

/** @typedef {{ ok: boolean, failed?: number, unconfirmed?: number }} Preflight */

/** @returns {Promise<void>} */
export async function prepareOffline() {
  const status = document.getElementById("offline-status");
  const banner = document.getElementById("update-banner");
  const message = document.getElementById("update-message");
  const updateButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("update-now"));
  const laterButton = /** @type {HTMLButtonElement | null} */ (document.getElementById("update-later"));

  let statusKey = "offlinePending";
  // idle | available | applying and PROBLEM_PHASES
  let phase = "idle";
  /** @type {ServiceWorkerRegistration | null} */
  let registration = null;
  let dismissed = false;
  let reloading = false;
  let lastCheck = 0;
  let activationTimer = 0;

  function paint() {
    if (status) status.textContent = t(statusKey);
    if (banner && message && updateButton && laterButton) {
      message.textContent = t(PHASE_MESSAGES[phase] || "updateAvailable");
      updateButton.textContent = t(phase === "reloadBlocked" ? "reloadNow" : "updateNow");
      laterButton.textContent = t("updateLater");
    }
  }

  /** @param {string} next */
  function setPhase(next) {
    phase = next;
    if (!(banner && message && updateButton && laterButton)) return;
    banner.dataset.state = next;
    banner.hidden = next === "idle";
    updateButton.disabled = next === "applying";
    laterButton.disabled = next === "applying";
    paint();
  }

  function refreshStatus() {
    statusKey = registration?.active ? "offlineReady" : "offlinePending";
    paint();
  }

  function saved() {
    try { return saveIfNeeded(); } catch (error) { return false; }
  }

  // The waiting worker asks every window whether its game is saved before the
  // user's confirmation can activate it. Each window answers on its own port.
  /** @param {MessageEvent} event */
  function answerPreflight(event) {
    const data = event.data || {};
    if (data.type !== "PREPARE_UPDATE" || !event.ports || !event.ports[0]) return;
    event.ports[0].postMessage({ ok: saved() });
  }

  /**
   * @param {ServiceWorker} worker
   * @returns {Promise<Preflight>}
   */
  function askWorker(worker) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve({ ok: false, unconfirmed: 1 }), PREFLIGHT_TIMEOUT);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        resolve(event.data || { ok: false });
      };
      try {
        worker.postMessage({ type: "PREPARE_UPDATE" }, [channel.port2]);
      } catch (error) {
        clearTimeout(timer);
        resolve({ ok: false, failed: 1 });
      }
    });
  }

  /** @returns {Promise<void>} */
  async function activate() {
    if (phase === "applying") return;
    if (phase === "reloadBlocked") {
      // The new worker already controls this page; only a save blocks reload.
      if (saved()) location.reload();
      else setPhase("failed");
      return;
    }
    const worker = registration?.waiting;
    if (!worker) { dismissed = true; setPhase("idle"); return; }
    setPhase("applying");
    // Let the applying state paint even when the tab is backgrounded.
    await new Promise((done) => setTimeout(done, 0));
    if (!saved()) { setPhase("failed"); return; }
    const preflight = await askWorker(worker);
    if (!preflight.ok) {
      setPhase(preflight.failed ? "peerFailed" : "unconfirmed");
      return;
    }
    if (!registration?.waiting) { dismissed = true; setPhase("idle"); return; }
    try {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } catch {
      setPhase("activateFailed");
      return;
    }
    clearTimeout(activationTimer);
    activationTimer = setTimeout(() => {
      if (phase === "applying") setPhase("activateFailed");
    }, ACTIVATION_TIMEOUT);
  }

  const languageObserver = new MutationObserver(() => paint());
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  paint();

  if (banner && message && updateButton && laterButton) {
    updateButton.addEventListener("click", activate);
    laterButton.addEventListener("click", () => {
      dismissed = true;
      setPhase("idle");
      refreshStatus();
    });
  }

  if (!("serviceWorker" in navigator)) {
    statusKey = "offlineUnavailable";
    paint();
    return;
  }

  navigator.serviceWorker.addEventListener("message", answerPreflight);
  // Reload only when the game is safely on disk. A window that cannot save
  // keeps running its already loaded code and shows the recovery message.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    clearTimeout(activationTimer);
    if (!saved()) {
      reloading = false;
      setPhase("reloadBlocked");
      return;
    }
    location.reload();
  });

  try {
    const reg = await navigator.serviceWorker.register(assetUrl("sw.js"), { updateViaCache: "none" });
    registration = reg;
    /** @param {ServiceWorker} worker */
    const installed = (worker) => {
      if (worker.state !== "installed" || PROBLEM_PHASES.has(phase)) return;
      if (navigator.serviceWorker.controller) { dismissed = false; setPhase("available"); }
      else refreshStatus();
    };
    /** @param {ServiceWorker | null | undefined} worker */
    const watch = (worker) => {
      if (!worker) return;
      installed(worker);
      worker.addEventListener("statechange", () => installed(worker));
    };
    watch(reg.installing);
    reg.addEventListener("updatefound", () => watch(reg.installing));
    if (reg.waiting && navigator.serviceWorker.controller) setPhase("available");
    navigator.serviceWorker.ready.then(refreshStatus);
    refreshStatus();

    // Check when the app opens, becomes visible or comes back online. The
    // interval is the only timer and is throttled by CHECK_INTERVAL.
    /** @param {boolean} [force] */
    const checkForUpdate = (force = false) => {
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - lastCheck < CHECK_INTERVAL) return;
      lastCheck = now;
      reg.update().catch(() => {});
    };
    lastCheck = Date.now();
    window.addEventListener("online", () => checkForUpdate(true));
    window.addEventListener("pageshow", () => checkForUpdate());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    setInterval(() => checkForUpdate(), CHECK_INTERVAL);
  } catch {
    statusKey = "offlineUnavailable";
    paint();
  }
}
