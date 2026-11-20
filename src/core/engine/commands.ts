import type {
  Command,
  CommandResult,
  DomainEvent,
  GameState,
  RejectedResult,
} from "../model/types.ts";
import type { CommandPayloads } from "../commands/contracts.ts";

interface DomainOutcome {
  [key: string]: unknown;
  ok?: boolean;
  status?: string;
  choice?: unknown;
  errorCode?: string | null;
  reason?: string;
  error?: string;
  errors?: string[] | null;
  result?: unknown;
  followUp?: unknown;
}

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
import { clone } from "../model/state.ts";
import { createExecutionContext } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { effectGraph } from "../model/effect-graph.ts";

import { currentAt } from "./context.ts";
import { defaultRuntime, hashString } from "./runtime.ts";
import type { Runtime } from "./runtime.ts";

import { completeStep, endNight, skipStep, startNight } from "./night.ts";
import {
  applyMadnessPenalty,
  artistQuestion,
  cancelNomination,
  endDay,
  execute,
  executeByDecision,
  gossipStatement,
  jugglerGuess,
  moonchildChoice,
  nominate,
  openNominations,
  recordVirginNomination,
  recordVotes,
  setVoteCount,
  setDeadVoteUsed,
  recoverClaim,
  reportJugglerGuesses,
  resetVotes,
  savantVisit,
  tinkerDeath,
  useSlayer,
} from "./day.ts";
import { autoSecrets, claimSeat, dealGame } from "./setup.ts";
import { lifecycleGuard } from "./lifecycle.ts";
import { manualCorrection } from "./corrections.ts";
import { recordBmrOutcome, resurrectPlayer } from "./bmr.ts";
import { resolveSuspendedPukkaDeaths } from "./pukka.ts";
import { recordAbnormal, recordKlutzChoice, recordSvOutcome } from "./sv.ts";
import { chooseDemonHeir, setWinner } from "./death.ts";
import { commandVersion, recordJournalEntry } from "./command-journal.ts";
import {
  canonicalState,
  checkInvariants,
  fingerprintOf,
  identityOf,
  replaceContents,
  sameValue,
} from "./command-state.ts";
export { canonicalState, checkInvariants } from "./command-state.ts";
import type { CommandMeta } from "./command-journal.ts";
export { startGame } from "./setup-commands.ts";
import {
  bagUpdate,
  importGame,
  newGame,
  normalizeSecrets,
  setHerring,
  setNotes,
  setOrder,
  setReviewOpen,
  setupInfo,
  startGame,
} from "./setup-commands.ts";

export { RULESET_VERSION, SUPPORTED_RULESET_VERSIONS } from "./command-versions.ts";
import { SUPPORTED_RULESET_VERSIONS } from "./command-versions.ts";
export const COMMAND_STATUS = {
  ALLOWED: "allowed",
  REJECTED: "rejected",
  CHOICE: "requires-storyteller-choice",
} as const;

// ---------------------------------------------------------------------------
// Command handlers

const asRecordOrNull = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;

const asOutcome = (value: unknown): RawOutcome => asRecordOrNull(value) || {};

// Engine handlers return a loose result; these fields are the ones the wrapper reads.
interface RawOutcome {
  ok?: boolean;
  status?: string;
  choice?: unknown;
  needsChoice?: boolean;
  needsRedirect?: boolean;
  needsSetup?: boolean;
  info?: { options?: unknown[] } | null;
  options?: unknown[];
  errorCode?: string | null;
  error?: string;
  errors?: string[] | null;
  reason?: string;
  result?: unknown;
  followUp?: unknown;
  pendingInheritance?: { options?: unknown[] } | null;
}

function commandResult(raw: unknown): DomainOutcome {
  const view = asOutcome(raw);
  if (!raw || typeof raw !== "object") return { ok: true, result: raw || null };
  if (view.ok === false) {
    if (view.needsChoice) {
      return {
        status: COMMAND_STATUS.CHOICE,
        choice: {
          kind: "info",
          options: (view.info && view.info.options) || [],
          context: view.info || null,
        },
        errorCode: view.errorCode || null,
        reason: view.error || "Требуется решение ведущего.",
      };
    }
    if (view.needsRedirect) {
      return {
        status: COMMAND_STATUS.CHOICE,
        choice: { kind: "redirect", options: view.options || [], context: raw },
        errorCode: view.errorCode || null,
        reason: view.error || "Выберите перенаправление.",
      };
    }
    if (view.needsSetup) {
      return {
        status: COMMAND_STATUS.CHOICE,
        choice: {
          kind: "setup",
          options: (view.info && view.info.options) || [],
          context: view.info || null,
        },
        errorCode: view.errorCode || null,
        reason: view.error || "Сначала настройте секретную информацию.",
      };
    }
    return {
      ok: false,
      errorCode: view.errorCode || null,
      error: view.error || "Команда отклонена.",
      errors: Array.isArray(view.errors) ? view.errors : null,
    };
  }
  return { ok: true, result: raw };
}

