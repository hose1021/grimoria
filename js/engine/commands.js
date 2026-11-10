// Command API: the only path for game-state changes.
//
// A command expresses intent: { id, type, payload, at?, rulesetVersion? }.
// An event describes a fact that happened: { id, type, commandId, ... }.
// An id is bound to a canonical fingerprint of type, payload and
// rulesetVersion; reusing it with different content is a conflict. Execution
// uses a seeded PRNG and a controlled clock. Preview captures the timestamp
// once per id, fingerprint and initial state; Apply reuses it (`command.at`
// pins it explicitly), so both agree for the same initial state.
//
// Every command runs on a draft. A rejected command or a failed invariant
// check discards the draft, so the real state is never partially changed.
// A successful command is recorded in `state.applied` by command id, so a
// repeated apply is a no-op. Event derivation is the domain diff used by
// preview and by the future replay log.
import {
  clone, createGame, importGame as importState, playerById,
  realTeamOf, setRoster, withClock
} from "../model.js";
import {
  isMixedEdition, isSupportedRole, requiredBluffs, roleTeam
} from "../rules.js";

import { completeStep, endNight, skipStep, startNight } from "./night.js";
import {
  cancelNomination, endDay, execute, executeByDecision, gossipStatement,
  moonchildChoice, nominate, openNominations, recordVirginNomination,
  recordVotes, recoverClaim, resetVotes, useSlayer
} from "./day.js";
import { autoSecrets, claimSeat, dealGame } from "./setup.js";
import { manualCorrection } from "./corrections.js";
import { recordBmrOutcome, resurrectPlayer } from "./bmr.js";
import { recordSvOutcome } from "./sv.js";
import { chooseDemonHeir, setWinner } from "./death.js";

export const RULESET_VERSION = "tb-bmr-snv-2026-11-10";
export const SUPPORTED_RULESET_VERSIONS = new Set([RULESET_VERSION]);
export const COMMAND_STATUS = {
  ALLOWED: "allowed",
  REJECTED: "rejected",
  CHOICE: "requires-storyteller-choice"
};

export function newCommandId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "cmd-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Command handlers

function commandResult(raw) {
  if (!raw || typeof raw !== "object") return { ok: true, result: raw || null };
  if (raw.ok === false) {
    if (raw.needsChoice) {
      return {
        status: COMMAND_STATUS.CHOICE,
        choice: {
          kind: "info",
          options: (raw.info && raw.info.options) || [],
          context: raw.info || null
        },
        errorCode: raw.errorCode || null,
        reason: raw.error || "Требуется решение ведущего."
      };
    }
    if (raw.needsRedirect) {
      return {
        status: COMMAND_STATUS.CHOICE,
        choice: { kind: "redirect", options: raw.options || [], context: raw },
        errorCode: raw.errorCode || null,
        reason: raw.error || "Выберите перенаправление."
      };
    }
    if (raw.needsSetup) {
      return {
        status: COMMAND_STATUS.CHOICE,
        choice: {
          kind: "setup",
          options: (raw.info && raw.info.options) || [],
          context: raw.info || null
        },
        errorCode: raw.errorCode || null,
        reason: raw.error || "Сначала настройте секретную информацию."
      };
    }
    return {
      ok: false,
      errorCode: raw.errorCode || null,
      error: raw.error || "Команда отклонена.",
      errors: Array.isArray(raw.errors) ? raw.errors : null
    };
  }
  return { ok: true, result: raw };
}

function finish(raw) {
  const normalized = commandResult(raw);
  if (normalized.status === COMMAND_STATUS.CHOICE) return normalized;
  if (normalized.ok === false) return normalized;
  const result = normalized.result;
  const followUp = result && result.pendingInheritance
    ? { type: "chooseDemonHeir", options: result.pendingInheritance.options || [], context: result.pendingInheritance }
    : null;
  return { ok: true, result, followUp };
}

function completeNightStep(state, payload = {}) {
  const step = state.night.queue.find((candidate) => candidate.key === payload.key);
  if (!step) return { ok: false, errorCode: "error.36", error: "Шаг не найден." };
  const result = completeStep(state, payload.key, {
    targetIds: payload.targetIds || [],
    redirectId: payload.redirectId || null,
    registrations: payload.registrations || {},
    given: payload.given || null,
    resurrectId: payload.resurrectId || null,
    roleId: payload.roleId || null,
    drunkId: payload.drunkId || null
  });
  if (!result || result.ok === false) return result;
  if (step.bmr || step.sv) {
    const deathIds = payload.deathIds || [];
    if (deathIds.length || payload.resurrectId) {
      const outcome = step.sv
        ? recordSvOutcome(state, step.key, { deathIds })
        : recordBmrOutcome(state, step.key, {
          deathIds,
          resurrectId: payload.resurrectId || null
        });
      if (!outcome.ok) return outcome;
    }
  }
  return result;
}

const INFO_ROLES = new Set(["washerwoman", "librarian", "investigator"]);

