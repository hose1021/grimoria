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
import { watchNotesLifecycle } from "./notes-lifecycle.ts";
import { needsRestoredHandoff } from "./page-restore.ts";
import * as presets from "../core/model/presets.ts";
import * as library from "../infrastructure/library/bag-library.ts";
import { mountShell } from "../ui/main.tsx";
import { toPreviewOutcome } from "../ui/screens/table/helpers.ts";
import { parseSheetRoute, sheetPath } from "../ui/sheet-route.ts";
import type { ShellPorts } from "../ui/ports.ts";
import { createRouteStore } from "../ui/router.ts";
import { roleFacts } from "../application/reference/role-facts.ts";

const screens: ShellPorts["legacy"]["screens"] = {
  "/help": () => import("./screens/help.ts"),
  "/demo": () => import("./screens/demo.ts"),
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
  const status = document.getElementById("language-status");
  if (status) status.hidden = true;
}

async function changeLanguage(code: string): Promise<void> {
  try {
    if (!(await loadLocale(code)) || currentLang() !== code) return;
    applyLocale(code);
  } catch {
    const status = document.getElementById("language-status");
    const message = status?.querySelector("[role=alert]");
    const retry = status?.querySelector("button");
    if (status && message && retry) {
      message.textContent = t("languageLoadFailed", { language: code.toUpperCase() });
      retry.textContent = t("retry");
      retry.onclick = () => void changeLanguage(code);
      status.hidden = false;
    }
    return;
  }
  // The sheet takes its language from the path, so a language change there must
  // move the path too; every other route keeps its own name.
  const route = current();
  const sheet = parseSheetRoute(route);
  go(sheet ? sheetPath(code, sheet.edition) : route);
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
  let notify: (() => void) | null = null;
  start({ root: import.meta.env?.BASE_URL || "/", handler: () => notify?.() });
  const language = parseSheetRoute(current())?.lang ?? savedLang;
  try {
    await loadLocale(language);
  } catch (error) {
    console.error("Could not load initial language", language, error);
    try {
      await loadLocale(language === "ru" ? "en" : "ru");
    } catch {
      const root = document.getElementById("screen");
      if (root) {
        setUiLang(language);
        const message = document.createElement("p");
        message.setAttribute("role", "alert");
        message.textContent = t("screenFailed");
        const retry = document.createElement("button");
        retry.textContent = t("retry");
        retry.addEventListener("click", () => location.reload());
        root.replaceChildren(message, retry);
      }
      return;
    }
  }
  applyLocale(currentLang());

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
    notes: store.notes,
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
      preview: (command) =>
        toPreviewOutcome(previewOnState(store.state, command, store.nextCommandId())),
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
      canRedo: store.canRedo,
      redo: store.redo,
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
      edit: library.editLibrary,
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
    reference: { facts: roleFacts },
  };

  const screen = document.getElementById("screen");
  if (!screen) throw new Error("The application root is missing.");
  mountShell(screen, ports, route);

  window.addEventListener("pageshow", (event) => {
    if (needsRestoredHandoff(event.persisted, current())) go("/player");
  });

  const status = document.getElementById("storage-status");
  if (status) {
    const paint = () => paintStorageStatus(status);
    store.subscribe(paint);
    paint();
  }

  const flushNotes = () =>
    ports.notes.flush(
      (notes) =>
        ports.commands.dispatch({ type: "setNotes", payload: { notes } }).status === "allowed",
    );
  watchNotesLifecycle(window, document, flushNotes);
  void prepareOffline(flushNotes);
}

void boot();
