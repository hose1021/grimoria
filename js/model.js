// Game state schema v3. Pure functions: no DOM, no localStorage.
import { roleTeam, isTbRole } from "./rules.js";

export const SCHEMA_VERSION = 3;
export const STORAGE_KEY = "pg.game.v3";
export const LEGACY_KEY = "pg.game.v2";

export function nowIso() {
  return new Date().toISOString();
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function emptyPlayer(id, index) {
  return {
    id: String(id),
    seat: Number(index) + 1,
    name: "",
    roleId: null,
    shownRoleId: null,
    team: null,
    alive: true,
    claimed: false,
    reminders: [],
    used: {},
    voteToken: true,
    butlerMasterId: null,
    changedFrom: null,
    deadAt: null,
    notes: ""
  };
}

export function emptyLog() {
  return [];
}

export function createGame(count = 8) {
  const size = Math.max(5, Math.min(15, Number(count) || 8));
  const players = {};
  const order = [];
  for (let i = 0; i < size; i += 1) {
    const id = String(i + 1);
    order.push(id);
    players[id] = emptyPlayer(id, i);
  }
  return {
    v: SCHEMA_VERSION,
    scriptId: "tb",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    phase: "setup",
    setup: {
      count: size,
      roles: [],
      bluffs: [],
      drunkShownId: null,
      herringId: null,
      info: {
        washerwoman: null,
        librarian: null,
        investigator: null
      },
      ready: false
    },
    order,
    players,
    bluffs: [],
    herringId: null,
    night: {
      number: 0,
      queue: [],
      currentIndex: 0,
      demonChanged: false
    },
    day: {
      number: 0,
      morning: [],
      nominations: [],
      activeNominationId: null,
      execution: null,
      ended: false,
      open: false
    },
    deaths: [],
    executions: [],
    effects: [],
    corrections: [],
    log: emptyLog(),
    notes: "",
    winner: null,
    reviewOpen: false,
    publicRevealed: false,
    applied: {},
    storageError: null,
    migratedFrom: null
  };
}

export function setRoster(state, count) {
  const size = Math.max(5, Math.min(15, Number(count) || 8));
  const kept = {};
  const order = [];
  for (let i = 0; i < size; i += 1) {
    const id = String(i + 1);
    order.push(id);
    kept[id] = emptyPlayer(id, i);
  }
  state.players = kept;
  state.order = order;
  state.setup.count = size;
  state.setup.roles = [];
  state.setup.bluffs = [];
  state.setup.drunkShownId = null;
  state.setup.herringId = null;
  state.setup.info = { washerwoman: null, librarian: null, investigator: null };
  state.bluffs = [];
  state.herringId = null;
  for (const player of Object.values(state.players)) {
    player.roleId = null;
    player.shownRoleId = null;
    player.team = null;
    player.alive = true;
    player.claimed = false;
    player.reminders = [];
    player.used = {};
    player.voteToken = true;
    player.butlerMasterId = null;
    player.changedFrom = null;
    player.deadAt = null;
  }
  state.phase = "setup";
  state.winner = null;
  state.reviewOpen = false;
  state.deaths = [];
  state.executions = [];
  state.effects = [];
  state.corrections = [];
  state.log = [];
  state.notes = "";
  state.applied = {};
  state.day = {
    number: 0, morning: [], nominations: [], activeNominationId: null,
    execution: null, ended: false, open: false
  };
  state.night = { number: 0, queue: [], currentIndex: 0, demonChanged: false };
  return state;
}

export function playerById(state, id) {
  return (state.players && state.players[id]) || null;
}

export function orderedPlayers(state) {
  return (state.order || []).map((id) => playerById(state, id)).filter(Boolean);
}

export function livingPlayers(state) {
  return orderedPlayers(state).filter((p) => p.alive);
}

export function livingIds(state) {
  return livingPlayers(state).map((p) => p.id);
}

export function seatOf(state, id) {
  const at = (state.order || []).indexOf(String(id));
  return at === -1 ? 0 : at + 1;
}

export function seatName(state, id) {
  const p = playerById(state, id);
  return p ? p.name : "—";
}

export function realTeamOf(player) {
  if (!player) return null;
  if (player.team) return player.team;
  const team = roleTeam(player.roleId);
  return team === "minion" || team === "demon" ? "evil" : team ? "good" : null;
}

export function effectiveRoleId(player) {
  if (!player) return null;
  if (player.roleId === "drunk") return player.shownRoleId;
  return player.roleId;
}

export function publicRoleView(player, role) {
  if (!player || !role) return null;
  return {
    seat: player.seat,
    name: player.name,
    role: role.name,
    team: role.team === "minion" || role.team === "demon" ? "evil" : "good",
    teamLabel: role.team,
    ability: role.ability || "",
    image: role.image
  };
}

export function publicGameView(state) {
  const living = livingPlayers(state).length;
  const deathNames = (state.day && state.day.morning ? state.day.morning : [])
    .map((death) => seatName(state, death.playerId))
    .filter(Boolean);
  return {
    phase: state.phase,
    day: state.day ? state.day.number : 0,
    night: state.night ? state.night.number : 0,
    living,
    total: (state.order || []).length,
    deaths: deathNames,
    winner: state.winner ? { team: state.winner.team, reason: state.winner.reason } : null
  };
}

// ---------------------------------------------------------------------------
// Migration and validation

export function migrateV2(old) {
  const count = Array.isArray(old.order) && old.order.length
    ? old.order.length
    : Object.keys(old.players || {}).length || 8;
  const state = createGame(count);
  state.migratedFrom = "v2";
  state.createdAt = old.updatedAt || state.createdAt;
  state.notes = typeof old.notes === "string" ? old.notes : "";
  state.order = Array.isArray(old.order) && old.order.length
    ? old.order.map(String)
    : state.order;
  if (state.order.length !== count) {
    state.order = state.order.slice(0, count);
    while (state.order.length < count) state.order.push(String(state.order.length + 1));
  }

  for (const id of state.order) {
    const raw = (old.players && old.players[id]) || {};
    const base = state.players[id] || emptyPlayer(id, Number(id) - 1);
    const roleId = raw.roleId && isTbRole(raw.roleId) ? raw.roleId : null;
    const shownRoleId = raw.shownRoleId && isTbRole(raw.shownRoleId)
      ? raw.shownRoleId
      : roleId;
    const alive = raw.alive !== false;
    state.players[id] = {
      ...base,
      id,
      seat: Number(id),
      name: String(raw.name || "").trim(),
      roleId,
      shownRoleId,
      team: roleId ? (roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good") : null,
      alive,
      claimed: Boolean(raw.claimed),
      reminders: Array.isArray(raw.reminders) ? raw.reminders.slice() : [],
      used: {},
      voteToken: true,
      deadAt: alive ? null : { phase: "night", number: Number(old.night) || 1, cause: "legacy" }
    };
    if (!alive) {
      state.deaths.push({
        id: "legacy-" + id,
        playerId: id,
        roleId,
        cause: "legacy",
        phase: "night",
        number: Number(old.night) || 1,
        at: state.createdAt,
        impaired: false,
        livingBefore: count
      });
    }
  }

  const roles = [];
  for (const p of orderedPlayers(state)) {
    if (p.roleId && !roles.includes(p.roleId)) roles.push(p.roleId);
  }
  state.setup.count = count;
  state.setup.roles = roles;
  state.setup.bluffs = Array.isArray(old.bluffs) ? old.bluffs.filter(Boolean) : [];
  state.setup.drunkShownId = (orderedPlayers(state).find((p) => p.roleId === "drunk") || {}).shownRoleId || null;
  state.bluffs = state.setup.bluffs.slice();
  state.night.number = Number(old.night) || 1;
  state.day.number = Math.max(1, state.night.number);
  state.phase = roles.length ? "night" : "setup";
  state.log = Array.isArray(old.log) ? old.log.slice() : [];
  state.night.queue = (Array.isArray(old.nightOrder) ? old.nightOrder : []).map((row, i) => ({
    key: "legacy-" + i,
    kind: "legacy",
    roleId: row.roleId || null,
    actorId: null,
    title: row.role || row.roleId || "Шаг",
    instruction: row.step || "",
    done: Boolean(row.done),
    legacy: true
  }));
  state.setup.ready = roles.length === count;
  return state;
}

export function validateState(value) {
  const errors = [];
  const add = (message) => errors.push(message);
  if (!value || typeof value !== "object") return ["Состояние не является объектом."];
  if (value.v !== SCHEMA_VERSION) add("Неизвестная версия схемы: " + value.v + ".");
  if (!value.players || typeof value.players !== "object") add("Нет списка игроков.");
  if (!Array.isArray(value.order)) add("Нет порядка мест.");
  if (!Array.isArray(value.log)) add("Нет журнала.");
  if (!value.setup || typeof value.setup !== "object") add("Нет блока подготовки.");
  if (Array.isArray(value.order)) {
    if (new Set(value.order.map(String)).size !== value.order.length) add("Порядок мест содержит дубликаты.");
    for (const id of value.order) {
      if (!value.players || !value.players[String(id)]) add("Место " + id + " не связано с игроком.");
    }
  }
  if (value.players) {
    for (const [id, player] of Object.entries(value.players)) {
      if (player.id !== id) add("ID игрока не совпадает с ключом: " + id + ".");
      if (typeof player.alive !== "boolean") add("У игрока " + id + " нет состояния жизни.");
      if (!Array.isArray(player.reminders)) add("У игрока " + id + " нет списка напоминаний.");
    }
  }
  return errors;
}

export function importGame(value) {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch (error) {
      return { ok: false, error: "Файл не является JSON: " + error.message };
    }
  }
  if (candidate && candidate.format === "pocket-grimoire" && candidate.game) candidate = candidate.game;
  if (!candidate || typeof candidate !== "object") {
    return { ok: false, error: "Файл не содержит состояния игры." };
  }
  if (candidate.v === 2) {
    const migrated = migrateV2(candidate);
    const errors = validateState(migrated);
    return errors.length ? { ok: false, error: errors.join(" ") } : { ok: true, state: migrated };
  }
  const errors = validateState(candidate);
  if (errors.length) return { ok: false, error: errors.join(" ") };
  const state = clone(candidate);
  state.storageError = null;
  state.migratedFrom = candidate.migratedFrom || null;
  return { ok: true, state };
}

export function exportGame(state) {
  return JSON.stringify({
    format: "pocket-grimoire",
    version: SCHEMA_VERSION,
    exportedAt: nowIso(),
    warning: "Файл содержит секретные роли, эффекты и заметки Рассказчика.",
    game: state
  }, null, 2);
}
