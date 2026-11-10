// @ts-check
import { esc, assetUrl } from "./ui.js";
import { allRoles, imageFor } from "./roles.js";
import { teamText, getUiLang, t, roleCount } from "./strings.js";
import { path } from "./router.js";
import { state } from "./store.js";

/** @typedef {import("./types.d.ts").Role} Role */
/** @typedef {import("./types.d.ts").Team} Team */
/** @typedef {"tb" | "bmr" | "snv" | "all"} ScenarioKey */

const TB_IDS = [
  "washerwoman", "librarian", "investigator", "chef", "empath",
  "fortuneteller", "undertaker", "monk", "ravenkeeper", "virgin",
  "slayer", "soldier", "mayor", "butler", "saint", "recluse", "drunk",
  "poisoner", "spy", "baron", "scarletwoman", "imp"
];

const BMR_IDS = [
  "chambermaid", "courtier", "exorcist", "fool", "gambler", "gossip",
  "grandmother", "innkeeper", "minstrel", "pacifist", "professor", "sailor",
  "tealady", "goon", "lunatic", "moonchild", "tinker", "assassin",
  "devilsadvocate", "godfather", "mastermind", "po", "pukka", "shabaloth",
  "zombuul"
];

const SNV_IDS = [
  "artist", "clockmaker", "dreamer", "flowergirl", "juggler", "mathematician",
  "oracle", "philosopher", "sage", "savant", "seamstress", "snakecharmer",
  "towncrier", "barber", "klutz", "mutant", "sweetheart", "cerenovus",
  "eviltwin", "pithag", "witch", "fanggu", "nodashii", "vigormortis", "vortox"
];

const TRAVELLER_IDS = ["scapegoat", "gunslinger", "beggar", "bureaucrat", "thief"];

const STANDARD_IDS = TB_IDS.concat(BMR_IDS, SNV_IDS);
const SHEET_IDS = STANDARD_IDS.concat(TRAVELLER_IDS);
// The sheet filter is a reading preference: it never touches game setup.
const SCENARIOS = { tb: TB_IDS, bmr: BMR_IDS, snv: SNV_IDS, all: STANDARD_IDS };
/** @type {ScenarioKey[]} */
const SCENARIO_ORDER = ["tb", "bmr", "snv", "all"];
const SCENARIO_LABELS = {
  tb: "sheetScenarioTb",
  bmr: "sheetScenarioBmr",
  snv: "sheetScenarioSnv",
  all: "sheetScenarioAll"
};
const SCENARIO_KEY = "pg.sheetScenario";
const TRAVELLERS_KEY = "pg.sheetTravellers";

/** @type {Team[]} */
const TEAMS = ["townsfolk", "outsider", "minion", "demon", "traveller"];
const LANGS = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "az", label: "AZ" }
];
/** @type {AbortController | null} */
let abort = null;

/** @param {string} key @returns {string | null} */
function readPreference(key) {
  try { return localStorage.getItem(key); } catch (error) { return null; }
}

/** @param {string} key @param {string} value */
function writePreference(key, value) {
  try { localStorage.setItem(key, value); } catch (error) { /* keep the filter for this visit */ }
}

/** @returns {ScenarioKey} */
function activeScenario() {
  const id = state && state.script ? state.script.id : null;
  return id === "bmr" || id === "snv" ? id : "tb";
}

/** @returns {ScenarioKey} */
function initialScenario() {
  const saved = readPreference(SCENARIO_KEY);
  return saved && Object.hasOwn(SCENARIOS, saved) ? /** @type {ScenarioKey} */ (saved) : activeScenario();
}

/** @param {ScenarioKey} scenario @returns {string} */
function summaryText(scenario) {
  const count = SCENARIOS[scenario].length;
  return `${t(SCENARIO_LABELS[scenario])} · ${count} ${roleCount(count)}`;
}

/** @param {ScenarioKey} id @param {ScenarioKey} selected @returns {string} */
function scenarioButton(id, selected) {
  const pressed = id === selected;
  return `<button class="btn sheet-scenario-btn${pressed ? " is-on" : ""}" type="button"
    data-scenario="${id}" aria-pressed="${pressed}">${esc(t(SCENARIO_LABELS[id]))}<span
    class="sheet-filter-count">${SCENARIOS[id].length}</span></button>`;
}

/** @param {boolean} shown @returns {string} */
function travellerToggle(shown) {
  return `<button class="btn sheet-travellers-btn${shown ? " is-on" : ""}" type="button"
    data-travellers aria-pressed="${shown}">${esc(t("sheetTravellersToggle"))}<span
    class="sheet-filter-count">${TRAVELLER_IDS.length}</span></button>`;
}

/** @param {Role} role @returns {string} */
function roleCard(role) {
  return `<article class="sheet-role" data-role-id="${esc(role.id)}">
    <img src="${esc(imageFor(role))}" alt="" loading="lazy">
    <div class="sheet-role-body">
      <h3>${esc(role.name)}</h3>
      <p>${esc(role.ability)}</p>
    </div>
  </article>`;
}

