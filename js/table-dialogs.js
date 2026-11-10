// @ts-check
import { esc } from "./ui.js";
import { t, teamText } from "./strings.js";
import { state, exportGame } from "./store.js";
import { orderedPlayers, livingPlayers, playerById } from "./model.js";
import { ALL_ROLES, roleTeam } from "./rules.js";
import { infoForStep } from "./engine.js";
import { roleById, imageFor } from "./roles.js";

/** @typedef {import("./types.js").GameState} GameState */
/** @typedef {import("./types.js").Player} Player */
/** @typedef {import("./types.js").NightStep} NightStep */

/**
 * @typedef {object} CorrectionDraft
 * @property {string} playerId
 * @property {string} kind
 * @property {string} value
 * @property {string} reason
 */

/**
 * @typedef {object} StepInfo
 * @property {string} kind
 * @property {unknown} [value]
 * @property {string|null} [roleId]
 * @property {string[]} [pair]
 * @property {number} [matchIndex]
 * @property {boolean} [impaired]
 * @property {boolean} [needsChoice]
 * @property {unknown[]} [options]
 * @property {string} [text]
 * @property {boolean} [missing]
 * @property {boolean} [zero]
 * @property {string[]} [bluffs]
 * @property {string|null} [demonId]
 * @property {string|null} [playerId]
 */

/**
 * @typedef {object} DialogOptions
 * @property {string|null} overlay
 * @property {string|null} infoKey
 * @property {CorrectionDraft|null} correction
 * @property {string} exportText
 * @property {string} importText
 * @property {(step: NightStep|null|undefined) => string} stepTitle
 * @property {(stateArg: GameState, step: NightStep, info: StepInfo|null|undefined) => string} infoText
 * @property {(step: NightStep) => string[]} stepTargets
 * @property {Map<string, Record<string, string>>} registrations
 * @property {Map<string, StepInfo>} givens
 * @property {(player: Player|null) => string} displayName
 * @property {(id: string|null|undefined) => string} roleNameOf
 * @property {(id: string, className?: string, clickable?: boolean) => string} roleTokenMarkup
 * @property {(player: Player) => string} effectBadges
 * @property {string|null} roleCardId
 */

/** @param {string} kind @param {Player|null|undefined} player @returns {string} */
export function defaultCorrectionValue(kind, player) {
  if (kind === "role") return (player && player.roleId) || ALL_ROLES[0];
  if (kind === "alive") return player && player.alive ? "dead" : "alive";
  return "";
}

