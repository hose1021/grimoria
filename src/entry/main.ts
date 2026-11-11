// Composition root. It is the only module that imports the legacy screens and
// wires them into the UI shell; `src/ui` sees ports only.
import * as store from "../../js/store.js";
import { allRoles, currentLang, imageFor, loadLocale } from "../../js/roles.js";
import { getUiLang, roleCount, setUiLang, t, teamText } from "../../js/strings.js";
import { setLang, watch } from "../../js/i18n.js";
import { assetUrl } from "../../js/ui.js";
import { acquireWriter, releaseWriter } from "../../js/writer.js";
import { current, go, path, start } from "../../js/router.js";
import { prepareOffline } from "../../js/offline.js";
import * as bag from "../../js/bag.js";
import * as seat from "../../js/seat.js";
import * as secrets from "../../js/secrets.js";
import * as table from "../../js/table.js";
import * as player from "../../js/player.js";
import * as publicScreen from "../../js/public.js";
import * as help from "../../js/help.js";
import * as demo from "../../js/demo.js";
import { mountShell } from "../ui/main.tsx";
import type { LegacyScreen, ShellPorts } from "../ui/ports.ts";
import { createRouteStore } from "../ui/router.ts";

const screens: Record<string, LegacyScreen> = {
  "/bag": bag,
  "/seat": seat,
  "/secrets": secrets,
  "/table": table,
  "/player": player,
  "/public": publicScreen,
  "/help": help,
  "/demo": demo
};

const savedLang = (() => {
  try { return localStorage.getItem("pg.lang") || "ru"; } catch { return "ru"; }
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
  try { return localStorage.getItem(key); } catch { return null; }
}

function writePreference(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* keep the preference for this visit */ }
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
      return () => { if (notify === listener) notify = null; };
    }
  });

  const ports: ShellPorts = {
    router: { current, path, go },
    game: { subscribe: store.subscribe, getSnapshot: store.getSnapshot },
    roles: { all: allRoles, image: imageFor },
    strings: { t, uiLang: getUiLang, teamText, roleCount },
    locale: {
      load: loadLocale,
      current: currentLang,
      use: applyLocale,
      watch,
      change: changeLanguage
    },
    assets: { url: assetUrl },
    prefs: { read: readPreference, write: writePreference },
    legacy: { acquireWriter, screens }
  };

  start({ root: import.meta.env?.BASE_URL || "/", handler: () => notify?.() });

  const screen = document.getElementById("screen");
  if (!screen) throw new Error("The application root is missing.");
  mountShell(screen, ports, route);

  window.addEventListener("pagehide", () => { releaseWriter(); });
  window.addEventListener("pageshow", (event) => { if (event.persisted) go("/player"); });

  const status = document.getElementById("storage-status");
  if (status) {
    const paint = () => paintStorageStatus(status);
    store.subscribe(paint);
    paint();
  }

  void prepareOffline();
}

void boot();
