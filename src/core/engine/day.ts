import type {
  ArtistAnswer,
  DeadAt,
  GameState,
  JugglerGuess,
  Player,
  RoleId,
  SavantTruth,
} from "../model/types.ts";

type DayOptions = {
  spyRegistersTownsfolk?: boolean;
  recluseRegistersDemon?: boolean;
  survives?: boolean;
  cause?: string;
};

// Trouble Brewing domain: day. No DOM or persistence.
import {
  isBmrScript,
  isManualScript,
  isSnvScript,
  isSupportedRole,
  roleTeam,
} from "../model/rules.ts";
import {
  effectiveRoleId,
  hasAbility,
  hasTrueAbility,
  livingPlayers,
  nowIso,
  orderedPlayers,
  playerById,
  realTeamOf,
  registersAlive,
  seatOf,
} from "../model/state.ts";

import { executionThreshold, dayAt, currentAt, addLog } from "./context.ts";
import { recordHostChoice } from "./host-choice.ts";
import { lifecycleGuard } from "./lifecycle.ts";
import { idSuffix } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { systemPorts } from "../model/ports.ts";
import { effectActive, isImpaired, butlerMaster } from "./effects.ts";
import { appendConditionalSteps, buildNightQueue } from "./night.ts";
import { repeatsDemonWake } from "./command-versions.ts";
import {
  MADNESS_PENALTIES,
  activeMadness,
  madnessEffects,
  madnessReviewsDue,
  reconcileNoDashiiPoison,
  vortoxFalsifies,
} from "./sv.ts";
import { kill, resolveDemonDeath, checkWin, setWinner } from "./death.ts";
import { applyDayCapability, resolveExecutionCapability } from "./ability.ts";
import { roleModule } from "../roles/registry.ts";
import type { DayContext } from "../roles/ability.ts";
import type { Death } from "../model/types.ts";
import type { DeathOutcome } from "../roles/types.ts";

export function openNominations(state: GameState, ports: CommandExecutionContext = systemPorts) {
  const guard = lifecycleGuard(state, "openNominations");
  if (guard) return guard;
  if (state.day.ended) return { ok: false, errorCode: "error.8", error: "День уже завершён." };
  state.day.open = true;
  addLog(
    state,
    {
      kind: "phase",
      title: "Номинации открыты",
      detail: "Номинировать может только живой игрок, один раз за день.",
    },
    ports,
  );
  return { ok: true };
}

export function virginTriggers(
  state: GameState,
  nominee: Player | null,
  nominator: Player,
  options: DayOptions = {},
): boolean {
  if (!nominee || !hasTrueAbility(nominee, "virgin") || !nominee.alive) return false;
  if (nominee.used.virgin) return false;
  if (isImpaired(state, nominee.id, dayAt(state))) return false;
  const realTownsfolk = roleTeam(nominator.roleId || "") === "townsfolk";
  const spyTownsfolk =
    nominator.roleId === "spy" &&
    options.spyRegistersTownsfolk === true &&
    !isImpaired(state, nominator.id, dayAt(state));
  return realTownsfolk || spyTownsfolk;
}

export function nominate(
  state: GameState,
  nominatorId: string,
  nomineeId: string,
  options: DayOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "nominate");
  if (guard) return guard;
  if (!state.day.open) return { ok: false, errorCode: "error.9", error: "Номинации не открыты." };
  if (state.day.ended) return { ok: false, errorCode: "error.8", error: "День уже завершён." };
  if (state.day.activeNominationId) {
    return { ok: false, errorCode: "error.10", error: "Сначала завершите текущее голосование." };
  }
  const nominator = playerById(state, nominatorId);
  const nominee = playerById(state, nomineeId);
  if (!nominator || !registersAlive(nominator))
    return { ok: false, errorCode: "error.11", error: "Номинировать может только живой." };
  if (!nominee) return { ok: false, errorCode: "error.12", error: "Номинант не найден." };
  if (state.day.nominations.some((nomination) => nomination.nominatorId === nominator.id)) {
    return { ok: false, errorCode: "error.13", error: "Этот игрок уже номинировал сегодня." };
  }
  if (state.day.nominations.some((nomination) => nomination.nomineeId === nominee.id)) {
    return { ok: false, errorCode: "error.14", error: "Этого игрока уже номинировали сегодня." };
  }

  // The Witch's curse kills the nominator when they nominate, but does not
  // cancel the nomination: it still proceeds to a vote.
  const curse = activeWitchCurse(state, nominator);
  const witchDeath = (deathCause: string) => {
    if (!curse) return null;
    curse.active = false;
    const death = kill(
      state,
      nominator.id,
      deathCause,
      dayAt(state),
      {
        demon: false,
        ability: "witch",
      },
      ports,
    );
    addLog(
      state,
      {
        secret: true,
        kind: "ability",
        title: "Ведьма: проклятие срабатывает",
        detail: nominator.name + " выдвинул игрока и умирает.",
        playerId: nominator.id,
      },
      ports,
    );
    return death;
  };

  const virgin = hasTrueAbility(nominee, "virgin") ? nominee : null;
  if (virgin && virgin.alive && !virgin.used.virgin) {
    const triggers = virginTriggers(state, virgin, nominator, options);
    virgin.used.virgin = true;
    if (triggers) {
      state.day.execution = {
        playerId: nominator.id,
        cause: "virgin",
        at: nowIso(ports),
        nominationId: null,
      };
      state.day.ended = true;
      state.day.open = false;
      const death = kill(state, nominator.id, "execution", dayAt(state), {}, ports);
      state.day.execution.deathId = death ? death.id : null;
      state.executions.push({
        playerId: nominator.id,
        cause: "virgin",
        at: nowIso(ports),
        deathId: death ? death.id : null,
      });
      if (death && roleTeam(nominator.roleId || "") === "demon") {
        resolveDemonDeath(
          state,
          {
            playerId: nominator.id,
            roleId: nominator.roleId,
            cause: "execution",
            livingBefore: death.livingBefore || 0,
            at: dayAt(state),
          },
          ports,
        );
      }
      // The curse also triggers, but the nominator is already dead.
      witchDeath("execution");
      checkWin(state, {}, ports);
      addLog(
        state,
        {
          kind: "execution",
          title: "Девственница срабатывает",
          detail: nominator.name + " казнён сразу. День завершён.",
          consequence: death ? "death" : "prevented",
        },
        ports,
      );
      return { ok: true, virgin: true, execution: state.day.execution };
    }
  }

  const nomination = {
    id: "nom-" + state.day.number + "-" + (state.day.nominations.length + 1),
    nominatorId: nominator.id,
    nomineeId: nominee.id,
    at: nowIso(ports),
    votes: [],
    count: 0,
    threshold: executionThreshold(livingPlayers(state).length),
    recorded: false,
    result: "pending",
    butlerWarning: [],
    minionNomination: roleTeam(nominator.roleId || "") === "minion",
  };
  state.day.nominations.push(nomination);
  state.day.activeNominationId = nomination.id;
  addLog(
    state,
    {
      kind: "nomination",
      title: nominator.name + " номинирует " + nominee.name,
      detail: "Порог: " + nomination.threshold + ".",
      playerId: nominee.id,
    },
    ports,
  );

  // The curse kills the nominator after the nomination is recorded, so the
  // nomination and its vote still stand. A game-ending death ends the day.
  const curseDeath = witchDeath("ability");
  if (curseDeath) {
    // The nominator died before the vote, so the threshold follows the new
    // living count while the nomination itself stays open.
    nomination.threshold = executionThreshold(livingPlayers(state).length);
    checkWin(state, {}, ports);
    if (state.winner) {
      state.day.ended = true;
      state.day.open = false;
      state.day.activeNominationId = null;
    }
  }
  return {
    ok: true,
    nomination,
    curse: Boolean(curseDeath),
    deathId: curseDeath ? curseDeath.id : null,
    winner: state.winner || null,
  };
}

