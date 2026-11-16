import type { DeadAt, GameState, NightStep, RoleId } from "../model/types.ts";
import { livingPlayers, playerById, registersAlive } from "../model/state.ts";
import { roleTeam } from "../model/rules.ts";
import type {
  AbilityDecision,
  DayContext,
  DayDecision,
  PendingDeathFact,
  RoleEffect,
  TransformationContext,
  TransformationDecision,
  InformationContext,
  InformationDecision,
  ExecutionContext,
  ExecutionDecision,
} from "../roles/ability.ts";
import type { RoleModule } from "../roles/types.ts";
import { setStepNote } from "./context.ts";
import { systemPorts } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { checkWin, kill, resolveDemonDeath } from "./death.ts";
import { isImpaired } from "./effects.ts";
import { delayPukkaDeath, poisonPukkaPlayer, pukkaPendings, resolvePukkaDeath } from "./pukka.ts";

/**
 * Runs one module-declared ability and applies its intents through the shared
 * mechanics. The module receives read-only facts, so it cannot write state.
 * A step without an actor, or a module without an ability, does nothing.
 */
export function applyRoleAbility(
  state: GameState,
  module: RoleModule,
  step: NightStep,
  targets: readonly string[],
  at: DeadAt,
  chosenRoleId: RoleId | null,
  ports: CommandExecutionContext = systemPorts,
): void {
  const ability = module.ability;
  const actorId = step.actorId;
  if (!ability || !actorId) return;
  const decision = ability.resolve({
    actorId,
    targetIds: targets,
    chosenRoleId,
    impaired: isImpaired(state, actorId, at),
    at: { phase: "night", number: at.number },
    pendings: pukkaPendings(state, actorId).map((effect): PendingDeathFact => ({
      id: effect.id,
      playerId: effect.targetId == null ? null : String(effect.targetId),
      suspended: Boolean(effect.suspended),
      resumeOnHealthy: effect.resumeOnHealthy === true,
      resolveAtNight: effect.resolve ? Number(effect.resolve.number) : null,
    })),
    actualRoleOf: (playerId) => playerById(state, playerId)?.roleId ?? null,
    hasPlayer: (playerId) => playerById(state, playerId) != null,
  });
  applyDecision(state, module, step, decision, at, actorId, ports);
}

function applyDecision(
  state: GameState,
  module: RoleModule,
  step: NightStep,
  decision: AbilityDecision,
  at: DeadAt,
  actorId: string,
  ports: CommandExecutionContext,
): void {
  if (decision.kind === "no-effect") return;
  if (decision.kind === "suppressed") {
    for (const effect of decision.effects || []) {
      applyEffect(state, module, effect, at, actorId, ports);
    }
    setStepNote(
      step,
      decision.noteKey || "note.abilityFailed",
      null,
      decision.text || "Способность не сработала: игрок отравлен или пьян.",
    );
    if (decision.result) step.result = { ...decision.result };
    return;
  }
  const resolved = [];
  for (const effect of decision.effects) {
    const outcome = applyEffect(state, module, effect, at, actorId, ports);
    if (outcome) resolved.push(outcome);
  }
  if (decision.note) {
    setStepNote(step, decision.note.key, decision.note.vars || null, decision.note.text);
  }
  if (decision.result) {
    const result: Record<string, unknown> = { ...decision.result };
    if (resolved.length) {
      const last = resolved.at(-1);
      if (last && typeof last === "object" && "death" in last) {
        result.deaths = last.death ? [last.death] : [];
        result.resolved = last;
      }
    }
    step.result = result;
  }
}

