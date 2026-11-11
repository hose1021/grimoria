// Composition root. It is the only module that imports the legacy screens and
// wires them into the UI shell; `src/ui` sees ports only.
import * as store from "../../js/store.js";
import { allRoles, currentLang, imageFor, loadLocale, roleById } from "../../js/roles.js";
import { getUiLang, roleCount, setUiLang, t, teamText } from "../../js/strings.js";
import { setLang, translateText, watch } from "../../js/i18n.js";
import { assetUrl } from "../../js/ui.js";
import { acquireWriter, releaseWriter } from "../../js/writer.js";
import { current, go, path, start } from "../../js/router.js";
import { prepareOffline } from "../../js/offline.js";
import * as presets from "../../js/presets.js";
import * as library from "../../js/library.js";
import * as table from "../../js/table.js";
import * as help from "../../js/help.js";
import * as demo from "../../js/demo.js";
import { mountShell } from "../ui/main.tsx";
import type { LegacyScreen, ShellPorts } from "../ui/ports.ts";
import { createRouteStore } from "../ui/router.ts";

const screens: Record<string, LegacyScreen> = {
  "/table": table,
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
  go(current());
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
    game: { subscribe: store.subscribe, getSnapshot: store.getSnapshot },
    roles: { all: allRoles, byId: roleById, image: imageFor },
    writer: { acquire: acquireWriter },
    commands: {
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

  window.addEventListener("pagehide", () => {
    releaseWriter();
  });
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
