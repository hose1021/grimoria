import { renderDialogs, defaultCorrectionValue } from "./table-dialogs.js";
import { guideFor } from "./guidance.js";
import { modalFocus } from "./ui.js";
import { esc } from "./ui.js";
import {
  state, dispatch, undo, canUndo, exportGame
} from "./store.js";
import { roleById, imageFor } from "./roles.js";
import { t, teamText } from "./strings.js";
import { go, path } from "./router.js";
import {
  ALL_ROLES, SYSTEM_STEPS, isManualScript, roleLabel, roleTeam, teamLabel
} from "./rules.js";
import {
  attackNeedsRedirect, butlerMaster, characterChoices, currentStep,
  demonChangePending, executionThreshold, infoForStep, isImpaired, protectionFor,
  soldierSafe, secretsErrors, stepProgress
} from "./engine.js";
import { livingPlayers, orderedPlayers, playerById } from "./model.js";
import { isBmrScript, isSnvScript } from "./rules.js";

let root = null;
let abort = null;
let overlay = null;
let infoKey = null;
let correction = null;
let roleCardId = null;
let roleCardBack = null;
let selectedSeat = null;
let exportText = "";
let importText = "";
let timerEnd = null;
let timerId = null;
let executeTarget = "";
let slayerTarget = "";
let recluseDemonSlayer = false;
let armedNew = false;
let mobilePanel = "play";
const bmrDeaths = new Map();
const bmrResurrect = new Map();
const bmrRoles = new Map();
const bmrDrunk = new Map();
let guided = (() => { try { return localStorage.getItem("pg.guided") === "true"; } catch { return false; } })();

const targets = new Map();
const redirects = new Map();
const registrations = new Map();
const givens = new Map();



function displayName(player) {
  if (!player) return "—";
  return player.name || (player.seat ? t("ui.player") + " " + player.seat : "—");
}

function roleOf(player) {
  return player && player.roleId ? roleById(player.roleId) : null;
}

function shownRoleOf(player) {
  return player && player.shownRoleId ? roleById(player.shownRoleId) : null;
}

function roleNameOf(id) {
  const role = roleById(id);
  return role ? role.name : roleLabel(id);
}

function roleTokenMarkup(id, className = "", clickable = false) {
  const role = roleById(id);
  if (!role) return "";
  const tag = clickable ? "button" : "span";
  const attrs = clickable ? ` type="button" data-role-card="${esc(id)}"` : "";
  return `<${tag} class="host-token ${className}"${attrs}>
    <img src="${esc(imageFor(role))}" alt="">
    <b>${esc(role.name)}</b>
  </${tag}>`;
}

function actorName(step) {
  const player = step && step.actorId ? playerById(state, step.actorId) : null;
  return player ? displayName(player) : "";
}

function stepTitle(step) {
  if (!step) return "";
  if (step.roleId) return roleNameOf(step.roleId);
  return step.system ? t("system." + step.system) : t("step");
}

function stepTargets(step) {
  return targets.get(step.key) || [];
}

function targetNames(ids) {
  return (ids || []).map((id) => {
    const player = playerById(state, id);
    return player ? displayName(player) : id;
  }).join(", ");
}

function currentPhaseLabel() {
  if (state.phase === "night") return `${t("night")} ${state.night.number}`;
  if (state.phase === "day") return `${t("day")} ${state.day.number}`;
  if (state.phase === "deal") return t("playerHandoff");
  if (state.phase === "over") return t("gameOver");
  return t("setup");
}

function headerCount() {
  if (state.phase === "setup" || state.phase === "deal" || state.phase === "seat") {
    return `${orderedPlayers(state).length} ${t("players")}`;
  }
  return `${aliveCount()} ${t("alive")}`;
}

function causeText(cause) {
  return {
    execution: t("ui.execution"),
    demon: t("ui.demon"),
    slayer: t("ui.slayer"),
    virgin: t("ui.virgin"),
    "imp-self-kill": t("ui.selfKill"),
    manual: t("ui.correction"),
    legacy: t("ui.migrated")
  }[cause] || cause;
}

function aliveCount() {
  return livingPlayers(state).length;
}

function zombieBadge(player) {
  return player && player.registeredDead && player.alive
    ? `<span class="host-chip">${esc(t("ui.registeredDead"))}</span>`
    : "";
}

function roleBadge(player) {
  const role = roleOf(player);
  if (!role) return `<span class="host-muted">${esc(t("ui.noRole"))}</span>`;
  return `<span class="host-role" data-team="${esc(role.team)}">
    <i class="host-team-dot" aria-hidden="true"></i>${esc(role.name)}
  </span>`;
}

function seatToken(player) {
  const role = roleOf(player);
  if (!role) return "";
  return `<span class="host-seat-token"><img src="${esc(imageFor(role))}" alt=""></span>`;
}

function effectBadges(player) {
  const badges = [];
  if (player.roleId === "drunk") badges.push(t("ui.drunk"));
  if (player.roleId !== "drunk" && isImpaired(state, player.id)) badges.push(t("ui.poisoned"));
  if (protectionFor(state, player.id)) badges.push(t("ui.protected"));
  const master = butlerMaster(state, player.id);
  if (master) badges.push(t("ui.master") + displayName(playerById(state, master)));
  if (state.setup.herringId === player.id || state.herringId === player.id) badges.push(t("ui.herring"));
  for (const reminder of player.reminders || []) badges.push(reminder);
  const used = Object.keys(player.used || {});
  if (used.length) badges.push(t("ui.used") + used.join(", "));
  return badges.map((badge) => `<span class="host-chip">${esc(badge)}</span>`).join("");
}

function seatRail() {
  return `
    <aside class="host-seats" aria-label="${esc(t("seats"))}">
      <div class="host-panel-head"><span class="label">${esc(t("seats"))}</span>
        <span class="host-muted">${state.phase === "setup" || state.phase === "deal" || state.phase === "seat"
          ? `${orderedPlayers(state).length} ${t("players")}`
          : `${aliveCount()} ${t("alive")} / ${orderedPlayers(state).length}`}</span></div>
      <div class="host-seat-list">
        ${orderedPlayers(state).map((player) => `
          <div class="host-seat ${player.alive ? "" : "is-dead"} ${player.id === selectedSeat ? "is-selected" : ""}">
            <button class="host-seat-main" type="button" data-seat-open="${esc(player.id)}">
              <span class="host-seat-num">${player.seat}</span>
              <span class="host-seat-body">
                <b>${esc(player.name || "—")}</b>
                <span>${roleBadge(player)} ${zombieBadge(player)} ${player.alive ? "" : `<em class="host-deadtag">${esc(t("dead"))}</em>`}</span>
                ${player.shownRoleId && player.shownRoleId !== player.roleId
                  ? `<span class="host-shown">${esc(t("shownRole"))}: ${esc(roleNameOf(player.shownRoleId))}</span>`
                  : ""}
                <span class="host-chips">${effectBadges(player)}</span>
              </span>
              ${seatToken(player)}
            </button>
          </div>`).join("")}
      </div>
      <div class="host-bluffs">
        <span class="label">${esc(t("bluffs"))}</span>
        <span class="host-bluff-list">
          ${(state.bluffs || []).length
            ? state.bluffs.map((id) => roleTokenMarkup(id, "host-token--mini", true)).join("")
            : `<span class="host-muted">${esc(state.setup.count < 7 ? t("noBluffs") : t("none"))}</span>`}
        </span>
        ${state.setup.herringId || state.herringId
          ? `<p class="host-muted">${esc(t("herring"))}: ${esc(displayName(playerById(state, state.setup.herringId || state.herringId)))}</p>`
          : ""}
      </div>
    </aside>`;
}

