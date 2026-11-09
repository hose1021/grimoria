// Trouble Brewing domain: corrections. No DOM or persistence.
import { compositionFor, isSnvScript, isSupportedRole, roleLabel, roleTeam } from "../rules.js";
import { nowIso, playerById } from "../model.js";

import { currentAt, addLog } from "./context.js";
import { setupErrors, secretsErrors } from "./setup.js";
import { reconcileNoDashiiPoison } from "./sv.js";

function applyManualCorrection(state, change) {
  const reason = String(change && change.reason || "").trim();
  if (!reason) return { ok: false, errorCode: "error.0", error: "Укажите причину ручной правки." };
  const at = nowIso();
  const player = change.playerId ? playerById(state, change.playerId) : null;
  const record = { at, reason, ...change };
  state.corrections.push(record);

  if (change.kind === "alive") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    const alive = Boolean(change.value);
    if (alive && !player.alive) {
      player.alive = true;
      player.deadAt = null;
      player.voteToken = true;
    } else if (!alive && player.alive) {
      player.alive = false;
      player.deadAt = { phase: state.phase === "day" ? "day" : "night", number: currentAt(state).number, cause: "manual" };
      player.voteToken = true;
    }
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка: " + (alive ? "возвращён" : "отмечен мёртвым"),
      detail: player.name + ". Причина: " + reason,
      playerId: player.id
    });
    return { ok: true };
  }

  if (change.kind === "role") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    const roleId = change.value;
    if (!isSupportedRole(roleId) || !(state.script && state.script.roles.includes(roleId))) {
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
      playerId: player.id
    });
    return { ok: true };
  }

  if (change.kind === "shown") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    if (!isSupportedRole(change.value) && change.value !== null) {
      return { ok: false, errorCode: "error.2", error: "Неизвестная роль." };
    }
    player.shownRoleId = change.value;
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка показанной роли",
      detail: player.name + ". Причина: " + reason,
      playerId: player.id
    });
    return { ok: true };
  }

  if (change.kind === "reminder") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    const text = String(change.value || "").trim();
    if (!text) return { ok: false, errorCode: "error.3", error: "Пустое напоминание." };
    player.reminders = Array.isArray(player.reminders) ? player.reminders : [];
    if (change.remove) {
      player.reminders = player.reminders.filter((item) => item !== text);
    } else if (!player.reminders.includes(text)) {
      player.reminders.push(text);
    }
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка напоминаний",
      detail: player.name + ": " + text + ". Причина: " + reason,
      playerId: player.id
    });
    return { ok: true };
  }

  if (change.kind === "effect") {
    const effect = state.effects.find((item) => item.id === change.effectId);
    if (!effect) return { ok: false, errorCode: "error.4", error: "Эффект не найден." };
    effect.active = Boolean(change.value);
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка эффекта",
      detail: effect.kind + ". Причина: " + reason
    });
    return { ok: true };
  }

  if (change.kind === "clear-winner") {
    state.winner = null;
    state.reviewOpen = false;
    state.publicRevealed = false;
    state.phase = state.day && state.day.number ? "day" : "night";
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Результат партии сброшен",
      detail: "Причина: " + reason
    });
    return { ok: true };
  }

  return { ok: false, errorCode: "error.5", error: "Неизвестный тип правки." };
}


export function manualCorrection(state, change) {
  const result = applyManualCorrection(state, change);
  if (result && result.ok && isSnvScript(state.script)) {
    reconcileNoDashiiPoison(state);
  }
  return result;
}


export function bagSummary(state) {
  return {
    count: state.setup.count,
    required: compositionFor(state.setup.count, state.setup.roles),
    errors: setupErrors(state),
    secrets: secretsErrors(state)
  };
}