/** @param {Team} team @param {Role[]} roles @returns {string} */
function teamSection(team, roles) {
  if (!roles.length) return "";
  return `<section class="sheet-team" data-team="${esc(team)}">
    <div class="sheet-team-head">
      <span class="sheet-team-dot" aria-hidden="true"></span>
      <h2>${esc(teamText(team))}</h2>
      <span class="sheet-team-count">${roles.length}</span>
    </div>
    <div class="sheet-grid">${roles.map(roleCard).join("")}</div>
  </section>`;
}

/** @param {Role[]} roles @returns {string} */
function travellersSection(roles) {
  const section = teamSection("traveller", roles);
  if (!section) return "";
  return `<div class="sheet-travellers" id="sheet-travellers">
    <p class="sheet-travellers-note">${esc(t("sheetTravellersNote"))}</p>
    ${section}
  </div>`;
}

/** @param {Map<string, Role>} byId @param {ScenarioKey} scenario @param {boolean} showTravellers @returns {string} */
function sectionsMarkup(byId, scenario, showTravellers) {
  const standard = SCENARIOS[scenario]
    .map((id) => byId.get(id))
    .filter((role) => role !== undefined);
  const sections = TEAMS.filter((team) => team !== "traveller")
    .map((team) => teamSection(team, standard.filter((role) => role.team === team)))
    .join("");
  if (!showTravellers) return sections;
  const travellers = TRAVELLER_IDS
    .map((id) => byId.get(id))
    .filter((role) => role !== undefined);
  return sections + travellersSection(travellers);
}

/** @param {HTMLElement} root */
export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();

  const catalog = allRoles();
  /** @type {Map<string, Role>} */
  const byId = new Map(catalog.map((role) => [role.id, role]));
  const lang = getUiLang();
  const missing = SHEET_IDS.filter((id) => !byId.has(id));
  let scenario = initialScenario();
  let showTravellers = readPreference(TRAVELLERS_KEY) === "true";

  root.innerHTML = `<div class="sheet-page">
    <header class="sheet-head">
      <div class="sheet-brand">
        <img class="brand-lockup" src="${esc(assetUrl("grimoria-logo.svg"))}" alt="Grimoria">
        <div>
          <h1>${esc(t("roleSheet"))}</h1>
          <p>${esc(t("roleSheetIntro"))}</p>
          <p class="sheet-summary" data-sheet-summary aria-live="polite">${esc(summaryText(scenario))}</p>
        </div>
      </div>
      <nav class="sheet-nav" aria-label="${esc(t("roleSheet"))}">
        <a class="btn" href="${path("table")}">${esc(t("table"))}</a>
        <a class="btn" href="${path("help")}">${esc(t("help"))}</a>
        <span class="sheet-langs">
          ${LANGS.map((item) => `<a class="btn ${lang === item.code ? "is-on" : ""}"
            href="${path("sheet/" + item.code)}"${lang === item.code ? ' aria-current="page"' : ""}>${item.label}</a>`).join("")}
        </span>
      </nav>
      <div class="sheet-filters" data-sheet-filters>
        <span class="label" id="sheet-scenario-label">${esc(t("sheetScenario"))}</span>
        <div class="sheet-scenario-group" role="group" aria-labelledby="sheet-scenario-label">
          ${SCENARIO_ORDER.map((id) => scenarioButton(id, scenario)).join("")}
        </div>
        ${travellerToggle(showTravellers)}
      </div>
    </header>

    ${missing.length ? `<div class="host-alert is-bad">Нет данных для ролей: ${esc(missing.join(", "))}.</div>` : ""}

    <main class="sheet-sections" data-sheet-sections>
      ${sectionsMarkup(byId, scenario, showTravellers)}
    </main>

    <footer class="sheet-foot">
      <p>${esc(t("nightExceptFirst"))}</p>
      <p>${esc(t("roleSheetHint"))}</p>
    </footer>
  </div>`;

  function render() {
    /** @type {HTMLElement} */ (root.querySelector("[data-sheet-summary]")).textContent = summaryText(scenario);
    root.querySelectorAll("[data-scenario]").forEach((element) => {
      const button = /** @type {HTMLElement} */ (element);
      const on = button.dataset.scenario === scenario;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", String(on));
    });
    const toggle = /** @type {HTMLElement} */ (root.querySelector("[data-travellers]"));
    toggle.classList.toggle("is-on", showTravellers);
    toggle.setAttribute("aria-pressed", String(showTravellers));
    /** @type {HTMLElement} */ (root.querySelector("[data-sheet-sections]")).innerHTML = sectionsMarkup(byId, scenario, showTravellers);
  }

  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = /** @type {HTMLElement | null} */ (event.target.closest("[data-scenario], [data-travellers]"));
    if (!button || !root.contains(button)) return;
    if (button.dataset.scenario) {
      const next = button.dataset.scenario;
      if (!Object.hasOwn(SCENARIOS, next) || next === scenario) return;
      scenario = /** @type {ScenarioKey} */ (next);
      writePreference(SCENARIO_KEY, next);
    } else {
      showTravellers = !showTravellers;
      writePreference(TRAVELLERS_KEY, String(showTravellers));
    }
    render();
  }, { signal: abort.signal });

  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
}