// States r1039: a Witch curse is suspended while the Witch is impaired and
// resumes on recovery. Vigormortis r3015 may preserve a dead Witch's ability.
function activeWitchCurse(state: GameState, nominator: Player) {
  if (!isSnvScript(state.script) || livingPlayers(state).length <= 3) return null;
  return (
    state.effects.find(
      (candidate) =>
        candidate.kind === "witch" &&
        candidate.targetId === nominator.id &&
        candidate.day === state.day.number &&
        effectActive(state, candidate, dayAt(state)),
    ) || null
  );
}

// Record this ability at an in-person table without requiring a vote ledger.

export function recordVirginNomination(
  state: GameState,
  nominatorId: string,
  virginId: string,
  options: DayOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "recordVirginNomination");
  if (guard) return guard;
  const virgin = playerById(state, virginId);
  if (!virgin || virgin.roleId !== "virgin" || !virgin.alive || virgin.used.virgin) {
    return { ok: false, errorCode: "error.15", error: "Virgin ability is unavailable." };
  }
  const nominator = playerById(state, nominatorId);
  if (!nominator || !nominator.alive)
    return { ok: false, errorCode: "error.11", error: "Номинировать может только живой." };
  // Virgin r1729: the first nomination spends the ability even when it does not
  // trigger or the Virgin is impaired. When the day already recorded an
  // execution the vote ledger cannot open, so the table records the first
  // nomination and the spent ability directly.
  if (state.day.ended || state.day.execution) {
    if (virginTriggers(state, virgin, nominator, options)) {
      return { ok: false, errorCode: "error.23", error: "Сегодня уже была казнь." };
    }
    virgin.used.virgin = true;
    const nomination = {
      id: "nom-" + state.day.number + "-" + (state.day.nominations.length + 1),
      nominatorId: nominator.id,
      nomineeId: virgin.id,
      at: nowIso(ports),
      votes: [],
      count: 0,
      threshold: executionThreshold(livingPlayers(state).length),
      recorded: true,
      result: "external",
      butlerWarning: [],
      minionNomination: roleTeam(nominator.roleId || "") === "minion",
    };
    state.day.nominations.push(nomination);
    addLog(
      state,
      {
        kind: "nomination",
        title: nominator.name + " номинирует " + virgin.name,
        detail: "Первый выдвиг Девственницы записан после казни дня.",
        playerId: virgin.id,
      },
      ports,
    );
    return { ok: true, virgin: false, nomination };
  }
  const wasOpen = state.day.open;
  state.day.open = true;
  const result = nominate(state, nominatorId, virginId, options, ports);
  if (!result.ok) {
    state.day.open = wasOpen;
    return result;
  }
  if (result.nomination) {
    result.nomination.recorded = true;
    result.nomination.result = "external";
    state.day.activeNominationId = null;
    state.day.open = wasOpen;
  }
  return result;
}

export function recoverClaim(
  state: GameState,
  playerId: string,
  reason: string = "",
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "recoverClaim");
  if (guard) return guard;
  const player = playerById(state, playerId);
  if (!player || !String(reason || "").trim())
    return { ok: false, errorCode: "error.16", error: "A player and reason are required." };
  player.claimed = false;
  player.name = "";
  state.corrections.push({ kind: "claim", playerId, reason, at: nowIso(ports) });
  addLog(
    state,
    {
      secret: true,
      kind: "correction",
      title: "Role handoff reopened",
      detail: reason,
      playerId,
    },
    ports,
  );
  return { ok: true };
}

// In-person totals are notes, not a nomination or a complete voter ledger.
export function setVoteCount(
  state: GameState,
  playerId: string,
  count: number,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "setVoteCount");
  if (guard) return guard;
  if (state.day.ended) return { ok: false, errorCode: "error.8", error: "День уже завершён." };
  if (!state.order.includes(playerId))
    return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
  if (!Number.isInteger(count) || count < 0 || count > state.order.length) {
    return {
      ok: false,
      errorCode: "error.voteCount",
      error: "Укажите целое число голосов от нуля до числа игроков.",
    };
  }
  if (state.day.voteCounts?.[playerId] === count) return { ok: true };
  state.day.voteCounts ??= {};
  state.day.voteCounts[playerId] = count;
  addLog(
    state,
    {
      kind: "vote",
      title: "Записано голосов: " + count,
      detail: String(count),
      playerId,
      case: "vote-count",
    },
    ports,
  );
  return { ok: true };
}

