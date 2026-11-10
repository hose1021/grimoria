// @ts-check
// Trouble Brewing domain: information. No DOM or persistence.
import { ALL_ROLES, roleTeam } from "../rules.js";
import { orderedPlayers, playerById, realTeamOf } from "../model.js";

import { nightAt, aliveNeighbors } from "./context.js";
import { isImpaired } from "./effects.js";
import { executionDeathForDay } from "./night.js";
import { bmrInfoForStep } from "./bmr.js";
import { svInfoForStep } from "./sv.js";

/** @typedef {import("../types.js").GameState} GameState */
/** @typedef {import("../types.js").Player} Player */
/** @typedef {import("../types.js").RoleId} RoleId */
/** @typedef {import("../types.js").NightStep} NightStep */
/** @typedef {import("../types.js").SetupInfo} SetupInfo */
/** @typedef {Record<string, string>} Registrations */
/** @typedef {{ targetIds?: string[], registrations?: Registrations }} InfoOptions */
/** @typedef {{ kind: string, value?: unknown, roleId?: RoleId|null, pair?: string[], matchIndex?: number, impaired?: boolean, needsChoice?: boolean, options?: unknown[], text?: string, missing?: boolean, zero?: boolean, bluffs?: string[], demonId?: string|null, playerId?: string|null }} InfoResult */

/** @param {GameState} state @param {Player|null} player @param {Registrations} [registrations] @returns {"good"|"evil"|null} */
export function alignmentOf(state, player, registrations = {}) {
  if (!player) return null;
  const override = registrations[player.id];
  if (override === "good" || override === "evil") return override;
  return realTeamOf(player) === "evil" ? "evil" : "good";
}


/** @param {GameState} state @param {Player|null} player @param {Registrations} [registrations] @returns {boolean} */
export function registersAsDemon(state, player, registrations = {}) {
  if (!player) return false;
  if (roleTeam(player.roleId || "") === "demon") return true;
  if (player.roleId === "recluse") {
    return registrations[player.id] === "demon" || registrations[player.id] === "evil";
  }
  return false;
}


/** @param {GameState} state @param {Player|null} player @param {Registrations} [registrations] @returns {boolean} */
export function registersAsTownsfolk(state, player, registrations = {}) {
  if (!player) return false;
  if (roleTeam(player.roleId || "") === "townsfolk") return true;
  return player.roleId === "spy" && registrations[player.id] === "townsfolk";
}


/** @param {GameState} state @param {Player|null} player @param {Registrations} [registrations] @returns {boolean} */
export function registersAsMinion(state, player, registrations = {}) {
  if (!player) return false;
  if (roleTeam(player.roleId || "") === "minion") return true;
  return player.roleId === "recluse" && registrations[player.id] === "minion";
}


/** @param {GameState} state @param {Player|null} player @param {Registrations} [registrations] @returns {boolean} */
export function registersAsOutsider(state, player, registrations = {}) {
  if (!player) return false;
  if (roleTeam(player.roleId || "") === "outsider") return true;
  return player.roleId === "spy" && registrations[player.id] === "outsider";
}


/** @param {GameState} state @param {Registrations} [registrations] @returns {number} */
export function chefCount(state, registrations = {}) {
  const ids = state.order;
  let pairs = 0;
  for (let i = 0; i < ids.length; i += 1) {
    const a = playerById(state, ids[i]);
    const b = playerById(state, ids[(i + 1) % ids.length]);
    if (
      alignmentOf(state, a, registrations) === "evil"
      && alignmentOf(state, b, registrations) === "evil"
    ) pairs += 1;
  }
  return pairs;
}


/** @param {GameState} state @param {string} playerId @param {Registrations} [registrations] @returns {number} */
export function empathCount(state, playerId, registrations = {}) {
  return aliveNeighbors(state, playerId)
    .map((id) => playerById(state, id))
    .filter((player) => alignmentOf(state, player, registrations) === "evil")
    .length;
}


/** @param {GameState} state @param {string[]|undefined} targetIds @param {Registrations} [registrations] @returns {boolean} */
export function fortuneTellerYes(state, targetIds, registrations = {}) {
  const herringId = state.setup && state.setup.herringId
    ? state.setup.herringId
    : state.herringId;
  return (targetIds || []).some((id) => {
    const player = playerById(state, id);
    if (!player) return false;
    if (id === herringId) return true;
    return registersAsDemon(state, player, registrations);
  });
}


