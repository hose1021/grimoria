const FILES = { en: "en_GB", ru: "ru_RU", az: "az_AZ" };
const EVIL = { minion: true, demon: true };

function filter() {
  return ((window.PG && window.PG.roles) || []).filter(
    (role) => role.edition === "tb" && role.team !== "traveller"
  );
}

export let TB = filter();
let lang = "ru";

export function currentLang() {
  return lang;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

export async function loadLocale(code) {
  const next = FILES[code] ? code : "en";
  if (next === lang && window.PG && Array.isArray(window.PG.roles)) return;
  await loadScript("assets/data/" + FILES[next] + ".js?v=" + Date.now());
  TB = filter();
  lang = next;
}

export function allRoles() {
  return ((window.PG && window.PG.roles) || []).slice();
}

export function roleById(id) {
  return TB.find((role) => role.id === id) || null;
}

export function teamName(team) {
  return team ? team.charAt(0).toUpperCase() + team.slice(1) : "";
}

function suffix(role) {
  return EVIL[role.team] ? "_e" : "_g";
}

export function imageName(role) {
  if (!role) return "";
  const images = Array.isArray(role.image) ? role.image : [role.image];
  const want = suffix(role);
  const match = images.find((path) => path && path.includes(want + "."));
  const chosen = match || images[0] || "";
  return chosen.slice(chosen.lastIndexOf("/") + 1);
}

export function imageFor(role) {
  const name = imageName(role);
  return name ? "assets/img/roles/" + name : "";
}