function finish(raw: unknown): DomainOutcome {
  const normalized = commandResult(raw);
  if (normalized.status === COMMAND_STATUS.CHOICE) return normalized;
  if (normalized.ok === false) return normalized;
  const result = asRecordOrNull(normalized.result);
  const pending = result ? asRecordOrNull(result.pendingInheritance) : null;
  const followUp = pending
    ? {
        type: "chooseDemonHeir",
        options: Array.isArray(pending.options) ? pending.options : [],
        context: pending,
      }
    : null;
  return { ok: true, result, followUp };
}

function completeNightStep(
  state: GameState,
  payload: CommandPayloads["completeNightStep"],
  ports: CommandExecutionContext,
) {
  const guard = lifecycleGuard(state, "completeNightStep");
  if (guard) return guard;
  const step = state.night.queue.find((candidate) => candidate.key === payload.key);
  if (!step) return { ok: false, errorCode: "error.36", error: "Шаг не найден." };
  const options: Parameters<typeof completeStep>[2] = {
    targetIds: payload.targetIds || [],
    redirectId: payload.redirectId ?? null,
    registrations: payload.registrations || {},
    resurrectId: payload.resurrectId ?? null,
    roleId: payload.roleId ?? null,
    drunkId: payload.drunkId ?? null,
  };
  if (payload.given != null) options.given = payload.given;
  const result = completeStep(state, payload.key, options, ports);
  if (!result || result.ok === false) return result;
  if (step.bmr || step.sv) {
    const deathIds = payload.deathIds || [];
    if (deathIds.length || payload.resurrectId) {
      const outcome = step.sv
        ? recordSvOutcome(
            state,
            step.key,
            {
              deathIds,
              poisonId: payload.poisonId ?? null,
            },
            ports,
          )
        : recordBmrOutcome(
            state,
            step.key,
            {
              deathIds,
              resurrectId: payload.resurrectId || null,
            },
            ports,
          );
      if (!outcome.ok) return outcome;
    }
  }
  return result;
}

function applyJugglerGuess(
  state: GameState,
  payload: CommandPayloads["jugglerGuess"],
  ports: CommandExecutionContext,
) {
  if (Array.isArray(payload.guesses)) return reportJugglerGuesses(state, payload.guesses, ports);
  if (typeof payload.playerId !== "string" || typeof payload.roleId !== "string") {
    return { ok: false, errorCode: "error.39", error: "Передайте список догадок Жонглёра." };
  }
  return jugglerGuess(state, payload.playerId, payload.roleId, ports);
}

/**
 * Takes a prepared bag into the first night in one host action: deal the
 * roles, seal the seat order and fill the setup secrets, then start night 1.
 * A bag that still needs a host choice (the Drunk's false information) stays
 * rejected by `startNight` and the host records it with `setSetupInfo`.
 */
interface CommandSpec<K extends keyof CommandPayloads> {
  apply: (state: GameState, payload: CommandPayloads[K], ports: CommandExecutionContext) => unknown;
  undoable?: boolean;
  resetHistory?: boolean;
}