export function setDeadVoteUsed(
  state: GameState,
  playerId: string,
  used: boolean,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "setDeadVoteUsed");
  if (guard) return guard;
  if (state.day.ended) return { ok: false, errorCode: "error.8", error: "День уже завершён." };
  const player = state.order.includes(playerId) ? playerById(state, playerId) : null;
  if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
  if (registersAlive(player)) {
    return {
      ok: false,
      errorCode: "error.deadVoteLiving",
      error: "Голос мёртвого доступен только мёртвому или считающемуся мёртвым игроку.",
    };
  }
  if (typeof used !== "boolean") {
    return {
      ok: false,
      errorCode: "error.deadVoteUsed",
      error: "Укажите, использован ли голос мёртвого.",
    };
  }
  if (player.voteToken === !used && state.day.voteCounts !== undefined) return { ok: true };
  // Even token-only bookkeeping cannot establish who nominated or voted.
  state.day.voteCounts ??= {};
  player.voteToken = !used;
  addLog(
    state,
    {
      kind: "vote",
      title: used ? "Голос мёртвого использован" : "Голос мёртвого восстановлен",
      detail: player.name,
      playerId,
      case: used ? "dead-vote-used" : "dead-vote-restored",
    },
    ports,
  );
  return { ok: true };
}

export function recordVotes(
  state: GameState,
  nominationId: string,
  voterIds: string[],
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "recordVotes");
  if (guard) return guard;
  const nomination = state.day.nominations.find((item) => item.id === nominationId);
  if (!nomination) return { ok: false, errorCode: "error.17", error: "Номинация не найдена." };
  if (nomination.recorded)
    return { ok: false, errorCode: "error.18", error: "Голоса уже записаны." };
  if (state.day.ended) return { ok: false, errorCode: "error.8", error: "День уже завершён." };

  const at = dayAt(state);
  const valid = new Set<string>();
  const warnings = [];
  for (const rawId of voterIds || []) {
    const id = String(rawId);
    const player = playerById(state, id);
    if (!player) continue;
    if (registersAlive(player)) {
      valid.add(id);
      continue;
    }
    if (player.voteToken) {
      valid.add(id);
      player.voteToken = false;
    } else {
      warnings.push(player.name + ": голос мёртвого уже использован.");
    }
  }

  for (const player of livingPlayers(state)) {
    if (player.roleId !== "butler") continue;
    if (!valid.has(player.id)) continue;
    const master = butlerMaster(state, player.id, at);
    if (master && !valid.has(master)) {
      // Official Storyteller guidance: count the vote that was actually cast.
      // Removing it would reveal the Butler, so only record a private warning.
      warnings.push(
        "Дворецкий голосует без своего хозяина: голос учтён, нарушение видит только ведущий.",
      );
    }
  }

  const ordered = Array.from(valid).sort((a, b) => {
    if (a === nomination.nomineeId) return 1;
    if (b === nomination.nomineeId) return -1;
    return seatOf(state, a) - seatOf(state, b);
  });
  nomination.votes = ordered;
  nomination.count = ordered.length;
  nomination.threshold = executionThreshold(livingPlayers(state).length);
  nomination.recorded = true;
  nomination.result = ordered.length >= nomination.threshold ? "qualified" : "failed";
  nomination.butlerWarning = warnings;
  nomination.deadVoters = ordered.filter((id) => {
    const player = playerById(state, id);
    return player && !player.alive;
  });
  // "If the Demon changes players after the original Demon voted … the
  // Flowergirl detects the original Demon" (Flowergirl r2907). Keep the role
  // fact at vote time; a later character change must not rewrite it.
  nomination.demonVoters = ordered.filter((id) => {
    const player = playerById(state, id);
    return Boolean(player && roleTeam(player.roleId || "") === "demon");
  });
  state.day.activeNominationId = null;
  addLog(
    state,
    {
      kind: "vote",
      title: "Голосование: " + nomination.count + " из " + nomination.threshold,
      detail: warnings.join(" "),
      playerId: nomination.nomineeId,
    },
    ports,
  );
  return { ok: true, nomination };
}

export function cancelNomination(
  state: GameState,
  nominationId: string,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "cancelNomination");
  if (guard) return guard;
  const nomination = state.day.nominations.find((item) => item.id === nominationId);
  if (!nomination) return { ok: false, errorCode: "error.17", error: "Номинация не найдена." };
  if (nomination.recorded)
    return {
      ok: false,
      errorCode: "error.19",
      error: "Голоса уже записаны. Используйте ручную правку.",
    };
  state.day.nominations = state.day.nominations.filter((item) => item.id !== nominationId);
  if (state.day.activeNominationId === nominationId) state.day.activeNominationId = null;
  addLog(
    state,
    {
      secret: true,
      kind: "nomination",
      title: "Номинация отменена",
      detail: nomination.id,
    },
    ports,
  );
  return { ok: true };
}

export function resetVotes(
  state: GameState,
  nominationId: string,
  reason: string,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "resetVotes");
  if (guard) return guard;
  if (!String(reason || "").trim())
    return { ok: false, errorCode: "error.20", error: "Укажите причину." };
  const nomination = state.day.nominations.find((item) => item.id === nominationId);
  if (!nomination) return { ok: false, errorCode: "error.17", error: "Номинация не найдена." };
  if (!nomination.recorded)
    return { ok: false, errorCode: "error.21", error: "Голоса ещё не записаны." };
  if (state.day.execution)
    return { ok: false, errorCode: "error.22", error: "Казнь уже состоялась." };
  for (const id of nomination.deadVoters || ([] as string[])) {
    const player = playerById(state, id);
    if (player && !player.alive) player.voteToken = true;
  }
  nomination.votes = [];
  nomination.deadVoters = [];
  nomination.count = 0;
  nomination.recorded = false;
  nomination.result = "pending";
  nomination.butlerWarning = [];
  state.day.activeNominationId = nomination.id;
  addLog(
    state,
    {
      secret: true,
      kind: "correction",
      title: "Голоса возвращены на пересчёт",
      detail: reason,
    },
    ports,
  );
  return { ok: true };
}

