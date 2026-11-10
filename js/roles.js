// @ts-check
/** @typedef {import("./types.js").Role} Role */
/** @typedef {import("./types.js").RoleId} RoleId */

/** @type {Record<string, string>} */
const FILES = { en: "en_GB", ru: "ru_RU", az: "az_AZ" };
/** @type {Record<string, boolean>} */
const EVIL = { minion: true, demon: true };

/** @returns {Role[]} */
function filter() {
  return ((window.PG && window.PG.roles) || []).filter(
    (/** @type {Role} */ role) => (role.edition === "tb" || role.edition === "bmr" || role.edition === "snv") && role.team !== "traveller"
  );
}

export let TB = filter();
let lang = "ru";

export function currentLang() {
  return lang;
}

/**
 * @param {string} src
 * @returns {Promise<void>}
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.append(script);
  });
}

/**
 * @param {string} code
 * @returns {Promise<void>}
 */
export async function loadLocale(code) {
  const next = FILES[code] ? code : "en";
  if (next === lang && window.PG && Array.isArray(window.PG.roles)) return;
  await loadScript("assets/data/" + FILES[next] + ".js");
  TB = filter();
  lang = next;
}

/** @returns {Role[]} */
export function allRoles() {
  return ((window.PG && window.PG.roles) || []).slice();
}

/**
 * @param {RoleId} id
 * @returns {Role | null}
 */
export function roleById(id) {
  return TB.find((role) => role.id === id) || null;
}

/**
 * @param {string | null | undefined} team
 * @returns {string}
 */
export function teamName(team) {
  return team ? team.charAt(0).toUpperCase() + team.slice(1) : "";
}

/** @param {Role} role @returns {string} */
function suffix(role) {
  return EVIL[role.team] ? "_e" : "_g";
}

/**
 * @param {Role | null | undefined} role
 * @returns {string}
 */
export function imageName(role) {
  if (!role) return "";
  const images = Array.isArray(role.image) ? role.image : [role.image];
  const want = suffix(role);
  const match = images.find((path) => path && path.includes(want + "."));
  const chosen = match || images[0] || "";
  return chosen.slice(chosen.lastIndexOf("/") + 1);
}

/**
 * @param {Role | null | undefined} role
 * @returns {string}
 */
export function imageFor(role) {
  const name = imageName(role);
  return name ? "assets/img/roles/" + name : "";
}
