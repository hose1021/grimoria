import type { GameState, RoleId } from "../model/types.ts";

// Trouble Brewing domain: corrections. No DOM or persistence.
import {
  compositionFor,
  isSnvScript,
  isSupportedRole,
  roleLabel,
  roleTeam,
} from "../model/rules.ts";
import { nowIso, playerById, realTeamOf } from "../model/state.ts";

import { currentAt, addLog } from "./context.ts";
import { setupErrors, secretsErrors } from "./setup.ts";
import { systemPorts } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";

import { reconcileNoDashiiPoison, reconcilePhilosopherDrunk } from "./sv.ts";

function applyManualCorrection(state: GameState, change: unknown, ports: CommandExecutionContext) {
  const view = (change !== null && typeof change === "object" ? change : {}) as Record<
    string,
    unknown
  >;
  const reason = String(view.reason || "").trim();
  if (!reason) return { ok: false, errorCode: "error.0", error: "Укажите причину ручной правки." };
  const at = nowIso(ports);
  const player = typeof view.playerId === "string" ? playerById(state, view.playerId) : null;
  const record = { at, reason, ...view };
  const commit = (): { ok: true } => {
    state.corrections.push(record);
    return { ok: true };
  };

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
    addLog(
      state,
      {
        secret: true,
        kind: "correction",
        title: "Ручная правка: " + (alive ? "возвращён" : "отмечен мёртвым"),
        detail: player.name + ". Причина: " + reason,
        playerId: player.id,
      },
      ports,
    );
    return commit();
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
    // A corrected character puts its holder in play, so a Philosopher who had
    // chosen it makes that holder drunk (Philosopher r2421 Summary).
    reconcilePhilosopherDrunk(state);
    addLog(
      state,
      {
        secret: true,
        kind: "correction",
        title: "Ручная правка роли",
        detail: player.name + ": " + roleLabel(roleId) + ". Причина: " + reason,
        playerId: player.id,
      },
      ports,
    );
    return commit();
  }

  if (view.kind === "twin") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    if (!isSnvScript(state.script)) {
      return { ok: false, errorCode: "error.74", error: "Правка Близнецов доступна только в S&V." };
    }
    if (player.roleId !== "eviltwin") {
      return { ok: false, errorCode: "error.75", error: "У игрока нет роли Злого Близнеца." };
    }
    const partner = typeof view.value === "string" ? playerById(state, view.value) : null;
    if (!partner || partner.id === player.id) {
      return { ok: false, errorCode: "error.31", error: "Партнёр не найден." };
    }
    if (realTeamOf(partner) === realTeamOf(player)) {
      return {
        ok: false,
        errorCode: "error.76",
        error: "Партнёр должен быть другого мировоззрения.",
      };
    }
    const good = realTeamOf(player) === "good" ? player : partner;
    const evil = good.id === player.id ? partner : player;
    state.setup.evilTwinGoodPlayerId = good.id;
    state.setup.evilTwinPlayerId = evil.id;
    // A mid-game good holder already has the `eviltwin` character, which is not
    // a legal setup good role; the stored player ids are authoritative then.
    const goodRole = good.roleId;
    if (goodRole && (roleTeam(goodRole) === "townsfolk" || roleTeam(goodRole) === "outsider")) {
      state.setup.evilTwinGoodId = goodRole;
    }
    addLog(
      state,
      {
        secret: true,
        kind: "correction",
        title: "Ручная правка Близнецов",
        detail: player.name + " и " + partner.name + ". Причина: " + reason,
        playerId: player.id,
      },
      ports,
    );
    return commit();
  }

  if (view.kind === "shown") {
    if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
    const shown = typeof view.value === "string" ? (view.value as RoleId) : null;
    if (shown !== null && !isSupportedRole(shown)) {
      return { ok: false, errorCode: "error.2", error: "Неизвестная роль." };
    }
    player.shownRoleId = shown;
    addLog(
      state,
      {
        secret: true,
        kind: "correction",
        title: "Ручная правка показанной роли",
        detail: player.name + ". Причина: " + reason,
        playerId: player.id,
      },
      ports,
    );
    return commit();
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
    addLog(
      state,
      {
        secret: true,
        kind: "correction",
        title: "Ручная правка напоминаний",
        detail: player.name + ": " + text + ". Причина: " + reason,
        playerId: player.id,
      },
      ports,
    );
    return commit();
  }

  if (view.kind === "effect") {
    const effectId = typeof view.effectId === "string" ? view.effectId : "";
    const effect = state.effects.find((item) => item.id === effectId);
    if (!effect) return { ok: false, errorCode: "error.4", error: "Эффект не найден." };
    effect.active = Boolean(view.value);
    addLog(
      state,
      {
        secret: true,
        kind: "correction",
        title: "Ручная правка эффекта",
        detail: effect.kind + ". Причина: " + reason,
      },
      ports,
    );
    return commit();
  }

  if (view.kind === "clear-winner") {
    state.winner = null;
    state.reviewOpen = false;
    state.publicRevealed = false;
    state.phase = state.day && state.day.number ? "day" : "night";
    addLog(
      state,
      {
        secret: true,
        kind: "correction",
        title: "Результат партии сброшен",
        detail: "Причина: " + reason,
      },
      ports,
    );
    return commit();
  }

  return { ok: false, errorCode: "error.5", error: "Неизвестный тип правки." };
}

export function manualCorrection(
  state: GameState,
  change: unknown,
  ports: CommandExecutionContext = systemPorts,
) {
  const result = applyManualCorrection(state, change, ports);
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
