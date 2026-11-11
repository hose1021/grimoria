import type { DeadAt, Effect, EffectGraphResult, GameState, Player } from "./types.js";

type TopoResult = { ok: true; order: Effect[] } | { ok: false; cycle: string[] };
type ResolveResult = EffectGraphResult;

// Unified poison/drunk dependency graph. Pure: no DOM, no persistence.
//
// An impairing effect is inactive while its living source is impaired by
// another active effect. Effects resolve in dependency order, so a later
// poison can suspend an earlier one. Creation order decides which effect was
// validly created in a cycle; an unresolvable cycle is rejected.

export const CYCLIC_EFFECT_DEPENDENCY = "CYCLIC_EFFECT_DEPENDENCY";

function cycleOf(at: DeadAt | null | undefined): number {
  if (!at) return 1;
  const number = Number(at.number) || 0;
  return at.phase === "day" ? number * 2 : number * 2 - 1;
}

function stateAt(state: GameState): DeadAt {
  if (state && state.phase === "day" && state.day) {
    return { phase: "day", number: state.day.number || 0 };
  }
  return { phase: "night", number: (state && state.night && state.night.number) || 0 };
}

function effectCycle(effect: Effect): number {
  return effect.start ? cycleOf(effect.start) : -Infinity;
}

function started(effect: Effect, at: DeadAt): boolean {
  return !effect.start || cycleOf(effect.start) <= cycleOf(at);
}

function expired(effect: Effect, at: DeadAt): boolean {
  return Boolean(effect.expires) && cycleOf(at) >= cycleOf(effect.expires as DeadAt);
}

function impairing(effect: Effect): boolean {
  return Boolean(effect) && (effect.kind === "poison" || effect.kind === "drunk");
}

function validSource(effect: Effect, players: Record<string, Player>): boolean {
  const source = effect.sourceId == null ? null : players[effect.sourceId];
  if (!source || source.roleId === "drunk") return false;
  if (effect.kind === "poison") return Boolean(source.alive);
  // A philosopher-granted drunk ends when the Philosopher dies.
  if (effect.kind === "drunk" && effect.philosopher === true) return Boolean(source.alive);
  return true;
}

function compareEffects(left: Effect, right: Effect): number {
  const leftCycle = effectCycle(left);
  const rightCycle = effectCycle(right);
  if (leftCycle !== rightCycle) return leftCycle - rightCycle;
  return String(left.id).localeCompare(String(right.id));
}

function topological(list: Effect[]): TopoResult {
  const byId: Map<string, Effect> = new Map(list.map((effect) => [effect.id, effect]));
  const ids = [...byId.keys()].sort();
  const edges: Map<string, Set<string>> = new Map(ids.map((id) => [id, new Set()]));
  const indegree: Map<string, number> = new Map(ids.map((id) => [id, 0]));

  for (const from of list) {
    const fromEdges = edges.get(from.id);
    if (!fromEdges) continue;
    for (const to of list) {
      if (from === to) continue;
      if (String(from.targetId) !== String(to.sourceId)) continue;
      if (fromEdges.has(to.id)) continue;
      fromEdges.add(to.id);
      indegree.set(to.id, (indegree.get(to.id) || 0) + 1);
    }
  }

  const ready = ids.filter((id) => indegree.get(id) === 0);
  const order: Effect[] = [];
  while (ready.length) {
    ready.sort((left, right) => {
      const leftEffect = byId.get(left);
      const rightEffect = byId.get(right);
      if (!leftEffect || !rightEffect) return 0;
      return compareEffects(leftEffect, rightEffect);
    });
    const id = ready.shift() as string;
    const effect = byId.get(id);
    if (effect) order.push(effect);
    const nextIds = edges.get(id);
    if (!nextIds) continue;
    for (const next of [...nextIds].sort()) {
      const nextDegree = (indegree.get(next) || 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) ready.push(next);
    }
  }

  if (order.length !== list.length) {
    return {
      ok: false,
      cycle: ids.filter((id) => !order.some((effect) => effect.id === id)),
    };
  }
  return { ok: true, order };
}

function resolveAt(state: GameState, at: DeadAt, candidates: Effect[]): ResolveResult {
  const players = state.players || {};
  const impaired: Set<string> = new Set();
  for (const player of Object.values(players)) {
    if (player && player.roleId === "drunk") impaired.add(String(player.id));
  }

  const list = candidates.filter(
    (effect) =>
      impairing(effect) &&
      effect.active !== false &&
      started(effect, at) &&
      !expired(effect, at) &&
      validSource(effect, players),
  );
  const sorted = topological(list);
  if (!sorted.ok) {
    return { ok: false, errorCode: CYCLIC_EFFECT_DEPENDENCY, effectIds: sorted.cycle.sort() };
  }

  const activePoison: Set<string> = new Set();
  const activeDrunk: Set<string> = new Set();
  for (const effect of sorted.order) {
    const sourceId = String(effect.sourceId);
    const source = effect.sourceId == null ? null : players[effect.sourceId];
    // A dead source keeps an on-death drunk effect (Sweetheart) alive, but not
    // a philosopher-granted drunk.
    const deadDrunk =
      effect.kind === "drunk" && effect.philosopher !== true && source && !source.alive;
    if (impaired.has(sourceId) && !deadDrunk) continue;
    if (effect.kind === "poison") activePoison.add(effect.id);
    else activeDrunk.add(effect.id);
    if (effect.targetId != null) impaired.add(String(effect.targetId));
  }
  return { ok: true, activePoison, activeDrunk, impaired };
}

function creationInvalid(
  state: GameState,
  effects: Effect[],
): { ok: true; invalid: Set<string> } | { ok: false; errorCode: string; effectIds: string[] } {
  const players = state.players || {};
  const invalid: Set<string> = new Set();
  const ordered = [...effects].sort(compareEffects);
  for (const effect of ordered) {
    if (!effect.start) continue;
    const earlier = effects.filter(
      (other) =>
        other !== effect && !invalid.has(other.id) && effectCycle(other) < effectCycle(effect),
    );
    if (!earlier.length) continue;
    const historical = resolveAt(state, effect.start, earlier);
    if (!historical.ok) return historical;
    const source = effect.sourceId == null ? null : players[effect.sourceId];
    if (effect.kind === "drunk" && effect.philosopher !== true && source && !source.alive) continue;
    if (historical.impaired.has(String(effect.sourceId))) invalid.add(effect.id);
  }
  return { ok: true, invalid };
}

export function effectGraph(state: GameState, at: DeadAt = stateAt(state)): ResolveResult {
  const effects = ((state && state.effects) || []).filter(impairing);
  const creation = creationInvalid(state, effects);
  if (!creation.ok) return creation;
  const current = effects.filter((effect) => !creation.invalid.has(effect.id));

  // Reject a cycle that only appears at a future start or expiry, including a
  // saved game still in setup. The current-time result is returned below.
  const probes: Map<string, DeadAt> = new Map();
  const addProbe = (time: DeadAt | null | undefined) => {
    if (time) probes.set(time.phase + ":" + time.number, time);
  };
  addProbe(at);
  for (const effect of current) {
    addProbe(effect.start);
    addProbe(effect.expires);
  }
  for (const probe of probes.values()) {
    const resolved = resolveAt(state, probe, current);
    if (!resolved.ok) return resolved;
  }
  return resolveAt(state, at, current);
}