function normalizeScript(script) {
  if (!script || typeof script !== "object") return { ok: false, error: "Некорректный сценарий." };
  if (typeof script.id !== "string" || !script.id) return { ok: false, error: "У сценария нет id." };
  if (typeof script.name !== "string" || !script.name) return { ok: false, error: "У сценария нет названия." };
  if (!Array.isArray(script.roles)) {
    return { ok: false, error: "В сценарии нет списка ролей." };
  }
  if (!script.roles.length && script.edition !== "custom") {
    return { ok: false, error: "В сценарии нет ролей." };
  }
  const unique = [];
  for (const id of script.roles) {
    if (typeof id !== "string" || !isSupportedRole(id) || roleTeam(id) === "traveller") {
      return { ok: false, error: "Неподдерживаемая роль в сценарии: " + id };
    }
    if (!unique.includes(id)) unique.push(id);
  }
  return {
    ok: true,
    script: {
      id: script.id.slice(0, 80),
      name: script.name.slice(0, 80),
      edition: script.edition || "custom",
      source: script.source || "manual",
      author: String(script.author || "").slice(0, 80),
      roles: unique,
      manualOnly: typeof script.manualOnly === "boolean" ? script.manualOnly : isMixedEdition(unique)
    }
  };
}

function normalizeBag(state) {
  const roles = state.setup.roles || [];
  const scriptRoles = (state.script && state.script.roles) || [];

  if (!roles.includes("godfather")) state.setup.godfatherOutsider = 1;
  else if (![1, -1].includes(state.setup.godfatherOutsider)) state.setup.godfatherOutsider = 1;

  if (!roles.includes("eviltwin")) {
    state.setup.evilTwinGoodId = null;
  } else {
    const good = roles.filter((id) => (
      id !== "eviltwin" && (roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider")
    ));
    if (!good.includes(state.setup.evilTwinGoodId)) state.setup.evilTwinGoodId = good[0] || null;
  }

  if (!roles.includes("lunatic")) {
    state.setup.lunaticShownId = null;
  } else {
    const demons = scriptRoles.filter((id) => roleTeam(id) === "demon");
    const inPlay = roles.find((id) => roleTeam(id) === "demon");
    if (!demons.includes(state.setup.lunaticShownId)) {
      state.setup.lunaticShownId = inPlay || demons[0] || null;
    }
  }

  if (!roles.includes("drunk")) {
    state.setup.drunkShownId = null;
  } else {
    const current = state.setup.drunkShownId;
    const valid = current && scriptRoles.includes(current)
      && roleTeam(current) === "townsfolk" && !roles.includes(current);
    if (!valid) {
      const unused = scriptRoles.filter((id) => roleTeam(id) === "townsfolk" && !roles.includes(id));
      state.setup.drunkShownId = unused[0] || null;
    }
  }

  const needed = requiredBluffs(state.setup.count);
  if (!needed) {
    state.setup.bluffs = [];
  } else {
    const seen = new Set();
    state.setup.bluffs = (Array.isArray(state.setup.bluffs) ? state.setup.bluffs : []).filter((id) => {
      if (!id || seen.has(id) || roles.includes(id) || id === state.setup.drunkShownId) return false;
      if (!scriptRoles.includes(id)) return false;
      seen.add(id);
      return true;
    }).slice(0, 3);
  }
}

function resetGameForSetup(state) {
  state.night = { number: 0, queue: [], currentIndex: 0, demonChanged: false };
  state.day = {
    number: 0, morning: [], nominations: [], activeNominationId: null,
    execution: null, ended: false, open: false
  };
  state.deaths = [];
  state.executions = [];
  state.effects = [];
  state.corrections = [];
  state.gossip = null;
  state.mastermind = null;
  state.fangguJumped = false;
  state.winner = null;
  state.reviewOpen = false;
  state.publicRevealed = false;
  state.bluffs = [];
  state.herringId = null;
  state.setup.ready = false;
  state.log = [];
}

function bagUpdate(state, payload = {}) {
  const patch = payload.patch || {};
  if (patch.script) {
    const normalized = normalizeScript(patch.script);
    if (!normalized.ok) return normalized;
    state.script = normalized.script;
    state.scriptId = normalized.script.id;
  }

  const count = patch.count != null ? Number(patch.count) : state.setup.count;
  if (!Number.isInteger(count) || count < 5 || count > 15) {
    return { ok: false, errorCode: "error.bag-count", error: "Игроков должно быть от 5 до 15." };
  }

  if (patch.resetRoster) {
    setRoster(state, count);
    resetGameForSetup(state);
    state.phase = patch.phase || "setup";
  } else if (patch.count != null) {
    setRoster(state, count);
    resetGameForSetup(state);
  } else if (patch.phase) {
    state.phase = patch.phase;
  }

  const scriptRoles = (state.script && state.script.roles) || [];
  if (patch.roles != null) {
    if (!Array.isArray(patch.roles)) return { ok: false, error: "Некорректный список ролей." };
    for (const id of patch.roles) {
      if (!isSupportedRole(id) || !scriptRoles.includes(id)) {
        return { ok: false, error: "Роль не входит в сценарий: " + id };
      }
    }
    state.setup.roles = patch.roles.slice();
  }
  if (patch.bluffs != null) {
    if (!Array.isArray(patch.bluffs)) return { ok: false, error: "Некорректный список блефов." };
    for (const id of patch.bluffs) {
      if (!isSupportedRole(id) || !scriptRoles.includes(id)) {
        return { ok: false, error: "Блеф не входит в сценарий: " + id };
      }
    }
    state.setup.bluffs = patch.bluffs.slice();
  }
  if (patch.drunkShownId !== undefined) state.setup.drunkShownId = patch.drunkShownId;
  if (patch.lunaticShownId !== undefined) state.setup.lunaticShownId = patch.lunaticShownId;
  if (patch.godfatherOutsider !== undefined) state.setup.godfatherOutsider = patch.godfatherOutsider;
  if (patch.evilTwinGoodId !== undefined) state.setup.evilTwinGoodId = patch.evilTwinGoodId;

  normalizeBag(state);
  return { ok: true };
}

function setOrder(state, payload = {}) {
  const order = Array.isArray(payload.order) ? payload.order.map(String) : null;
  if (!order) return { ok: false, error: "Некорректный порядок мест." };
  const ids = Object.keys(state.players);
  if (order.length !== ids.length || new Set(order).size !== order.length
    || order.some((id) => !state.players[id])) {
    return { ok: false, error: "Порядок мест должен содержать каждого игрока один раз." };
  }
  state.order = order;
  if (state.phase === "deal") state.phase = "seat";
  return { ok: true };
}

function setHerring(state, payload = {}) {
  if (payload.playerId == null || payload.playerId === "") {
    state.setup.herringId = null;
    return { ok: true };
  }
  const player = playerById(state, payload.playerId);
  if (!player) return { ok: false, error: "Игрок не найден." };
  if (realTeamOf(player) !== "good") return { ok: false, error: "Красная селёдка должна быть добрым игроком." };
  state.setup.herringId = player.id;
  return { ok: true };
}

function setupInfo(state, payload = {}) {
  const roleId = payload.roleId;
  if (!INFO_ROLES.has(roleId)) return { ok: false, error: "Неизвестная информационная роль." };
  const patch = payload.info;
  if (!patch || typeof patch !== "object") return { ok: false, error: "Некорректная информация." };
  if (patch.zero === true) {
    state.setup.info[roleId] = { zero: true, pair: [] };
    return { ok: true };
  }
  const current = state.setup.info[roleId] || { roleId: "", pair: ["", ""] };
  const next = { ...current, pair: current.pair || ["", ""], ...patch };
  if (roleId === "librarian" && next.zero) {
    state.setup.info[roleId] = { zero: true, pair: [] };
    return { ok: true };
  }
  state.setup.info[roleId] = next;
  return { ok: true };
}

function normalizeSecrets(state) {
  const players = Object.values(state.players || {});
  const has = (roleId) => players.some((player) => player.roleId === roleId);
  if (has("librarian") && !players.some((player) => roleTeam(player.roleId) === "outsider")) {
    state.setup.info.librarian = { zero: true, pair: [] };
  }
  return { ok: true };
}

function setNotes(state, payload = {}) {
  state.notes = String(payload.notes || "");
  return { ok: true };
}

function setReviewOpen(state, payload = {}) {
  state.reviewOpen = Boolean(payload.open);
  return { ok: true };
}

function newGame(state, payload = {}) {
  const count = payload.count == null ? 8 : Number(payload.count);
  if (!Number.isInteger(count) || count < 5 || count > 15) {
    return { ok: false, error: "Игроков должно быть от 5 до 15." };
  }
  replaceContents(state, createGame(count));
  return { ok: true };
}

function importGame(state, payload = {}) {
  const imported = importState(String(payload.text == null ? "" : payload.text));
  if (!imported.ok) return { ok: false, error: imported.error };
  replaceContents(state, imported.state);
  return { ok: true };
}

const COMMANDS = {
  startNight: { apply: (state) => startNight(state) },
  completeStep: { apply: (state, payload = {}) => completeStep(state, payload.key, payload.options || {}) },
  completeNightStep: { apply: (state, payload = {}) => completeNightStep(state, payload) },
  endNight: { apply: (state) => endNight(state) },
  skipStep: { apply: (state, payload = {}) => skipStep(state, payload.key, payload.reason) },
  chooseDemonHeir: { apply: (state, payload = {}) => chooseDemonHeir(state, payload.stepKey, payload.heirId) },
  openNominations: { apply: (state) => openNominations(state) },
  nominate: { apply: (state, payload = {}) => nominate(state, payload.nominatorId, payload.nomineeId, payload.options || {}) },
  recordVirginNomination: { apply: (state, payload = {}) => recordVirginNomination(state, payload.nominatorId, payload.virginId, payload.options || {}) },
  recordVotes: { apply: (state, payload = {}) => recordVotes(state, payload.nominationId, payload.voterIds) },
  cancelNomination: { apply: (state, payload = {}) => cancelNomination(state, payload.nominationId) },
  resetVotes: { apply: (state, payload = {}) => resetVotes(state, payload.nominationId, payload.reason) },
  execute: { apply: (state, payload = {}) => execute(state, payload.nominationId, payload.options || {}) },
  executeByDecision: { apply: (state, payload = {}) => executeByDecision(state, payload.playerId, payload.options || {}) },
  endDay: { apply: (state) => endDay(state) },
  useSlayer: { apply: (state, payload = {}) => useSlayer(state, payload.slayerId, payload.targetId, payload.options || {}) },
  gossipStatement: { apply: (state, payload = {}) => gossipStatement(state, Boolean(payload.truth)) },
  moonchildChoice: { apply: (state, payload = {}) => moonchildChoice(state, payload.targetId) },
  recoverClaim: { apply: (state, payload = {}) => recoverClaim(state, payload.playerId, payload.reason) },
  dealGame: { apply: (state, payload = {}) => dealGame(state, payload.options || {}) },
  claimSeat: { apply: (state, payload = {}) => claimSeat(state, payload.playerId, payload.name) },
  autoSecrets: { apply: (state, payload = {}) => autoSecrets(state, payload.options || {}) },
  manualCorrection: { apply: (state, payload = {}) => manualCorrection(state, payload.change) },
  recordBmrOutcome: { apply: (state, payload = {}) => recordBmrOutcome(state, payload.stepKey, payload.options || {}) },
  recordSvOutcome: { apply: (state, payload = {}) => recordSvOutcome(state, payload.stepKey, payload.options || {}) },
  resurrectPlayer: { apply: (state, payload = {}) => {
    const player = resurrectPlayer(state, payload.playerId);
    return player ? { ok: true, playerId: player.id } : { ok: false, error: "Игрок не может вернуться." };
  } },
  setWinner: { apply: (state, payload = {}) => setWinner(state, payload.team, payload.reason) },
  bagUpdate: { apply: (state, payload = {}) => bagUpdate(state, payload) },
  setOrder: { apply: (state, payload = {}) => setOrder(state, payload) },
  setHerring: { apply: (state, payload = {}) => setHerring(state, payload) },
  setSetupInfo: { apply: (state, payload = {}) => setupInfo(state, payload) },
  setSetupInfoZero: { apply: (state, payload = {}) => setupInfo(state, { roleId: payload.roleId, info: { zero: true, pair: [] } }) },
  normalizeSecrets: { apply: (state) => normalizeSecrets(state), undoable: false, record: false },
  setNotes: { apply: (state, payload = {}) => setNotes(state, payload), undoable: false, record: false },
  setReviewOpen: { apply: (state, payload = {}) => setReviewOpen(state, payload), undoable: false, record: false },
  newGame: { apply: (state, payload = {}) => newGame(state, payload), resetHistory: true },
  importGame: { apply: (state, payload = {}) => importGame(state, payload) }
};

// ---------------------------------------------------------------------------
// Invariants and canonical comparison

export function checkInvariants(state) {
  const errors = [];
  if (!state || typeof state !== "object") return ["Состояние отсутствует."];
  const players = state.players || {};
  const order = state.order || [];
  const scriptRoles = (state.script && state.script.roles) || [];

  if (!["setup", "deal", "seat", "night", "day", "over"].includes(state.phase)) {
    errors.push("Неизвестная фаза: " + state.phase);
  }
  if (new Set(order).size !== order.length) errors.push("Порядок мест содержит повторы.");
  for (const id of order) if (!players[id]) errors.push("Место без игрока: " + id);
  if (Object.keys(players).length !== order.length) errors.push("Игроки не совпадают с порядком мест.");
  for (const [id, player] of Object.entries(players)) {
    if (!player || player.id !== id) errors.push("Некорректный игрок: " + id);
    if (player && player.roleId != null && !scriptRoles.includes(player.roleId)) {
      errors.push("Роль вне сценария: " + id);
    }
    if (player && player.shownRoleId != null && !isSupportedRole(player.shownRoleId)) {
      errors.push("Показанная роль неизвестна: " + id);
    }
  }

  const seenEffects = new Set();
  for (const effect of state.effects || []) {
    if (!effect || typeof effect.id !== "string") { errors.push("Эффект без id."); continue; }
    if (seenEffects.has(effect.id)) errors.push("Повтор эффекта: " + effect.id);
    seenEffects.add(effect.id);
    if (effect.sourceId != null && !players[effect.sourceId]) errors.push("Источник эффекта не найден: " + effect.id);
    if (effect.targetId != null && !players[effect.targetId]) errors.push("Цель эффекта не найдена: " + effect.id);
  }
  for (const death of state.deaths || []) {
    if (!death || !players[death.playerId]) errors.push("Смерть без игрока.");
  }
  for (const execution of state.executions || []) {
    if (!execution || !players[execution.playerId]) errors.push("Казнь без игрока.");
  }

  const keys = new Set();
  for (const step of (state.night && state.night.queue) || []) {
    if (!step || typeof step.key !== "string") { errors.push("Ночной шаг без ключа."); continue; }
    if (keys.has(step.key)) errors.push("Повтор ночного шага: " + step.key);
    keys.add(step.key);
    if (step.actorId != null && !players[step.actorId]) errors.push("Ночной актёр не найден: " + step.actorId);
  }

  if (state.winner && state.phase !== "over") errors.push("Победитель объявлен вне фазы завершения.");
  if (state.winner && ((state.night && state.night.queue) || []).some((step) => (
    step.pending && step.pending.kind === "demon-inheritance"
  ))) {
    errors.push("Победитель объявлен до выбора наследника Демона.");
  }
  if (state.day && state.day.activeNominationId) {
    const found = (state.day.nominations || []).some((nomination) => nomination.id === state.day.activeNominationId);
    if (!found) errors.push("Активная номинация не найдена.");
  }
  return errors;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

// Domain equality ignores volatile persistence and audit fields. It keeps the
// rule state: phase, players, effects, queue, day, deaths, winner and setup.
export function canonicalState(state) {
  const copy = { ...state };
  delete copy.storageError;
  delete copy.revision;
  delete copy.updatedAt;
  delete copy.createdAt;
  delete copy.applied;
  delete copy.migratedFrom;
  delete copy.log;
  delete copy.corrections;
  return canonicalize(copy);
}

function sameValue(a, b) {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

function fingerprintOf(command, version) {
  return JSON.stringify(canonicalize({
    type: command.type,
    payload: command.payload == null ? {} : command.payload,
    rulesetVersion: version
  }));
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value |= 0;
    value = (value + 0x6D2B79F5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withDeterminism(seedText, at, fn) {
  const original = Math.random;
  Math.random = seededRandom(hashString(seedText));
  try {
    return withClock(at, fn);
  } finally {
    Math.random = original;
  }
}

// Capture the command timestamp once per (id, fingerprint, initial state).
// Preview and Apply for the same command then share the same clock.
// ponytail: bounded in-memory cache; PR-02B persists event time in the log.
const previewTimestamps = new Map();
const PREVIEW_TIMESTAMP_LIMIT = 100;

function timestampKey(command, fingerprint, state) {
  return command.id + "|" + fingerprint + "|" + hashString(JSON.stringify(canonicalState(state)));
}

function resolveTimestamp(command, fingerprint, state, capture) {
  if (command.at != null) return new Date(command.at);
  const key = timestampKey(command, fingerprint, state);
  const saved = previewTimestamps.get(key);
  if (saved) return new Date(saved);
  const now = new Date();
  if (capture) {
    previewTimestamps.set(key, now.toISOString());
    if (previewTimestamps.size > PREVIEW_TIMESTAMP_LIMIT) {
      previewTimestamps.delete(previewTimestamps.keys().next().value);
    }
  }
  return now;
}

// ---------------------------------------------------------------------------
// Domain events

function eventSink(command, at) {
  const events = [];
  const push = (type, payload) => {
    events.push({
      id: command.id + ":" + (events.length + 1),
      type,
      commandId: command.id,
      commandType: command.type,
      at,
      phase: null,
      payload: payload || {}
    });
  };
  return { events, push };
}

function deriveEvents(before, after, command, at) {
  const sink = eventSink(command, at);
  const push = sink.push;
  const inPhase = (event) => {
    event.phase = before.phase;
    return event;
  };

  const beforePlayers = before.players || {};
  const afterPlayers = after.players || {};
  for (const id of new Set([...Object.keys(beforePlayers), ...Object.keys(afterPlayers)])) {
    const a = beforePlayers[id];
    const b = afterPlayers[id];
    if (!a || !b) {
      push(a ? "player.removed" : "player.added", { playerId: id });
      continue;
    }
    if (a.alive !== b.alive) push("player.alive_changed", { playerId: id, alive: b.alive, cause: b.deadAt && b.deadAt.cause });
    if (a.roleId !== b.roleId) push("player.role_changed", { playerId: id, from: a.roleId, to: b.roleId });
    if (a.shownRoleId !== b.shownRoleId) push("player.shown_role_changed", { playerId: id, from: a.shownRoleId, to: b.shownRoleId });
    if (a.team !== b.team) push("player.team_changed", { playerId: id, from: a.team, to: b.team });
    if (a.registeredDead !== b.registeredDead) push("player.registered_dead_changed", { playerId: id, registeredDead: Boolean(b.registeredDead) });
    if (a.voteToken !== b.voteToken) push("player.vote_token_changed", { playerId: id, voteToken: b.voteToken });
    if (a.butlerMasterId !== b.butlerMasterId) push("player.butler_master_changed", { playerId: id, masterId: b.butlerMasterId || null });
    if (!sameValue(a.used || {}, b.used || {})) push("player.used_changed", { playerId: id, used: b.used || {} });
    if (!sameValue(a.reminders || [], b.reminders || [])) push("player.reminders_changed", { playerId: id, reminders: b.reminders || [] });
    if (!sameValue(a.deadAt || null, b.deadAt || null)) push("player.dead_at_changed", { playerId: id, deadAt: b.deadAt || null });
  }

  const beforeEffects = new Map((before.effects || []).map((effect) => [effect.id, effect]));
  const afterEffects = new Map((after.effects || []).map((effect) => [effect.id, effect]));
  for (const id of new Set([...beforeEffects.keys(), ...afterEffects.keys()])) {
    const a = beforeEffects.get(id);
    const b = afterEffects.get(id);
    if (!a) push("effect.added", { effect: b });
    else if (!b) push("effect.removed", { effect: a });
    else {
      if (a.active !== b.active) push("effect.active_changed", { effectId: id, active: b.active });
      if (!sameValue(a.expires || null, b.expires || null) || a.kind !== b.kind) {
        push("effect.updated", { effectId: id, effect: b });
      }
    }
  }

  const beforeDeaths = new Set((before.deaths || []).map((death) => death.id));
  for (const death of after.deaths || []) {
    if (!beforeDeaths.has(death.id)) push("death.recorded", { death });
  }
  const beforeExecutions = new Set((before.executions || []).map((execution) => execution.at + ":" + execution.playerId));
  for (const execution of after.executions || []) {
    if (!beforeExecutions.has(execution.at + ":" + execution.playerId)) push("execution.recorded", { execution });
  }

  const beforeNominations = new Map((before.day && before.day.nominations || []).map((nomination) => [nomination.id, nomination]));
  const afterNominations = new Map((after.day && after.day.nominations || []).map((nomination) => [nomination.id, nomination]));
  for (const id of new Set([...beforeNominations.keys(), ...afterNominations.keys()])) {
    const a = beforeNominations.get(id);
    const b = afterNominations.get(id);
    if (!a) push("nomination.added", { nomination: b });
    else if (!b) push("nomination.cancelled", { nominationId: id });
    else if (!sameValue(a.votes || [], b.votes || []) || a.count !== b.count) {
      push("votes.recorded", { nominationId: id, count: b.count, threshold: b.threshold, votes: b.votes });
    }
  }

  const beforeSteps = new Map(((before.night && before.night.queue) || []).map((step) => [step.key, step]));
  const afterSteps = new Map(((after.night && after.night.queue) || []).map((step) => [step.key, step]));
  for (const key of new Set([...beforeSteps.keys(), ...afterSteps.keys()])) {
    const a = beforeSteps.get(key);
    const b = afterSteps.get(key);
    if (!a) push("step.added", { step: b });
    else if (!b) push("step.removed", { stepKey: key });
    else {
      if (!a.done && b.done && !a.skipped && b.skipped) push("step.skipped", { stepKey: key, roleId: b.roleId || null });
      if (!a.done && b.done && !b.skipped) push("step.completed", { stepKey: key, roleId: b.roleId || null });
      if (!sameValue(a.targetIds || [], b.targetIds || [])
        || !sameValue(a.given || null, b.given || null)
        || !sameValue(a.pending || null, b.pending || null)
        || a.note !== b.note) {
        push("step.updated", { stepKey: key, roleId: b.roleId || null });
      }
    }
  }

  if (before.phase !== after.phase) push("phase.changed", { from: before.phase, to: after.phase });
  if (!before.winner && after.winner) push("winner.declared", { winner: after.winner });
  if (before.winner && !after.winner) push("winner.cleared", {});
  if (!sameValue(before.script || null, after.script || null) || before.scriptId !== after.scriptId) {
    push("script.changed", { scriptId: after.scriptId });
  }
  if (!sameValue(before.order || [], after.order || [])) push("order.changed", { order: after.order || [] });
  if (!sameValue(before.setup || null, after.setup || null)) push("setup.changed", { setup: after.setup });
  if (before.notes !== after.notes) push("notes.changed", { notes: after.notes });
  if (before.reviewOpen !== after.reviewOpen) push("review.changed", { open: after.reviewOpen });

  for (const event of sink.events) {
    if (event.phase === null) inPhase(event);
  }
  return sink.events;
}

function summarize(before, after, events) {
  const deaths = (after.deaths || []).filter((death) => (
    !(before.deaths || []).some((old) => old.id === death.id)
  ));
  const phase = before.phase !== after.phase ? { from: before.phase, to: after.phase } : null;
  return {
    events: events.length,
    deaths: deaths.map((death) => death.playerId),
    phase,
    winner: after.winner ? { team: after.winner.team, reason: after.winner.reason } : null,
    effects: {
      added: (after.effects || []).filter((effect) => (
        !(before.effects || []).some((old) => old.id === effect.id)
      )).map((effect) => effect.id),
      deactivated: (after.effects || []).filter((effect) => (
        effect.active === false && (before.effects || []).some((old) => old.id === effect.id && old.active !== false)
      )).map((effect) => effect.id)
    },
    queue: {
      added: ((after.night && after.night.queue) || []).filter((step) => (
        !((before.night && before.night.queue) || []).some((old) => old.key === step.key)
      )).map((step) => step.key),
      completed: ((after.night && after.night.queue) || []).filter((step) => (
        step.done && !step.skipped && !((before.night && before.night.queue) || []).some((old) => old.key === step.key && old.done)
      )).map((step) => step.key),
      skipped: ((after.night && after.night.queue) || []).filter((step) => (
        step.skipped && !((before.night && before.night.queue) || []).some((old) => old.key === step.key && old.skipped)
      )).map((step) => step.key)
    }
  };
}

function futureOf(after, followUp) {
  const effects = (after.effects || []).filter((effect) => effect.active !== false);
  const queue = (after.night && after.night.queue) || [];
  return {
    phase: after.phase,
    winner: after.winner ? { team: after.winner.team, reason: after.winner.reason } : null,
    followUp: followUp || null,
    pendingSteps: queue.filter((step) => !step.done && !step.skipped).map((step) => ({
      key: step.key,
      roleId: step.roleId || null,
      system: step.system || null,
      actorId: step.actorId || null
    })),
    activeEffects: effects.map((effect) => ({
      id: effect.id,
      kind: effect.kind,
      sourceId: effect.sourceId,
      targetId: effect.targetId,
      expires: effect.expires || null,
      resolve: effect.resolve || null
    })),
    delayedEffects: effects.filter((effect) => effect.expires || effect.resolve).map((effect) => ({
      id: effect.id,
      kind: effect.kind,
      targetId: effect.targetId,
      expires: effect.expires || null,
      resolve: effect.resolve || null
    })),
    pendingInheritance: queue.find((step) => step.pending && step.pending.kind === "demon-inheritance") || null
  };
}

// ---------------------------------------------------------------------------
// Public API

function commandVersion(command) {
  return command.rulesetVersion == null ? RULESET_VERSION : String(command.rulesetVersion);
}

function normalizeCommand(command) {
  if (!command || typeof command !== "object") return { ok: false, error: "Команда отсутствует." };
  if (typeof command.id !== "string" || !command.id.trim()) {
    return { ok: false, errorCode: "command-missing-id", error: "У команды нет id." };
  }
  if (typeof command.type !== "string" || !COMMANDS[command.type]) {
    return { ok: false, errorCode: "command-unknown", error: "Неизвестная команда: " + command.type };
  }
  if (command.payload != null && typeof command.payload !== "object") {
    return { ok: false, errorCode: "command-payload", error: "Некорректные данные команды." };
  }
  const version = commandVersion(command);
  if (!SUPPORTED_RULESET_VERSIONS.has(version)) {
    return {
      ok: false,
      errorCode: "ruleset-version-unsupported",
      error: "Версия правил не поддерживается: " + version
    };
  }
  if (command.at != null) {
    const at = new Date(command.at);
    if (Number.isNaN(at.getTime())) {
      return { ok: false, errorCode: "command-at", error: "Некорректная отметка времени команды." };
    }
  }
  return { ok: true, version };
}

function rejected(command, reason, extra = {}) {
  return {
    status: COMMAND_STATUS.REJECTED,
    id: command && command.id || null,
    type: command && command.type || null,
    reason,
    ...extra
  };
}

function runDraft(state, command, fingerprint, at) {
  const draft = clone(state);
  const entry = COMMANDS[command.type];
  const atIso = at.toISOString();
  const seedText = command.id + "|" + fingerprint + "|" + hashString(JSON.stringify(canonicalState(state)));
  let outcome;
  try {
    outcome = withDeterminism(seedText, at, () => finish(entry.apply(draft, command.payload || {})));
  } catch (error) {
    return {
      outcome: { ok: false, error: "Команда завершилась ошибкой: " + (error.message || String(error)) },
      draft,
      at: atIso
    };
  }
  if (!outcome.ok) {
    if (outcome.status === COMMAND_STATUS.CHOICE) {
      return {
        outcome: {
          status: COMMAND_STATUS.CHOICE,
          id: command.id,
          type: command.type,
          choice: outcome.choice,
          errorCode: outcome.errorCode || null,
          reason: outcome.reason
        },
        draft,
        at: atIso
      };
    }
    return {
      outcome: rejected(command, outcome.error || "Команда отклонена.", {
        errorCode: outcome.errorCode || null,
        errors: outcome.errors || null
      }),
      draft,
      at: atIso
    };
  }
  const violations = checkInvariants(draft);
  if (violations.length) {
    return {
      outcome: rejected(command, "Нарушены инварианты состояния.", { errorCode: "invariant-violation", errors: violations }),
      draft: state,
      at: atIso
    };
  }
  return { outcome: { ok: true, result: outcome.result, followUp: outcome.followUp || null }, draft, at: atIso };
}

export function validateCommand(state, command) {
  const normalized = normalizeCommand(command);
  if (!normalized.ok) return rejected(command, normalized.error, { errorCode: normalized.errorCode });
  const fingerprint = fingerprintOf(command, normalized.version);
  const stored = state.applied && state.applied[command.id];
  if (stored) {
    const same = stored.fingerprint
      ? stored.fingerprint === fingerprint
      : stored.type === command.type;
    if (!same) {
      return rejected(command, "Id команды уже использован для другого действия.", { errorCode: "command-id-conflict" });
    }
    return { status: COMMAND_STATUS.ALLOWED, id: command.id, type: command.type, idempotent: true };
  }
  const at = resolveTimestamp(command, fingerprint, state, false);
  const { outcome } = runDraft(state, command, fingerprint, at);
  if (outcome.ok) {
    return {
      status: COMMAND_STATUS.ALLOWED,
      id: command.id,
      type: command.type,
      result: outcome.result || null,
      followUp: outcome.followUp || null
    };
  }
  if (outcome.status === COMMAND_STATUS.CHOICE) return outcome;
  return outcome;
}

export function previewCommand(state, command) {
  const normalized = normalizeCommand(command);
  if (!normalized.ok) return rejected(command, normalized.error, { errorCode: normalized.errorCode });
  const fingerprint = fingerprintOf(command, normalized.version);
  const stored = state.applied && state.applied[command.id];
  if (stored) {
    const same = stored.fingerprint
      ? stored.fingerprint === fingerprint
      : stored.type === command.type;
    if (!same) {
      return rejected(command, "Id команды уже использован для другого действия.", { errorCode: "command-id-conflict" });
    }
    return {
      status: COMMAND_STATUS.ALLOWED,
      id: command.id,
      type: command.type,
      idempotent: true,
      at: stored.at || null,
      events: [],
      changes: null,
      future: futureOf(state, stored.followUp || null)
    };
  }
  const at = resolveTimestamp(command, fingerprint, state, true);
  const { outcome, draft } = runDraft(state, command, fingerprint, at);
  if (!outcome.ok) {
    if (outcome.status === COMMAND_STATUS.CHOICE) return outcome;
    return outcome;
  }
  const events = deriveEvents(state, draft, command, at.toISOString());
  return {
    status: COMMAND_STATUS.ALLOWED,
    id: command.id,
    type: command.type,
    at: at.toISOString(),
    result: outcome.result || null,
    followUp: outcome.followUp || null,
    events,
    changes: summarize(state, draft, events),
    future: futureOf(draft, outcome.followUp || null)
  };
}

export function applyCommand(state, command) {
  const normalized = normalizeCommand(command);
  if (!normalized.ok) return rejected(command, normalized.error, { errorCode: normalized.errorCode });
  const fingerprint = fingerprintOf(command, normalized.version);
  const stored = state.applied && state.applied[command.id];
  if (stored) {
    const same = stored.fingerprint
      ? stored.fingerprint === fingerprint
      : stored.type === command.type;
    if (!same) {
      return rejected(command, "Id команды уже использован для другого действия.", { errorCode: "command-id-conflict" });
    }
    return {
      status: COMMAND_STATUS.ALLOWED,
      id: command.id,
      type: command.type,
      idempotent: true,
      at: stored.at || null,
      events: [],
      result: stored.result || null,
      followUp: stored.followUp || null,
      undoable: stored.undoable !== false
    };
  }

  const at = resolveTimestamp(command, fingerprint, state, false);
  const { outcome, draft } = runDraft(state, command, fingerprint, at);
  if (!outcome.ok) {
    if (outcome.status === COMMAND_STATUS.CHOICE) return outcome;
    return outcome;
  }

  const events = deriveEvents(state, draft, command, at.toISOString());
  const changes = summarize(state, draft, events);
  const entry = COMMANDS[command.type];
  const undoable = entry.undoable !== false;
  replaceContents(state, draft);
  state.applied = state.applied || {};
  if (entry.record !== false) {
    state.applied[command.id] = {
      type: command.type,
      at: at.toISOString(),
      rulesetVersion: normalized.version,
      fingerprint,
      followUp: outcome.followUp || null,
      result: null,
      undoable
    };
  }
  return {
    status: COMMAND_STATUS.ALLOWED,
    id: command.id,
    type: command.type,
    at: at.toISOString(),
    result: outcome.result || null,
    followUp: outcome.followUp || null,
    events,
    changes,
    undoable,
    resetHistory: Boolean(entry.resetHistory)
  };
}

function replaceContents(target, source) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, clone(source));
}
