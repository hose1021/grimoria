import type { GameState, RoleId } from "../model/types.ts";

// Trouble Brewing domain: corrections. No DOM or persistence.
import {
  compositionFor,
  isSnvScript,
  isSupportedRole,
  roleLabel,
  roleTeam,
} from "../model/rules.ts";
import { nowIso, playerById } from "../model/state.ts";

import { currentAt, addLog } from "./context.ts";
import { setupErrors, secretsErrors } from "./setup.ts";

import { reconcileNoDashiiPoison } from "./sv.ts";

function applyManualCorrection(state: GameState, change: unknown) {
  const view = (change !== null && typeof change === "object" ? change : {}) as Record<
    string,
    unknown
  >;
  const reason = String(view.reason || "").trim();
  if (!reason) return { ok: false, errorCode: "error.0", error: "Укажите причину ручной правки." };
  const at = nowIso();
  const player = typeof view.playerId === "string" ? playerById(state, view.playerId) : null;
  const record = { at, reason, ...view };
  state.corrections.push(record);

  if (view.kind === "alive") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    const alive = Boolean(view.value);
    if (alive && !player.alive) {
      player.alive = true;
      player.deadAt = null;
      player.voteToken = true;
    } else if (!alive && player.alive) {
      player.alive = false;
      player.deadAt = {
        phase: state.phase === "day" ? "day" : "night",
        number: currentAt(state).number,
        cause: "manual",
      };
      player.voteToken = true;
    }
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка: " + (alive ? "возвращён" : "отмечен мёртвым"),
      detail: player.name + ". Причина: " + reason,
      playerId: player.id,
    });
    return { ok: true };
  }

  if (view.kind === "role") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    const roleId = (typeof view.value === "string" ? view.value : "") as RoleId;
    if (
      !roleId ||
      !isSupportedRole(roleId) ||
      !(state.script && state.script.roles.includes(roleId))
    ) {
      return { ok: false, errorCode: "error.2", error: "Неизвестная роль." };
    }
    player.changedFrom = player.roleId;
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка роли",
      detail: player.name + ": " + roleLabel(roleId) + ". Причина: " + reason,
      playerId: player.id,
    });
    return { ok: true };
  }

  if (view.kind === "shown") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    const shown = typeof view.value === "string" ? (view.value as RoleId) : null;
    if (shown !== null && !isSupportedRole(shown)) {
      return { ok: false, errorCode: "error.2", error: "Неизвестная роль." };
    }
    player.shownRoleId = shown;
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка показанной роли",
      detail: player.name + ". Причина: " + reason,
      playerId: player.id,
    });
    return { ok: true };
  }

  if (view.kind === "reminder") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    const text = String(view.value || "").trim();
    if (!text) return { ok: false, errorCode: "error.3", error: "Пустое напоминание." };
    player.reminders = Array.isArray(player.reminders) ? player.reminders : [];
    if (view.remove) {
      player.reminders = player.reminders.filter((item) => item !== text);
    } else if (!player.reminders.includes(text)) {
      player.reminders.push(text);
    }
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка напоминаний",
      detail: player.name + ": " + text + ". Причина: " + reason,
      playerId: player.id,
    });
    return { ok: true };
  }

  if (view.kind === "effect") {
    const effectId = typeof view.effectId === "string" ? view.effectId : "";
    const effect = state.effects.find((item) => item.id === effectId);
    if (!effect) return { ok: false, errorCode: "error.4", error: "Эффект не найден." };
    effect.active = Boolean(view.value);
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка эффекта",
      detail: effect.kind + ". Причина: " + reason,
    });
    return { ok: true };
  }

  if (view.kind === "clear-winner") {
    state.winner = null;
    state.reviewOpen = false;
    state.publicRevealed = false;
    state.phase = state.day && state.day.number ? "day" : "night";
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Результат партии сброшен",
      detail: "Причина: " + reason,
    });
    return { ok: true };
  }

  return { ok: false, errorCode: "error.5", error: "Неизвестный тип правки." };
}

export function manualCorrection(state: GameState, change: unknown) {
  const result = applyManualCorrection(state, change);
  if (result && result.ok && isSnvScript(state.script)) {
    reconcileNoDashiiPoison(state);
  }
  return result;
}

export function bagSummary(state: GameState) {
  return {
    count: state.setup.count,
    required: compositionFor(state.setup.count, state.setup.roles),
    errors: setupErrors(state),
    secrets: secretsErrors(state),
  };
}
