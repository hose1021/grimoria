import { t } from "../ui/i18n/strings.ts";
import { assetUrl } from "../infrastructure/platform/asset-url.ts";
import { saveIfNeeded, state } from "./store.ts";

// Opportunistic checks only; the opening check is never throttled.
const CHECK_INTERVAL = 30 * 60 * 1000;
// The waiting worker activates promptly; past this the prompt asks for a retry.
const ACTIVATION_TIMEOUT = 5000;
const PHASE_MESSAGES: Record<string, string> = {
  downloading: "updateDownloading",
  applying: "updateApplying",
  activateFailed: "updateActivateFailed",
  saveFailed: "updateSaveFailed",
};

export async function prepareOffline(flushNotes: () => boolean): Promise<void> {
  const banner = document.getElementById("update-banner");
  const message = document.getElementById("update-message");
  const updateButton = document.getElementById("update-now") as HTMLButtonElement | null;
  const laterButton = document.getElementById("update-later") as HTMLButtonElement | null;

  let phase = "idle";
  let registration: ServiceWorkerRegistration | null = null;
  let reloading = false;
  let reloadPending = false;
  let approvedWorker: ServiceWorker | null = null;
  let offeredWorker: ServiceWorker | null = null;
  let deferredWorker: ServiceWorker | null = null;
  let lastCheck = 0;
  let activationTimer: ReturnType<typeof setTimeout> | undefined;
  // Only inactive windows may apply an opening update automatically.
  const automatic = new WeakSet<ServiceWorker>();

  function paint(): void {
    if (!(banner && message && updateButton && laterButton)) return;
    message.textContent = t(PHASE_MESSAGES[phase] || "updateAvailable");
    updateButton.textContent = t("updateNow");
    laterButton.textContent = t("updateLater");
  }

  function setPhase(next: string): void {
    phase = next;
    if (!(banner && message && updateButton && laterButton)) return;
    const busy = next === "applying" || next === "downloading";
    banner.dataset.state = next;
    banner.hidden = next === "idle";
    updateButton.hidden = busy;
    laterButton.hidden = busy;
    updateButton.disabled = busy;
    laterButton.disabled = busy;
    paint();
  }

  function activeGame(): boolean {
    return state.phase !== "setup" && state.phase !== "over";
  }

  function saveForUpdate(): boolean {
    let ok = false;
    try {
      ok = flushNotes() && saveIfNeeded();
    } catch {
      // Treat a throwing storage adapter the same as a rejected write.
    }
    if (ok || !activeGame()) return true;
    setPhase("saveFailed");
    return false;
  }

  function reloadUpdatedPage(): void {
    if (reloading || !saveForUpdate()) return;
    reloading = true;
    location.reload();
  }

  async function activate(confirmed: boolean): Promise<void> {
    if (reloadPending) {
      if (confirmed) reloadUpdatedPage();
      return;
    }
    if (phase === "applying") return;
    const worker = registration?.waiting;
    if (!worker) {
      setPhase("idle");
      return;
    }
    setPhase("applying");
    // Let the applying state paint even when the tab is backgrounded.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (reloadPending) return;
    if (activeGame() && !confirmed) {
      setPhase("available");
      return;
    }
    if (!saveForUpdate()) return;
    if (registration?.waiting !== worker) {
      setPhase("idle");
      return;
    }
    try {
      approvedWorker = confirmed ? worker : null;
      worker.postMessage({ type: "SKIP_WAITING" });
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
    updateButton.addEventListener("click", () => void activate(true));
    laterButton.addEventListener("click", () => {
      deferredWorker = offeredWorker;
      setPhase("idle");
    });
  }

  if (!("serviceWorker" in navigator)) {
    paint();
    return;
  }

  // A sibling tab can activate the shared worker without this window's consent.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !navigator.serviceWorker.controller) return;
    clearTimeout(activationTimer);
    reloadPending = true;
    if (activeGame() && approvedWorker !== navigator.serviceWorker.controller) {
      setPhase("available");
      return;
    }
    reloadUpdatedPage();
  });

  try {
    const reg = await navigator.serviceWorker.register(assetUrl("sw.js"), {
      updateViaCache: "none",
    });
    registration = reg;
    const installed = (worker: ServiceWorker): void => {
      if (worker.state !== "installed" || worker === deferredWorker) return;
      if (!navigator.serviceWorker.controller) return;
      if (
        reloadPending ||
        phase === "applying" ||
        phase === "activateFailed" ||
        phase === "saveFailed"
      )
        return;
      offeredWorker = worker;
      setPhase("available");
      if (!activeGame() && automatic.has(worker)) void activate(false);
    };
    const watch = (worker: ServiceWorker | null | undefined): void => {
      if (!worker) return;
      const statechange = (): void => {
        if (worker.state === "installing" && phase === "idle" && navigator.serviceWorker.controller)
          setPhase("downloading");
        if (worker.state === "redundant" && phase === "downloading") setPhase("idle");
        installed(worker);
      };
      statechange();
      worker.addEventListener("statechange", statechange);
    };
    const adopt = (): void => {
      for (const worker of [reg.installing, reg.waiting]) if (worker) automatic.add(worker);
    };
    watch(reg.installing);
    // An install can finish before this event is delivered, which leaves
    // `installing` empty while the worker already waits.
    reg.addEventListener("updatefound", () => watch(reg.installing ?? reg.waiting));

    // The opening check runs before the throttle.
    adopt();
    const alreadyWaiting = reg.waiting;
    if (alreadyWaiting) installed(alreadyWaiting);
    lastCheck = Date.now();
    await reg.update().catch(() => {});
    adopt();
    watch(reg.installing);
    // A registration can resolve before it exposes the worker that is already
    // waiting, so the adopt() calls above can miss it. The opening check still
    // owns that worker, so re-check after the
    // current task and once more after the registration settles.
    const applyWaiting = (): void => {
      if (!reg.waiting) return;
      automatic.add(reg.waiting);
      installed(reg.waiting);
    };
    // A worker offered before the network check may have been deferred by now.
    if (reg.waiting !== alreadyWaiting) applyWaiting();
    if (!reg.waiting) {
      setTimeout(applyWaiting, 0);
      setTimeout(applyWaiting, 250);
    }

    // Check when the app becomes visible or comes back online. The interval is
    // the only timer and is throttled by CHECK_INTERVAL.
    const checkForUpdate = (force = false): void => {
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - lastCheck < CHECK_INTERVAL) return;
      lastCheck = now;
      reg.update().catch(() => {});
    };
    window.addEventListener("online", () => checkForUpdate(true));
    window.addEventListener("pageshow", () => checkForUpdate());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    setInterval(() => checkForUpdate(), CHECK_INTERVAL);
  } catch {
    paint();
  }
}
