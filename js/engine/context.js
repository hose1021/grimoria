// @ts-check
// Trouble Brewing domain: context. No DOM or persistence.

import { effectiveRoleId, livingPlayers, nowIso, orderedPlayers, seatName } from "../model.js";

/** @typedef {import("../types.js").GameState} GameState */
/** @typedef {import("../types.js").Player} Player */
/** @typedef {import("../types.js").LogEntry} LogEntry */
/** @typedef {import("../types.js").DeadAt} DeadAt */
/** @typedef {import("../types.js").RoleId} RoleId */
/** @typedef {{ kind?: string, title?: string, detail?: string, playerId?: string|null, secret?: boolean }} LogInput */

/** @param {GameState} state @returns {DeadAt} */
export function nightAt(state) {
  return { phase: "night", number: Math.max(1, state.night.number || 1) };
}


/** @param {number} livingCount @returns {number} */
export function executionThreshold(livingCount) {
  return Math.ceil(Math.max(0, Number(livingCount) || 0) / 2);
}


/** @param {GameState} state @returns {DeadAt} */
export function dayAt(state) {
  return {
    phase: "day",
    number: Math.max(1, state.day.number || state.night.number || 1)
  };
}


/** @param {GameState} state @returns {DeadAt} */
export function currentAt(state) {
  return state.phase === "day" ? dayAt(state) : nightAt(state);
}


/** @param {DeadAt} at @returns {number} */
export function cycleOf(at) {
  return at.phase === "night" ? at.number * 2 - 1 : at.number * 2;
}


/** @param {GameState} state @param {LogInput} entry @returns {LogEntry} */
export function addLog(state, entry) {
  const phase = state.phase === "day"
    ? "День " + dayAt(state).number
    : state.phase === "night"
      ? "Ночь " + nightAt(state).number
      : state.phase === "over"
        ? "Итог"
        : "Подготовка";
  const item = {
    id: "log-" + (state.log.length + 1) + "-" + Math.random().toString(36).slice(2, 7),
    at: nowIso(),
    phase,
    kind: entry.kind || "game",
    title: entry.title || "",
    detail: entry.detail || "",
    playerId: entry.playerId || null,
    secret: Boolean(entry.secret)
  };
  state.log.push(item);
  return item;
}


/** @param {GameState} state @param {string} id @returns {string} */
export function playerName(state, id) {
  return seatName(state, id);
}


/** @param {GameState} state @param {RoleId} roleId @param {boolean} [includeDead] @returns {Player|null} */
export function actorForRole(state, roleId, includeDead = false) {
  return orderedPlayers(state).find((p) => {
    if (!includeDead && !p.alive) return false;
    return effectiveRoleId(p) === roleId;
  }) || null;
}


/** @param {GameState} state @param {RoleId} roleId @returns {Player[]} */
export function playersWithEffectiveRole(state, roleId) {
  return orderedPlayers(state).filter((p) => effectiveRoleId(p) === roleId);
}


/** @param {GameState} state @param {string} id @returns {string[]} */
export function aliveNeighbors(state, id) {
  const ids = state.order;
  const at = ids.indexOf(String(id));
  if (at === -1) return [];
  const alive = new Set(livingPlayers(state).map((p) => p.id));
  /** @type {string[]} */
  const found = [];
  for (const dir of [-1, 1]) {
    for (let step = 1; step < ids.length; step += 1) {
      const index = (at + dir * step + ids.length) % ids.length;
      const candidate = String(ids[index]);
      if (candidate === String(id)) continue;
      if (alive.has(candidate)) {
        found.push(candidate);
        break;
      }
    }
  }
  return found.filter((value, index) => found.indexOf(value) === index);
}


/** @param {GameState} state @param {string} id @returns {string[]} */
export function allNeighbors(state, id) {
  const ids = state.order;
  const at = ids.indexOf(String(id));
  if (at === -1 || ids.length < 2) return [];
  return [
    String(ids[(at - 1 + ids.length) % ids.length]),
    String(ids[(at + 1) % ids.length])
  ];
}

// ---------------------------------------------------------------------------
// Effects