const COMMANDS = {
  startNight: { apply: (state, _payload, ports) => startNight(state, ports) },
  completeStep: {
    apply: (state, payload, ports) =>
      completeStep(
        state,
        payload.key,
        payload.options as Parameters<typeof completeStep>[2],
        ports,
      ),
  },
  completeNightStep: { apply: (state, payload, ports) => completeNightStep(state, payload, ports) },
  endNight: { apply: (state, _payload, ports) => endNight(state, ports) },
  skipStep: {
    apply: (state, payload, ports) => skipStep(state, payload.key, payload.reason, ports),
  },
  chooseDemonHeir: {
    apply: (state, payload, ports) =>
      chooseDemonHeir(state, payload.stepKey, payload.heirId, ports),
  },
  openNominations: { apply: (state, _payload, ports) => openNominations(state, ports) },
  nominate: {
    apply: (state, payload, ports) =>
      nominate(
        state,
        payload.nominatorId,
        payload.nomineeId,
        payload.options as Parameters<typeof nominate>[3],
        ports,
      ),
  },
  recordVirginNomination: {
    apply: (state, payload, ports) =>
      recordVirginNomination(
        state,
        payload.nominatorId,
        payload.virginId,
        payload.options as Parameters<typeof recordVirginNomination>[3],
        ports,
      ),
  },
  recordVotes: {
    apply: (state, payload, ports) =>
      recordVotes(state, payload.nominationId, payload.voterIds, ports),
  },
  setVoteCount: {
    apply: (state, payload, ports) => setVoteCount(state, payload.playerId, payload.count, ports),
  },
  setDeadVoteUsed: {
    apply: (state, payload, ports) => setDeadVoteUsed(state, payload.playerId, payload.used, ports),
  },
  cancelNomination: {
    apply: (state, payload, ports) => cancelNomination(state, payload.nominationId, ports),
  },
  resetVotes: {
    apply: (state, payload, ports) =>
      resetVotes(state, payload.nominationId, payload.reason, ports),
  },
  execute: {
    apply: (state, payload, ports) =>
      execute(state, payload.nominationId, payload.options as Parameters<typeof execute>[2], ports),
  },
  executeByDecision: {
    apply: (state, payload, ports) =>
      executeByDecision(
        state,
        payload.playerId,
        payload.options as Parameters<typeof executeByDecision>[2],
        ports,
      ),
  },
  madnessPenalty: {
    apply: (state, payload, ports) =>
      applyMadnessPenalty(
        state,
        payload.playerId,
        payload.penalty,
        payload.reason,
        payload.effectId,
        ports,
      ),
  },
  endDay: { apply: (state, _payload, ports) => endDay(state, ports) },
  useSlayer: {
    apply: (state, payload, ports) =>
      useSlayer(
        state,
        payload.slayerId,
        payload.targetId,
        payload.options as Parameters<typeof useSlayer>[3],
        ports,
      ),
  },
  gossipStatement: {
    apply: (state, payload, ports) => gossipStatement(state, Boolean(payload.truth), ports),
  },
  jugglerGuess: { apply: (state, payload, ports) => applyJugglerGuess(state, payload, ports) },
  artistQuestion: {
    apply: (state, payload, ports) =>
      artistQuestion(state, payload.playerId, payload.question, payload.answer, ports),
  },
  savantVisit: {
    apply: (state, payload, ports) =>
      savantVisit(state, payload.playerId, payload.statements, payload.truth, ports),
  },
  recordAbnormal: {
    apply: (state, payload, ports) =>
      recordAbnormal(state, payload.playerId, payload.reason, ports),
  },
  moonchildChoice: {
    apply: (state, payload, ports) => moonchildChoice(state, payload.targetId, ports),
  },
  recordKlutzChoice: {
    apply: (state, payload, ports) => recordKlutzChoice(state, payload.targetId, ports),
  },
  tinkerDeath: {
    apply: (state, payload, ports) => tinkerDeath(state, payload.playerId, ports),
  },
  recoverClaim: {
    apply: (state, payload, ports) => recoverClaim(state, payload.playerId, payload.reason, ports),
  },
  dealGame: {
    apply: (state, payload, ports) =>
      dealGame(state, payload.options as Parameters<typeof dealGame>[1], ports),
  },
  startGame: {
    apply: (state, payload, ports) => {
      const options = asRecordOrNull(payload.options) || {};
      const assignment = asRecordOrNull(options.assignment);
      return startGame(
        state,
        {
          ...(assignment ? { assignment: assignment as Record<string, string> } : {}),
          secrets: options.secrets !== false,
        },
        ports,
      );
    },
  },
  claimSeat: {
    apply: (state, payload, ports) => claimSeat(state, payload.playerId, payload.name, ports),
  },
  autoSecrets: {
    apply: (state, payload) =>
      autoSecrets(state, payload.options as Parameters<typeof autoSecrets>[1]),
  },
  manualCorrection: {
    apply: (state, payload, ports) => manualCorrection(state, payload.change, ports),
  },
  recordBmrOutcome: {
    apply: (state, payload, ports) =>
      recordBmrOutcome(
        state,
        payload.stepKey,
        payload.options as Parameters<typeof recordBmrOutcome>[2],
        ports,
      ),
  },
  recordSvOutcome: {
    apply: (state, payload, ports) =>
      recordSvOutcome(state, payload.stepKey, payload.options || {}, ports),
  },
  resurrectPlayer: {
    apply: (state, payload, ports) => {
      const guard = lifecycleGuard(state, "resurrectPlayer");
      if (guard) return guard;
      const player = resurrectPlayer(state, payload.playerId, {}, ports);
      return player
        ? { ok: true, playerId: player.id }
        : { ok: false, error: "Игрок не может вернуться." };
    },
  },
  setWinner: {
    apply: (state, payload, ports) => setWinner(state, payload.team, payload.reason, ports),
  },
  bagUpdate: { apply: (state, payload, ports) => bagUpdate(state, payload, ports) },
  setOrder: { apply: (state, payload, ports) => setOrder(state, payload, ports) },
  setHerring: { apply: (state, payload) => setHerring(state, payload) },
  setSetupInfo: { apply: (state, payload) => setupInfo(state, payload) },
  setSetupInfoZero: {
    apply: (state, payload) =>
      setupInfo(state, { roleId: payload.roleId, info: { zero: true as const, pair: [] as [] } }),
  },
  normalizeSecrets: { apply: (state) => normalizeSecrets(state), undoable: false },
  setNotes: { apply: (state, payload) => setNotes(state, payload), undoable: false },
  setReviewOpen: { apply: (state, payload) => setReviewOpen(state, payload), undoable: false },
  newGame: { apply: (state, payload, ports) => newGame(state, payload, ports), resetHistory: true },
  importGame: { apply: (state, payload) => importGame(state, payload), resetHistory: true },
} satisfies { [K in keyof CommandPayloads]: CommandSpec<K> };

