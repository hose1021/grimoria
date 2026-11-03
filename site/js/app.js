import { start, go, current } from "./router.js";
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

const root = document.getElementById("screen");
const savedLang = (() => {
  try { return localStorage.getItem("pg.lang") || "ru"; } catch (error) { return "ru"; }
})();

document.documentElement.lang = savedLang;
setLang(savedLang);
setUiLang(savedLang);

let mountSeq = 0;

async function mountRoute(route) {
  const seq = ++mountSeq;
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
  if (seq !== mountSeq) return;
  document.body.dataset.route = key.slice(1);
  root.innerHTML = "";
  try {
    screens[key].mount(root);
  } catch (error) {
    console.error(error);
    root.innerHTML =
      '<div style="padding:32px;max-width:640px;margin:0 auto">' +
      '<p class="label">Pocket Grimoire</p>' +
      '<h1 style="font-size:22px">Этот экран не загрузился.</h1>' +
      '<p style="color:#8a969c">' + String(error && error.message || error) + '</p>' +
      '<p><a class="btn" href="#/table">К столу</a></p></div>';
  }
}

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
  });