function applyEffect(
  state: GameState,
  module: RoleModule,
  effect: RoleEffect,
  at: DeadAt,
  actorId: string,
  ports: CommandExecutionContext,
): unknown {
  switch (effect.kind) {
    case "kill":
      // The ability name and the edition marker are engine bookkeeping, so
      // they come from the module, not from the role's intent.
      kill(
        state,
        effect.playerId,
        effect.cause || "ability",
        at,
        module.edition === "bmr" ? { ability: module.id, bmr: true } : { ability: module.id },
        ports,
      );
      return null;
    case "poison":
      return poisonPukkaPlayer(state, actorId, effect.playerId, at);
    case "delay-death":
      return delayPukkaDeath(state, actorId, effect.playerId, at, effect.resolveAtNight);
    case "suspend-death": {
      const pending = state.effects.find((candidate) => candidate.id === effect.pendingId);
      if (!pending) return null;
      pending.suspended = effect.reason;
      if (effect.resumeOnHealthy !== undefined) pending.resumeOnHealthy = effect.resumeOnHealthy;
      return null;
    }
    case "release-poisons":
      for (const candidate of state.effects) {
        if (candidate.kind !== "poison" || candidate.pukka !== true) continue;
        if (candidate.sourceId !== actorId) continue;
        if (candidate.targetId === effect.keepPlayerId) continue;
        candidate.active = false;
      }
      return null;
    case "resolve-death": {
      const pending = state.effects.find((candidate) => candidate.id === effect.pendingId) || null;
      return resolvePukkaDeath(state, pending, at, {}, ports);
    }
  }
}

/**
 * Runs a module's transformation capability for one cause. The caller applies
 * the returned decision through the shared character-change path.
 */
export function resolveTransformationCapability(
  module: RoleModule,
  context: TransformationContext,
): TransformationDecision | null {
  const capability = (module.capabilities || []).find(
    (candidate): candidate is Extract<typeof candidate, { kind: "transformation" }> =>
      candidate.kind === "transformation" && candidate.cause === context.cause,
  );
  return capability ? capability.resolve(context) : null;
}

/** Runs a module's information capability for one info kind. */
export function resolveInformationCapability(
  module: RoleModule,
  context: InformationContext,
): InformationDecision | null {
  const capability = (module.capabilities || []).find(
    (candidate): candidate is Extract<typeof candidate, { kind: "information" }> =>
      candidate.kind === "information" && candidate.infoKind === context.infoKind,
  );
  return capability ? capability.resolve(context) : null;
}

/** Runs a module's execution contribution for one executed player. */
export function resolveExecutionCapability(
  module: RoleModule,
  context: ExecutionContext,
): ExecutionDecision | null {
  const capability = (module.capabilities || []).find(
    (candidate): candidate is Extract<typeof candidate, { kind: "execution" }> =>
      candidate.kind === "execution",
  );
  return capability ? capability.resolve(context) : null;
}

export function applyDayCapability(
  state: GameState,
  module: RoleModule,
  context: DayContext,
  ports: CommandExecutionContext = systemPorts,
): { handled: boolean; result?: Readonly<Record<string, unknown>> } {
  const capability = (module.capabilities || []).find(
    (candidate): candidate is Extract<typeof candidate, { kind: "day-action" }> =>
      candidate.kind === "day-action" && candidate.action === context.action,
  );
  if (!capability) return { handled: false };

  const decision: DayDecision = capability.resolve(context);
  if (decision.kind === "no-effect") return { handled: true, result: { hit: false } };
  if (decision.kind === "record") return { handled: true, result: decision.result };

  const result: Record<string, unknown> = {};
  for (const effect of decision.effects) {
    if (effect.kind !== "kill") continue;
    const target = playerById(state, effect.playerId);
    const livingBefore = livingPlayers(state).filter(registersAlive).length;
    const cause = effect.cause || "ability";
    const death = kill(state, effect.playerId, cause, context.at, {}, ports);
    let inheritance = null;
    if (death && effect.succession && target && roleTeam(target.roleId || "") === "demon") {
      inheritance = resolveDemonDeath(
        state,
        {
          playerId: effect.playerId,
          roleId: target.roleId,
          cause,
          livingBefore,
          at: context.at,
        },
        ports,
      );
    }
    if (effect.succession) checkWin(state, {}, ports);
    result.hit = true;
    result.death = death;
    result.inheritance = inheritance;
  }
  return { handled: true, result };
}