type CommandName = keyof typeof COMMANDS;

function commandMeta(type: string): CommandMeta {
  return COMMANDS[type as CommandName] as CommandMeta;
}

// The payload union is narrowed by the caller's `type` at compile time; the
// runtime gate is validatePayload (contracts), which prepareCommand runs.
function runCommand(
  type: string,
  state: GameState,
  payload: Record<string, unknown>,
  ports: CommandExecutionContext,
): unknown {
  const spec = COMMANDS[type as CommandName] as {
    apply: (s: GameState, p: Record<string, unknown>, ports: CommandExecutionContext) => unknown;
  };
  return spec.apply(state, payload, ports);
}

interface StoredCommand {
  type: string;
  fingerprint: string | null;
  identity: string | null;
  at: string | null;
  result: Record<string, unknown> | null;
  followUp: Record<string, unknown> | null;
  undoable: boolean;
}

function storedCommand(state: GameState, id: string): StoredCommand | null {
  const applied = state.applied && state.applied[id];
  if (applied) {
    return {
      type: applied.type,
      fingerprint: applied.fingerprint || null,
      identity: applied.identity || null,
      at: applied.at || null,
      result: applied.result || null,
      followUp: applied.followUp || null,
      undoable: applied.undoable !== false,
    };
  }
  // An older save may have a record-only id only in the journal.
  const entries =
    state.journal && Array.isArray(state.journal.entries) ? state.journal.entries : [];
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) return null;
  return {
    type: entry.type,
    fingerprint: entry.fingerprint || null,
    identity: null,
    at: entry.at || null,
    result: null,
    followUp: null,
    undoable: entry.undoable !== false,
  };
}

