import { t } from "../ui/i18n/strings.ts";
import { assetUrl } from "../infrastructure/platform/asset-url.ts";
import { saveIfNeeded } from "./store.ts";

// Opportunistic checks only; a background tab never polls the network.
const CHECK_INTERVAL = 30 * 60 * 1000;
// The waiting worker activates promptly; past this the prompt asks for a retry.
const ACTIVATION_TIMEOUT = 5000;
// Every controlled window must confirm it can save before one window activates.
const PREFLIGHT_TIMEOUT = 4000;
const PROBLEM_PHASES = new Set([
  "failed",
  "peerFailed",
  "unconfirmed",
  "activateFailed",
  "reloadBlocked",
]);
const PHASE_MESSAGES: Record<string, string> = {
  applying: "updateApplying",
  failed: "updateSaveFailed",
  peerFailed: "updateOtherWindowFailed",
  unconfirmed: "updateUnconfirmed",
  activateFailed: "updateActivateFailed",
  reloadBlocked: "updateReloadBlocked",
};

type Preflight = { ok: boolean; failed?: number; unconfirmed?: number };

export async function prepareOffline(): Promise<void> {
  const status = document.getElementById("offline-status");
  const banner = document.getElementById("update-banner");
  const message = document.getElementById("update-message");
  const updateButton = document.getElementById("update-now") as HTMLButtonElement | null;
  const laterButton = document.getElementById("update-later") as HTMLButtonElement | null;

  let statusKey = "offlinePending";
  // idle | available | applying and PROBLEM_PHASES
  let phase = "idle";
  let registration: ServiceWorkerRegistration | null = null;
  let reloading = false;
  let lastCheck = 0;
  let activationTimer = 0;

  function paint(): void {
    if (status) status.textContent = t(statusKey);
    if (banner && message && updateButton && laterButton) {
      message.textContent = t(PHASE_MESSAGES[phase] || "updateAvailable");
      updateButton.textContent = t(phase === "reloadBlocked" ? "reloadNow" : "updateNow");
      laterButton.textContent = t("updateLater");
    }
  }

  function setPhase(next: string): void {
    phase = next;
    if (!(banner && message && updateButton && laterButton)) return;
    banner.dataset.state = next;
    banner.hidden = next === "idle";
    updateButton.disabled = next === "applying";
    laterButton.disabled = next === "applying";
    paint();
  }

  function refreshStatus(): void {
    statusKey = registration?.active ? "offlineReady" : "offlinePending";
    paint();
  }

  function saved(): boolean {
    try {
      return saveIfNeeded();
    } catch {
      return false;
    }
  }

  // The waiting worker asks every window whether its game is saved before the
  // user's confirmation can activate it. Each window answers on its own port.
  function answerPreflight(event: MessageEvent): void {
    const data = event.data || {};
    if (data.type !== "PREPARE_UPDATE" || !event.ports || !event.ports[0]) return;
    event.ports[0].postMessage({ ok: saved() });
  }

  function askWorker(worker: ServiceWorker): Promise<Preflight> {
    const { promise, resolve } = Promise.withResolvers<Preflight>();
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve({ ok: false, unconfirmed: 1 }), PREFLIGHT_TIMEOUT);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve((event.data as Preflight | null) ?? { ok: false });
    };
    try {
      worker.postMessage({ type: "PREPARE_UPDATE" }, [channel.port2]);
    } catch {
      clearTimeout(timer);
      resolve({ ok: false, failed: 1 });
    }
    return promise;
  }

  async function activate(): Promise<void> {
    if (phase === "applying") return;
    if (phase === "reloadBlocked") {
      // The new worker already controls this page; only a save blocks reload.
      if (saved()) location.reload();
      else setPhase("failed");
      return;
    }
    const worker = registration?.waiting;
    if (!worker) {
      setPhase("idle");
      return;
    }
    setPhase("applying");
    // Let the applying state paint even when the tab is backgrounded.
    const painted = Promise.withResolvers<void>();
    setTimeout(painted.resolve, 0);
    await painted.promise;
    if (!saved()) {
      setPhase("failed");
      return;
    }
    const preflight = await askWorker(worker);
    if (!preflight.ok) {
      setPhase(preflight.failed ? "peerFailed" : "unconfirmed");
      return;
    }
    if (!registration?.waiting) {
      setPhase("idle");
      return;
    }
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
  languageObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  paint();

  if (banner && message && updateButton && laterButton) {
    updateButton.addEventListener("click", activate);
    laterButton.addEventListener("click", () => {
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
    const reg = await navigator.serviceWorker.register(assetUrl("sw.js"), {
      updateViaCache: "none",
    });
    registration = reg;
    const installed = (worker: ServiceWorker): void => {
      if (worker.state !== "installed" || PROBLEM_PHASES.has(phase)) return;
      if (navigator.serviceWorker.controller) {
        setPhase("available");
      } else refreshStatus();
    };
    const watch = (worker: ServiceWorker | null | undefined): void => {
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
    const checkForUpdate = (force = false): void => {
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