function queueMarkup() {
  const progress = stepProgress(state);
  return `
    <section class="host-panel">
      <div class="host-panel-head">
        <span class="label">${esc(t("queue"))}</span>
        <span class="host-muted">${progress.done} / ${progress.total} ${esc(t("finished"))}</span>
      </div>
      ${state.night.queue.length ? `<ol class="host-queue">
        ${state.night.queue.map((step) => {
          const isCurrent = currentStep(state) === step;
          const pending = step.pending;
          return `<li class="host-queue-item ${step.done ? "is-done" : ""} ${step.skipped ? "is-skipped" : ""} ${isCurrent ? "is-current" : ""} ${pending ? "is-pending" : ""}">
            <span class="host-queue-dot" aria-hidden="true"></span>
            <span class="host-queue-body">
              <b>${esc(stepTitle(step))}</b>
              <small>${esc(step.actorName || "")}${step.skipped ? t("ui.skipped") : step.done ? t("ui.done") : ""}</small>
            </span>
          </li>`;
        }).join("")}
      </ol>` : `<p class="host-muted">${esc(t("noWake"))}</p>`}
    </section>`;
}

function logMarkup() {
  const entries = (state.log || []).slice(-8).reverse();
  return `
    <section class="host-panel">
      <div class="host-panel-head"><span class="label">${esc(t("log"))}</span></div>
      ${entries.length ? `<ol class="host-log">${entries.map((entry) => `
        <li class="${entry.secret ? "is-secret" : ""}">
          <b>${esc(entry.title)}</b>
          <span>${esc(entry.phase)}${entry.detail ? " · " + esc(entry.detail) : ""}</span>
        </li>`).join("")}</ol>` : `<p class="host-muted">—</p>`}
    </section>`;
}

function notesMarkup() {
  return `
    <section class="host-panel">
      <label class="label" for="host-notes">${esc(t("notes"))}</label>
      <textarea class="field host-notes" id="host-notes" data-notes maxlength="4000">${esc(state.notes || "")}</textarea>
      <p class="host-muted">${esc(t("correctionHint"))}</p>
    </section>`;
}

function sidePanel() {
  return `
    <aside class="host-side">
      ${state.storageError ? `<div class="host-alert is-error">${esc(t("storageError"))}: ${esc(state.storageError)}</div>` : ""}
      ${state.phase === "night" ? queueMarkup() : ""}
      ${state.phase === "day" ? daySidePanel() : ""}
      ${logMarkup()}
      ${notesMarkup()}
      <div class="host-panel">
        <span class="label">${esc(t("ui.backup"))}</span>
        <div class="host-inline">
          <button class="btn" type="button" data-act="export">${esc(t("export"))}</button>
          <button class="btn" type="button" data-act="import">${esc(t("import"))}</button>
        </div>
        <p class="host-muted">${esc(t("exportWarning"))}</p>
      </div>
    </aside>`;
}

