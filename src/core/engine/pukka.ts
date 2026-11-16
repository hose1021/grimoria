import type { DeadAt, Effect, GameState } from "../model/types.ts";
import { playerById } from "../model/state.ts";

import { currentAt, cycleOf } from "./context.ts";
import { kill, checkWin } from "./death.ts";
import { effectActive } from "./effects.ts";
import { systemPorts } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";

// The Pukka's poison and its delayed death are two effects from one ability:
// the poison impairs the target from the moment it is chosen, and the pending
// death resolves at the next Pukka step (or an Exorcist skip). A dead or
// impaired Pukka keeps the pending death on hold until the source is healthy
// again (wiki r3074). The role resolver decides; these helpers are the shared
// effect mechanics it and the engine coordinator use.
function pendingOrder(effect: Effect): number {
  return effect.resolve ? cycleOf(effect.resolve) : -Infinity;
}

function sortPendings(left: Effect, right: Effect): number {
  return (
    pendingOrder(left) - pendingOrder(right) || String(left.id).localeCompare(String(right.id))
  );
}

export function pukkaPendings(state: GameState, sourceId: string): Effect[] {
  return state.effects
    .filter(
      (effect) =>
        effect.kind === "pukka-death" && effect.sourceId === sourceId && effect.active !== false,
    )
    .sort(sortPendings);
}

export function resolvePukkaDeath(
  state: GameState,
  pending: Effect | null,
  at: DeadAt,
  { allowResume = false }: { allowResume?: boolean } = {},
  ports: CommandExecutionContext = systemPorts,
) {
  if (!pending) return null;
  if (pending.resumeOnHealthy && !allowResume) return null;
  if (!effectActive(state, pending, at)) return null;
  if (pending.resolve && cycleOf(at) < cycleOf(pending.resolve)) return null;
  const target = pending.targetId == null ? null : playerById(state, pending.targetId);
  const wasAlive = Boolean(target && target.alive);
  // Kill while the poison is still active so the death record keeps the
  // impaired state; then the victim becomes healthy.
  const death =
    wasAlive && target
      ? kill(state, target.id, "ability", at, { demon: true, ability: "pukka" }, ports)
      : null;
  // Choosing the same player twice leaves two Pukka poisons on the victim.
  // Clearing every Pukka effect for this source and target restores health
  // without touching poison from another source.
  for (const effect of state.effects) {
    if (effect.sourceId !== pending.sourceId || effect.targetId !== pending.targetId) continue;
    if (effect.kind === "pukka-death" || (effect.kind === "poison" && effect.pukka === true)) {
      effect.active = false;
    }
  }
  return { targetId: pending.targetId, death, skipped: !wasAlive, prevented: wasAlive && !death };
}

// A self-target suspension waits for the Pukka to become healthy; resolve it
// inside the command that removes the impairment, not on a later Pukka step.
export function resolveSuspendedPukkaDeaths(
  state: GameState,
  at: DeadAt = currentAt(state),
  ports: CommandExecutionContext = systemPorts,
) {
  const pendings = state.effects
    .filter(
      (effect) =>
        effect.kind === "pukka-death" && effect.active !== false && effect.resumeOnHealthy === true,
    )
    .sort(sortPendings);
  const resolved = [];
  for (const pending of pendings) {
    const result = resolvePukkaDeath(state, pending, at, { allowResume: true }, ports);
    if (result) resolved.push(result);
  }
  if (resolved.some((result) => result.death)) checkWin(state, {}, ports);
  return resolved;
}

/** The poison half of the Pukka ability; the delayed death is a separate effect. */
export function poisonPukkaPlayer(
  state: GameState,
  sourceId: string,
  targetId: string,
  at: DeadAt,
) {
  if (!playerById(state, targetId)) return null;
  const poison = {
    id: "eff-pukka-poison-" + sourceId + "-" + at.number,
    kind: "poison",
    pukka: true,
    sourceId,
    targetId,
    start: at,
    expires: null,
    active: true,
  };
  state.effects.push(poison);
  return poison;
}

/** The delayed death half of the Pukka ability. */
export function delayPukkaDeath(
  state: GameState,
  sourceId: string,
  targetId: string,
  at: DeadAt,
  resolveAtNight: number,
): Effect | null {
  if (!playerById(state, targetId)) return null;
  const pending = {
    id: "eff-pukka-death-" + sourceId + "-" + at.number,
    kind: "pukka-death",
    sourceId,
    targetId,
    start: at,
    resolve: { phase: "night", number: resolveAtNight } as DeadAt,
    expires: null,
    active: true,
  };
  state.effects.push(pending);
  return pending;
}
