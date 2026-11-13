// Composition root. It is the only module that imports the remaining DOM
// screens and wires them into the UI shell; `src/ui` sees ports only.
import * as store from "./store.ts";
import { previewOnState } from "../application/dispatch/preview.ts";
import {
  allRoles,
  currentLang,
  imageFor,
  loadLocale,
  roleById,
} from "../infrastructure/catalog/role-catalog.ts";
import { getUiLang, roleCount, setUiLang, t, teamText } from "../ui/i18n/strings.ts";
import { setLang, translateText, watch } from "../ui/i18n/translate.ts";
import { guideFor } from "./guidance.ts";
import { assetUrl } from "../infrastructure/platform/asset-url.ts";
import { current, go, path, start } from "../infrastructure/routing/history-router.ts";
import { prepareOffline } from "./offline.ts";
import * as presets from "../core/model/presets.ts";
import * as library from "../infrastructure/library/bag-library.ts";
import * as help from "./screens/help.ts";
import * as demo from "./screens/demo.ts";
import { mountShell } from "../ui/main.tsx";
import { toPreviewOutcome } from "../ui/screens/table/helpers.ts";
import type { LegacyScreen, ShellPorts } from "../ui/ports.ts";
import { createRouteStore } from "../ui/router.ts";

const screens: Record<string, LegacyScreen> = {
  "/help": help,
  "/demo": demo,
};

const savedLang = (() => {
  try {
    return localStorage.getItem("pg.lang") || "ru";
  } catch {
    return "ru";
  }
})();

function applyLocale(code: string): void {
  document.documentElement.lang = code;
  setLang(code);
  setUiLang(code);
}

async function changeLanguage(code: string): Promise<void> {
  try {
    await loadLocale(code);
    applyLocale(code);
  } catch (error) {
    console.error("Could not load language", code, error);
    applyLocale("en");
  }
  // The sheet takes its language from the path, so a language change there must
  // move the path too; every other route keeps its own name.
  const route = current();
  go(/^\/sheet(\/|$)/.test(route) ? "sheet/" + code : route);
}

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* keep the preference for this visit */
  }
}

function paintStorageStatus(status: HTMLElement): void {
  status.hidden = !store.state.storageError;
  status.textContent = store.state.storageError ? t("storageWarning") : "";
}

async function boot(): Promise<void> {
  applyLocale(savedLang);
  try {
    await loadLocale(savedLang);
  } catch (error) {
    console.error("Could not load saved language", error);
    applyLocale("en");
  }

  let notify: (() => void) | null = null;
  const route = createRouteStore({
    read: current,
    subscribe(listener) {
      notify = listener;
      return () => {
        if (notify === listener) notify = null;
      };
    },
  });

  const ports: ShellPorts = {
    router: { current, path, go },
    game: {
      subscribe: store.subscribe,
      getSnapshot: store.getSnapshot,
      exportGame: store.exportGame,
    },
    roles: { all: allRoles, byId: roleById, image: imageFor },
    commands: {
      dispatch: (command) => store.dispatch(command),
      // A fresh id per preview pins the timestamp apply reuses; a content id
      // would make a later identical command idempotent instead of applying.
      preview: (command) => toPreviewOutcome(previewOnState(store.state, command)),
      claimSeat: (playerId, name) =>
        store.dispatch({ type: "claimSeat", payload: { playerId, name } }),
      setOrder: (order) => store.dispatch({ type: "setOrder", payload: { order } }),
      startNight: () => store.dispatch({ type: "startNight", payload: {} }),
      setHerring: (playerId) => store.dispatch({ type: "setHerring", payload: { playerId } }),
      setSetupInfo: (roleId, info) =>
        store.dispatch({ type: "setSetupInfo", payload: { roleId, info } }),
      normalizeSecrets: () => store.dispatch({ type: "normalizeSecrets", payload: {} }),
      bagUpdate: (patch) => store.dispatch({ type: "bagUpdate", payload: { patch } }),
      dealGame: () => store.dispatch({ type: "dealGame", payload: {} }),
    },
    history: {
      canUndo: store.canUndo,
      undo: store.undo,
    },
    guidance: { for: guideFor },
    presets: {
      labels: presets.PRESET_LABELS,
      notes: presets.PRESET_NOTES,
      bag: presets.presetBag,
      repair: presets.repairBag,
      resize: presets.resizeBag,
      hints: presets.bagFixHints,
      mechanics: presets.bagMechanics,
      suggestions: presets.customSuggestions,
    },
    library: {
      normalize: library.normalizeLibrary,
      read: library.readLibrary,
      write: library.writeLibrary,
      saveBag: library.upsertBag,
      savePool: library.upsertPool,
      removeBag: library.removeBag,
      removePool: library.removePool,
      export: library.exportLibrary,
      parse: library.parseLibrary,
    },
    strings: { t, text: translateText, uiLang: getUiLang, teamText, roleCount },
    locale: {
      load: loadLocale,
      current: currentLang,
      use: applyLocale,
      watch,
      change: changeLanguage,
    },
    assets: { url: assetUrl },
    prefs: { read: readPreference, write: writePreference },
    legacy: { screens },
  };

  start({ root: import.meta.env?.BASE_URL || "/", handler: () => notify?.() });

  const screen = document.getElementById("screen");
  if (!screen) throw new Error("The application root is missing.");
  mountShell(screen, ports, route);

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) go("/player");
  });

  const status = document.getElementById("storage-status");
  if (status) {
    const paint = () => paintStorageStatus(status);
    store.subscribe(paint);
    paint();
  }

  void prepareOffline();
}

void boot();
