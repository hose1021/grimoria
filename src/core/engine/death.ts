import type {
  Alignment,
  DeadAt,
  Death,
  GameState,
  Player,
  RoleId,
  Winner,
} from "../model/types.ts";

// Trouble Brewing domain: death. No DOM or persistence.
import { isBmrScript, isManualScript, isSnvScript, roleLabel, roleTeam } from "../model/rules.ts";
import {
  livingPlayers,
  nowIso,
  orderedPlayers,
  playerById,
  realTeamOf,
  registersAlive,
} from "../model/state.ts";

import { dayAt, currentAt, addLog } from "./context.ts";
import { idSuffix } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { systemPorts } from "../model/ports.ts";
import { isImpaired, protectionFor, soldierSafe, mayorRedirects, bmrCannotDie } from "./effects.ts";
import { HOST_CHOICE_REASONS } from "./host-choice.ts";

import { demonChangePending } from "./night.ts";
import { minionRetainsAbility } from "./retention.ts";
import { becomeDemon } from "./becoming.ts";
import { resolveDeathCapability } from "./death-ability.ts";
import { resolveWinCapability } from "./win-ability.ts";
import { roleModule } from "../roles/registry.ts";
import type { DeathOutcome } from "../roles/types.ts";

const DEMON_REASONS = {
  "demon-dead": "Демон мёртв, и никто не унаследовал его роль.",
  saint: "Святой казнён, и его способность действовала.",
  mayor: "Мэр жив, в городе ровно три игрока и казни не было.",
  "two-alive": "В живых осталось двое.",
  mastermind: "Кукловод продлил игру на один день.",
  vortox: "Вортокс: день закончился без казни.",
  "evil-twin": "Злой Близнец: добрый Близнец казнён.",
  klutz: "Растяпа выбрал противника, и его команда проигрывает.",
};

export function kill(
  state: GameState,
  playerId: string,
  cause: string,
  at: DeadAt = currentAt(state),
  extra: {
    demon?: boolean;
    bypassProtection?: boolean;
    ability?: string;
    bmr?: string | boolean;
  } = {},
  ports: CommandExecutionContext = systemPorts,
): Death | null {
  const player = playerById(state, playerId);
  if (!player || !player.alive) return null;
  if (!isManualScript(state.script) && isBmrScript(state.script)) {
    const prevented = bmrCannotDie(state, playerId, at, {
      cause: cause === "demon" ? "demon" : extra.demon ? "demon" : cause,
      bypassProtection: extra.bypassProtection === true,
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
        // Zombuul r3022: the first death is replaced, not prevented. The player
        // stays alive but a death is recorded for the day, so "if no-one died
        // today" abilities (the Zombuul's own wake) see it.
        state.deaths.push({
          id: "death-" + (state.deaths.length + 1) + "-" + idSuffix(ports, 4),
          playerId,
          roleId: player.roleId,
          cause,
          phase: at.phase,
          number: at.number,
          at: nowIso(ports),
          impaired: false,
          livingBefore: livingPlayers(state).length,
          zombuul: true,
        });
        addLog(
          state,
          {
            secret: true,
            kind: "death",
            title: player.name + ": первая смерть Зомбула",
            detail: "Зомбул остаётся жив, но регистрируется как мёртвый.",
            playerId,
            consequence: "prevented",
          },
          ports,
        );
        checkWin(state, {}, ports);
        return null;
      }
      addLog(
        state,
        {
          secret: true,
          kind: "death",
          title: player.name + ": смерть предотвращена",
          detail: "Причина: " + cause + ". Защита: " + prevented + ".",
          playerId,
          consequence: "prevented",
        },
        ports,
      );
      return null;
    }
  }
  const livingBefore = livingPlayers(state).length;
  const impaired = isImpaired(state, playerId, at);
  player.alive = false;
  player.deadAt = { phase: at.phase, number: at.number, cause };
  player.voteToken = true;
  const death = {
    id: "death-" + (state.deaths.length + 1) + "-" + idSuffix(ports, 4),
    playerId,
    roleId: player.roleId,
    cause,
    phase: at.phase,
    number: at.number,
    at: nowIso(ports),
    impaired,
    livingBefore,
    ...extra,
  };
  state.deaths.push(death);
  addLog(
    state,
    {
      secret: true,
      kind: "death",
      title: player.name + " погибает",
      detail: "Причина: " + cause + ". Роль: " + roleLabel(player.roleId) + ".",
      playerId,
      consequence: "death",
    },
    ports,
  );
  return death;
}