export function leader(state: GameState) {
  const recorded = state.day.nominations.filter((nomination) => nomination.recorded);
  if (!recorded.length) return { nomination: null };
  const max = Math.max(...recorded.map((nomination) => nomination.count));
  const top = recorded.filter((nomination) => nomination.count === max);
  if (top.length !== 1) {
    return { tie: true, count: max, nominations: top };
  }
  const nomination = top[0]!;
  if (nomination.count < nomination.threshold) {
    return {
      nomination,
      belowThreshold: true,
      count: nomination.count,
      threshold: nomination.threshold,
    };
  }
  return { nomination, count: nomination.count, threshold: nomination.threshold };
}

export function executePlayer(
  state: GameState,
  playerId: string,
  cause: string,
  at: DeadAt,
  options: DayOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const player = playerById(state, playerId);
  if (!player) return null;
  const livingBefore = livingPlayers(state).filter(registersAlive).length;
  const death = options.survives ? null : kill(state, playerId, "execution", at, {}, ports);
  state.executions.push({
    playerId,
    cause,
    at: nowIso(ports),
    deathId: death ? death.id : null,
  });
  if (!isManualScript(state.script) && death && roleTeam(player.roleId || "") === "demon") {
    resolveDemonDeath(
      state,
      {
        playerId,
        roleId: player.roleId,
        cause: "execution",
        livingBefore,
        at,
      },
      ports,
    );
  }
  if (!isManualScript(state.script) && isSnvScript(state.script)) reconcileNoDashiiPoison(state);
  if (
    !isManualScript(state.script) &&
    death &&
    isBmrScript(state.script) &&
    roleTeam(player.roleId || "") === "minion"
  ) {
    const minstrel = livingPlayers(state).find(
      (candidate) => candidate.roleId === "minstrel" && !isImpaired(state, candidate.id, at),
    );
    if (minstrel) {
      const expires: DeadAt = { phase: "night", number: state.day.number + 2 };
      const targets = orderedPlayers(state).filter((candidate) => candidate.id !== minstrel.id);
      for (const target of targets) {
        state.effects.push({
          id: "eff-" + (state.effects.length + 1) + "-" + idSuffix(ports, 4),
          kind: "drunk",
          sourceId: minstrel.id,
          targetId: target.id,
          start: { phase: "day", number: state.day.number },
          expires,
          active: true,
        });
      }
      addLog(
        state,
        {
          secret: true,
          kind: "ability",
          title: "Менестрель: все пьяны",
          detail: "Приспешник казнён. Все остальные игроки пьяны до заката завтрашнего дня.",
        },
        ports,
      );
    }
  }
  return death;
}

export function moonchildChoice(
  state: GameState,
  targetId: string,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "moonchildChoice");
  if (guard) return guard;
  const moonchild = orderedPlayers(state).find(
    (player) =>
      hasTrueAbility(player, "moonchild") &&
      !player.alive &&
      !(player.used && player.used.moonchildTarget),
  );
  if (!moonchild) return { ok: false, errorCode: "error.29", error: "Дитя Луны не может выбрать." };
  const target = playerById(state, targetId);
  if (!target || !target.alive)
    return { ok: false, errorCode: "error.31", error: "Цель должна быть живой." };
  moonchild.used = moonchild.used || {};
  moonchild.used.moonchildTarget = target.id;
  // Moonchild r1783: only the choice-time alignment is stored. Impairment is
  // judged at the night resolution, so a choice made while impaired still
  // kills when the Moonchild is sober and healthy then.
  // Moonchild r1783: the choice-time alignment decides, even if the Goon turns
  // evil before the curse resolves.
  moonchild.used.moonchildTargetEvil = realTeamOf(target) === "evil";
  addLog(
    state,
    {
      secret: true,
      kind: "ability",
      title: "Дитя Луны выбирает " + target.name,
      detail: "Если цель добрая, она умрёт следующей ночью.",
    },
    ports,
  );
  return { ok: true, targetId: target.id };
}

function jugglerDayGuard(state: GameState) {
  const guard = lifecycleGuard(state, "jugglerGuess");
  if (guard) return guard;
  const juggler = orderedPlayers(state).find(
    (player) => player.alive && hasAbility(player, "juggler"),
  );
  if (!juggler) return { ok: false, errorCode: "error.29", error: "Жонглёра нет в игре." };
  const current = state.juggler;
  if (current && typeof current.day === "number" && current.day !== state.day.number) {
    return { ok: false, errorCode: "error.7", error: "Жонглёр угадывает в свой первый день." };
  }
  return { ok: true as const };
}

// Juggler r2401: up to five public guesses on their first day; characters and
// players may repeat, and zero guesses is a legal record.
export function reportJugglerGuesses(
  state: GameState,
  guesses: Array<{ playerId: string; roleId: string }>,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = jugglerDayGuard(state);
  if (guard.ok === false) return guard;
  if (!Array.isArray(guesses)) {
    return { ok: false, errorCode: "error.39", error: "Передайте список догадок Жонглёра." };
  }
  if (guesses.length > 5) {
    return { ok: false, errorCode: "error.39", error: "Можно угадать не больше пяти игроков." };
  }
  const clean: JugglerGuess[] = [];
  for (const guess of guesses) {
    const target = playerById(state, String(guess.playerId));
    if (!target) return { ok: false, errorCode: "error.31", error: "Цель не найдена." };
    const roleId = guess.roleId as RoleId;
    if (!isSupportedRole(roleId) || !(state.script && state.script.roles.includes(roleId))) {
      return { ok: false, errorCode: "error.2", error: "Выберите роль из сценария." };
    }
    clean.push({ playerId: target.id, roleId });
  }
  // Juggler r2401: the CORRECT reminders are placed on the guessing day, so
  // the count is fixed then. A later character change must not move it.
  const correct = clean.filter(
    (guess) => (playerById(state, guess.playerId)?.roleId ?? null) === guess.roleId,
  ).length;
  state.juggler = { day: state.day.number, guesses: clean, correct };
  addLog(
    state,
    {
      secret: true,
      kind: "ability",
      title: "Жонглёр угадывает",
      detail: clean.length ? "Записано догадок: " + clean.length + "." : "Догадок нет.",
    },
    ports,
  );
  return { ok: true, juggler: state.juggler };
}