/** @param {DialogOptions} options */
export function renderDialogs({ overlay, infoKey, correction, exportText, importText,
  stepTitle, infoText, stepTargets, registrations, givens, displayName, roleNameOf,
  roleTokenMarkup, effectBadges, roleCardId }) {
function markup() {
  if (overlay === "hide") {
    return `<div class="host-cover" role="dialog" aria-modal="true" aria-label="${esc(t("hide"))}">
      <div class="host-cover-box">
        <p class="label">${esc(t("hide"))}</p>
        <h2>${esc(t("ui.screenHidden"))}</h2>
        <p>${esc(t("playerWarning"))}</p>
        <button class="btn btn--accent" type="button" data-act="reveal">${esc(t("continue"))}</button>
      </div>
    </div>`;
  }
  if (overlay === "grimoire") {
    return grimoireMarkup();
  }
  if (overlay === "info") {
    const step = state.night.queue.find(/** @param {NightStep} candidate */ (candidate) => candidate.key === infoKey);
    if (!step) return "";
    const info = givenInfoStep(step);
    return `<div class="host-info-overlay" role="dialog" aria-modal="true" aria-label="${esc(t("showCard"))}">
      <div class="host-info-card">
        <p class="label">${esc(t("night"))} ${state.night.number} · ${esc(stepTitle(step))}</p>
        ${info.kind === "demon-info"
          ? demonInfoMarkup(info)
          : `<p class="host-info-big">${esc(infoText(state, step, info))}</p>`}
        <button class="btn btn--accent" type="button" data-act="hide-info">${esc(t("hideCard"))}</button>
      </div>
    </div>`;
  }
  if (overlay === "role") return roleCardMarkup(roleCardId);
  if (overlay === "correction") return correctionMarkup();
  if (overlay === "export") return exportMarkup();
  if (overlay === "import") return importMarkup();
  return "";
}

function grimoireMarkup() {
  return `<div class="host-grimoire-overlay" role="dialog" aria-modal="true" aria-label="${esc(t("ui.grimoire"))}">
    <div class="host-grimoire-card">
      <div class="host-panel-head">
        <div>
          <p class="label">${esc(t("ui.spy"))}</p>
          <h2>${esc(t("ui.grimoire"))}</h2>
        </div>
        <button class="btn" type="button" data-act="hide-grimoire">${esc(t("ui.hideGrimoire"))}</button>
      </div>
      <p class="host-muted">${esc(t("ui.spyOnly"))}</p>
      <div class="host-grimoire-grid">
        ${orderedPlayers(state).map((player) => `
          <article class="host-grimoire-seat ${player.alive ? "" : "is-dead"}">
            <span class="host-seat-num">${player.seat}</span>
            <div class="host-grimoire-body">
              <b>${esc(displayName(player))}</b>
              ${roleTokenMarkup(player.roleId || "")}
              <p>${esc(roleTeam(player.roleId || "") ? teamText(roleTeam(player.roleId || "") || "") : "—")} · ${player.alive ? esc(t("ui.alive")) : esc(t("ui.dead"))}</p>
              <p class="host-chips">${effectBadges(player)}</p>
            </div>
          </article>`).join("")}
      </div>
    </div>
  </div>`;
}

/** @param {StepInfo} info @returns {string} */
function demonInfoMarkup(info) {
  const bluffs = info.bluffs || state.bluffs || [];
  const minions = livingPlayers(state)
    .filter((player) => roleTeam(player.roleId || "") === "minion")
    .map(displayName);
  return `<div class="host-info-tokens">
    <span class="label">${esc(t("ui.minions"))}</span>
    <p class="host-info-line">${esc(minions.join(", ") || "—")}</p>
    <span class="label">${esc(t("ui.bluffs"))}</span>
    <div class="host-token-row">
      ${bluffs.map(/** @param {string} id */ (id) => roleTokenMarkup(id, "", true)).join("") || `<p class="host-muted">${esc(t("ui.noBluffs"))}</p>`}
    </div>
  </div>`;
}

/** @param {string|null} id @returns {string} */
function roleCardMarkup(id) {
  const role = roleById(id || "");
  if (!role) return "";
  return `<div class="host-modal" role="dialog" aria-modal="true" aria-labelledby="role-card-title">
    <div class="host-modal-box host-role-card">
      <div class="host-panel-head">
        <div>
          <p class="label">${esc(teamText(role.team))}</p>
          <h2 id="role-card-title">${esc(role.name)}</h2>
        </div>
        <button class="btn" type="button" data-act="close">${esc(t("close"))}</button>
      </div>
      <div class="host-role-card-body">
        <img src="${esc(imageFor(role))}" alt="">
        <div>
          <p>${esc(role.ability || "")}</p>
          ${role.flavor ? `<p class="host-muted">${esc(role.flavor)}</p>` : ""}
        </div>
      </div>
    </div>
  </div>`;
}

/** @param {NightStep} step @returns {StepInfo} */
function givenInfoStep(step) {
  const info = infoForStep(state, step, {
    targetIds: stepTargets(step),
    registrations: registrations.get(step.key) || {}
  });
  return givens.get(step.key) || info;
}



function correctionMarkup() {
  const players = orderedPlayers(state);
  const current = correction || {
    playerId: players[0] ? players[0].id : "",
    kind: "alive",
    value: "dead",
    reason: ""
  };
  const player = playerById(state, current.playerId);
  return `<div class="host-modal" role="dialog" aria-modal="true" aria-labelledby="correction-title">
    <div class="host-modal-box">
      <div class="host-panel-head">
        <h2 id="correction-title">${esc(t("correction"))}</h2>
        <button class="btn" type="button" data-act="close">${esc(t("close"))}</button>
      </div>
      <p class="host-muted">${esc(t("correctionHint"))}</p>
      <label class="host-field"><span class="label">${esc(t("player"))}</span>
        <select class="field" data-correct="player">
          ${players.map((item) => `<option value="${esc(item.id)}"${item.id === current.playerId ? " selected" : ""}>${item.seat} · ${esc(displayName(item))}</option>`).join("")}
        </select>
      </label>
      <label class="host-field"><span class="label">${esc(t("correction"))}</span>
        <select class="field" data-correct="kind">
          <option value="alive"${current.kind === "alive" ? " selected" : ""}>${esc(t("markDead"))} / ${esc(t("revive"))}</option>
          <option value="role"${current.kind === "role" ? " selected" : ""}>${esc(t("role"))}</option>
          <option value="reminder"${current.kind === "reminder" ? " selected" : ""}>${esc(t("addReminder"))}</option>
          <option value="clear-winner"${current.kind === "clear-winner" ? " selected" : ""}>${esc(t("rollback"))}</option>
        </select>
      </label>
      ${current.kind === "alive" ? `
        <label class="host-field"><span class="label">${esc(t("role"))}</span>
          <select class="field" data-correct="alive-value">
            <option value="dead"${current.value === "dead" ? " selected" : ""}>${esc(t("markDead"))}</option>
            <option value="alive"${current.value === "alive" ? " selected" : ""}>${esc(t("revive"))}</option>
          </select>
        </label>` : ""}
      ${current.kind === "role" ? `
        <label class="host-field"><span class="label">${esc(t("role"))}</span>
          <select class="field" data-correct="role-value">
            ${ALL_ROLES.map((roleId) => `<option value="${esc(roleId)}"${current.value === roleId ? " selected" : ""}>${esc(roleNameOf(roleId))}</option>`).join("")}
          </select>
        </label>` : ""}
      ${current.kind === "reminder" ? `
        <label class="host-field"><span class="label">${esc(t("addReminder"))}</span>
          <input class="field" data-correct="reminder-value" value="${esc(current.value || "")}" maxlength="28">
        </label>` : ""}
      <label class="host-field"><span class="label">${esc(t("correctionReason"))}</span>
        <input class="field" data-correct="reason" value="${esc(current.reason || "")}" maxlength="120" placeholder="${esc(t("correctionReason"))}">
      </label>
      ${current.kind === "clear-winner" ? `<p class="host-warning">${esc(t("reviewHidden"))}</p>` : ""}
      <button class="btn" type="button" data-act="recover-claim">${esc(t("recoverClaim"))}</button>
      <p class="host-muted">${esc(t("recoverClaimHint"))}</p>
      <div class="host-inline">
        <button class="btn btn--accent" type="button" data-act="apply-correction" data-player="${esc(current.playerId)}">${esc(t("apply"))}</button>
        <button class="btn" type="button" data-act="close">${esc(t("cancel"))}</button>
      </div>
    </div>
  </div>`;
}

function exportMarkup() {
  const renderedExport = exportText || exportGame();
  return `<div class="host-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
    <div class="host-modal-box">
      <div class="host-panel-head">
        <h2 id="export-title">${esc(t("export"))}</h2>
        <button class="btn" type="button" data-act="close">${esc(t("close"))}</button>
      </div>
      <p class="host-warning">${esc(t("exportWarning"))}</p>
      <textarea class="field host-json" readonly>${esc(renderedExport)}</textarea>
      <div class="host-inline">
        <button class="btn" type="button" data-act="download">${esc(t("save"))}</button>
        <button class="btn" type="button" data-act="copy">${esc(t("ui.copy"))}</button>
      </div>
    </div>
  </div>`;
}

function importMarkup() {
  return `<div class="host-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
    <div class="host-modal-box">
      <div class="host-panel-head">
        <h2 id="import-title">${esc(t("import"))}</h2>
        <button class="btn" type="button" data-act="close">${esc(t("close"))}</button>
      </div>
      <p class="host-warning">${esc(t("exportWarning"))}</p>
      <textarea class="field host-json" data-import-text placeholder="${esc(t("importLabel"))}">${esc(importText)}</textarea>
      <div class="host-inline">
        <button class="btn btn--accent" type="button" data-act="apply-import">${esc(t("apply"))}</button>
        <button class="btn" type="button" data-act="close">${esc(t("cancel"))}</button>
      </div>
    </div>
  </div>`;
}

return markup();
}
