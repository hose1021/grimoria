// @ts-check
// Browser persistence for one local game. No game rules live here.
import {
  LEGACY_KEY, LEGACY_V2_KEY, SCHEMA_VERSION, STORAGE_KEY, clone, createGame,
  exportGame as serializeGame, importGame as validateGame,
  livingPlayers, migrateV2, migrateV3, normalizeScriptState, orderedPlayers as ordered, playerById as getPlayer,
  validateState
} from "./model.js";
import { applyCommand, newCommandId } from "./engine/commands.js";

/** @typedef {import("./types.js").GameState} GameState */
/** @typedef {import("./types.js").Command} Command */

export const KEY = STORAGE_KEY;

const LEGACY_DEFAULT_NAMES = [
  "Алиса", "Бен", "Кара", "Дев", "Элла", "Финн", "Гвен", "Хьюго",
  "Ирис", "Джек", "Кейт", "Лиам", "Мона", "Нейт", "Оливия",
  "Alice", "Ben", "Cara", "Dev", "Ella", "Finn", "Gwen", "Hugo",
  "Iris", "Jack", "Kate", "Liam", "Mona", "Nate", "Olive"
];

/** @param {GameState} game @returns {boolean} */
function clearUnclaimedDefaultNames(game) {
  let changed = false;
  for (const player of Object.values(game.players || {})) {
    const seat = Number(player.seat) - 1;
    const legacy = [LEGACY_DEFAULT_NAMES[seat], LEGACY_DEFAULT_NAMES[seat + 15]];
    if (!player.claimed && player.name && (legacy.includes(player.name) || /^(Player|Игрок) \d+$/.test(player.name))) {
      player.name = "";
      player.claimed = false;
      changed = true;
    }
  }
  return changed;
}

export const loadStatus = {
  ok: true,
  error: /** @type {string|null} */ (null),
  backupKey: /** @type {string|null} */ (null),
  migrated: false
};

/** @type {GameState[]} */
let history = [];

/** @param {string} error @param {string|null} raw @returns {GameState} */
function freshWithError(error, raw) {
  const fresh = createGame(8);
  let message = error;
  if (raw) {
    try {
      const backupKey = "pg.game.broken." + Date.now();
      localStorage.setItem(backupKey, raw);
      loadStatus.backupKey = backupKey;
      message += " Исходные данные сохранены в браузере как " + backupKey + ".";
    } catch (backupError) {
      message += " Браузер не позволил сохранить резервную копию.";
    }
  }
  fresh.storageError = message;
  loadStatus.ok = false;
  loadStatus.error = message;
  return fresh;
}

/** @param {any} parsed @param {string} raw @returns {GameState} */
function loadLegacy(parsed, raw) {
  const migrated = parsed.v === 2 ? migrateV2(parsed) : migrateV3(parsed);
  const errors = validateState(migrated);
  if (errors.length) return freshWithError("Старое сохранение не удалось перенести: " + errors.join(" "), raw);
  loadStatus.migrated = true;
  if (parsed.v === 2) clearUnclaimedDefaultNames(migrated);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch (error) { /* keep in memory */ }
  return migrated;
}

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === SCHEMA_VERSION) {
        normalizeScriptState(parsed);
        const errors = validateState(parsed);
        if (!errors.length) {
          parsed.storageError = null;
          return parsed;
        }
        return freshWithError("Сохранение повреждено: " + errors.join(" "), raw);
      }
      if (parsed && (parsed.v === 2 || parsed.v === 3)) return loadLegacy(parsed, raw);
      return freshWithError("Неизвестная версия сохранения: " + (parsed && parsed.v), raw);
    }

    for (const key of [LEGACY_KEY, LEGACY_V2_KEY]) {
      const legacy = localStorage.getItem(key);
      if (legacy) return loadLegacy(JSON.parse(legacy), legacy);
    }
  } catch (error) {
    return freshWithError("Не удалось прочитать сохранение: " + (error instanceof Error ? error.message : String(error)), raw);
  }
  return createGame(8);
}

export const state = load();
let savedRevision = Number(state.revision) || 0;
let diskSnapshot = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
const subscribers = new Set();
function notify() {
  for (const listener of subscribers) {
    try { listener(); } catch (error) { console.error("Store subscriber failed", error); }
  }
}
/** @param {() => void} listener @returns {() => boolean} */
export function subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); }
if (typeof window !== "undefined") window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  const incoming = validateGame(event.newValue);
  if (!incoming.ok) return;
  restore(incoming.state);
  savedRevision = Number(state.revision) || 0;
  diskSnapshot = event.newValue;
  history = [];
  notify();
});

