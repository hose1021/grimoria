// Trouble Brewing domain: death. No DOM or persistence.
import { isBmrScript, isSnvScript, roleLabel, roleTeam } from "../rules.js";
import { livingPlayers, nowIso, orderedPlayers, playerById } from "../model.js";

import { dayAt, currentAt, addLog } from "./context.js";
import { isImpaired, protectionFor, soldierSafe, mayorRedirects, bmrCannotDie } from "./effects.js";
import { stepKey, demonChangePending } from "./night.js";

const DEMON_REASONS = {
  "demon-dead": "Демон мёртв, и никто не унаследовал его роль.",
  saint: "Святой казнён, и его способность действовала.",
  mayor: "Мэр жив, в городе ровно три игрока и казни не было.",
  "two-alive": "В живых осталось двое.",
  mastermind: "Кукловод продлил игру на один день.",
  vortox: "Вортокс: день закончился без казни.",
  "evil-twin": "Злой Близнец: добрый Близнец казнён."
};

export function kill(state, playerId, cause, at = currentAt(state), extra = {}) {
  const player = playerById(state, playerId);
  if (!player || !player.alive) return null;
  if (isBmrScript(state.script)) {
    const prevented = bmrCannotDie(state, playerId, at, {
      cause: cause === "demon" ? "demon" : extra.demon ? "demon" : cause,
      bypassProtection: extra.bypassProtection === true
    });
    if (prevented) {
      if (prevented === "fool") {
        player.used = player.used || {};
        player.used.fool = true;
      }
      if (prevented === "zombuul") {
        player.used = player.used || {};
        player.used.zombuul = true;
        player.registeredDead = true;
        addLog(state, {
          secret: true,
          kind: "death",
          title: player.name + ": первая смерть Зомбула",
          detail: "Зомбул остаётся жив, но регистрируется как мёртвый.",
          playerId
        });
        checkWin(state);
        return null;
      }
      addLog(state, {
        secret: true,
        kind: "death",
        title: player.name + ": смерть предотвращена",
        detail: "Причина: " + cause + ". Защита: " + prevented + ".",
        playerId
      });
      return null;
    }
  }
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
    return { ok: false, errorCode: "error.32", error: "Здесь нет выбора наследника." };
  }
  const heir = playerById(state, heirId);
  if (!heir || !heir.alive || roleTeam(heir.roleId) !== "minion") {
    return { ok: false, errorCode: "error.33", error: "Наследником может стать только живой Приспешник." };
  }
  becomeDemon(state, heir, "imp", currentAt(state));
  step.pending = null;
  checkWin(state);
  return { ok: true, heir };
}


// Reasons an attack produces no death at all. Shared with the table so the
// host is never asked to resolve a redirection that cannot happen.
export function attackBlockReason(state, { attackerId, targetId, at }) {
  const attacker = playerById(state, attackerId);
  const target = playerById(state, targetId);
  if (!attacker || !target) return "Цель не найдена.";
  if (isImpaired(state, attackerId, at)) return "Демон отравлен или пьян: смерти нет.";
  if (!target.alive) return "Игрок уже мёртв: повторной смерти нет.";
  if (protectionFor(state, targetId, at)) return "Цель защищена Монахом.";
  if (soldierSafe(state, targetId, at)) return "Солдат не может умереть от Демона.";
  return null;
}


// Only a living, unimpaired Mayor who would actually die forces a host choice.
export function attackNeedsRedirect(state, { attackerId, targetId, at = currentAt(state) }) {
  if (!targetId) return false;
  if (attackBlockReason(state, { attackerId, targetId, at })) return false;
  return mayorRedirects(state, targetId, at);
}


export function resolveAttack(state, { attackerId, targetId, at, redirectId = null }) {
  const blocked = attackBlockReason(state, { attackerId, targetId, at });
  if (blocked) return { noDeath: true, reason: blocked };

  let victimId = targetId;
  let redirected = false;
  if (mayorRedirects(state, targetId, at)) {
    if (!redirectId) {
      return {
        needsRedirect: true,
        options: orderedPlayers(state)
          .filter((player) => player.id !== targetId)
          .map((player) => ({ id: player.id, name: player.name, alive: player.alive }))
      };
    }
    if (redirectId !== "none") {
      const victim = playerById(state, redirectId);
      if (!victim || victim.id === targetId) {
        return { noDeath: true, reason: "Перенаправление отменено." };
      }
      // The Storyteller may pick a dead player, a healthy Soldier, or a
      // Monk-protected player. The attack then kills nobody and the Mayor
      // stays alive (official Mayor examples).
      if (!victim.alive) {
        return { noDeath: true, reason: "Перенаправленная цель уже мертва: дополнительной смерти нет." };
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
  if (isBmrScript(state.script) && state.mastermind && state.mastermind.active) return null;
  if (isSnvScript(state.script)) {
    const goodTwin = orderedPlayers(state).find((player) => (
      state.setup.evilTwinGoodId && player.roleId === state.setup.evilTwinGoodId
    ));
    const evilTwin = livingPlayers(state).find((player) => player.roleId === "eviltwin");
    if (state.day && state.day.execution && goodTwin && evilTwin
      && !isImpaired(state, evilTwin.id, dayAt(state))
      && state.day.execution.playerId === goodTwin.id) {
      return setWinner(state, "evil", "evil-twin");
    }
    if (endOfDay && state.day && !state.day.execution) {
      const living = livingPlayers(state);
      if (living.some((player) => (
        player.roleId === "vortox" && !isImpaired(state, player.id, dayAt(state))
      ))) {
        return setWinner(state, "evil", "vortox");
      }
    }
  }
  if (isBmrScript(state.script) && state.day && state.day.execution) {
    const execution = state.day.execution;
    const death = execution.deathId
      ? state.deaths.find((candidate) => candidate.id === execution.deathId)
      : null;
    if (death && !death.fake && roleTeam(death.roleId) === "demon") {
      const mastermind = livingPlayers(state).find((player) => (
        player.roleId === "mastermind" && !isImpaired(state, player.id, dayAt(state))
      ));
      if (mastermind) {
        state.mastermind = {
          active: true,
          extraDay: false,
          triggerDay: state.day.number,
          playerId: mastermind.id
        };
        addLog(state, {
          secret: true,
          kind: "phase",
          title: "Кукловод продлевает игру",
          detail: "Демон казнён, но игра продолжается ещё один день."
        });
        return null;
      }
    }
  }

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
  if (!demon) {
    if (isSnvScript(state.script) && state.setup.evilTwinGoodId) {
      const evilTwin = living.find((player) => player.roleId === "eviltwin");
      const goodTwin = orderedPlayers(state).find((player) => (
        player.roleId === state.setup.evilTwinGoodId
      ));
      if (evilTwin && goodTwin && goodTwin.alive) return null;
    }
    return setWinner(state, "good", "demon-dead");
  }
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