export function resolveDemonDeath(
  state: GameState,
  {
    playerId,
    roleId,
    cause,
    livingBefore,
    at = currentAt(state),
  }: { playerId: string; roleId: RoleId | null; cause: string; livingBefore: number; at?: DeadAt },
  ports: CommandExecutionContext = systemPorts,
): DeathOutcome {
  const event = { playerId, roleId, cause, at, livingBefore };
  // A role with its own death capability owns succession; every other Demon
  // falls back to the Imp's shared rule.
  return (
    resolveDeathCapability(state, roleModule(roleId ?? ""), event, ports) ??
    resolveDeathCapability(state, roleModule("imp"), event, ports) ?? { inherited: false }
  );
}

export function chooseDemonHeir(
  state: GameState,
  stepKey: string,
  heirId: string,
  ports: CommandExecutionContext = systemPorts,
) {
  const step = state.night.queue.find((candidate) => candidate.key === stepKey);
  if (!step || !step.pending || step.pending.kind !== "demon-inheritance") {
    return { ok: false, errorCode: "error.32", error: "Здесь нет выбора наследника." };
  }
  const heir = playerById(state, heirId);
  if (!heir || !heir.alive || roleTeam(heir.roleId || "") !== "minion") {
    return {
      ok: false,
      errorCode: "error.33",
      error: "Наследником может стать только живой Приспешник.",
    };
  }
  becomeDemon(state, heir, "imp", currentAt(state), ports);
  step.pending = null;
  checkWin(state, {}, ports);
  addLog(
    state,
    {
      secret: true,
      kind: "choice",
      title: HOST_CHOICE_REASONS["demon-heir"],
      detail: heir.name || "Игрок " + heir.seat,
      playerId: heir.id,
      case: "demon-heir",
    },
    ports,
  );
  return { ok: true, heir };
}

// Reasons an attack produces no death at all. Shared with the table so the
// host is never asked to resolve a redirection that cannot happen.
export function attackBlockReason(
  state: GameState,
  { attackerId, targetId, at }: { attackerId: string; targetId: string; at?: DeadAt },
): string | null {
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
export function attackNeedsRedirect(
  state: GameState,
  {
    attackerId,
    targetId,
    at = currentAt(state),
  }: { attackerId: string; targetId: string; at?: DeadAt },
): boolean {
  if (!targetId) return false;
  if (attackBlockReason(state, { attackerId, targetId, at })) return false;
  return mayorRedirects(state, targetId, at);
}

export function resolveAttack(
  state: GameState,
  {
    attackerId,
    targetId,
    at,
    redirectId = null,
  }: { attackerId: string; targetId: string; at: DeadAt; redirectId?: string | null },
  ports: CommandExecutionContext = systemPorts,
) {
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
          .map((player) => ({ id: player.id, name: player.name, alive: player.alive })),
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
        return {
          noDeath: true,
          reason: "Перенаправленная цель уже мертва: дополнительной смерти нет.",
        };
      }
      if (protectionFor(state, victim.id, at) || soldierSafe(state, victim.id, at)) {
        return { noDeath: true, reason: "Перенаправленная смерть предотвращена защитой." };
      }
      victimId = victim.id;
      redirected = true;
    }
  }

  const victim = playerById(state, victimId) as Player;
  const wasDemon = roleTeam(victim.roleId || "") === "demon";
  // Scarlet Woman r3117: "5 or more players alive" excludes a player other
  // abilities see as dead, such as a registered-dead Zombuul.
  const livingBefore = livingPlayers(state).filter(registersAlive).length;
  const selfKill = !redirected && victimId === attackerId;
  const death = kill(state, victimId, selfKill ? "imp-self-kill" : "demon", at, {}, ports);

  let inheritance = null;
  if (wasDemon && death) {
    inheritance = resolveDemonDeath(
      state,
      {
        playerId: victimId,
        roleId: victim.roleId,
        cause: death.cause,
        livingBefore,
        at,
      },
      ports,
    );
  }

  return {
    noDeath: false,
    deathId: victimId,
    redirected,
    wasDemon,
    inheritance,
    pendingInheritance:
      inheritance && inheritance.pendingInheritance ? inheritance.pendingInheritance : null,
  };
}

