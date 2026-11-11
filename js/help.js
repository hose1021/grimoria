// @ts-check
import { esc, assetUrl } from "./ui.js";
import { TB, imageFor } from "./roles.js";
import { NIGHT_FIRST, NIGHT_OTHER, isBmrScript, isSnvScript, nightSequence } from "./rules.js";
import { t, teamText } from "./strings.js";
import { path } from "./router.js";
import { state } from "./store.js";

/** @type {AbortController | null} */
let abort = null;
const STAGES = [
  ["setup", "setup"],
  ["player", "playerHandoff"],
  ["seats", "seats"],
  ["secrets", "secrets"],
  ["night", "firstNight"],
  ["dawn", "dawn"],
  ["day", "day"],
  ["execution", "execution"],
  ["win", "winHelp"],
];
/** @param {string} id @returns {string} */
function roleName(id) {
  if (id === "info") return t("system.info");
  return TB.find((role) => role.id === id)?.name || t("system." + id);
}
/** @param {string[]} sequence @returns {string} */
function nightList(sequence) {
  return sequence
    .filter((id) => id !== "scarletwoman")
    .map((id, index) => `<li><span>${index + 1}</span><b>${esc(roleName(id))}</b></li>`)
    .join("");
}
/** @param {HTMLElement} root */
export function mount(root) {
  unmount();
  abort = new AbortController();
  const bmr = isBmrScript(state.script);
  const snv = isSnvScript(state.script);
  const edition = snv ? "snv" : bmr ? "bmr" : "tb";
  const first = edition === "tb" ? NIGHT_FIRST : nightSequence(1, edition);
  const other = edition === "tb" ? NIGHT_OTHER : nightSequence(2, edition);
  root.innerHTML = `<div class="help">
    <header class="help-head"><div><img class="brand-lockup" src="${esc(assetUrl("grimoria-logo.svg"))}" alt="Grimoria">
      <p class="label">${esc(t("help"))}</p>
      <h1>${esc(state.script ? state.script.name : "Trouble Brewing")} · ${esc(t("rulesFull"))}</h1>
      <p>${esc(t("publicHint"))}</p>${bmr ? `<p class="host-muted">${esc(t("bmrHelpNote"))}</p>` : ""}</div>
      <nav class="help-nav"><a class="btn" href="${path("table")}">${esc(t("table"))}</a>
        <a class="btn" href="${path("bag")}">${esc(t("setup"))}</a><a class="btn" href="${path("sheet")}">${esc(t("roleSheet"))}</a></nav>
    </header>
    <main class="help-shell">
      <section class="help-section"><h2>${esc(t("stepHelp"))}</h2><div class="help-walk">
        ${STAGES.map(([key, label]) => `<article class="help-walk-row"><h3>${esc(t(label))}</h3><p>${esc(t("help." + key))}</p></article>`).join("")}
      </div></section>
      <section class="help-section"><h2>${esc(t("firstNightList"))}</h2><ol class="help-order">${nightList(first)}</ol><p>${esc(t("noBluffs"))}</p></section>
      <section class="help-section"><h2>${esc(t("otherNightList"))}</h2><ol class="help-order">${nightList(other)}</ol><p>${esc(t("help.nightExceptions"))}</p></section>
      <section class="help-section"><h2>${esc(t("votingHelp"))}</h2><ul class="help-list">
        ${["help.nominationRules", "voteRule", "help.deadVotes"].map((key) => `<li>${esc(t(key))}</li>`).join("")}
      </ul></section>
      <section class="help-section"><h2>${esc(t("roleList"))}</h2><div class="help-roles">
        ${TB.map(
          (role) => `<details class="help-role"><summary>
          <img src="${esc(imageFor(role))}" alt=""><b>${esc(role.name)}</b><span>${esc(teamText(role.team))}</span>
        </summary><p>${esc(role.ability)}</p></details>`,
        ).join("")}
      </div></section>
    </main>
  </div>`;
  return unmount;
}
export function unmount() {
  abort?.abort();
  abort = null;
}