export function jugglerGuess(
  state: GameState,
  playerId: string,
  roleId: string,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = jugglerDayGuard(state);
  if (guard.ok === false) return guard;
  const target = playerById(state, playerId);
  if (!target) return { ok: false, errorCode: "error.31", error: "Цель не найдена." };
  const stored = state.juggler && state.juggler.guesses;
  const guesses: JugglerGuess[] = Array.isArray(stored)
    ? stored.map((entry) => ({ playerId: String(entry.playerId), roleId: entry.roleId }))
    : stored && typeof stored === "object"
      ? Object.entries(stored).map(([id, role]) => ({ playerId: id, roleId: role }))
      : [];
  return reportJugglerGuesses(
    state,
    [...guesses, { playerId: target.id, roleId: roleId as RoleId }],
    ports,
  );
}

export function gossipStatement(
  state: GameState,
  truth: boolean,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "gossipStatement");
  if (guard) return guard;
  const gossip = orderedPlayers(state).find((player) => player.roleId === "gossip" && player.alive);
  if (!gossip) return { ok: false, errorCode: "error.29", error: "Сплетницы нет в игре." };
  if (state.gossip && state.gossip.day === state.day.number) {
    return { ok: false, errorCode: "error.29", error: "Заявление уже записано на этот день." };
  }
  state.gossip = { day: state.day.number, truth: Boolean(truth), playerId: gossip.id };
  addLog(
    state,
    {
      secret: true,
      kind: "ability",
      title: "Сплетница делает заявление",
      detail:
        "Заявление " + (truth ? "истинно" : "ложно") + ". Ночью ведущий разрешает последствие.",
    },
    ports,
  );
  return { ok: true, gossip: state.gossip };
}

type DayAbilityLookup =
  | { ok: false; result: { ok: false; errorCode: string; error: string } }
  | { ok: true; player: Player };

// The Artist and the Savant act in the day, in private. The shared guards keep
// one implementation of the phase and holder checks; the role-specific rule
// stays in its own function.
function dayAbilityHolder(
  state: GameState,
  playerId: string,
  roleId: RoleId,
  type: "artistQuestion" | "savantVisit",
): DayAbilityLookup {
  const guard = lifecycleGuard(state, type);
  if (guard) return { ok: false, result: guard };
  if (state.day.ended)
    return {
      ok: false,
      result: { ok: false, errorCode: "error.8", error: "День уже завершён." },
    };
  const player = playerById(state, playerId);
  if (!player)
    return { ok: false, result: { ok: false, errorCode: "error.1", error: "Игрок не найден." } };
  if (!player.alive || !hasAbility(player, roleId))
    return {
      ok: false,
      result: { ok: false, errorCode: "error.29", error: "Этого персонажа нет среди живых." },
    };
  return { ok: true, player };
}

const ARTIST_ANSWERS: readonly ArtistAnswer[] = ["yes", "no", "unknown"];

// Artist r3156: once per game, during the day, privately ask any yes/no
// question. The Storyteller answers yes, no or "I don't know"; the engine
// records the private exchange and never interprets the free-form question.
export function artistQuestion(
  state: GameState,
  playerId: string,
  question: string,
  answer: ArtistAnswer,
  ports: CommandExecutionContext = systemPorts,
) {
  const lookup = dayAbilityHolder(state, playerId, "artist", "artistQuestion");
  if (!lookup.ok) return lookup.result;
  const player = lookup.player;
  if (player.used.artist)
    return {
      ok: false,
      errorCode: "error.60",
      error: "Художник уже задал свой вопрос.",
    };
  const text = String(question == null ? "" : question).trim();
  if (!text) return { ok: false, errorCode: "error.61", error: "Запишите вопрос Художника." };
  if (!ARTIST_ANSWERS.includes(answer))
    return {
      ok: false,
      errorCode: "error.61",
      error: "Ответ ведущего: «да», «нет» или «не знаю».",
    };
  player.used.artist = true;
  state.artist = {
    day: state.day.number,
    playerId: player.id,
    question: text,
    answer,
  };
  addLog(
    state,
    {
      secret: true,
      kind: "ability",
      title: "Художник задаёт вопрос",
      detail: "Вопрос: " + text + " Ответ: " + answer + ".",
      playerId: player.id,
    },
    ports,
  );
  return { ok: true, artist: state.artist };
}

const SAVANT_TRUTHS: readonly SavantTruth[] = ["first", "second", "both", "neither"];

// Savant r2910: one printed statement is true and one is false. A drunk or
// poisoned Savant might get two true or two false statements. A living,
// unimpaired Vortox makes the information false, so both statements are false.
export function savantTruthChoices(state: GameState, playerId: string): SavantTruth[] {
  const player = playerById(state, playerId);
  if (vortoxFalsifies(state, effectiveRoleId(player))) return ["neither"];
  const impaired = Boolean(player && isImpaired(state, player.id, dayAt(state)));
  return impaired ? [...SAVANT_TRUTHS] : ["first", "second"];
}