/** @param {GameState} state @param {string} targetId @param {boolean} [actorImpaired] @returns {RoleId[]} */
export function characterChoices(state, targetId, actorImpaired = false) {
  if (actorImpaired) return ALL_ROLES.slice();
  const player = playerById(state, targetId);
  if (!player) return [];
  if (player.roleId === "recluse") {
    return [player.roleId].concat(
      ALL_ROLES.filter((id) => roleTeam(id) === "minion" || roleTeam(id) === "demon")
    );
  }
  if (player.roleId === "spy") {
    return [player.roleId].concat(
      ALL_ROLES.filter((id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider")
    );
  }
  return [/** @type {RoleId} */ (player.roleId)];
}

// ---------------------------------------------------------------------------
// Night queue


/** @param {GameState} state @param {NightStep} step @param {InfoOptions} [options] @returns {InfoResult} */
export function infoForStep(state, step, options = {}) {
  if (step.bmr) return bmrInfoForStep(state, step, options);
  if (step.sv) return svInfoForStep(state, step, options);
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const at = nightAt(state);
  const impaired = actor ? isImpaired(state, actor.id, at) : false;
  const registrations = options.registrations || step.registrations || {};
  const role = step.roleId;

  if (step.kind === "system") {
    if (step.system === "demoninfo") {
      return { kind: "demon-info", bluffs: step.bluffs || [] };
    }
    if (step.system === "minioninfo") {
      return { kind: "minion-info", demonId: step.demonId };
    }
    return { kind: "note", text: step.note || "" };
  }

  if (role === "washerwoman" || role === "librarian" || role === "investigator") {
    const setup = state.setup.info[role];
    if (!setup) {
      if (actor && actor.roleId === "drunk") {
        const team = role === "washerwoman" ? "townsfolk" : role === "librarian" ? "outsider" : "minion";
        const options = ALL_ROLES.filter((id) => roleTeam(id) === team);
        const others = orderedPlayers(state).filter((player) => player.id !== actor.id).map((player) => player.id);
        return {
          kind: "one-of-two",
          missing: false,
          roleId: options[0] || null,
          pair: others.slice(0, 2),
          matchIndex: 0,
          impaired: true,
          needsChoice: true,
          options,
          text: "Пьяница: предложена ложная информация."
        };
      }
      return { kind: "one-of-two", missing: true, needsChoice: true };
    }
    if ("zero" in setup && setup.zero) {
      return { kind: "one-of-two", zero: true, text: "В игре нет Изгоев." };
    }
    const pairInfo = /** @type {import("../types.js").InfoPair} */ (setup);
    if (!pairInfo.roleId || !Array.isArray(pairInfo.pair) || pairInfo.pair.length !== 2) {
      return { kind: "one-of-two", missing: true, needsChoice: true };
    }
    return {
      kind: "one-of-two",
      roleId: pairInfo.roleId,
      pair: pairInfo.pair.slice(),
      matchIndex: pairInfo.matchIndex || 0,
      impaired,
      needsChoice: impaired,
      options: impaired
        ? ALL_ROLES.filter((id) => roleTeam(id) === (role === "washerwoman" ? "townsfolk" : role === "librarian" ? "outsider" : "minion"))
        : []
    };
  }

  if (role === "chef") {
    const value = chefCount(state, registrations);
    return {
      kind: "number",
      value,
      impaired,
      needsChoice: impaired,
      options: impaired ? uniqueNumbers(0, orderedPlayers(state).length) : []
    };
  }

  if (role === "empath") {
    const value = empathCount(state, actor ? actor.id : "", registrations);
    return {
      kind: "number",
      value,
      impaired,
      needsChoice: impaired,
      options: impaired ? uniqueNumbers(0, 2) : []
    };
  }

  if (role === "fortuneteller") {
    const value = fortuneTellerYes(state, options.targetIds || step.targetIds, registrations);
    return {
      kind: "yes-no",
      value,
      impaired,
      needsChoice: impaired,
      options: impaired ? [true, false] : []
    };
  }

  if (role === "undertaker") {
    const death = executionDeathForDay(state, nightAt(state).number - 1);
    if (!death) return { kind: "none", text: "Сегодня казни со смертью не было." };
    const choices = characterChoices(state, death.playerId, impaired);
    return {
      kind: "character",
      roleId: death.roleId,
      playerId: death.playerId,
      impaired,
      needsChoice: impaired || choices.length > 1,
      options: choices
    };
  }

  if (role === "spy") {
    return { kind: "grimoire" };
  }

  if (role === "ravenkeeper") {
    const targetId = (options.targetIds || step.targetIds || [])[0];
    const target = targetId ? playerById(state, targetId) : null;
    if (!target) return { kind: "character", roleId: null, needsChoice: true, options: ALL_ROLES.slice() };
    const choices = characterChoices(state, target.id, impaired);
    return {
      kind: "character",
      roleId: target.roleId,
      playerId: target.id,
      impaired,
      needsChoice: impaired || choices.length > 1,
      options: choices
    };
  }

  return { kind: "none" };
}


/** @param {number} from @param {number} to @returns {number[]} */
export function uniqueNumbers(from, to) {
  /** @type {number[]} */
  const out = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}

// ---------------------------------------------------------------------------
// Death, inheritance and win