function matchesStored(stored: StoredCommand, type: string, fingerprint: string): boolean {
  if (stored.identity) return stored.identity === identityOf(fingerprint);
  if (stored.fingerprint) return stored.fingerprint === fingerprint;
  return stored.type === type;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return function random() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function commandPorts(seedText: string, at: Date, runtime: Runtime): CommandExecutionContext {
  return createExecutionContext(
    () => at.toISOString(),
    seededRandom(runtime.random.seed(seedText)),
  );
}

// Capture the command timestamp once per (id, fingerprint, initial state).
// The capture lives in the runtime: a store owns one, and direct engine callers
// share the default runtime until the store is the only caller.
const PREVIEW_TIMESTAMP_LIMIT = 100;

function timestampKey(command: Command, fingerprint: string, state: GameState): string {
  return command.id + "|" + fingerprint + "|" + hashString(JSON.stringify(canonicalState(state)));
}

function resolveTimestamp(
  command: Command,
  fingerprint: string,
  state: GameState,
  capture: boolean,
  runtime: Runtime,
): Date {
  if (command.at != null) return new Date(command.at);
  const key = timestampKey(command, fingerprint, state);
  const saved = runtime.timestamps.get(key);
  if (saved) return new Date(saved);
  const now = runtime.now();
  if (capture) {
    runtime.timestamps.set(key, now.toISOString());
    if (runtime.timestamps.size > PREVIEW_TIMESTAMP_LIMIT) {
      const oldest = runtime.timestamps.keys().next().value;
      if (oldest !== undefined) runtime.timestamps.delete(oldest);
    }
  }
  return now;
}

// ---------------------------------------------------------------------------
// Domain events

function eventSink(
  command: Command,
  at: string,
): { events: DomainEvent[]; push: (type: string, payload?: Record<string, unknown>) => void } {
  const events: DomainEvent[] = [];
  const push = (type: string, payload?: Record<string, unknown>) => {
    events.push({
      id: command.id + ":" + (events.length + 1),
      type,
      commandId: command.id,
      commandType: command.type,
      at,
      phase: null,
      payload: payload || {},
    });
  };
  return { events, push };
}

function deriveEvents(
  before: GameState,
  after: GameState,
  command: Command,
  at: string,
): DomainEvent[] {
  const sink = eventSink(command, at);
  const push = sink.push;
  const inPhase = (event: DomainEvent): DomainEvent => {
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
    if (a.alive !== b.alive)
      push("player.alive_changed", {
        playerId: id,
        alive: b.alive,
        cause: b.deadAt && b.deadAt.cause,
      });
    if (a.roleId !== b.roleId)
      push("player.role_changed", { playerId: id, from: a.roleId, to: b.roleId });
    if (a.shownRoleId !== b.shownRoleId)
      push("player.shown_role_changed", { playerId: id, from: a.shownRoleId, to: b.shownRoleId });
    if (a.team !== b.team) push("player.team_changed", { playerId: id, from: a.team, to: b.team });
    if (a.registeredDead !== b.registeredDead)
      push("player.registered_dead_changed", {
        playerId: id,
        registeredDead: Boolean(b.registeredDead),
      });
    if (a.voteToken !== b.voteToken)
      push("player.vote_token_changed", { playerId: id, voteToken: b.voteToken });
    if (a.butlerMasterId !== b.butlerMasterId)
      push("player.butler_master_changed", { playerId: id, masterId: b.butlerMasterId || null });
    if (!sameValue(a.used || {}, b.used || {}))
      push("player.used_changed", { playerId: id, used: b.used || {} });
    if (!sameValue(a.reminders || [], b.reminders || []))
      push("player.reminders_changed", { playerId: id, reminders: b.reminders || [] });
    if (!sameValue(a.deadAt || null, b.deadAt || null))
      push("player.dead_at_changed", { playerId: id, deadAt: b.deadAt || null });
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
  const beforeExecutions = new Set(
    (before.executions || []).map((execution) => execution.at + ":" + execution.playerId),
  );
  for (const execution of after.executions || []) {
    if (!beforeExecutions.has(execution.at + ":" + execution.playerId))
      push("execution.recorded", { execution });
  }

  for (const [playerId, count] of Object.entries(after.day.voteCounts || {})) {
    if (before.day.voteCounts?.[playerId] !== count)
      push("votes.count_changed", { playerId, count });
  }

  const beforeNominations = new Map(
    ((before.day && before.day.nominations) || []).map((nomination) => [nomination.id, nomination]),
  );
  const afterNominations = new Map(
    ((after.day && after.day.nominations) || []).map((nomination) => [nomination.id, nomination]),
  );
  for (const id of new Set([...beforeNominations.keys(), ...afterNominations.keys()])) {
    const a = beforeNominations.get(id);
    const b = afterNominations.get(id);
    if (!a) push("nomination.added", { nomination: b });
    else if (!b) push("nomination.cancelled", { nominationId: id });
    else if (!sameValue(a.votes || [], b.votes || []) || a.count !== b.count) {
      push("votes.recorded", {
        nominationId: id,
        count: b.count,
        threshold: b.threshold,
        votes: b.votes,
      });
    }
  }

  const beforeSteps = new Map(
    ((before.night && before.night.queue) || []).map((step) => [step.key, step]),
  );
  const afterSteps = new Map(
    ((after.night && after.night.queue) || []).map((step) => [step.key, step]),
  );
  for (const key of new Set([...beforeSteps.keys(), ...afterSteps.keys()])) {
    const a = beforeSteps.get(key);
    const b = afterSteps.get(key);
    if (!a) push("step.added", { step: b });
    else if (!b) push("step.removed", { stepKey: key });
    else {
      if (!a.done && b.done && !a.skipped && b.skipped)
        push("step.skipped", { stepKey: key, roleId: b.roleId || null });
      if (!a.done && b.done && !b.skipped)
        push("step.completed", { stepKey: key, roleId: b.roleId || null });
      if (
        !sameValue(a.targetIds || [], b.targetIds || []) ||
        !sameValue(a.given || null, b.given || null) ||
        !sameValue(a.pending || null, b.pending || null) ||
        a.note !== b.note
      ) {
        push("step.updated", { stepKey: key, roleId: b.roleId || null });
      }
    }
  }

  if (before.phase !== after.phase) push("phase.changed", { from: before.phase, to: after.phase });
  if (!before.winner && after.winner) push("winner.declared", { winner: after.winner });
  if (before.winner && !after.winner) push("winner.cleared", {});
  if (
    !sameValue(before.script || null, after.script || null) ||
    before.scriptId !== after.scriptId
  ) {
    push("script.changed", { scriptId: after.scriptId });
  }
  if (!sameValue(before.order || [], after.order || []))
    push("order.changed", { order: after.order || [] });
  if (!sameValue(before.setup || null, after.setup || null))
    push("setup.changed", { setup: after.setup });
  if (before.notes !== after.notes) push("notes.changed", { notes: after.notes });
  if (before.reviewOpen !== after.reviewOpen) push("review.changed", { open: after.reviewOpen });

  for (const event of sink.events) {
    if (event.phase === null) inPhase(event);
  }
  return sink.events;
}

function summarize(before: GameState, after: GameState, events: DomainEvent[]) {
  const deaths = (after.deaths || []).filter(
    (death) => !(before.deaths || []).some((old) => old.id === death.id),
  );
  const phase = before.phase !== after.phase ? { from: before.phase, to: after.phase } : null;
  return {
    events: events.length,
    deaths: deaths.map((death) => death.playerId),
    phase,
    winner: after.winner ? { team: after.winner.team, reason: after.winner.reason } : null,
    effects: {
      added: (after.effects || [])
        .filter((effect) => !(before.effects || []).some((old) => old.id === effect.id))
        .map((effect) => effect.id),
      deactivated: (after.effects || [])
        .filter(
          (effect) =>
            effect.active === false &&
            (before.effects || []).some((old) => old.id === effect.id && old.active !== false),
        )
        .map((effect) => effect.id),
    },
    queue: {
      added: ((after.night && after.night.queue) || [])
        .filter(
          (step) =>
            !((before.night && before.night.queue) || []).some((old) => old.key === step.key),
        )
        .map((step) => step.key),
      completed: ((after.night && after.night.queue) || [])
        .filter(
          (step) =>
            step.done &&
            !step.skipped &&
            !((before.night && before.night.queue) || []).some(
              (old) => old.key === step.key && old.done,
            ),
        )
        .map((step) => step.key),
      skipped: ((after.night && after.night.queue) || [])
        .filter(
          (step) =>
            step.skipped &&
            !((before.night && before.night.queue) || []).some(
              (old) => old.key === step.key && old.skipped,
            ),
        )
        .map((step) => step.key),
    },
  };
}

function futureOf(after: GameState, followUp: Record<string, unknown> | null) {
  const effects = (after.effects || []).filter((effect) => effect.active !== false);
  const queue = (after.night && after.night.queue) || [];
  return {
    phase: after.phase,
    winner: after.winner ? { team: after.winner.team, reason: after.winner.reason } : null,
    followUp: followUp || null,
    pendingSteps: queue
      .filter((step) => !step.done && !step.skipped)
      .map((step) => ({
        key: step.key,
        roleId: step.roleId || null,
        system: step.system || null,
        actorId: step.actorId || null,
      })),
    activeEffects: effects.map((effect) => ({
      id: effect.id,
      kind: effect.kind,
      sourceId: effect.sourceId,
      targetId: effect.targetId,
      expires: effect.expires || null,
      resolve: effect.resolve || null,
      suspended: effect.suspended || null,
      resumeOnHealthy: effect.resumeOnHealthy === true,
    })),
    delayedEffects: effects
      .filter((effect) => effect.expires || effect.resolve)
      .map((effect) => ({
        id: effect.id,
        kind: effect.kind,
        targetId: effect.targetId,
        expires: effect.expires || null,
        resolve: effect.resolve || null,
        suspended: effect.suspended || null,
        resumeOnHealthy: effect.resumeOnHealthy === true,
      })),
    pendingInheritance:
      queue.find((step) => step.pending && step.pending.kind === "demon-inheritance") || null,
  };
}

// ---------------------------------------------------------------------------
// Public API

function normalizeCommand(
  command: Command,
): { ok: true; version: string } | { ok: false; error: string; errorCode?: string } {
  if (!command || typeof command !== "object") return { ok: false, error: "Команда отсутствует." };
  if (typeof command.id !== "string" || !command.id.trim()) {
    return { ok: false, errorCode: "command-missing-id", error: "У команды нет id." };
  }
  if (typeof command.type !== "string" || !COMMANDS[command.type as CommandName]) {
    return {
      ok: false,
      errorCode: "command-unknown",
      error: "Неизвестная команда: " + command.type,
    };
  }
  if (command.payload != null && typeof command.payload !== "object") {
    return { ok: false, errorCode: "command-payload", error: "Некорректные данные команды." };
  }
  const version = commandVersion(command);
  if (!SUPPORTED_RULESET_VERSIONS.has(version)) {
    return {
      ok: false,
      errorCode: "ruleset-version-unsupported",
      error: "Версия правил не поддерживается: " + version,
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

function rejected(
  command: Command,
  reason: string,
  extra: Record<string, unknown> = {},
): RejectedResult {
  return {
    status: COMMAND_STATUS.REJECTED,
    id: (command && command.id) || null,
    type: (command && command.type) || null,
    reason,
    ...extra,
  };
}

function runDraft(
  state: GameState,
  command: Command,
  fingerprint: string,
  at: Date,
  runtime: Runtime,
) {
  const draft = clone(state);
  const atIso = at.toISOString();
  const seedText =
    command.id + "|" + fingerprint + "|" + hashString(JSON.stringify(canonicalState(state)));
  const ports: CommandExecutionContext = {
    ...commandPorts(seedText, at, runtime),
    rulesetVersion: commandVersion(command),
  };
  let outcome: DomainOutcome;
  try {
    outcome = finish(runCommand(command.type, draft, command.payload || {}, ports));
  } catch (error) {
    return {
      outcome: {
        ok: false,
        error:
          "Команда завершилась ошибкой: " +
          (error instanceof Error ? error.message : String(error)),
      },
      draft,
      at: atIso,
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
          reason: outcome.reason,
        },
        draft,
        at: atIso,
      };
    }
    return {
      outcome: rejected(command, outcome.error || "Команда отклонена.", {
        errorCode: outcome.errorCode || null,
        errors: outcome.errors || null,
      }),
      draft,
      at: atIso,
    };
  }
  const gameAt = currentAt(draft);
  const graph = effectGraph(draft, gameAt);
  if (!graph.ok) {
    return {
      outcome: rejected(command, "Циклическая зависимость эффектов.", {
        errorCode: graph.errorCode,
        errors: graph.effectIds,
      }),
      draft: state,
      at: atIso,
    };
  }
  resolveSuspendedPukkaDeaths(draft, gameAt, ports);
  const violations = checkInvariants(draft);
  if (violations.length) {
    return {
      outcome: rejected(command, "Нарушены инварианты состояния.", {
        errorCode: "invariant-violation",
        errors: violations,
      }),
      draft: state,
      at: atIso,
    };
  }
  return {
    outcome: { ok: true, result: outcome.result, followUp: asRecordOrNull(outcome.followUp) },
    draft,
    at: atIso,
  };
}

export function validateCommand(
  state: GameState,
  command: Command,
  runtime = defaultRuntime,
): CommandResult {
  const normalized = normalizeCommand(command);
  if (!normalized.ok)
    return rejected(command, normalized.error, { errorCode: normalized.errorCode });
  const fingerprint = fingerprintOf(command, normalized.version);
  const stored = storedCommand(state, command.id);
  if (stored) {
    const same = matchesStored(stored, command.type, fingerprint);
    if (!same) {
      return rejected(command, "Id команды уже использован для другого действия.", {
        errorCode: "command-id-conflict",
      });
    }
    return { status: COMMAND_STATUS.ALLOWED, id: command.id, type: command.type, idempotent: true };
  }
  const at = resolveTimestamp(command, fingerprint, state, false, runtime);
  const { outcome } = runDraft(state, command, fingerprint, at, runtime);
  if (outcome.ok) {
    return {
      status: COMMAND_STATUS.ALLOWED,
      id: command.id,
      type: command.type,
      result: asRecordOrNull(outcome.result),
      followUp: asRecordOrNull(outcome.followUp),
    };
  }
  if (outcome.status === COMMAND_STATUS.CHOICE) return outcome as CommandResult;
  return outcome as CommandResult;
}

export function previewCommand(
  state: GameState,
  command: Command,
  runtime = defaultRuntime,
): CommandResult {
  const normalized = normalizeCommand(command);
  if (!normalized.ok)
    return rejected(command, normalized.error, { errorCode: normalized.errorCode });
  const fingerprint = fingerprintOf(command, normalized.version);
  const stored = storedCommand(state, command.id);
  if (stored) {
    const same = matchesStored(stored, command.type, fingerprint);
    if (!same) {
      return rejected(command, "Id команды уже использован для другого действия.", {
        errorCode: "command-id-conflict",
      });
    }
    return {
      status: COMMAND_STATUS.ALLOWED,
      id: command.id,
      type: command.type,
      idempotent: true,
      at: stored.at || null,
      events: [],
      changes: null,
      future: futureOf(state, asRecordOrNull(stored.followUp)),
    };
  }
  const at = resolveTimestamp(command, fingerprint, state, true, runtime);
  const { outcome, draft } = runDraft(state, command, fingerprint, at, runtime);
  if (!outcome.ok) {
    if (outcome.status === COMMAND_STATUS.CHOICE) return outcome as CommandResult;
    return outcome as CommandResult;
  }
  const events = deriveEvents(state, draft, command, at.toISOString());
  return {
    status: COMMAND_STATUS.ALLOWED,
    id: command.id,
    type: command.type,
    at: at.toISOString(),
    result: asRecordOrNull(outcome.result),
    followUp: asRecordOrNull(outcome.followUp),
    events,
    changes: summarize(state, draft, events),
    future: futureOf(draft, asRecordOrNull(outcome.followUp)),
  };
}

export function applyCommand(
  state: GameState,
  command: Command,
  runtime = defaultRuntime,
): CommandResult {
  const normalized = normalizeCommand(command);
  if (!normalized.ok)
    return rejected(command, normalized.error, { errorCode: normalized.errorCode });
  const fingerprint = fingerprintOf(command, normalized.version);
  const stored = storedCommand(state, command.id);
  if (stored) {
    const same = matchesStored(stored, command.type, fingerprint);
    if (!same) {
      return rejected(command, "Id команды уже использован для другого действия.", {
        errorCode: "command-id-conflict",
      });
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
      undoable: stored.undoable !== false,
    };
  }

  const at = resolveTimestamp(command, fingerprint, state, false, runtime);
  const { outcome, draft } = runDraft(state, command, fingerprint, at, runtime);
  if (!outcome.ok) {
    if (outcome.status === COMMAND_STATUS.CHOICE) return outcome as CommandResult;
    return outcome as CommandResult;
  }

  const events = deriveEvents(state, draft, command, at.toISOString());
  const changes = summarize(state, draft, events);
  const entry = commandMeta(command.type);
  const undoable = entry.undoable !== false;
  // The base is the state before the first recorded command of this history.
  let base: GameState | null = null;
  if (!state.journal || !state.journal.base) {
    base = clone(state);
    // Legacy callers may omit the ledger; the replay base needs the same
    // normalization as the accepted state below.
    base.applied = base.applied || {};
    delete (base as Partial<GameState>).journal;
  }
  replaceContents(state, draft);
  state.applied = state.applied || {};
  state.applied[command.id] = {
    type: command.type,
    at: at.toISOString(),
    rulesetVersion: normalized.version,
    identity: identityOf(fingerprint),
    followUp: asRecordOrNull(outcome.followUp),
    result: null,
    undoable,
  };
  recordJournalEntry(
    state,
    command,
    entry,
    normalized.version,
    fingerprint,
    at.toISOString(),
    undoable,
    base,
  );
  return {
    status: COMMAND_STATUS.ALLOWED,
    id: command.id,
    type: command.type,
    at: at.toISOString(),
    result: asRecordOrNull(outcome.result),
    followUp: asRecordOrNull(outcome.followUp),
    events,
    changes,
    undoable,
    resetHistory: Boolean(entry.resetHistory),
  };
}
