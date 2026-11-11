// @ts-check
// Browser composition root: one store wired with the browser adapters. Every
// export keeps the shape the screens already use; the screens mutate the game
// only through dispatch.
import {
  livingPlayers,
  orderedPlayers as ordered,
  playerById as getPlayer,
  STORAGE_KEY,
} from "./model.js";
import { createGameStore } from "../src/application/store/create-game-store.ts";
import { toCommandInput } from "../src/application/dispatch/adapt.ts";
import { createLocalGameStorage } from "../src/infrastructure/storage/local-game-storage.ts";
import { createWebLocksCoordination } from "../src/infrastructure/coordination/web-locks.ts";
import { createSystemPorts } from "../src/infrastructure/platform/system-ports.ts";
import { createLocalPreferences } from "../src/infrastructure/preferences/local-preferences.ts";

/** @typedef {import("../src/core/commands/result.ts").DispatchResult} DispatchResult */

export const KEY = STORAGE_KEY;

const game = createGameStore({
  storage: createLocalGameStorage(),
  preferences: createLocalPreferences(),
  coordination: createWebLocksCoordination(),
  ...createSystemPorts(),
});

export const state = game.state;
export const loadStatus = game.loadStatus;

/**
 * The cached snapshot: identity changes only at publish, so a subscriber that
 * reads twice without a change gets the same object.
 * @returns {import("../src/application/store/create-game-store.ts").GameSnapshot}
 */
export function getSnapshot() {
  return game.getSnapshot();
}

/** @param {() => void} listener @returns {() => void} */
export function subscribe(listener) {
  return game.subscribe(listener);
}

/**
 * Screens compose an intent; the store assigns the identity when none is given.
 * @param {import("./types.js").Command} command
 * @returns {DispatchResult}
 */
export function dispatch(command) {
  const input = toCommandInput(command);
  const prepared = game.prepare(input);
  if (!prepared.ok) {
    return {
      status: "rejected",
      id: input.id ?? null,
      type: input.type,
      reason: prepared.reason,
      errorCode: prepared.errorCode,
      errors: null,
      persisted: false,
    };
  }
  return game.dispatch(prepared.command);
}

/** @returns {boolean} */
export function save() {
  return game.persist().ok;
}

/** @returns {boolean} */
export function saveIfNeeded() {
  if (!game.hasLocalChanges()) return true;
  return game.persist().ok;
}

/** @returns {boolean} */
export function hasLocalChanges() {
  return game.hasLocalChanges();
}

/** @returns {boolean} */
export function canUndo() {
  return game.canUndo();
}

/**
 * Boolean for the legacy screen: a failed write must not open the success path.
 * @returns {boolean}
 */
export function undo() {
  return game.undo().ok;
}

/**
 * Legacy escape hatch for tests and the import/reset flows: the mutator writes
 * the live object and undo history keeps a step even when the write fails.
 * @param {(state: import("./types.js").GameState) => any} mutator
 */
export function run(mutator) {
  return game.run(mutator);
}

/** @param {number} [count] */
export function reset(count = 8) {
  return game.reset(count);
}

/** @param {import("./types.js").GameState} next */
export function replaceState(next) {
  return game.replaceState(next);
}

/** @returns {string} */
export function exportGame() {
  return game.exportGame();
}

/** @param {string} text */
export function importGame(text) {
  return game.importGame(text);
}

export function acknowledgeStorageError() {
  game.clearSaveError();
}

/** @param {string} id @returns {import("./types.js").Player|null} */
export function playerById(id) {
  return getPlayer(state, id);
}

export function orderedPlayers() {
  return ordered(state);
}

export function living() {
  return livingPlayers(state);
}
