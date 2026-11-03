import { esc } from "./ui.js";
import { TB, imageFor } from "./roles.js";
import { NIGHT_FIRST, NIGHT_OTHER } from "./rules.js";
import { t, teamText } from "./strings.js";

let abort = null;
const STAGES = [
  ["setup", "setup"], ["player", "playerHandoff"], ["seats", "seats"],
  ["secrets", "secrets"], ["night", "firstNight"], ["dawn", "dawn"],
  ["day", "day"], ["execution", "execution"], ["win", "winHelp"]
];
function roleName(id) {
  return TB.find((role) => role.id === id)?.name || t("system." + id);
}
function nightList(sequence) {
  return sequence.filter((id) => id !== "scarletwoman").map((id, index) =>
    `<li><span>${index + 1}</span><b>${esc(roleName(id))}</b></li>`).join("");
}
export function mount(root) {
  unmount();
  abort = new AbortController();
  root.innerHTML = `<div class="help">
    <header class="help-head"><div><p class="label">${esc(t("help"))}</p>
      <h1>Trouble Brewing · ${esc(t("rulesFull"))}</h1><p>${esc(t("publicHint"))}</p></div>
      <nav class="help-nav"><a class="btn" href="#/table">${esc(t("table"))}</a>
        <a class="btn" href="#/bag">${esc(t("setup"))}</a><a class="btn" href="#/sheet">${esc(t("roleSheet"))}</a></nav>
    </header>
    <main class="help-shell">
      <section class="help-section"><h2>${esc(t("stepHelp"))}</h2><div class="help-walk">
        ${STAGES.map(([key, label]) => `<article class="help-walk-row"><h3>${esc(t(label))}</h3><p>${esc(t("help." + key))}</p></article>`).join("")}
      </div></section>
      <section class="help-section"><h2>${esc(t("firstNightList"))}</h2><ol class="help-order">${nightList(NIGHT_FIRST)}</ol><p>${esc(t("noBluffs"))}</p></section>
      <section class="help-section"><h2>${esc(t("otherNightList"))}</h2><ol class="help-order">${nightList(NIGHT_OTHER)}</ol><p>${esc(t("help.nightExceptions"))}</p></section>
      <section class="help-section"><h2>${esc(t("votingHelp"))}</h2><ul class="help-list">
        ${["help.nominationRules", "voteRule", "help.deadVotes"].map((key) => `<li>${esc(t(key))}</li>`).join("")}
      </ul></section>
      <section class="help-section"><h2>${esc(t("roleList"))}</h2><div class="help-roles">
        ${TB.map((role) => `<details class="help-role"><summary>
          <img src="${esc(imageFor(role))}" alt=""><b>${esc(role.name)}</b><span>${esc(teamText(role.team))}</span>
        </summary><p>${esc(role.ability)}</p></details>`).join("")}
      </div></section>
    </main>
  </div>`;
  return unmount;
}
export function unmount() { abort?.abort(); abort = null; }
