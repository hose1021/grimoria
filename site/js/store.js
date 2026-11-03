// Browser persistence for one local game. No game rules live here.
import {
  LEGACY_KEY, SCHEMA_VERSION, STORAGE_KEY, clone, createGame,
  exportGame as serializeGame, importGame as validateGame,
  livingPlayers, migrateV2, orderedPlayers as ordered, playerById as getPlayer,
  validateState
} from "./model.js";

export const KEY = STORAGE_KEY;

const LEGACY_DEFAULT_NAMES = [
  "Алиса", "Бен", "Кара", "Дев", "Элла", "Финн", "Гвен", "Хьюго",
  "Ирис", "Джек", "Кейт", "Лиам", "Мона", "Нейт", "Оливия",
  "Alice", "Ben", "Cara", "Dev", "Ella", "Finn", "Gwen", "Hugo",
  "Iris", "Jack", "Kate", "Liam", "Mona", "Nate", "Olive"
];

function clearUnclaimedDefaultNames(game) {
  let changed = false;
  for (const player of Object.values(game.players || {})) {
    const seat = Number(player.seat) - 1;
    const legacy = [LEGACY_DEFAULT_NAMES[seat], LEGACY_DEFAULT_NAMES[seat + 15]];
    if (player.name && (legacy.includes(player.name) || /^(Player|Игрок) \d+$/.test(player.name))) {
      player.name = "";
      player.claimed = false;
      changed = true;
    }
  }
  return changed;
}

export const loadStatus = {
  ok: true,
  error: null,
  backupKey: null,
  migrated: false
};

let history = [];

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

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === SCHEMA_VERSION) {
        const errors = validateState(parsed);
        if (!errors.length) {
          parsed.storageError = null;
          if (clearUnclaimedDefaultNames(parsed)) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch (error) { /* memory only */ }
          }
          return parsed;
        }
        return freshWithError("Сохранение повреждено: " + errors.join(" "), raw);
      }
      if (parsed && parsed.v === 2) {
        const migrated = migrateV2(parsed);
        const errors = validateState(migrated);
        if (errors.length) return freshWithError("Старое сохранение не удалось перенести: " + errors.join(" "), raw);
        loadStatus.migrated = true;
        clearUnclaimedDefaultNames(migrated);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch (error) { /* keep in memory */ }
        return migrated;
      }
      return freshWithError("Неизвестная версия сохранения: " + (parsed && parsed.v), raw);
    }

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateV2(JSON.parse(legacy));
      const errors = validateState(migrated);
      if (errors.length) return freshWithError("Старое сохранение не удалось перенести: " + errors.join(" "), legacy);
      loadStatus.migrated = true;
      clearUnclaimedDefaultNames(migrated);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch (error) { /* keep in memory */ }
      return migrated;
    }
  } catch (error) {
    return freshWithError("Не удалось прочитать сохранение: " + error.message, raw);
  }
  return createGame(8);
}

export const state = load();

export function save() {
  state.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    state.storageError = null;
    if (loadStatus.ok) loadStatus.error = null;
    return true;
  } catch (error) {
    state.storageError = "Не удалось сохранить игру: " + error.message + ". Сделайте экспорт.";
    loadStatus.ok = false;
    loadStatus.error = state.storageError;
    return false;
  }
}

export function pushHistory() {
  history.push(clone(state));
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

export function run(mutator) {
  pushHistory();
  const result = mutator(state);
  if (result && result.ok === false) {
    history.pop();
    return result;
  }
  save();
  return result;
}

export function reset(count = 8) {
  const next = createGame(count);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  history = [];
  save();
  return state;
}

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

export function importGame(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: "Файл не является JSON: " + error.message };
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

export function playerById(id) {
  return getPlayer(state, id);
}

export function orderedPlayers() {
  return ordered(state);
}

export function living() {
  return livingPlayers(state);
}