function daySidePanel() {
  const executed = state.day.execution
    ? playerById(state, state.day.execution.playerId)
    : null;
  return `
    <section class="host-panel">
      <div class="host-panel-head"><span class="label">${esc(t("ui.dayResult"))}</span></div>
      ${executed
        ? `<p class="host-tally is-bad">${esc(t("execution"))}: ${esc(displayName(executed))}</p>`
        : `<p class="host-muted">${esc(t("noExecutionShort"))}</p>`}
      <div class="host-timer">
        <span class="label">${esc(t("timer"))}</span>
        <b data-timer-text>${esc(timerText())}</b>
        <div class="host-inline">
          <button class="btn" type="button" data-act="timer-start">${esc(t("startTimer"))}</button>
          <button class="btn" type="button" data-act="timer-stop">${esc(t("resetTimer"))}</button>
        </div>
      </div>
    </section>`;
}
function timerText() {
  if (!timerEnd) return "—";
  const left = Math.max(0, timerEnd - Date.now());
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function setupPrompt() {
  return `
    <section class="host-card host-empty">
      <p class="label">${esc(t("setup"))}</p>
      <h1>${esc(t("noRoles"))}</h1>
      <p>${esc(t("setupIntro"))}</p>
      <div class="host-inline">
        <a class="btn btn--accent" href="${path("bag")}">${esc(t("ui.begin"))}</a>
        <a class="btn" href="${path("demo")}">${esc(t("demo"))}</a>
      </div>
    </section>`;
}

function dealCard() {
  const players = orderedPlayers(state);
  const claimed = players.filter((player) => player.claimed).length;
  const everyoneNamed = claimed === players.length;
  const seated = state.phase === "seat";
  const errors = secretsErrors(state);
  const step = !everyoneNamed ? "names" : !seated ? "seats" : "secrets";
  return `
    <section class="host-card">
      ${manualWarningMarkup()}
      <p class="label">${esc(t("playerHandoff"))}</p>
      <h1>${!everyoneNamed ? t("ui.names") : !seated ? t("ui.arrange") : t("ui.checkSecrets")}</h1>
      <p>${esc(t("discussWarning"))}</p>
      <div class="host-progress">
        <div class="host-progress-bar"><span style="width:${players.length ? (claimed / players.length) * 100 : 0}%"></span></div>
        <b>${claimed} / ${players.length}</b>
      </div>
      <div class="host-inline">
        <a class="btn btn--accent" href="${path(step === "names" ? "player" : step === "seats" ? "seat" : "secrets")}">
          ${step === "names" ? t("ui.handoff") : step === "seats" ? t("ui.seats") : t("ui.secrets")}
        </a>
        <a class="btn" href="${path("seat")}">${esc(t("seats"))}</a>
        <a class="btn" href="${path("secrets")}">${esc(t("secrets"))}</a>
      </div>
      ${seated && errors.length ? `<div class="host-alert is-bad">
        <b>${esc(t("setupErrors"))}</b>
        <ul>${errors.map((error) => `<li>${esc(error.message)}</li>`).join("")}</ul>
        <a class="btn" href="${path("secrets")}">${esc(t("secrets"))}</a>
      </div>` : ""}
      ${seated ? `<button class="btn btn--accent host-primary" type="button" data-act="start-night" ${errors.length ? "disabled" : ""}>
        ${esc(t("startFirstNight"))}
      </button>` : ""}
    </section>`;
}


function registrationMarkup(step) {
  const relevant = orderedPlayers(state).filter((player) => (
    player.roleId === "spy" || player.roleId === "recluse"
  ));
  if (!relevant.length) return "";
  const regs = registrations.get(step.key) || {};
  if (step.roleId === "chef" || step.roleId === "empath") {
    return `<div class="host-reg">
      <span class="label">${esc(t("registration"))}</span>
      ${relevant.map((player) => {
        const spy = player.roleId === "spy";
        const checked = spy ? regs[player.id] === "good" : regs[player.id] === "evil";
        return `<label class="host-check">
          <input type="checkbox" data-reg="${esc(step.key)}" data-reg-player="${esc(player.id)}"
            data-reg-value="${spy ? "good" : "evil"}" ${checked ? "checked" : ""}>
          <span>${spy ? t("ui.spyGood") : esc(t("recluseEvil"))} — ${esc(displayName(player))}</span>
        </label>`;
      }).join("")}
    </div>`;
  }
  if (step.roleId === "fortuneteller") {
    return `<div class="host-reg">
      <span class="label">${esc(t("registration"))}</span>
      ${relevant.filter((player) => player.roleId === "recluse").map((player) => `
        <label class="host-check">
          <input type="checkbox" data-reg="${esc(step.key)}" data-reg-player="${esc(player.id)}"
            data-reg-value="demon" ${regs[player.id] === "demon" ? "checked" : ""}>
          <span>${esc(t("recluseDemon"))} — ${esc(displayName(player))}</span>
        </label>`).join("")}
    </div>`;
  }
  return "";
}

function givenSelect(step, info) {
  if (!info || !info.needsChoice) return "";
  const current = givens.get(step.key);
  let options = [];
  let kind = "number";
  if (info.kind === "number") {
    kind = "number";
    options = info.options && info.options.length
      ? info.options
      : Array.from({ length: orderedPlayers(state).length + 1 }, (_, i) => i);
  } else if (info.kind === "yes-no") {
    kind = "bool";
    options = [true, false];
  } else if (info.kind === "character") {
    kind = "role";
    options = info.options && info.options.length
      ? info.options
      : (info.playerId ? characterChoices(state, info.playerId, true) : ALL_ROLES);
  } else if (info.kind === "one-of-two") {
    kind = "role";
    options = info.options && info.options.length ? info.options : ALL_ROLES;
  }
  if (!options.length) return "";
  return `<label class="host-field">
    <span class="label">${esc(t("falseInfo"))}</span>
    <select class="field" data-given="${esc(step.key)}" data-given-kind="${esc(kind)}">
      <option value="">${esc(t("computed"))}: ${esc(infoText(state, step, info))}</option>
      ${options.map((value) => {
        const label = kind === "role"
          ? roleNameOf(value)
          : kind === "bool"
            ? (value ? t("yes") : t("no"))
            : String(value);
        return `<option value="${esc(value)}">${esc(label)}</option>`;
      }).join("")}
    </select>
  </label>`;
}

function infoText(stateArg, step, info) {
  if (!info) return t("none");
  if (info.kind === "note") return info.text || "";
  if (info.kind === "one-of-two") {
    if (info.zero) return t("ui.zero");
    if (!info.roleId) return info.text || t("ui.notSet");
    const pair = (info.pair || []).map((id) => {
      const player = playerById(stateArg, id);
      return player ? `${displayName(player)} (${player.seat})` : id;
    });
    return t("infoPairResult", { role: roleNameOf(info.roleId), pair: pair.join(t("ui.or")) });
  }
  if (info.kind === "number") {
    return t("numberResult", { value: info.value });
  }
  if (info.kind === "yes-no") {
    return t("answerResult", { value: info.value ? t("yes") : t("no") });
  }
  if (info.kind === "character") {
    const player = info.playerId ? playerById(stateArg, info.playerId) : null;
    const roleId = info.roleId;
    return `${player ? displayName(player) : t("ui.player")} — ${roleId ? roleNameOf(roleId) : t("ui.unknown")}.`;
  }
  if (info.kind === "grimoire") {
    return t("ui.showGrimoireHint");
  }
  if (info.kind === "minion-info") {
    const demon = info.demonId ? playerById(stateArg, info.demonId) : null;
    return t("demonResult", { name: demon ? displayName(demon) : "—" });
  }
  if (info.kind === "demon-info") {
    const minions = livingPlayers(stateArg)
      .filter((player) => roleTeam(player.roleId) === "minion")
      .map((player) => displayName(player))
      .join(", ");
    const bluffs = (info.bluffs || stateArg.bluffs || []).map(roleNameOf).join(", ");
    return t("demonInfoResult", { minions: minions || "—", bluffs: bluffs || "—" });
  }
  return info.text || t("none");
}

function applyGiven(info, raw, kind) {
  if (!info) return info;
  if (kind === "number") {
    const value = Number(raw);
    return { ...info, value, needsChoice: false };
  }
  if (kind === "bool") {
    return { ...info, value: raw === "true", needsChoice: false };
  }
  if (kind === "role") {
    return { ...info, roleId: raw, needsChoice: false };
  }
  return info;
}

function bmrWarningMarkup() {
  if (!isBmrScript(state.script) && !isSnvScript(state.script)) return "";
  return `<div class="host-alert bmr-warning">
    <b>${esc(t("bmrHostWarningTitle"))}</b>
    <p>${esc(isSnvScript(state.script) ? t("svHostWarning") : t("bmrHostWarning"))}</p>
  </div>`;
}

function manualWarningMarkup() {
  if (!isManualScript(state.script)) return "";
  return `<div class="host-alert manual-warning">
    <b>${esc(t("manualOnlyTitle"))}</b>
    <p>${esc(t("manualOnlyWarning"))}</p>
  </div>`;
}

function nightCard() {
  const step = currentStep(state);
  const progress = stepProgress(state);
  const pending = demonChangePending(state);

  if (pending) {
    return `
      <section class="host-card is-night">
        ${bmrWarningMarkup()}
        <p class="label">${esc(t("pendingHeir"))}</p>
        <h1>${esc(t("pendingHeirText"))}</h1>
        <div class="host-targets">
          ${pending.pending.options.map((option) => `
            <button class="host-target" type="button" data-heir="${esc(pending.key)}" data-id="${esc(option.id)}">
              ${esc(option.name)}
              <small>${esc(roleNameOf(option.roleId))}</small>
            </button>`).join("")}
        </div>
      </section>`;
  }

  if (!step) {
    return `
      <section class="host-card is-night">
        ${manualWarningMarkup()}
        ${bmrWarningMarkup()}
        <p class="label">${esc(t("night"))} ${state.night.number}</p>
        <h1>${state.night.queue.length ? t("ui.allDone") : t("noWake")}</h1>
        <p>${esc(t("check"))}: ${progress.done} / ${progress.total}.</p>
        <button class="btn btn--accent host-primary" type="button" data-act="end-night">
          ${esc(t("finishNight"))}
        </button>
      </section>`;
  }

  const guide = guideFor(step, stepTitle);
  const role = step.roleId ? roleById(step.roleId) : null;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const info = infoForStep(state, step, {
    targetIds: stepTargets(step),
    registrations: registrations.get(step.key) || {}
  });
  const given = givens.get(step.key);
  const needsSetup = info.missing;
  const selected = stepTargets(step);
  const minTargets = (step.bmr || step.sv) ? (step.minTargets || 0) : step.targetMode === "none" ? 0 : step.targetMode === "two" ? 2 : 1;
  const maxTargets = (step.bmr || step.sv) ? (step.maxTargets || 0) : minTargets;
  const targetsIncomplete = selected.length < minTargets || selected.length > maxTargets;
  const selectedPlayer = selected[0] ? playerById(state, selected[0]) : null;
  const deadImpTarget = step.roleId === "imp" && selectedPlayer && !selectedPlayer.alive;
  // Only a Demon attack that would really kill the Mayor is redirected; a
  // poison target, a protected or dead target, or an impaired Demon must never
  // ask the host to resolve a redirection.
  const targetIsMayor = step.roleId === "imp" && attackNeedsRedirect(state, {
    attackerId: step.actorId,
    targetId: selected[0]
  });
  const needsRedirect = Boolean(targetIsMayor && !redirects.get(step.key));
  const needsInfo = targetsIncomplete || (info.needsChoice && !given);

  return `
    <section class="host-card is-night">
      ${manualWarningMarkup()}
      ${bmrWarningMarkup()}
      <div class="host-step-top">
        <p class="label">${esc(t("night"))} ${state.night.number} · ${esc(t("step"))} ${progress.done + 1} / ${progress.total}</p>
        ${role ? `<span class="host-chip">${esc(teamText(role.team))}</span>` : ""}
      </div>
      <h1>${esc(stepTitle(step))}${actor ? ` <small>· ${esc(displayName(actor))}</small>` : ""}</h1>
      ${step.deadTonight ? `<p class="host-alert">${esc(t("ui.deadWake"))}</p>` : ""}
      ${actor && isImpaired(state, actor.id) ? `<p class="host-alert">${esc(t("ui.impaired"))}</p>` : ""}

      <details class="host-guide" ${guided ? "open" : ""} data-guide>
        <summary>${esc(t("guidedInstructions"))}</summary>
        ${guideRow(t("hostAction"), guide.host)}
        ${guideRow(t("playerAction"), guide.player)}
        ${guideRow(t("grimoireNote"), guide.grimoire)}
        ${guideRow(t("publicLine"), guide.publicLine)}
        ${guideRow(t("check"), guide.check)}
      </details>

      ${step.targetMode !== "none" ? `
        <div class="host-section">
          <span class="label">${step.targetMode === "two" ? esc(t("chooseTwo")) : esc(t("chooseTarget"))}</span>
          <div class="host-targets">
            ${orderedPlayers(state).map((player) => {
              const on = selected.includes(player.id);
              const disabled = (step.targetMode === "one-other" && player.id === step.actorId)
                || (step.sv && ["dreamer", "seamstress"].includes(step.roleId) && player.id === step.actorId)
                || (step.previousTarget && player.id === step.previousTarget)
                || (step.roleId !== "moonchild" && ["professor"].includes(step.roleId) === false
                  && step.bmr && step.targetMode === "one-any" && step.canResurrect && !player.alive);
              return `<button class="host-target ${on ? "is-on" : ""} ${disabled ? "is-disabled" : ""}"
                type="button" data-target="${esc(step.key)}" data-id="${esc(player.id)}" ${disabled ? "disabled" : ""}>
                <span>${player.seat} · ${esc(displayName(player))}</span>
                <small>${player.alive ? esc(roleNameOf(player.roleId)) : esc(t("dead"))}</small>
              </button>`;
            }).join("")}
          </div>
          ${selected.length ? `<p class="host-muted">${esc(t("target"))}: ${esc(targetNames(selected))}</p>` : ""}
          ${deadImpTarget ? `<p class="host-alert">${esc(t("ui.deadTarget"))}</p>` : ""}
        </div>` : ""}

      ${targetIsMayor ? `
        <label class="host-field">
          <span class="label">${esc(t("forced"))}</span>
          <select class="field" data-redirect="${esc(step.key)}">
            <option value="none"${!redirects.get(step.key) || redirects.get(step.key) === "none" ? " selected" : ""}>${esc(t("ui.mayorDies"))}</option>
            ${orderedPlayers(state).filter((player) => player.id !== selected[0]).map((player) => {
              const label = !player.alive
                ? t("mayorRedirectDead", { name: displayName(player) })
                : (protectionFor(state, player.id) || soldierSafe(state, player.id))
                  ? t("mayorRedirectProtected", { name: displayName(player) })
                  : t("mayorRedirectResult", { name: displayName(player) });
              return `
              <option value="${esc(player.id)}"${redirects.get(step.key) === player.id ? " selected" : ""}>
                ${esc(label)}
              </option>`;
            }).join("")}
          </select>
        </label>` : ""}

      ${registrationMarkup(step)}

      ${step.infoKind !== "none" ? `
        <div class="host-section">
          <span class="label">${esc(t("computed"))}</span>
          <div class="host-info-preview">${esc(
            needsSetup
              ? t("ui.needsSecrets")
              : targetsIncomplete
                ? t("ui.targetFirst")
                : infoText(state, step, given || info)
          )}</div>
          ${!targetsIncomplete ? givenSelect(step, info) : ""}
          ${given ? `<p class="host-muted">${esc(t("given"))}: ${esc(infoText(state, step, given))}</p>` : ""}
          ${!needsSetup && !targetsIncomplete ? (
            step.roleId === "spy"
              ? `<button class="btn" type="button" data-act="show-grimoire">${esc(t("ui.showGrimoire"))}</button>`
              : `<button class="btn" type="button" data-act="show-info" data-key="${esc(step.key)}">${esc(t("showCard"))}</button>`
          ) : ""}
        </div>` : ""}

      ${needsSetup ? `<div class="host-alert is-bad">
        <b>${esc(t("setupErrors"))}</b>
        <p>${esc(t("secretsIntro"))}</p>
        <a class="btn" href="${path("secrets")}">${esc(t("secrets"))}</a>
      </div>` : ""}

      ${bmrOutcomeMarkup(step)}

      <div class="host-actions">
        <button class="btn btn--accent host-primary" type="button" data-act="complete"
          data-key="${esc(step.key)}" ${needsInfo || needsSetup || needsRedirect ? "disabled" : ""}>
          ${esc(t("completeStep"))}
        </button>
        <button class="btn" type="button" data-act="skip" data-key="${esc(step.key)}">${esc(t("skipStep"))}</button>
      </div>
    </section>`;
}

function bmrOutcomeMarkup(step) {
  if (!step.bmr && !step.sv) return "";
  const dead = orderedPlayers(state).filter((player) => !player.alive);
  const selected = stepTargets(step);
  const deaths = bmrDeaths.get(step.key) || [];
  const chosenDeath = bmrResurrect.get(step.key) || "";
  const isPukka = step.roleId === "pukka";
  const pending = isPukka ? state.effects.find((effect) => (
    effect.kind === "pukka-death"
    && effect.sourceId === step.actorId
    && effect.active !== false
  )) : null;
  const pendingPlayer = pending ? playerById(state, pending.targetId) : null;
  const pukkaStatus = isImpaired(state, step.actorId)
    ? t("bmrPukkaSuspended")
    : pendingPlayer
      ? t("bmrPukkaPending", { name: displayName(pendingPlayer) })
      : t("bmrPukkaNone");
  return `<div class="host-section bmr-outcome">
    <span class="label">${esc(t("bmrOutcome"))}</span>
    <p class="host-muted">${esc(isPukka ? t("bmrPukkaAuto") : t("bmrHostRuns"))}</p>
    ${isPukka ? `<p class="host-muted">${esc(pukkaStatus)}</p>` : ""}
    ${step.canKill && !isPukka ? `
      <div class="host-targets">
        ${orderedPlayers(state).filter((player) => player.alive).map((player) => `
          <button class="host-target ${deaths.includes(player.id) ? "is-on" : ""}" type="button"
            data-bmr-death="${esc(step.key)}" data-id="${esc(player.id)}">
            <span>${player.seat} · ${esc(displayName(player))}</span>
            <small>${esc(roleNameOf(player.roleId))}</small>
          </button>`).join("")}
      </div>
      <p class="host-muted">${esc(t("bmrDeaths"))}: ${esc(targetNames(deaths)) || "—"}</p>` : ""}
    ${step.roleChoices && step.roleChoices.length ? `
      <label class="host-field">
        <span class="label">${esc(t("bmrRoleChoice"))}</span>
        <select class="field" data-bmr-role="${esc(step.key)}">
          <option value="">${esc(t("ui.chooseRole"))}</option>
          ${step.roleChoices.map((id) => `
            <option value="${esc(id)}"${bmrRoles.get(step.key) === id ? " selected" : ""}>${esc(roleNameOf(id))}</option>`).join("")}
        </select>
      </label>` : ""}
    ${(step.roleId === "sailor" || step.roleId === "innkeeper") && selected.length ? `
      <label class="host-field">
        <span class="label">${esc(t("bmrDrunkChoice"))}</span>
        <select class="field" data-bmr-drunk="${esc(step.key)}">
          <option value="">${esc(t("none"))}</option>
          ${selected.map((id) => {
            const player = playerById(state, id);
            return `<option value="${esc(id)}"${bmrDrunk.get(step.key) === id ? " selected" : ""}>${esc(player ? displayName(player) : id)}</option>`;
          }).join("")}
        </select>
      </label>` : ""}
    ${step.canResurrect && dead.length ? `
      <label class="host-field">
        <span class="label">${esc(t("bmrResurrect"))}</span>
        <select class="field" data-bmr-resurrect="${esc(step.key)}">
          <option value=""${!chosenDeath ? " selected" : ""}>${esc(t("none"))}</option>
          ${dead.map((player) => `
            <option value="${esc(player.id)}"${chosenDeath === player.id ? " selected" : ""}>
              ${esc(displayName(player))} · ${esc(roleNameOf(player.roleId))}
            </option>`).join("")}
        </select>
      </label>` : ""}
  </div>`;
}

function guideRow(label, text) {
  return `<div class="host-guide-row">
    <span class="label">${esc(label)}</span>
    <p>${esc(text || "—")}</p>
  </div>`;
}

function dayCard() {
  const day = state.day;
  const executed = day.execution ? playerById(state, day.execution.playerId) : null;
  const living = livingPlayers(state);
  const threshold = executionThreshold(living.length);
  const manual = isManualScript(state.script);
  const virgin = !manual ? orderedPlayers(state).find((p) => p.roleId === "virgin" && p.alive && !p.used.virgin) : null;
  const slayer = !manual && !day.execution && !day.ended ? orderedPlayers(state).find((player) => (
    player.roleId === "slayer" && player.alive && !player.used.slayer
  )) : null;
  const canExecute = Boolean(executeTarget) && !day.execution && !day.ended && !state.winner;

  return `
    <section class="host-card is-day">
      ${manualWarningMarkup()}
      ${bmrWarningMarkup()}
      <p class="label">${esc(t("day"))} ${day.number}</p>
      <h1>${esc(t("dawn"))}</h1>
      <div class="host-morning">
        <span class="label">${esc(t("morning"))}</span>
        <p>${day.morning.length
          ? `${esc(t("died"))}: ${day.morning.map((death) => esc(displayName(playerById(state, death.playerId) || {}))).join(", ")}.`
          : esc(t("noDeaths"))}</p>
        <p class="host-muted">${esc(t("ui.announceNames"))}</p>
      </div>

      ${!day.execution && !day.ended ? `
        <div class="host-vote-hint">
          <span class="label">${esc(t("ui.voting"))}</span>
          <b>${esc(t("voteMinimum", { count: threshold, living: living.length }))}</b>
          <p class="host-muted">${esc(t("voteRule"))}</p>
        </div>` : ""}

      ${!day.execution && !day.ended ? `
        <div class="host-execute">
          <span class="label">${esc(t("ui.executedWho"))}</span>
          <div class="host-inline">
            <select class="field" data-exec-target>
              <option value="">${esc(t("ui.noExecution"))}</option>
              ${orderedPlayers(state).map((player) => `
                <option value="${esc(player.id)}"${executeTarget === player.id ? " selected" : ""}>
                  ${esc(displayName(player))}${player.alive ? "" : t("ui.alreadyDead")}
                </option>`).join("")}
            </select>
            <button class="btn btn--accent" type="button" data-act="execute-direct" ${canExecute ? "" : "disabled"}>
              ${esc(t("execute"))}
            </button>
          </div>
          ${state.script && Array.isArray(state.script.roles) && state.script.roles.some((id) => ["pacifist", "sailor", "fool", "devilsadvocate", "zombuul"].includes(id))
            ? `<label class="host-check"><input type="checkbox" data-exec-survives><span>${esc(t("survivesExecution"))}</span></label>`
            : ""}
          <p class="host-muted">${esc(t("ui.tableVotes"))}</p>
        </div>` : ""}

      ${!manual && virgin && !day.execution && !day.ended ? `<form class="host-execute" data-virgin-form>
        <h2>${esc(t("virginNomination"))}</h2>
        <p>${esc(t("virginHint"))}</p>
        <label>${esc(t("nominator"))}<select class="field" name="nominator" required>
          <option value="">${esc(t("chooseTarget"))}</option>
          ${living.map((p) => `<option value="${esc(p.id)}">${p.seat} · ${esc(displayName(p))}</option>`).join("")}
        </select></label>
        <label><input type="checkbox" name="spy"> ${esc(t("spyTownsfolk"))}</label>
        <button class="btn" type="submit" data-virgin="${esc(virgin.id)}">${esc(t("recordNomination"))}</button>
      </form>` : ""}
      ${executed ? `<div class="host-execution">
        <span class="label">${esc(t("execution"))}</span>
        <b>${esc(displayName(executed))}</b>
        <p class="host-muted">${day.execution.deathId ? t("ui.executedDied") : t("ui.executedNoDeath")}</p>
      </div>` : ""}

      ${slayer ? slayerPanel(slayer) : ""}
      ${manual ? "" : gossipPanel()}
      ${manual ? "" : moonchildPanel()}
      ${manual ? "" : mastermindPanel()}
      ${manual ? `<div class="host-execute">
        <span class="label">${esc(t("manualWinner"))}</span>
        <div class="host-inline">
          <select class="field" data-winner-team>
            <option value="good">${esc(t("winnerGood"))}</option>
            <option value="evil">${esc(t("winnerEvil"))}</option>
          </select>
          <button class="btn btn--accent" type="button" data-act="declare-winner">${esc(t("declareWinner"))}</button>
        </div>
        <p class="host-muted">${esc(t("manualWinnerHint"))}</p>
      </div>` : ""}

      <div class="host-actions">
        <button class="btn btn--accent" type="button" data-act="end-day">
          ${esc(day.execution || day.ended ? t("endDay") : t("noExecution"))}
        </button>
      </div>
    </section>`;
}
function moonchildPanel() {
  const moonchild = state.phase === "day"
    ? orderedPlayers(state).find((player) => (
      player.roleId === "moonchild" && !player.alive && !(player.used && player.used.moonchildTarget)
    ))
    : null;
  if (!moonchild) return "";
  return `<div class="host-execute">
    <span class="label">${esc(t("moonchildPanel"))}</span>
    <p class="host-muted">${esc(displayName(moonchild))}: ${esc(t("moonchildHint"))}</p>
    <div class="host-inline">
      <select class="field" data-moonchild-target>
        <option value="">${esc(t("chooseTarget"))}</option>
        ${livingPlayers(state).map((player) => `
          <option value="${esc(player.id)}">${player.seat} · ${esc(displayName(player))}</option>`).join("")}
      </select>
      <button class="btn" type="button" data-act="moonchild-choice">${esc(t("recordChoice"))}</button>
    </div>
  </div>`;
}

function mastermindPanel() {
  if (!state.mastermind || !state.mastermind.active) return "";
  return `<div class="host-alert">
    <b>${esc(t("mastermindActive"))}</b>
    <p>${esc(t("mastermindHint"))}</p>
  </div>`;
}

function gossipPanel() {
  const gossip = state.script && Array.isArray(state.script.roles) && state.script.roles.includes("gossip")
    ? orderedPlayers(state).find((player) => player.roleId === "gossip" && player.alive)
    : null;
  if (!gossip || state.day.execution || state.day.ended) return "";
  if (state.gossip && state.gossip.day === state.day.number) return "";
  return `<div class="host-execute">
    <span class="label">${esc(t("gossipPanel"))}</span>
    <p class="host-muted">${esc(displayName(gossip))}: ${esc(t("gossipHint"))}</p>
    <div class="host-inline">
      <button class="btn" type="button" data-act="gossip-true">${esc(t("gossipTrue"))}</button>
      <button class="btn" type="button" data-act="gossip-false">${esc(t("gossipFalse"))}</button>
    </div>
  </div>`;
}

function slayerPanel(slayer) {
  const targets = orderedPlayers(state);
  const selected = targets.find((player) => player.id === slayerTarget);
  return `<div class="host-slayer">
    <span class="label">${esc(t("slayer"))}</span>
    <p class="host-muted">${esc(t("slayerHint"))}</p>
    <div class="host-inline">
      <select class="field" data-slayer-target>
        <option value="">${esc(t("chooseTarget"))}</option>
        ${targets.map((player) => `<option value="${esc(player.id)}"${slayerTarget === player.id ? " selected" : ""}>${esc(displayName(player))}${player.alive ? "" : t("ui.deadSuffix")}</option>`).join("")}
      </select>
      ${selected && selected.roleId === "recluse" ? `<label class="host-check"><input type="checkbox" data-recluse-slayer ${recluseDemonSlayer ? "checked" : ""}><span>${esc(t("recluseDemon"))}</span></label>` : ""}
      <button class="btn" type="button" data-act="slayer" ${slayerTarget ? "" : "disabled"}>${esc(t("useSlayer"))}</button>
    </div>
  </div>`;
}

function overCard() {
  const winner = state.winner;
  return `
    <section class="host-card is-over">
      <p class="label">${esc(t("gameOver"))}</p>
      <h1>${esc(winner ? t(winner.team === "good" ? "winnerGood" : "winnerEvil") : t("gameOver"))}</h1>
      <p>${esc(winner ? t("winReason." + winner.reason) : "")}</p>
      <div class="host-inline">
        ${!state.reviewOpen ? `<button class="btn btn--accent" type="button" data-act="review">${esc(t("review"))}</button>` : ""}
        <button class="btn" type="button" data-act="new-game">${esc(t("newGame"))}</button>
        <button class="btn" type="button" data-act="export">${esc(t("export"))}</button>
      </div>
      ${!state.reviewOpen ? `<p class="host-muted">${esc(t("reviewHidden"))}</p>` : reviewTable()}
    </section>`;
}

function reviewTable() {
  return `<div class="host-review">
    <table>
      <thead><tr><th>#</th><th>${esc(t("player"))}</th><th>${esc(t("role"))}</th><th>${esc(t("shownRole"))}</th><th>${esc(t("team"))}</th><th>${esc(t("dead"))}</th><th>${esc(t("notes"))}</th></tr></thead>
      <tbody>
        ${orderedPlayers(state).map((player) => {
          const role = roleOf(player);
          const shown = shownRoleOf(player);
          return `<tr>
            <td>${player.seat}</td>
            <td>${esc(displayName(player))}</td>
            <td>${esc(role ? role.name : "—")}</td>
            <td>${esc(shown ? shown.name : "—")}</td>
            <td>${esc(role ? teamText(role.team) : "—")}</td>
            <td>${player.alive ? "—" : esc(player.deadAt ? causeText(player.deadAt.cause) : "—")}</td>
            <td>${esc((player.reminders || []).join(", "))}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function headerBar() {
  return `
    <header class="host-head">
      <div class="host-brand">
        <span class="host-mark" aria-hidden="true">PG</span>
        <div>
          <b>${esc(state.script ? state.script.name : "")}</b>
          <small>${esc(currentPhaseLabel())} · ${esc(headerCount())}</small>
        </div>
      </div>
      <nav class="host-nav" aria-label="${esc(t("table"))}">
        <a class="btn" href="${path("bag")}">${esc(t("setup"))}</a>
        <a class="btn" href="${path("seat")}">${esc(t("seats"))}</a>
        <a class="btn" href="${path("secrets")}">${esc(t("secrets"))}</a>
        <a class="btn" href="${path("player")}">${esc(t("player"))}</a>
        <a class="btn" href="${path("public")}">${esc(t("publicScreen"))}</a>
        <a class="btn" href="${path("help")}">${esc(t("help"))}</a>
        <a class="btn" href="${path("sheet")}">${esc(t("roleSheet"))}</a>
        <button class="btn" type="button" data-act="undo" ${canUndo() ? "" : "disabled"}>${esc(t("undo"))}</button>
        <button class="btn" type="button" data-act="export">${esc(t("export"))}</button>
        <button class="btn" type="button" data-act="import">${esc(t("import"))}</button>
        <button class="btn btn--accent" type="button" data-act="hide">${esc(t("hide"))}</button>
      </nav>
    </header>`;
}

function mainCard() {
  if (state.phase === "over") return overCard();
  if (state.phase === "night") return nightCard();
  if (state.phase === "day") return dayCard();
  if (state.phase === "deal" || state.phase === "seat") return dealCard();
  if (state.phase === "setup" && !state.setup.roles.length) return setupPrompt();
  return dealCard();
}

function overlayMarkup() {
  return renderDialogs({ overlay, infoKey, correction, exportText, importText,
    stepTitle, infoText, stepTargets, registrations, givens, displayName, roleNameOf,
    roleTokenMarkup, effectBadges, roleCardId });
}

function render() {
  if (overlay === "hide" || overlay === "info" || overlay === "grimoire") {
    root.innerHTML = overlayMarkup();
    return;
  }
  root.innerHTML = `
    <div class="host">
      ${headerBar()}
      <nav class="host-view-tabs" aria-label="${esc(t("view"))}">
        ${["play", "roster", "tools"].map((panel) => `<button class="btn ${mobilePanel === panel ? "btn--accent" : ""}" type="button" data-panel="${panel}" aria-pressed="${mobilePanel === panel}">${esc(t(panel))}</button>`).join("")}
      </nav>
      <div class="host-grid" data-panel="${mobilePanel}">
        ${seatRail()}
        <main class="host-main">${mainCard()}</main>
        ${sidePanel()}
      </div>
      <nav class="host-dock" aria-label="${esc(t("table"))}">
        <a href="${path("bag")}">${esc(t("setup"))}</a>
        <a href="${path("seat")}">${esc(t("seats"))}</a>
        <a href="${path("player")}">${esc(t("player"))}</a>
        <a href="${path("public")}">${esc(t("publicScreen"))}</a>
        <a href="${path("sheet")}">${esc(t("roleSheet"))}</a>
        <a href="${path("help")}">${esc(t("help"))}</a>
      </nav>
      ${overlayMarkup()}
    </div>`;
}

function doCommand(type, payload) {
  return dispatch({ type, payload });
}

function afterResult(result) {
  if (!result) return;
  if (result.status === "rejected") {
    if (result.errors) {
      window.alert(result.errors.map((error) => error.message || error).join("\n"));
    } else {
      window.alert(result.reason || t("setupErrors"));
    }
    return;
  }
  if (result.status === "requires-storyteller-choice") {
    window.alert(result.reason || t("setupErrors"));
    return;
  }
  render();
}


export function mount(rootScreen, { covered = false } = {}) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;
  modalFocus(rootScreen, signal);

  root = rootScreen;
  overlay = covered ? "hide" : null;
  infoKey = null;
  correction = null;
  executeTarget = "";
  exportText = "";
  importText = "";
  armedNew = false;

  root.addEventListener("submit", (event) => {
    if (!event.target.matches("[data-virgin-form]")) return;
    event.preventDefault();
    const data = new FormData(event.target);
    const id = event.target.querySelector("[data-virgin]").dataset.virgin;
    afterResult(doCommand("recordVirginNomination", {
      nominatorId: data.get("nominator"),
      virginId: id,
      options: { spyRegistersTownsfolk: data.has("spy") }
    }));
  }, { signal });
  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-bmr-resurrect]")) {
      bmrResurrect.set(event.target.dataset.bmrResurrect, event.target.value || null);
      render();
      return;
    }
    if (event.target.matches("[data-bmr-role]")) {
      bmrRoles.set(event.target.dataset.bmrRole, event.target.value || null);
      render();
      return;
    }
    if (event.target.matches("[data-bmr-drunk]")) {
      bmrDrunk.set(event.target.dataset.bmrDrunk, event.target.value || null);
      render();
    }
  }, { signal });
  root.addEventListener("toggle", (event) => {
    if (!event.target.matches("[data-guide]")) return;
    guided = event.target.open;
    try { localStorage.setItem("pg.guided", String(guided)); } catch { /* session preference */ }
  }, { capture: true, signal });
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const seatButton = target.closest("[data-seat-open]");
    if (seatButton) {
      selectedSeat = seatButton.dataset.seatOpen;
      correction = {
        playerId: selectedSeat,
        kind: "alive",
        value: playerById(state, selectedSeat) && playerById(state, selectedSeat).alive ? "dead" : "alive",
        reason: ""
      };
      overlay = "correction";
      render();
      return;
    }

    const roleToken = target.closest("[data-role-card]");
    if (roleToken) {
      roleCardBack = overlay;
      roleCardId = roleToken.dataset.roleCard;
      overlay = "role";
      render();
      return;
    }

    const panelButton = target.closest("button[data-panel]");
    if (panelButton) { mobilePanel = panelButton.dataset.panel; render(); return; }
    const targetButton = target.closest("[data-target]");
    if (targetButton) {
      const key = targetButton.dataset.target;
      const id = targetButton.dataset.id;
      const step = state.night.queue.find((candidate) => candidate.key === key);
      if (!step) return;
      const list = (targets.get(key) || []).slice();
      const victimBefore = list[0];
      const at = list.indexOf(id);
      if (at !== -1) list.splice(at, 1);
      else if (step.targetMode === "two") {
        if (list.length >= 2) list.shift();
        list.push(id);
      } else list.splice(0, list.length, id);
      targets.set(key, list);
      // A stored redirection belongs to one victim. Changing the Demon's target
      // must not silently redirect the new attack to the old replacement.
      if (victimBefore !== list[0]) redirects.delete(key);
      if (step.roleId === "imp"
        && attackNeedsRedirect(state, { attackerId: step.actorId, targetId: list[0] })
        && !redirects.has(key)) {
        redirects.set(key, "none");
      }
      render();
      return;
    }

    const bmrDeath = target.closest("[data-bmr-death]");
    if (bmrDeath) {
      const key = bmrDeath.dataset.bmrDeath;
      const list = (bmrDeaths.get(key) || []).slice();
      const at = list.indexOf(bmrDeath.dataset.id);
      if (at === -1) list.push(bmrDeath.dataset.id);
      else list.splice(at, 1);
      bmrDeaths.set(key, list);
      render();
      return;
    }

    const heir = target.closest("[data-heir]");
    if (heir) {
      afterResult(doCommand("chooseDemonHeir", { stepKey: heir.dataset.heir, heirId: heir.dataset.id }));
      return;
    }

    const act = target.closest("[data-act]");
    if (!act) return;
    const name = act.dataset.act;
    if (name === "recover-claim") {
      const reason = window.prompt(t("correctionReason"));
      if (reason) {
        const id = correction.playerId;
        overlay = null; correction = null;
        afterResult(doCommand("recoverClaim", { playerId: id, reason }));
      }
      return;
    }

    if (name === "hide") {
      overlay = "hide";
      render();
    } else if (name === "reveal") {
      overlay = null;
      render();
    } else if (name === "hide-info") {
      overlay = null;
      infoKey = null;
      render();
    } else if (name === "show-grimoire") {
      overlay = "grimoire";
      render();
    } else if (name === "hide-grimoire") {
      overlay = null;
      render();
    } else if (name === "close") {
      overlay = overlay === "role" && roleCardBack ? roleCardBack : null;
      roleCardBack = null;
      correction = null;
      roleCardId = null;
      render();
    } else if (name === "show-info") {
      infoKey = act.dataset.key;
      overlay = "info";
      render();
    } else if (name === "end-night") {
      afterResult(doCommand("endNight"));
    } else if (name === "execute-direct") {
      if (!executeTarget) return;
      const survives = root.querySelector("[data-exec-survives]")?.checked === true;
      const result = doCommand("executeByDecision", { playerId: executeTarget, options: { survives } });
      if (result && result.status === "allowed") executeTarget = "";
      afterResult(result);
    } else if (name === "declare-winner") {
      const team = root.querySelector("[data-winner-team]")?.value;
      if (team === "good" || team === "evil") {
        afterResult(doCommand("setWinner", { team, reason: "manual" }));
      }
    } else if (name === "end-day") {
      executeTarget = "";
      afterResult(doCommand("endDay"));
    } else if (name === "gossip-true" || name === "gossip-false") {
      afterResult(doCommand("gossipStatement", { truth: name === "gossip-true" }));
    } else if (name === "moonchild-choice") {
      const select = root.querySelector("[data-moonchild-target]");
      if (!select || !select.value) return;
      afterResult(doCommand("moonchildChoice", { targetId: select.value }));
    } else if (name === "slayer") {
      const slayerId = state.order.find((id) => {
        const player = playerById(state, id);
        return player && player.roleId === "slayer" && player.alive && !player.used.slayer;
      });
      afterResult(doCommand("useSlayer", {
        slayerId,
        targetId: slayerTarget,
        options: { recluseRegistersDemon: recluseDemonSlayer }
      }));
    } else if (name === "start-night") {
      afterResult(doCommand("startNight"));
    } else if (name === "complete") {
      const step = state.night.queue.find((candidate) => candidate.key === act.dataset.key);
      if (!step) return;
      const key = act.dataset.key;
      const result = doCommand("completeNightStep", {
        key,
        targetIds: stepTargets(step),
        redirectId: redirects.get(key) || null,
        registrations: registrations.get(key) || {},
        given: givens.get(key) || null,
        resurrectId: bmrResurrect.get(key) || null,
        roleId: bmrRoles.get(key) || null,
        drunkId: bmrDrunk.get(key) || null,
        deathIds: bmrDeaths.get(key) || []
      });
      if (result && result.status === "allowed") {
        bmrDeaths.delete(key);
        bmrResurrect.delete(key);
        bmrRoles.delete(key);
        bmrDrunk.delete(key);
      }
      afterResult(result);
    } else if (name === "skip") {
      const reason = window.prompt(t("ui.skipReason"));
      if (!reason) return;
      afterResult(doCommand("skipStep", { key: act.dataset.key, reason }));
    } else if (name === "undo") {
      if (undo()) {
        overlay = null;
        render();
      }
    } else if (name === "new-game" || name === "new") {
      if (!armedNew) {
        armedNew = true;
        window.alert(t("ui.newConfirm"));
        return;
      }
      doCommand("newGame", { count: 8 });
      go("/bag");
    } else if (name === "export") {
      exportText = exportGame();
      overlay = "export";
      render();
    } else if (name === "import") {
      overlay = "import";
      render();
    } else if (name === "apply-import") {
      if (!window.confirm(t("ui.importConfirm"))) return;
      const result = doCommand("importGame", { text: importText });
      if (result.status !== "allowed") {
        window.alert(t("importError") + ": " + (result.reason || result.error || ""));
        return;
      }
      overlay = null;
      render();
    } else if (name === "download") {
      const blob = new Blob([exportText], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pocket-grimoire-tb.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (name === "copy") {
      navigator.clipboard.writeText(exportText).catch(() => {});
    } else if (name === "timer-start") {
      timerEnd = Date.now() + 5 * 60 * 1000;
      render();
    } else if (name === "timer-stop") {
      timerEnd = null;
      render();
    } else if (name === "review") {
      doCommand("setReviewOpen", { open: true });
      render();
    } else if (name === "apply-correction") {
      if (!correction || !correction.reason.trim()) {
        window.alert(t("correctionReason"));
        return;
      }
      const base = { playerId: correction.playerId, reason: correction.reason };
      let payload = null;
      if (correction.kind === "alive") {
        payload = { ...base, kind: "alive", value: correction.value === "alive" };
      } else if (correction.kind === "role") {
        payload = { ...base, kind: "role", value: correction.value };
      } else if (correction.kind === "reminder") {
        payload = { ...base, kind: "reminder", value: correction.value };
      } else if (correction.kind === "clear-winner") {
        payload = { kind: "clear-winner", reason: correction.reason };
      }
      const result = doCommand("manualCorrection", { change: payload });
      overlay = null;
      correction = null;
      afterResult(result);
    }
  }, { signal });

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;

    if (target.matches("[data-reg]")) {
      const key = target.dataset.reg;
      const playerId = target.dataset.regPlayer;
      const value = target.dataset.regValue;
      const regs = { ...(registrations.get(key) || {}) };
      if (target.checked) regs[playerId] = value;
      else delete regs[playerId];
      registrations.set(key, regs);
      render();
      return;
    }

    if (target.matches("[data-given]")) {
      const key = target.dataset.given;
      const step = state.night.queue.find((candidate) => candidate.key === key);
      if (!step) return;
      const info = infoForStep(state, step, {
        targetIds: stepTargets(step),
        registrations: registrations.get(key) || {}
      });
      if (target.value) {
        givens.set(key, applyGiven(info, target.value, target.dataset.givenKind));
      } else {
        givens.delete(key);
      }
      render();
      return;
    }

    if (target.matches("[data-redirect]")) {
      redirects.set(target.dataset.redirect, target.value || "none");
      render();
      return;
    }

    if (target.matches("[data-exec-target]")) {
      executeTarget = target.value;
      render();
      return;
    }

    if (target.matches("[data-slayer-target]")) {
      slayerTarget = target.value;
      render();
      return;
    }

    if (target.matches("[data-recluse-slayer]")) {
      recluseDemonSlayer = target.checked;
      return;
    }

    if (target.matches("[data-correct]")) {
      if (!correction) correction = { playerId: "", kind: "alive", value: "dead", reason: "" };
      const field = target.dataset.correct;
      if (field === "player") {
        correction.playerId = target.value;
        correction.value = defaultCorrectionValue(correction.kind, playerById(state, target.value));
      } else if (field === "kind") {
        correction.kind = target.value;
        correction.value = defaultCorrectionValue(target.value, playerById(state, correction.playerId));
      } else if (field === "alive-value") correction.value = target.value;
      else if (field === "role-value") correction.value = target.value;
      else if (field === "reminder-value") { correction.value = target.value; return; }
      else if (field === "reason") { correction.reason = target.value; return; }
      render();
      return;
    }

    if (target.matches("[data-import-text]")) {
      importText = target.value;
    }
  }, { signal });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) return;
    if (target.matches("[data-notes]")) {
      doCommand("setNotes", { notes: target.value });
    } else if (target.matches("[data-import-text]")) {
      importText = target.value;
    } else if (target.matches("[data-correct='reason']")) {
      if (!correction) correction = { playerId: "", kind: "alive", value: "dead", reason: "" };
      correction.reason = target.value;
    }
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (overlay) {
      overlay = null;
      correction = null;
      roleCardId = null;
      roleCardBack = null;
      infoKey = null;
      render();
    }
  }, { signal });

  timerId = setInterval(() => {
    const node = root.querySelector("[data-timer-text]");
    if (node) node.textContent = timerText();
  }, 1000);
  signal.addEventListener("abort", () => clearInterval(timerId));

  render();
  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
  overlay = null; infoKey = null; correction = null; roleCardId = null; roleCardBack = null;
  targets.clear(); redirects.clear(); registrations.clear(); givens.clear();
  root = null;
}