// The Evil Twin pair is the two players the Storyteller chose, stored as ids at
// the deal or by the `twin` correction: it never follows a character, so
// swapping the two twins keeps the pair. The ability holder is the player
// currently holding the `eviltwin` character (it may be either pair member),
// and it must be alive and unimpaired. The execution is resolved before its
// death: the holder may be the player being executed (the two twins swapped
// characters). An unchosen pair or one without such a holder has no ability.
// Legacy saves without the ids are resolved once at import.
export function evilTwinPair(
  state: GameState,
  { executingId = null }: { executingId?: string | null } = {},
): { good: Player; evil: Player } | null {
  const good =
    typeof state.setup.evilTwinGoodPlayerId === "string"
      ? playerById(state, state.setup.evilTwinGoodPlayerId)
      : null;
  const evil =
    typeof state.setup.evilTwinPlayerId === "string"
      ? playerById(state, state.setup.evilTwinPlayerId)
      : null;
  if (!good || !evil || good.id === evil.id) return null;
  if (realTeamOf(good) !== "good" || realTeamOf(evil) !== "evil") return null;
  const holder = orderedPlayers(state).find((player) => player.roleId === "eviltwin") || null;
  // A Minion killed by the Vigormortis keeps its ability, including the Evil
  // Twin's execution win (r3015).
  if (
    !holder ||
    (!holder.alive && holder.id !== executingId && !minionRetainsAbility(state, holder.id))
  ) {
    return null;
  }
  if (holder.id !== good.id && holder.id !== evil.id) return null;
  if (isImpaired(state, holder.id, currentAt(state))) return null;
  return { good, evil };
}

// A living Evil Twin holder without a stored pair naming it means the
// Storyteller has not chosen the opposing player yet. The night cannot be
// resolved on an inferred pair, so `endNight` refuses to close it.
export function evilTwinHolder(state: GameState): Player | null {
  return (
    orderedPlayers(state).find(
      (player) =>
        player.roleId === "eviltwin" && (player.alive || minionRetainsAbility(state, player.id)),
    ) || null
  );
}

export function evilTwinPartnerMissing(state: GameState): boolean {
  const holder = evilTwinHolder(state);
  if (!holder) return false;
  const good =
    typeof state.setup.evilTwinGoodPlayerId === "string"
      ? playerById(state, state.setup.evilTwinGoodPlayerId)
      : null;
  const evil =
    typeof state.setup.evilTwinPlayerId === "string"
      ? playerById(state, state.setup.evilTwinPlayerId)
      : null;
  if (!good || !evil || good.id === evil.id) return true;
  if (realTeamOf(good) !== "good" || realTeamOf(evil) !== "evil") return true;
  return holder.id !== good.id && holder.id !== evil.id;
}

