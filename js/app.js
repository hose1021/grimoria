// @ts-check
import { esc } from "./ui.js";
import { prepareOffline } from "./offline.js";
import { acquireWriter, releaseWriter } from "./writer.js";
import { t } from "./strings.js";
import { state, subscribe } from "./store.js";
import { start, go, current, path } from "./router.js";
import { currentLang, loadLocale } from "./roles.js";
import { setLang, watch } from "./i18n.js";
import { setUiLang } from "./strings.js";
import * as bag from "./bag.js";
import * as seat from "./seat.js";
import * as secrets from "./secrets.js";
import * as table from "./table.js";
import * as player from "./player.js";
import * as publicScreen from "./public.js";
import * as help from "./help.js";
import * as demo from "./demo.js";
import * as sheet from "./sheet.js";

/**
 * @typedef {object} Screen
 * @property {(root: HTMLElement, options?: { covered?: boolean }) => (() => void) | undefined} mount
 * @property {() => void} unmount
 */

/** @type {Record<string, Screen>} */
const screens = {
  "/bag": bag,
  "/seat": seat,
  "/secrets": secrets,
  "/table": table,
  "/player": player,
  "/public": publicScreen,
  "/help": help,
  "/demo": demo,
  "/sheet": sheet
};

const root = /** @type {HTMLElement} */ (document.getElementById("screen"));
function storageStatus() {
  const status = /** @type {HTMLElement} */ (document.getElementById("storage-status"));
  status.hidden = !state.storageError;
  status.textContent = state.storageError ? t("storageWarning") : "";
}
subscribe(storageStatus);
const savedLang = (() => {
  try { return localStorage.getItem("pg.lang") || "ru"; } catch (error) { return "ru"; }
})();

document.documentElement.lang = savedLang;
setLang(savedLang);
setUiLang(savedLang);

let mountSeq = 0;
/** @type {Screen | null} */
let activeScreen = null;
/** @type {(() => void) | null | undefined} */
let cleanup = null;
function disposeScreen() {
  if (cleanup) cleanup();
  else activeScreen?.unmount();
  cleanup = null;
  activeScreen = null;
}
window.addEventListener("pagehide", () => { disposeScreen(); root.replaceChildren(); releaseWriter(); });
window.addEventListener("pageshow", (event) => { if (event.persisted) go("/player"); });

/** @param {HTMLElement} scope @returns {HTMLButtonElement} */
function firstButton(scope) { return /** @type {HTMLButtonElement} */ (scope.querySelector("button")); }

/** @param {unknown} error @returns {unknown} */
function errorDetail(error) {
  if (error && typeof error === "object" && "message" in error) return error.message || error;
  return error;
}

/**
 * @param {string} route
 * @returns {Promise<void>}
 */
async function mountRoute(route) {
  const seq = ++mountSeq;
  disposeScreen();
  root.replaceChildren();
  const langMatch = /^\/sheet\/(ru|en|az)$/.exec(route);
  const key = screens[route] ? route : route.startsWith("/sheet") ? "/sheet" : "/table";
  if (langMatch && currentLang() !== langMatch[1]) {
    try {
      await loadLocale(langMatch[1]);
      setLang(langMatch[1]);
      setUiLang(langMatch[1]);
      document.documentElement.lang = langMatch[1];
    } catch (error) {
      console.error("Could not load sheet language", langMatch[1], error);
    }
  }
  if (!["/public", "/help", "/sheet", "/demo"].includes(key)) {
    if (!await acquireWriter()) {
      if (seq !== mountSeq) return;
      root.innerHTML = `<section class="host-card"><h1>${esc(t("writerBusy"))}</h1><p>${esc(t("writerBusyHint"))}</p><button class="btn" id="retry-writer">${esc(t("retry"))}</button></section>`;
      firstButton(root).onclick = () => mountRoute(route);
      return;
    }
  }
  if (seq !== mountSeq) return;
  const previousRoute = document.body.dataset.route || "";
  document.body.dataset.route = key.slice(1);
  storageStatus();
  root.innerHTML = "";
  if (["player", "public"].includes(previousRoute) && ["/bag", "/seat", "/secrets"].includes(key)) {
    root.innerHTML = `<section class="host-cover"><div class="host-cover-box"><h1>${esc(t("playerCover"))}</h1><p>${esc(t("playerWarning"))}</p><button class="btn btn--accent" id="return-host">${esc(t("playerBack"))}</button></div></section>`;
    firstButton(root).onclick = () => mountRoute(route);
    firstButton(root).focus();
    return;
  }
  try {
    activeScreen = screens[key];
    cleanup = activeScreen.mount(root, { covered: key === "/table" && ["player", "public"].includes(previousRoute) });
  } catch (error) {
    disposeScreen();
    console.error(error);
    root.innerHTML =
      '<div style="padding:32px;max-width:640px;margin:0 auto">' +
      '<p class="label">Pocket Grimoire</p>' +
      '<h1 style="font-size:22px">' + esc(t("screenFailed")) + '</h1>' +
      '<p style="color:#8a969c">' + esc(errorDetail(error)) + '</p>' +
      '<p><a class="btn" href="' + path("table") + '">' + esc(t("table")) + '</a></p></div>';
  }
}

/** @param {string} code @returns {Promise<void>} */
async function changeLanguage(code) {
  try {
    await loadLocale(code);
    document.documentElement.lang = code;
    setLang(code);
    setUiLang(code);
    go(current());
  } catch (error) {
    console.error("Could not load language", code, error);
    setLang("en");
    setUiLang("en");
    go(current());
  }
}

loadLocale(savedLang)
  .catch((error) => {
    console.error("Could not load saved language", error);
    setLang("en");
    setUiLang("en");
  })
  .finally(() => {
    watch(root, changeLanguage);
    start(mountRoute);
    prepareOffline();
  });
