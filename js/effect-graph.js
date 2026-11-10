// @ts-check
// Unified poison/drunk dependency graph. Pure: no DOM, no persistence.
//
// An impairing effect is inactive while its living source is impaired by
// another active effect. Effects resolve in dependency order, so a later
// poison can suspend an earlier one. Creation order decides which effect was
// validly created in a cycle; an unresolvable cycle is rejected.

/** @typedef {import("./types.js").GameState} GameState */
/** @typedef {import("./types.js").Effect} Effect */
/** @typedef {import("./types.js").DeadAt} DeadAt */
/** @typedef {import("./types.js").Player} Player */
/** @typedef {{ ok: true, order: Effect[] } | { ok: false, cycle: string[] }} TopoResult */
/** @typedef {import("./types.js").EffectGraphResult} ResolveResult */

export const CYCLIC_EFFECT_DEPENDENCY = "CYCLIC_EFFECT_DEPENDENCY";

/** @param {DeadAt | null | undefined} at @returns {number} */
function cycleOf(at) {
  if (!at) return 1;
  const number = Number(at.number) || 0;
  return at.phase === "day" ? number * 2 : number * 2 - 1;
}

/** @param {GameState} state @returns {DeadAt} */
function stateAt(state) {
  if (state && state.phase === "day" && state.day) {
    return { phase: "day", number: state.day.number || 0 };
  }
  return { phase: "night", number: (state && state.night && state.night.number) || 0 };
}

/** @param {Effect} effect @returns {number} */
function effectCycle(effect) {
  return effect.start ? cycleOf(effect.start) : -Infinity;
}

/** @param {Effect} effect @param {DeadAt} at @returns {boolean} */
function started(effect, at) {
  return !effect.start || cycleOf(effect.start) <= cycleOf(at);
}

/** @param {Effect} effect @param {DeadAt} at @returns {boolean} */
function expired(effect, at) {
  return Boolean(effect.expires) && cycleOf(at) >= cycleOf(/** @type {DeadAt} */ (effect.expires));
}

/** @param {Effect} effect @returns {boolean} */
function impairing(effect) {
  return Boolean(effect) && (effect.kind === "poison" || effect.kind === "drunk");
}

/** @param {Effect} effect @param {Record<string, Player>} players @returns {boolean} */
function validSource(effect, players) {
  const source = effect.sourceId == null ? null : players[effect.sourceId];
  if (!source || source.roleId === "drunk") return false;
  return effect.kind === "poison" ? Boolean(source.alive) : true;
}

/** @param {Effect} left @param {Effect} right @returns {number} */
function compareEffects(left, right) {
  const leftCycle = effectCycle(left);
  const rightCycle = effectCycle(right);
  if (leftCycle !== rightCycle) return leftCycle - rightCycle;
  return String(left.id).localeCompare(String(right.id));
}

/** @param {Effect[]} list @returns {TopoResult} */
function topological(list) {
  /** @type {Map<string, Effect>} */
  const byId = new Map(list.map((effect) => [effect.id, effect]));
  const ids = [...byId.keys()].sort();
  /** @type {Map<string, Set<string>>} */
  const edges = new Map(ids.map((id) => [id, new Set()]));
  /** @type {Map<string, number>} */
  const indegree = new Map(ids.map((id) => [id, 0]));

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
  /** @type {Effect[]} */
  const order = [];
  while (ready.length) {
    ready.sort((left, right) => {
      const leftEffect = byId.get(left);
      const rightEffect = byId.get(right);
      if (!leftEffect || !rightEffect) return 0;
      return compareEffects(leftEffect, rightEffect);
    });
    const id = /** @type {string} */ (ready.shift());
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
      cycle: ids.filter((id) => !order.some((effect) => effect.id === id))
    };
  }
  return { ok: true, order };
}

/** @param {GameState} state @param {DeadAt} at @param {Effect[]} candidates @returns {ResolveResult} */
function resolveAt(state, at, candidates) {
  const players = state.players || {};
  /** @type {Set<string>} */
  const impaired = new Set();
  for (const player of Object.values(players)) {
    if (player && player.roleId === "drunk") impaired.add(String(player.id));
  }

  const list = candidates.filter((effect) => (
    impairing(effect)
    && effect.active !== false
    && started(effect, at)
    && !expired(effect, at)
    && validSource(effect, players)
  ));
  const sorted = topological(list);
  if (!sorted.ok) {
    return { ok: false, errorCode: CYCLIC_EFFECT_DEPENDENCY, effectIds: sorted.cycle.sort() };
  }

  /** @type {Set<string>} */
  const activePoison = new Set();
  /** @type {Set<string>} */
  const activeDrunk = new Set();
  for (const effect of sorted.order) {
    const sourceId = String(effect.sourceId);
    const source = effect.sourceId == null ? null : players[effect.sourceId];
    // A dead source keeps an on-death drunk effect (Sweetheart) alive.
    const deadDrunk = effect.kind === "drunk" && source && !source.alive;
    if (impaired.has(sourceId) && !deadDrunk) continue;
    if (effect.kind === "poison") activePoison.add(effect.id);
    else activeDrunk.add(effect.id);
    if (effect.targetId != null) impaired.add(String(effect.targetId));
  }
  return { ok: true, activePoison, activeDrunk, impaired };
}

/** @param {GameState} state @param {Effect[]} effects @returns {{ ok: true, invalid: Set<string> } | { ok: false, errorCode: string, effectIds: string[] }} */
function creationInvalid(state, effects) {
  const players = state.players || {};
  /** @type {Set<string>} */
  const invalid = new Set();
  const ordered = [...effects].sort(compareEffects);
  for (const effect of ordered) {
    if (!effect.start) continue;
    const earlier = effects.filter((other) => (
      other !== effect
      && !invalid.has(other.id)
      && effectCycle(other) < effectCycle(effect)
    ));
    if (!earlier.length) continue;
    const historical = resolveAt(state, effect.start, earlier);
    if (!historical.ok) return historical;
    const source = effect.sourceId == null ? null : players[effect.sourceId];
    if (effect.kind === "drunk" && source && !source.alive) continue;
    if (historical.impaired.has(String(effect.sourceId))) invalid.add(effect.id);
  }
  return { ok: true, invalid };
}

/** @param {GameState} state @param {DeadAt} [at] @returns {ResolveResult} */
export function effectGraph(state, at = stateAt(state)) {
  const effects = ((state && state.effects) || []).filter(impairing);
  const creation = creationInvalid(state, effects);
  if (!creation.ok) return creation;
  const current = effects.filter((effect) => !creation.invalid.has(effect.id));

  // Reject a cycle that only appears at a future start or expiry, including a
  // saved game still in setup. The current-time result is returned below.
  /** @type {Map<string, DeadAt>} */
  const probes = new Map();
  /** @param {DeadAt | null | undefined} time */
  const addProbe = (time) => {
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