export function savantVisit(
  state: GameState,
  playerId: string,
  statements: [string, string],
  truth: SavantTruth,
  ports: CommandExecutionContext = systemPorts,
) {
  const lookup = dayAbilityHolder(state, playerId, "savant", "savantVisit");
  if (!lookup.ok) return lookup.result;
  const player = lookup.player;
  if (state.savant && state.savant.day === state.day.number && state.savant.playerId === player.id)
    return {
      ok: false,
      errorCode: "error.69",
      error: "Савант уже посещал ведущего в этот день.",
    };
  const first = String(statements && statements[0] != null ? statements[0] : "").trim();
  const second = String(statements && statements[1] != null ? statements[1] : "").trim();
  if (!first || !second)
    return { ok: false, errorCode: "error.70", error: "Запишите два утверждения Саванта." };
  if (first === second)
    return {
      ok: false,
      errorCode: "error.70",
      error: "Два утверждения должны различаться.",
    };
  const choices = savantTruthChoices(state, player.id);
  if (!SAVANT_TRUTHS.includes(truth) || !choices.includes(truth))
    return {
      ok: false,
      errorCode: "error.71",
      error:
        "Одно утверждение истинно, другое ложно; при отравлении ведущий может выбрать иначе, а Вортокс делает оба ложными.",
    };
  const record = {
    day: state.day.number,
    playerId: player.id,
    statements: [first, second] as [string, string],
    truth,
  };
  state.savantVisits = [...(state.savantVisits || []), record];
  state.savant = record;
  addLog(
    state,
    {
      secret: true,
      kind: "ability",
      title: "Савант посещает ведущего",
      detail: "Утверждение 1: " + first + " Утверждение 2: " + second + ". Истина: " + truth + ".",
      playerId: player.id,
    },
    ports,
  );
  return { ok: true, savant: state.savant };
}

// Tinker r1782: "You might die at any time." The Storyteller records a real
// ability death for a sober Tinker during the day or the night.
export function tinkerDeath(
  state: GameState,
  playerId: string,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "tinkerDeath");
  if (guard) return guard;
  const player = playerById(state, playerId);
  if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
  if (!player.alive || !hasTrueAbility(player, "tinker")) {
    return { ok: false, errorCode: "error.58", error: "Тинкер не в игре или уже мёртв." };
  }
  const at = currentAt(state);
  if (isImpaired(state, player.id, at)) {
    return {
      ok: false,
      errorCode: "error.59",
      error: "Тинкер отравлен или пьян: способность не работает.",
    };
  }
  const death = kill(state, player.id, "ability", at, { ability: "tinker", bmr: "tinker" }, ports);
  checkWin(state, {}, ports);
  return { ok: true, death };
}

// Pacifist r2601: only a living, unimpaired Pacifist can spare an executed good
// player, and only for an execution the day decides.
export function survivesExecutionAllowed(state: GameState, playerId: string): boolean {
  return survivalAllowed(state, playerId, dayAt(state));
}

function survivalAllowed(state: GameState, playerId: string, at: DeadAt): boolean {
  const player = playerById(state, playerId);
  if (!player || realTeamOf(player) === "evil") return false;
  const module = roleModule("pacifist");
  if (!module) return false;
  const decision = resolveExecutionCapability(module, {
    executedId: playerId,
    executedRoleId: player.roleId,
    executedTeam: "good",
    cause: "execution",
    death: null,
    livingCount: livingPlayers(state).length,
    at,
    hasLivingUnimpairedRole: (roleId) =>
      livingPlayers(state).some(
        (candidate) => candidate.roleId === roleId && !isImpaired(state, candidate.id, at),
      ),
    actualRoleOf: (id) => playerById(state, id)?.roleId ?? null,
    hasPlayer: (id) => playerById(state, id) != null,
  });
  return decision?.kind === "survives";
}

export function execute(
  state: GameState,
  nominationId: string,
  options: DayOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "execute");
  if (guard) return guard;
  if (state.day.execution)
    return { ok: false, errorCode: "error.23", error: "Сегодня уже была казнь." };
  if (state.day.ended) return { ok: false, errorCode: "error.8", error: "День уже завершён." };
  const current = leader(state);
  if (!current.nomination)
    return { ok: false, errorCode: "error.24", error: "Нет номинации с голосами." };
  if (current.tie)
    return { ok: false, errorCode: "error.25", error: "Ничья на максимуме: казни нет." };
  if (current.belowThreshold)
    return { ok: false, errorCode: "error.26", error: "Голосов меньше порога." };
  if (nominationId && current.nomination.id !== nominationId) {
    return { ok: false, errorCode: "error.27", error: "Казнить можно только единоличного лидера." };
  }

  const nomination = current.nomination;
  const nominee = playerById(state, nomination.nomineeId);
  const at = dayAt(state);
  if (options.survives && !survivalAllowed(state, nomination.nomineeId, at)) {
    return {
      ok: false,
      errorCode: "error.57",
      error: "Выжить при казни может только добрый игрок при живом и здоровом Пацифисте.",
    };
  }
  state.day.execution = {
    playerId: nomination.nomineeId,
    cause: "vote",
    at: nowIso(ports),
    nominationId: nomination.id,
  };
  state.day.ended = true;
  state.day.open = false;
  state.day.activeNominationId = null;

  const livingBefore = livingPlayers(state).length;
  const death = executePlayer(state, nomination.nomineeId, "vote", at, options, ports);
  // Link the death before the win check: the Mastermind and the Demon-dead
  // result both read the recorded execution death.
  state.day.execution.deathId = death ? death.id : null;
  if (options.survives && !death) {
    recordHostChoice(
      state,
      "pacifist-survival",
      (nominee ? nominee.name || "Игрок " + nominee.seat : nomination.nomineeId) +
        " выжил при казни.",
      nomination.nomineeId,
      ports,
    );
  }
  checkWin(state, {}, ports);
  addLog(
    state,
    {
      kind: "execution",
      title: "Казнь: " + (nominee ? nominee.name : "—"),
      detail: death ? "Казнён и умер." : "Игрок был уже мёртв: смерть не наступила.",
      playerId: nomination.nomineeId,
      consequence: death ? "death" : "prevented",
    },
    ports,
  );
  return { ok: true, execution: state.day.execution, death, livingBefore };
}