export function checkWin(
  state: GameState,
  { endOfDay = false }: { endOfDay?: boolean } = {},
  ports: CommandExecutionContext = systemPorts,
): Winner | null {
  if (state.winner) return state.winner;
  // Manual-only games never claim an automatic rule outcome. The host declares
  // the winner after resolving the roles at the table.
  if (isManualScript(state.script)) return null;
  if (demonChangePending(state)) return null;
  if (isBmrScript(state.script) && state.mastermind && state.mastermind.active) return null;
  if (isSnvScript(state.script)) {
    // "If the good player is executed, evil wins." Alignment decides: the good
    // twin is the stored pair member, even after a character change. The pair is
    // null while the Evil Twin character has no living, unimpaired holder inside
    // the pair; the execution resolves before its own death.
    const twins = evilTwinPair(state, {
      executingId: state.day && state.day.execution ? state.day.execution.playerId : null,
    });
    if (
      state.day &&
      state.day.execution &&
      twins &&
      realTeamOf(twins.good) === "good" &&
      state.day.execution.playerId === twins.good.id
    ) {
      return setWinner(state, "evil", "evil-twin", ports);
    }
    if (endOfDay && state.day && !state.day.execution) {
      const living = livingPlayers(state);
      if (
        living.some(
          (player) => player.roleId === "vortox" && !isImpaired(state, player.id, dayAt(state)),
        )
      ) {
        return setWinner(state, "evil", "vortox", ports);
      }
    }
  }
  if (isBmrScript(state.script) && state.day && state.day.execution) {
    const execution = state.day.execution;
    const death = execution.deathId
      ? state.deaths.find((candidate) => candidate.id === execution.deathId)
      : null;
    if (death && !death.fake && roleTeam(death.roleId || "") === "demon") {
      const mastermind = livingPlayers(state).find(
        (player) => player.roleId === "mastermind" && !isImpaired(state, player.id, dayAt(state)),
      );
      if (mastermind) {
        state.mastermind = {
          active: true,
          extraDay: false,
          triggerDay: state.day.number,
          playerId: mastermind.id,
        };
        addLog(
          state,
          {
            secret: true,
            kind: "phase",
            title: "Кукловод продлевает игру",
            detail: "Демон казнён, но игра продолжается ещё один день.",
          },
          ports,
        );
        return null;
      }
    }
  }

  const dayExecution =
    state.deaths.find(
      (death) =>
        death.cause === "execution" &&
        death.phase === "day" &&
        (!state.day || death.number === state.day.number),
    ) || null;
  const win = resolveWinCapability(state, roleModule(dayExecution?.roleId ?? ""), dayExecution);
  if (win && win.kind === "win") return setWinner(state, win.team, win.reason, ports);

  const living = livingPlayers(state);
  // States r1039 and Mayor r2995: execution is distinct from death, including
  // an execution of an already dead player.
  if (endOfDay && state.day && !state.day.execution && living.length === 3) {
    const mayor = living.find((player) => mayorRedirects(state, player.id, dayAt(state)));
    if (mayor) return setWinner(state, "good", "mayor", ports);
  }

  const demon = living.find((player) => roleTeam(player.roleId || "") === "demon");
  if (!demon) {
    const twins = isSnvScript(state.script) ? evilTwinPair(state) : null;
    if (twins && twins.evil.alive && twins.good.alive) return null;
    return setWinner(state, "good", "demon-dead", ports);
  }
  if (living.length <= 2) return setWinner(state, "evil", "two-alive", ports);
  return null;
}

export function setWinner(
  state: GameState,
  team: Alignment,
  reason: string,
  ports: CommandExecutionContext = systemPorts,
): Winner {
  state.winner = {
    team,
    reason,
    title: team === "good" ? "Победа добра" : "Победа зла",
    detail: (DEMON_REASONS as Record<string, string>)[reason] || "",
    at: nowIso(ports),
  };
  state.phase = "over";
  state.reviewOpen = false;
  addLog(
    state,
    {
      kind: "winner",
      title: state.winner.title || "",
      detail: state.winner.detail || "",
    },
    ports,
  );
  return state.winner;
}

// ---------------------------------------------------------------------------
// Night end and day
