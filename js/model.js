// Game state schema v4. Pure functions: no DOM, no localStorage.
import { ALL_ROLES, BMR_ALL, SNV_ALL, SUPPORTED_ROLES, isSupportedRole, isTbRole, roleTeam } from "./rules.js";
import { troubleBrewingScript } from "./scripts.js";

export const SCHEMA_VERSION = 4;
export const STORAGE_KEY = "pg.game.v4";
export const LEGACY_KEY = "pg.game.v3";
export const LEGACY_V2_KEY = "pg.game.v2";

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
    script: troubleBrewingScript(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    phase: "setup",
    setup: {
      count: size,
      roles: [],
      bluffs: [],
      drunkShownId: null,
      lunaticShownId: null,
      godfatherOutsider: 1,
      grandmotherId: null,
      evilTwinGoodId: null,
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
    gossip: null,
    mastermind: null,
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
  state.setup.lunaticShownId = null;
  state.setup.godfatherOutsider = 1;
  state.setup.grandmotherId = null;
  state.setup.evilTwinGoodId = null;
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
  state.gossip = null;
  state.mastermind = null;
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
  const living = livingPlayers(state).filter((player) => !player.registeredDead).length;
  const announced = (state.day && state.day.morning ? state.day.morning : [])
    .map((death) => death.playerId);
  const registered = orderedPlayers(state)
    .filter((player) => player.registeredDead)
    .map((player) => player.id);
  const deathNames = [...new Set([...announced, ...registered])]
    .map((id) => seatName(state, id))
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

export function migrateV3(old) {
  const state = clone(old);
  state.v = SCHEMA_VERSION;
  state.scriptId = "tb";
  state.script = troubleBrewingScript();
  state.migratedFrom = "v3";
  return state;
}

export function validateState(value) {
  const errors = [];
  const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const check = (ok, message) => { if (!ok) errors.push(message); };
  if (!object(value)) return ["Invalid game object."];
  check(value.v === SCHEMA_VERSION, "Unsupported schema version.");
  check(["setup", "deal", "seat", "night", "day", "over"].includes(value.phase), "Invalid phase.");
  const script = object(value.script) ? value.script : null;
  const scriptRoles = script && Array.isArray(script.roles) ? script.roles : [];
  check(script !== null, "Missing script.");
  if (script) {
    check(typeof script.id === "string" && script.id.length > 0, "Invalid script ID.");
    check(value.scriptId === script.id, "Script mismatch.");
    check(typeof script.name === "string" && script.name.trim().length > 0, "Invalid script name.");
    check(["tb", "bmr", "snv", "custom"].includes(script.edition), "Invalid script edition.");
    check(script.source === undefined || typeof script.source === "string", "Invalid script source.");
    check(script.author === undefined || typeof script.author === "string", "Invalid script author.");
    check(scriptRoles.length >= 5 && scriptRoles.length <= SUPPORTED_ROLES.length, "Invalid script roster.");
    check(new Set(scriptRoles).size === scriptRoles.length, "Duplicate script roles.");
    for (const roleId of scriptRoles) check(isSupportedRole(roleId), "Unsupported script role: " + roleId);
    if (script.id === "tb") {
      check(script.edition === "tb", "Invalid Trouble Brewing edition.");
      check(scriptRoles.length === ALL_ROLES.length && ALL_ROLES.every((id) => scriptRoles.includes(id)), "Invalid Trouble Brewing roster.");
    } else if (script.id === "bmr") {
      check(script.edition === "bmr", "Invalid Bad Moon Rising edition.");
      check(scriptRoles.length === BMR_ALL.length && BMR_ALL.every((id) => scriptRoles.includes(id)), "Invalid Bad Moon Rising roster.");
    } else if (script.id === "snv") {
      check(script.edition === "snv", "Invalid Sects and Violets edition.");
      check(scriptRoles.length === SNV_ALL.length && SNV_ALL.every((id) => scriptRoles.includes(id)), "Invalid Sects and Violets roster.");
    } else {
      check(script.id.startsWith("custom-"), "Invalid custom script ID.");
      check(script.edition === "custom", "Invalid custom script edition.");
      const fromTb = scriptRoles.every((id) => ALL_ROLES.includes(id));
      const fromBmr = scriptRoles.every((id) => BMR_ALL.includes(id));
      const fromSnv = scriptRoles.every((id) => SNV_ALL.includes(id));
      check(fromTb || fromBmr || fromSnv, "Custom scripts cannot mix editions.");
    }
  }
  const inScript = (id) => typeof id === "string" && isSupportedRole(id) && scriptRoles.includes(id);
  const players = object(value.players) ? value.players : {};
  const order = Array.isArray(value.order) ? value.order : [];
  const ref = (id) => typeof id === "string" && Object.hasOwn(players, id);
  check(object(value.players), "Missing players.");
  check(order.length >= 5 && order.length <= 15 && new Set(order).size === order.length, "Invalid seat order.");
  check(Object.keys(players).length === order.length, "Roster does not match seats.");
  for (const id of order) check(ref(id), "Unknown seat: " + id);
  for (const [id, player] of Object.entries(players)) {
    if (!object(player)) { errors.push("Invalid player: " + id); continue; }
    check(player.id === id && order.includes(id), "Invalid player ID: " + id);
    check(Number.isInteger(player.seat) && player.seat === order.indexOf(id) + 1, "Invalid seat: " + id);
    check(typeof player.name === "string" && typeof player.notes === "string", "Invalid player text: " + id);
    for (const key of ["alive", "claimed", "voteToken"]) check(typeof player[key] === "boolean", "Invalid " + key + ": " + id);
    check(player.registeredDead === undefined || typeof player.registeredDead === "boolean", "Invalid registered death: " + id);
    check(Array.isArray(player.reminders) && player.reminders.every((r) => typeof r === "string"), "Invalid reminders: " + id);
    check(object(player.used), "Invalid used abilities: " + id);
    for (const key of ["roleId", "shownRoleId"]) {
      check(player[key] === null || inScript(player[key]), "Invalid role: " + id);
    }
    check(player.butlerMasterId == null || ref(player.butlerMasterId), "Invalid Butler master.");
  }
  for (const key of ["log", "deaths", "executions", "effects", "corrections"]) {
    check(Array.isArray(value[key]) && value[key].every(object), "Invalid " + key + ".");
  }
  check(typeof value.notes === "string" && object(value.applied), "Invalid notes or action ledger.");
  check(value.gossip == null || object(value.gossip), "Invalid gossip.");
  check(value.mastermind == null || object(value.mastermind), "Invalid Mastermind state.");
  check(Array.isArray(value.bluffs) && value.bluffs.every(inScript), "Invalid bluffs.");
  const setup = value.setup;
  if (!object(setup)) errors.push("Missing setup.");
  else {
    check(setup.count === order.length, "Invalid player count.");
    for (const key of ["roles", "bluffs"]) check(Array.isArray(setup[key]) && setup[key].every(inScript), "Invalid setup " + key + ".");
    check(object(setup.info), "Invalid setup information.");
    if (object(setup.info)) for (const info of Object.values(setup.info)) {
      check(info === null || (object(info) && Array.isArray(info.pair) && info.pair.every(ref)), "Invalid information pair.");
    }
    check(setup.herringId == null || ref(setup.herringId), "Invalid red herring.");
    check(setup.drunkShownId == null || inScript(setup.drunkShownId), "Invalid Drunk mask.");
    check(setup.lunaticShownId == null || inScript(setup.lunaticShownId), "Invalid Lunatic mask.");
    check(setup.godfatherOutsider == null || [1, -1].includes(setup.godfatherOutsider), "Invalid Godfather setup.");
    check(setup.grandmotherId == null || ref(setup.grandmotherId), "Invalid grandchild.");
    check(setup.evilTwinGoodId == null || inScript(setup.evilTwinGoodId), "Invalid Evil Twin twin.");
  }
  const night = value.night;
  if (!object(night)) errors.push("Missing night.");
  else {
    check(Number.isInteger(night.number) && night.number >= 0, "Invalid night number.");
    check(Array.isArray(night.queue), "Invalid night queue.");
    if (Array.isArray(night.queue)) {
      check(Number.isInteger(night.currentIndex) && night.currentIndex >= 0 && night.currentIndex <= night.queue.length, "Invalid night position.");
      const keys = new Set();
      for (const step of night.queue) {
        if (!object(step)) { errors.push("Invalid night step."); continue; }
        check(typeof step.key === "string" && !keys.has(step.key), "Invalid step key."); keys.add(step.key);
        check(step.actorId == null || ref(step.actorId), "Unknown night actor.");
        check(step.roleId == null || inScript(step.roleId), "Unknown night role.");
      }
    }
  }
  const day = value.day;
  if (!object(day)) errors.push("Missing day.");
  else {
    check(Number.isInteger(day.number) && day.number >= 0, "Invalid day number.");
    for (const key of ["morning", "nominations"]) check(Array.isArray(day[key]) && day[key].every(object), "Invalid day " + key + ".");
    check(typeof day.open === "boolean" && typeof day.ended === "boolean", "Invalid day status.");
    check(day.execution === null || (object(day.execution) && ref(day.execution.playerId)), "Invalid execution.");
    if (Array.isArray(day.morning)) for (const death of day.morning) check(object(death) && ref(death.playerId), "Invalid morning death.");
  }
  for (const key of ["deaths", "executions"]) if (Array.isArray(value[key])) {
    for (const event of value[key]) check(object(event) && ref(event.playerId), "Unknown " + key + " player.");
  }
  if (Array.isArray(value.effects)) for (const effect of value.effects) {
    check(object(effect) && ref(effect.sourceId) && ref(effect.targetId) && typeof effect.active === "boolean", "Invalid effect.");
  }
  check(value.winner === null || (object(value.winner) && ["good", "evil"].includes(value.winner.team)), "Invalid winner.");
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
  if (candidate.v === 2 || candidate.v === 3) {
    try {
      const migrated = candidate.v === 2 ? migrateV2(candidate) : migrateV3(candidate);
      const errors = validateState(migrated);
      return errors.length ? { ok: false, error: errors.join(" ") } : { ok: true, state: migrated };
    } catch (error) {
      return { ok: false, error: "Invalid legacy save: " + error.message };
    }
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