export function executeByDecision(
  state: GameState,
  playerId: string,
  options: DayOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "executeByDecision");
  if (guard) return guard;
  const cause = options.cause || "vote";
  // A madness execution during the day is the day's execution. Only a madness
  // execution at night is outside the day's single execution.
  const nightMadness = state.phase === "night" && cause === "madness";
  if (state.phase !== "day" && !nightMadness) {
    return { ok: false, errorCode: "error.7", error: "Сейчас не день." };
  }
  if (state.day.execution && !nightMadness) {
    return { ok: false, errorCode: "error.23", error: "Сегодня уже была казнь." };
  }
  if (state.day.ended && !nightMadness) {
    return { ok: false, errorCode: "error.8", error: "День уже завершён." };
  }
  const player = playerById(state, playerId);
  if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
  // States r1039: a dead player may be executed, but cannot die again.
  const at = nightMadness ? currentAt(state) : dayAt(state);
  if (options.survives && (nightMadness || !survivalAllowed(state, playerId, at))) {
    return {
      ok: false,
      errorCode: "error.57",
      error: "Выжить при казни может только добрый игрок при живом и здоровом Пацифисте.",
    };
  }
  if (!nightMadness) {
    state.day.execution = {
      playerId,
      cause,
      at: nowIso(ports),
      nominationId: null,
      deathId: null,
    };
    state.day.ended = true;
    state.day.open = false;
    state.day.activeNominationId = null;
  }
  const death = executePlayer(state, playerId, cause, at, options, ports);
  if (!nightMadness && state.day.execution) state.day.execution.deathId = death ? death.id : null;
  checkWin(state, {}, ports);
  if (
    !state.winner &&
    isBmrScript(state.script) &&
    state.mastermind?.active &&
    state.mastermind.extraDay
  ) {
    const good = realTeamOf(player) !== "evil";
    setWinner(state, good ? "evil" : "good", "mastermind", ports);
  }
  if (options.survives && !death) {
    recordHostChoice(
      state,
      "pacifist-survival",
      (player.name || "Игрок " + player.seat) + " выжил при казни.",
      player.id,
      ports,
    );
  }
  addLog(
    state,
    {
      kind: "execution",
      title: "Казнь: " + (player.name || "Игрок " + player.seat),
      detail: death ? "Казнён и умер." : "Казнён, но смерть не наступила.",
      playerId,
      consequence: death ? "death" : "prevented",
    },
    ports,
  );
  return { ok: true, execution: state.day.execution, death };
}

// The madness penalty is a Storyteller decision, never an automatic effect of
// a failed madness. The command records the chosen legal option and its reason
// on the token, and an execution goes through the normal day execution path.
export function applyMadnessPenalty(
  state: GameState,
  playerId: string,
  penalty: string,
  reason: string,
  effectId?: string,
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "madnessPenalty");
  if (guard) return guard;
  const at = currentAt(state);
  const effect = effectId
    ? madnessEffects(state, at).find(
        (candidate) => candidate.id === effectId && candidate.targetId === playerId,
      )
    : activeMadness(state, playerId, at);
  if (!effect)
    return { ok: false, errorCode: "error.62", error: "У игрока нет активного безумия." };
  // A token told on this night covers the next day and night, not this one.
  if (
    state.phase === "night" &&
    effect.madness === "cerenovus" &&
    effect.start &&
    effect.start.phase === "night" &&
    effect.start.number === state.night.number
  ) {
    return {
      ok: false,
      errorCode: "error.73",
      error: "Безумие назначено этой ночью: решение принимается на следующий день или ночь.",
    };
  }
  if (!(MADNESS_PENALTIES as readonly string[]).includes(penalty)) {
    return {
      ok: false,
      errorCode: "error.63",
      error: "Выберите законный штраф за безумие: казнь или без последствий.",
      needsChoice: true,
      info: { options: MADNESS_PENALTIES.slice() },
    };
  }
  const text = String(reason == null ? "" : reason).trim();
  if (!text)
    return { ok: false, errorCode: "error.64", error: "Укажите причину решения ведущего." };
  const number = state.day.number;
  const canUpgradeReview =
    effect.decidedDay === number && effect.decidedPenalty === "none" && penalty === "execute";
  if (effect.decidedDay === number && !canUpgradeReview) {
    return {
      ok: false,
      errorCode: "error.65",
      error: "Решение по этому безумию уже записано сегодня.",
    };
  }
  let death = null;
  if (penalty === "execute") {
    const result = executeByDecision(state, playerId, { cause: "madness" }, ports);
    if (result.ok === false) return result;
    death = result.death || null;
  }
  effect.decidedDay = number;
  effect.decidedPenalty = penalty;
  effect.decidedReason = text;
  const player = playerById(state, playerId);
  addLog(
    state,
    {
      secret: true,
      kind: "ability",
      title: "Безумие: " + (player ? player.name : playerId),
      detail:
        (penalty === "execute" ? "Ведущий казнил игрока. " : "Ведущий не стал казнить. ") + text,
      playerId,
      case: "madness-penalty",
    },
    ports,
  );
  return { ok: true, penalty, reason: text, death };
}