export function save() {
  state.updatedAt = new Date().toISOString();
  try {
    const disk = localStorage.getItem(STORAGE_KEY);
    if (disk !== diskSnapshot) {
      throw new Error("Another tab changed this game. Reload before continuing.");
    }
    state.revision = savedRevision + 1;
    const serialized = JSON.stringify({ ...state, storageError: null });
    localStorage.setItem(STORAGE_KEY, serialized);
    diskSnapshot = serialized;
    savedRevision = state.revision;
    state.storageError = null;
    notify();
    if (loadStatus.ok) loadStatus.error = null;
    return true;
  } catch (error) {
    state.storageError = "Не удалось сохранить игру: " + (error instanceof Error ? error.message : String(error)) + ". Сделайте экспорт.";
    loadStatus.ok = false;
    loadStatus.error = state.storageError;
    notify();
    return false;
  }
}

function serializedState() {
  return JSON.stringify({ ...state, storageError: null });
}

// True when this window holds game changes that are not in the last known disk
// snapshot. Another window may have saved a newer revision since then; that is
// not a local change and a reload adopts it.
export function hasLocalChanges() {
  if (diskSnapshot === null) return true;
  try {
    return JSON.stringify({ ...JSON.parse(diskSnapshot), storageError: null }) !== serializedState();
  } catch (error) {
    return true;
  }
}

// Persist pending in-memory changes without rewriting a game that is already on
// disk. The update prompt uses this so an idle tab never bumps the revision.
// No local changes means the latest stored revision is authoritative: a window
// that only received an older copy can reload into it without losing anything.
export function saveIfNeeded() {
  if (!hasLocalChanges()) return true;
  return save();
}

/** @param {GameState} [previous] */
export function pushHistory(previous) {
  history.push(previous || clone(state));
  if (history.length > 12) history.shift();
}

export function canUndo() {
  return history.length > 0;
}

export function undo() {
  const previous = history.pop();
  if (!previous) return false;
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, previous);
  save();
  return true;
}

/** @param {GameState} previous */
function restore(previous) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, previous);
}

/** @param {(state: GameState) => any} mutator @returns {any} */
export function run(mutator) {
  const before = clone(state);
  try {
    const result = mutator(state);
    if (result && result.ok === false) {
      restore(before);
      return result;
    }
    history.push(before);
    if (history.length > 12) history.shift();
    const persisted = save();
    return result && typeof result === "object" ? { ...result, persisted } : result;
  } catch (error) {
    restore(before);
    return { ok: false, error: (error instanceof Error ? error.message : String(error)) || String(error) };
  }
}

// The single mutation path for screens. A command is validated and applied on
// a draft; a rejection leaves the state untouched. A repeated command id is a
// no-op and does not add undo history.
/** @param {Command} command @returns {any} */
export function dispatch(command) {
  const withId = command && command.id ? command : { ...command, id: newCommandId() };
  const before = clone(state);
  const result = applyCommand(state, withId);
  if (result.status !== "allowed") return result;
  if (result.idempotent) return { ...result, persisted: !state.storageError };

  const persisted = save();
  if (!persisted) {
    const message = state.storageError;
    restore(before);
    state.storageError = message;
    return {
      status: "rejected",
      id: result.id,
      type: result.type,
      reason: message || "Не удалось сохранить игру.",
      errorCode: "persist-failed",
      persisted: false
    };
  }
  if (result.resetHistory) history = [];
  else if (result.undoable !== false) {
    history.push(before);
    if (history.length > 12) history.shift();
  }
  return { ...result, persisted: true };
}

// Legacy escape hatch retained for the existing tests and import/reset flows.
// Screens must call dispatch().
export function reset(count = 8) {
  const next = createGame(count);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  history = [];
  save();
  return state;
}

/** @param {GameState} next @returns {GameState} */
export function replaceState(next) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  history = [];
  save();
  return state;
}

export function exportGame() {
  return serializeGame(state);
}

/** @param {string} text @returns {{ ok: true } | { ok: false, error: string }} */
export function importGame(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: "Файл не является JSON: " + (error instanceof Error ? error.message : String(error)) };
  }
  const result = validateGame(parsed);
  if (!result.ok) return result;
  pushHistory();
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, result.state);
  state.storageError = null;
  save();
  return { ok: true };
}

export function acknowledgeStorageError() {
  state.storageError = null;
  loadStatus.ok = true;
  loadStatus.error = null;
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

