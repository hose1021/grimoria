import type { Command, GameState } from "../model/types.ts";
import { isSupportedRole } from "../model/rules.ts";
import { clone } from "../model/state.ts";
import { legacyRecord } from "../model/validated.ts";
import { hashString } from "./runtime.ts";

// ---------------------------------------------------------------------------
// Invariants and canonical comparison

export function checkInvariants(state: GameState): string[] {
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
  if (Object.keys(players).length !== order.length)
    errors.push("Игроки не совпадают с порядком мест.");
  for (const [id, player] of Object.entries(players)) {
    if (!player || player.id !== id) errors.push("Некорректный игрок: " + id);
    if (player && player.roleId != null && !scriptRoles.includes(player.roleId)) {
      errors.push("Роль вне сценария: " + id);
    }
    if (player && player.shownRoleId != null && !isSupportedRole(player.shownRoleId)) {
      errors.push("Показанная роль неизвестна: " + id);
    }
    if (player && player.butlerMasterId != null && !players[player.butlerMasterId]) {
      errors.push("Мастер Дворецкого не найден: " + id);
    }
  }

  const seenEffects = new Set();
  for (const effect of state.effects || []) {
    if (!effect || typeof effect.id !== "string") {
      errors.push("Эффект без id.");
      continue;
    }
    if (seenEffects.has(effect.id)) errors.push("Повтор эффекта: " + effect.id);
    seenEffects.add(effect.id);
    if (effect.sourceId != null && !players[effect.sourceId])
      errors.push("Источник эффекта не найден: " + effect.id);
    if (effect.targetId != null && !players[effect.targetId])
      errors.push("Цель эффекта не найдена: " + effect.id);
  }
  for (const death of state.deaths || []) {
    if (!death || !players[death.playerId]) errors.push("Смерть без игрока.");
  }
  for (const execution of state.executions || []) {
    if (!execution || !players[execution.playerId]) errors.push("Казнь без игрока.");
  }
  if (state.day) {
    for (const nomination of state.day.nominations || []) {
      if (!nomination || !players[nomination.nominatorId] || !players[nomination.nomineeId]) {
        errors.push("Номинация ссылается на отсутствующего игрока.");
      }
    }
    for (const death of state.day.morning || []) {
      if (!death || !players[death.playerId]) errors.push("Утренняя смерть без игрока.");
    }
    if (state.day.execution && !players[state.day.execution.playerId])
      errors.push("Казнь без игрока.");
  }
  if (state.setup) {
    const setupRefs = [
      state.setup.grandmotherId,
      state.setup.evilTwinGoodPlayerId,
      state.setup.evilTwinPlayerId,
      state.setup.herringId,
    ];
    if (setupRefs.some((id) => id != null && !players[id]))
      errors.push("Ссылка настройки не найдена.");
  }
  if (
    state.mastermind &&
    typeof state.mastermind.playerId === "string" &&
    !players[state.mastermind.playerId]
  ) {
    errors.push("Кукловод не найден.");
  }

  const keys = new Set();
  for (const step of (state.night && state.night.queue) || []) {
    if (!step || typeof step.key !== "string") {
      errors.push("Ночной шаг без ключа.");
      continue;
    }
    if (keys.has(step.key)) errors.push("Повтор ночного шага: " + step.key);
    keys.add(step.key);
    if (step.actorId != null && !players[step.actorId])
      errors.push("Ночной актёр не найден: " + step.actorId);
  }

  if (state.winner && state.phase !== "over")
    errors.push("Победитель объявлен вне фазы завершения.");
  if (
    state.winner &&
    ((state.night && state.night.queue) || []).some(
      (step) => step.pending && step.pending.kind === "demon-inheritance",
    )
  ) {
    errors.push("Победитель объявлен до выбора наследника Демона.");
  }
  if (state.day && state.day.activeNominationId) {
    const found = (state.day.nominations || []).some(
      (nomination) => nomination.id === state.day.activeNominationId,
    );
    if (!found) errors.push("Активная номинация не найдена.");
  }
  return errors;
}

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

// Domain equality ignores volatile persistence and audit fields. It keeps the
// rule state: phase, players, effects, queue, day, deaths, winner and setup.
export function canonicalState(state: GameState): Record<string, unknown> {
  const copy = { ...state } as Record<string, unknown>;
  delete copy.storageError;
  delete copy.revision;
  delete copy.updatedAt;
  delete copy.createdAt;
  delete copy.applied;
  delete copy.journal;
  delete copy.migratedFrom;
  delete copy.log;
  delete copy.corrections;
  return canonicalize(copy) as Record<string, unknown>;
}

export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

/**
 * Compact persisted identity for one canonical fingerprint. The fingerprint
 * itself stays the execution seed and the journal record; this 128-bit digest
 * is only the idempotency identity stored in `state.applied`.
 */
export function identityOf(fingerprint: string): string {
  let identity = "";
  for (let salt = 0; salt < 4; salt += 1) {
    identity += (hashString(salt + "|" + fingerprint) >>> 0).toString(16).padStart(8, "0");
  }
  return identity;
}

export function fingerprintOf(command: Command, version: string): string {
  return JSON.stringify(
    canonicalize({
      type: command.type,
      payload: command.payload || {},
      rulesetVersion: version,
    }),
  );
}

export function replaceContents(target: object, source: object): void {
  for (const key of Object.keys(target)) delete (target as Record<string, unknown>)[key];
  Object.assign(target, clone(legacyRecord(source)));
}