export function endDay(state: GameState, ports: CommandExecutionContext = systemPorts) {
  const guard = lifecycleGuard(state, "endDay");
  if (guard) return guard;

  const madnessDue = madnessReviewsDue(state);
  if (madnessDue.length) {
    return {
      ok: false,
      errorCode: "error.66",
      error: "Проверьте безумие у игроков: " + madnessDue.length + ".",
      info: { playerIds: madnessDue.map((effect) => effect.targetId).filter(Boolean) },
    };
  }

  if (
    !isManualScript(state.script) &&
    isBmrScript(state.script) &&
    state.mastermind &&
    state.mastermind.active &&
    state.mastermind.extraDay
  ) {
    const execution = state.day.execution;
    if (execution) {
      const player = playerById(state, execution.playerId);
      const good = player ? realTeamOf(player) !== "evil" : false;
      setWinner(state, good ? "evil" : "good", "mastermind", ports);
    } else {
      setWinner(state, "good", "demon-dead", ports);
    }
    return { ok: true, winner: state.winner };
  }

  if (!state.day.ended) {
    state.day.ended = true;
    state.day.open = false;
    state.day.activeNominationId = null;
  }
  // Mayor r2995 and Vortox r3017 check execution, not execution death.
  if (!state.day.execution && !isManualScript(state.script)) {
    checkWin(state, { endOfDay: true }, ports);
  }
  if (state.winner) return { ok: true, winner: state.winner };

  // A Juggler that entered play (dealt or created) without guessing still
  // answers on the night after their first day, so the day is persisted before
  // the next night queue is built.
  if (
    !state.juggler &&
    orderedPlayers(state).some((player) => player.alive && hasAbility(player, "juggler"))
  ) {
    state.juggler = { day: state.day.number, guesses: [] };
  }

  state.lastDay = {
    number: state.day.number,
    ...(state.day.voteCounts !== undefined ? { voteCounts: { ...state.day.voteCounts } } : {}),
    nominations: state.day.nominations.slice(),
    execution: state.day.execution ? { ...state.day.execution } : null,
  };
  // A Demon change during the day must still wake the new Demon tonight
  // (Scarlet Woman r3117). The flag survives the night reset; the queue build
  // below appends the YOU ARE step before the flag is cleared. A change made
  // last night was woken last night (Imp r3116), so it is not carried again.
  // A death today places the reveal before the Imp step, so the new Demon acts
  // that night; a carried night change stays after it and acts no more.
  const demonDiedToday = state.deaths.some(
    (death) =>
      death.phase === "day" &&
      death.number === state.day.number &&
      roleTeam(death.roleId || "") === "demon",
  );
  const demonChanged =
    state.night.demonChanged &&
    (repeatsDemonWake(ports.rulesetVersion) || newDemonAwaitsWake(state));
  const nextNight = Math.max(1, (state.night.number || state.day.number) + 1);
  state.night = { number: nextNight, queue: [], currentIndex: 0, demonChanged };
  state.day = {
    number: nextNight,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: false,
  };
  state.phase = "night";
  state.night.queue = buildNightQueue(state, ports);
  if (demonChanged) {
    appendConditionalSteps(state, ports, demonDiedToday ? "day" : "night");
    state.night.demonChanged = false;
  }
  addLog(
    state,
    {
      kind: "phase",
      title: "Ночь " + nextNight,
      detail: "Город засыпает. Разбудите роли по порядку.",
    },
    ports,
  );
  return { ok: true, night: state.night };
}

// Whether the Demon change the flag records still needs its YOU ARE wake when
// the day ends. The flag covers every change since the last night began. A
// change made that night has its wake in that night's queue; a change made
// today follows the death of a Demon today, whatever that night held.
function newDemonAwaitsWake(state: GameState): boolean {
  if (!state.night.queue.some((step) => step.system === "demonchange")) return true;
  return state.deaths.some(
    (death) =>
      death.phase === "day" &&
      death.number === state.day.number &&
      roleTeam(death.roleId || "") === "demon",
  );
}

export function useSlayer(
  state: GameState,
  slayerId: string,
  targetId: string,
  options: DayOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "useSlayer");
  if (guard) return guard;
  if (state.day.ended) return { ok: false, errorCode: "error.8", error: "День уже завершён." };
  const slayer = playerById(state, slayerId);
  if (!slayer || !slayer.alive || !hasAbility(slayer, "slayer")) {
    return { ok: false, errorCode: "error.29", error: "Истребитель не может действовать." };
  }
  if (slayer.used.slayer)
    return { ok: false, errorCode: "error.30", error: "Истребитель уже использовал способность." };
  const target = playerById(state, targetId);
  if (!target) return { ok: false, errorCode: "error.31", error: "Цель не найдена." };

  slayer.used.slayer = true;
  const at = dayAt(state);
  addLog(
    state,
    {
      kind: "ability",
      title: "Истребитель выбирает " + target.name,
      detail: "Публичная попытка. Способность одноразовая.",
    },
    ports,
  );

  const targetRegistersDemon =
    roleTeam(target.roleId || "") === "demon" ||
    (target.roleId === "recluse" &&
      options.recluseRegistersDemon === true &&
      !isImpaired(state, target.id, at));
  const module = roleModule("slayer");
  const context: DayContext = {
    actorId: slayerId,
    action: "slayer-shot",
    targetIds: [target.id],
    targetId: target.id,
    impaired: slayer.roleId === "drunk" || isImpaired(state, slayerId, at),
    targetAlive: target.alive,
    targetRegistersDemon,
    at,
    actualRoleOf: (playerId) => playerById(state, playerId)?.roleId ?? null,
    hasPlayer: (playerId) => playerById(state, playerId) != null,
  };
  const applied = module ? applyDayCapability(state, module, context, ports) : { handled: false };
  if (!applied.handled) {
    return { ok: false, errorCode: "error.5", error: "Способность Истребителя не объявлена." };
  }
  const outcome = (applied.result || {}) as {
    hit?: boolean;
    impaired?: boolean;
    death?: Death | null;
    inheritance?: DeathOutcome | null;
  };
  if (outcome.impaired) {
    addLog(
      state,
      {
        secret: true,
        kind: "ability",
        title: "Истребитель: способность не сработала",
        detail: "Игрок был отравлен или пьян.",
      },
      ports,
    );
    return { ok: true, hit: false, impaired: true };
  }
  if (!outcome.hit) {
    addLog(
      state,
      {
        kind: "ability",
        title: "Истребитель промахивается",
        detail: target.name + " не Демон (или уже мёртв).",
      },
      ports,
    );
    return { ok: true, hit: false };
  }
  return {
    ok: true,
    hit: true,
    death: outcome.death ?? null,
    inheritance: outcome.inheritance ?? null,
  };
}

// ---------------------------------------------------------------------------
// Setup and secrets
