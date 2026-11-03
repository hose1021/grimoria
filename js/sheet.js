import { allRoles, imageFor } from "./roles.js";
import { teamText, getUiLang, t } from "./strings.js";

const SHEET_IDS = [
  "washerwoman", "librarian", "investigator", "chef", "empath",
  "fortuneteller", "undertaker", "monk", "ravenkeeper", "virgin",
  "slayer", "soldier", "mayor", "butler", "saint", "recluse", "drunk",
  "poisoner", "spy", "baron", "scarletwoman", "imp",
  "scapegoat", "gunslinger", "beggar", "bureaucrat", "thief"
];

const TEAMS = ["townsfolk", "outsider", "minion", "demon", "traveller"];
const LANGS = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "az", label: "AZ" }
];
let abort = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function roleCard(role) {
  return `<article class="sheet-role">
    <img src="${esc(imageFor(role))}" alt="" loading="lazy">
    <div class="sheet-role-body">
      <h3>${esc(role.name)}</h3>
      <p>${esc(role.ability)}</p>
    </div>
  </article>`;
}

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

export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();

  const catalog = allRoles();
  const byId = new Map(catalog.map((role) => [role.id, role]));
  const roles = SHEET_IDS.map((id) => byId.get(id)).filter(Boolean);
  const lang = getUiLang();
  const missing = SHEET_IDS.filter((id) => !byId.has(id));

  root.innerHTML = `<div class="sheet-page">
    <header class="sheet-head">
      <div class="sheet-brand">
        <span class="sheet-mark" aria-hidden="true">PG</span>
        <div>
          <p class="label">Pocket Grimoire</p>
          <h1>${esc(t("roleSheet"))}</h1>
          <p>${esc(t("roleSheetIntro"))} · ${roles.length} ${esc(t("roleSheetCount"))}</p>
        </div>
      </div>
      <nav class="sheet-nav" aria-label="${esc(t("roleSheet"))}">
        <a class="btn" href="#/table">${esc(t("table"))}</a>
        <a class="btn" href="#/help">${esc(t("help"))}</a>
        <span class="sheet-langs">
          ${LANGS.map((item) => `<a class="btn ${lang === item.code ? "is-on" : ""}"
            href="#/sheet/${item.code}"${lang === item.code ? ' aria-current="page"' : ""}>${item.label}</a>`).join("")}
        </span>
      </nav>
    </header>

    ${missing.length ? `<div class="host-alert is-bad">Нет данных для ролей: ${esc(missing.join(", "))}.</div>` : ""}

    <main class="sheet-sections">
      ${TEAMS.map((team) => teamSection(team, roles.filter((role) => role.team === team))).join("")}
    </main>

    <footer class="sheet-foot">
      <p>${esc(t("nightExceptFirst"))}</p>
      <p>${esc(t("roleSheetHint"))}</p>
    </footer>
  </div>`;
}
