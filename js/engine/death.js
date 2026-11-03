// Trouble Brewing domain: death. No DOM or persistence.
import { roleLabel, roleTeam } from "../rules.js";
import { livingPlayers, nowIso, playerById } from "../model.js";

import { dayAt, currentAt, addLog } from "./context.js";
import { isImpaired, protectionFor, soldierSafe, mayorRedirects } from "./effects.js";
import { stepKey, demonChangePending } from "./night.js";

const DEMON_REASONS = {
  "demon-dead": "Демон мёртв, и никто не унаследовал его роль.",
  saint: "Святой казнён, и его способность действовала.",
  mayor: "Мэр жив, в городе ровно три игрока и казни не было.",
  "two-alive": "В живых осталось двое."
};

export function kill(state, playerId, cause, at = currentAt(state), extra = {}) {
  const player = playerById(state, playerId);
  if (!player || !player.alive) return null;
  const livingBefore = livingPlayers(state).length;
  const impaired = isImpaired(state, playerId, at);
  player.alive = false;
  player.deadAt = { phase: at.phase, number: at.number, cause };
  player.voteToken = true;
  const death = {
    id: "death-" + (state.deaths.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
    playerId,
    roleId: player.roleId,
    cause,
    phase: at.phase,
    number: at.number,
    at: nowIso(),
    impaired,
    livingBefore,
    ...extra
  };
  state.deaths.push(death);
  addLog(state, {
    secret: true,
    kind: "death",
    title: player.name + " погибает",
    detail: "Причина: " + cause + ". Роль: " + roleLabel(player.roleId) + ".",
    playerId
  });
  return death;
}


export function becomeDemon(state, player, via, at = currentAt(state)) {
  const previous = player.roleId;
  player.changedFrom = previous;
  player.roleId = "imp";
  player.shownRoleId = "imp";
  player.team = "evil";
  for (const step of state.night.queue) {
    if (step.done || step.skipped) continue;
    if (step.actorId !== player.id) continue;
    if (!step.roleId || step.roleId === "imp") continue;
    step.done = true;
    step.skipped = true;
    step.note = "Роль изменилась до шага: теперь это Демон.";
  }
  player.reminders = Array.isArray(player.reminders) ? player.reminders : [];
  if (!player.reminders.includes("Демон")) player.reminders.push("Демон");
  state.night.demonChanged = true;
  addLog(state, {
    secret: true,
    kind: "role-change",
    title: "Новый Демон: " + player.name,
    detail: via === "scarletwoman"
      ? "Алая женщина становится Демоном. Порог живых соблюдён."
      : "Приспешник получает роль Демона после самоубийства Чёрта.",
    playerId: player.id
  });
  return player;
}


export function resolveDemonDeath(state, { cause, livingBefore, at = currentAt(state) }) {
  const living = livingPlayers(state);
  const scarlet = living.find((player) => (
    player.roleId === "scarletwoman" && !isImpaired(state, player.id, at)
  ));
  if (scarlet && livingBefore >= 5) {
    becomeDemon(state, scarlet, "scarletwoman", at);
    return { inherited: true, playerId: scarlet.id, via: "scarletwoman" };
  }

  if (cause === "imp-self-kill") {
    const minions = living.filter((player) => roleTeam(player.roleId) === "minion");
    if (minions.length === 1) {
      becomeDemon(state, minions[0], "imp", at);
      return { inherited: true, playerId: minions[0].id, via: "imp" };
    }
    if (minions.length > 1) {
      return {
        inherited: false,
        pendingInheritance: {
          kind: "demon-inheritance",
          options: minions.map((player) => ({ id: player.id, name: player.name, roleId: player.roleId }))
        }
      };
    }
  }
  return { inherited: false };
}


export function chooseDemonHeir(state, stepKey, heirId) {
  const step = state.night.queue.find((candidate) => candidate.key === stepKey);
  if (!step || !step.pending || step.pending.kind !== "demon-inheritance") {
    return { ok: false, error: "Здесь нет выбора наследника." };
  }
  const heir = playerById(state, heirId);
  if (!heir || !heir.alive || roleTeam(heir.roleId) !== "minion") {
    return { ok: false, error: "Наследником может стать только живой Приспешник." };
  }
  becomeDemon(state, heir, "imp", currentAt(state));
  step.pending = null;
  checkWin(state);
  return { ok: true, heir };
}


export function resolveAttack(state, { attackerId, targetId, at, redirectId = null }) {
  const attacker = playerById(state, attackerId);
  const target = playerById(state, targetId);
  if (!attacker || !target) return { noDeath: true, reason: "Цель не найдена." };
  if (isImpaired(state, attackerId, at)) {
    return { noDeath: true, reason: "Демон отравлен или пьян: смерти нет." };
  }
  if (!target.alive) {
    return { noDeath: true, reason: "Игрок уже мёртв: повторной смерти нет." };
  }
  if (protectionFor(state, targetId, at)) {
    return { noDeath: true, reason: "Цель защищена Монахом." };
  }
  if (soldierSafe(state, targetId, at)) {
    return { noDeath: true, reason: "Солдат не может умереть от Демона." };
  }

  let victimId = targetId;
  let redirected = false;
  if (mayorRedirects(state, targetId, at)) {
    if (!redirectId) {
      return {
        needsRedirect: true,
        options: livingPlayers(state)
          .filter((player) => player.id !== targetId)
          .map((player) => ({ id: player.id, name: player.name }))
      };
    }
    if (redirectId !== "none") {
      const victim = playerById(state, redirectId);
      if (!victim || !victim.alive || victim.id === targetId) {
        return { noDeath: true, reason: "Перенаправление отменено." };
      }
      if (protectionFor(state, victim.id, at) || soldierSafe(state, victim.id, at)) {
        return { noDeath: true, reason: "Перенаправленная смерть предотвращена защитой." };
      }
      victimId = victim.id;
      redirected = true;
    }
  }

  const victim = playerById(state, victimId);
  const wasDemon = roleTeam(victim.roleId) === "demon";
  const livingBefore = livingPlayers(state).length;
  const selfKill = victimId === attackerId;
  const death = kill(state, victimId, selfKill ? "imp-self-kill" : "demon", at);

  let inheritance = null;
  if (wasDemon && death) {
    inheritance = resolveDemonDeath(state, {
      cause: death.cause,
      livingBefore,
      at
    });
  }

  return {
    noDeath: false,
    deathId: victimId,
    redirected,
    wasDemon,
    inheritance,
    pendingInheritance: inheritance && inheritance.pendingInheritance
      ? inheritance.pendingInheritance
      : null
  };
}


export function checkWin(state, { endOfDay = false } = {}) {
  if (state.winner) return state.winner;
  if (demonChangePending(state)) return null;

  const saintDeath = state.deaths.find((death) => (
    death.cause === "execution"
    && !death.impaired
    && death.roleId === "saint"
  ));
  if (saintDeath) return setWinner(state, "evil", "saint");

  const living = livingPlayers(state);
  if (endOfDay && state.day && !state.day.execution && living.length === 3) {
    const mayor = living.find((player) => mayorRedirects(state, player.id, dayAt(state)));
    if (mayor) return setWinner(state, "good", "mayor");
  }

  const demon = living.find((player) => roleTeam(player.roleId) === "demon");
  if (!demon) return setWinner(state, "good", "demon-dead");
  if (living.length <= 2) return setWinner(state, "evil", "two-alive");
  return null;
}


export function setWinner(state, team, reason) {
  state.winner = {
    team,
    reason,
    title: team === "good" ? "Победа добра" : "Победа зла",
    detail: DEMON_REASONS[reason] || "",
    at: nowIso()
  };
  state.phase = "over";
  state.reviewOpen = false;
  addLog(state, {
    kind: "winner",
    title: state.winner.title,
    detail: state.winner.detail
  });
  return state.winner;
}

// ---------------------------------------------------------------------------
// Night end and day

