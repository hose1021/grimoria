// Unified poison/drunk dependency graph. Pure: no DOM, no persistence.
//
// An impairing effect is inactive while its living source is impaired by
// another active effect. Effects resolve in dependency order, so a later
// poison can suspend an earlier one. Creation order decides which effect was
// validly created in a cycle; an unresolvable cycle is rejected.

export const CYCLIC_EFFECT_DEPENDENCY = "CYCLIC_EFFECT_DEPENDENCY";

function cycleOf(at) {
  if (!at) return 1;
  const number = Number(at.number) || 0;
  return at.phase === "day" ? number * 2 : number * 2 - 1;
}

function stateAt(state) {
  if (state && state.phase === "day" && state.day) {
    return { phase: "day", number: state.day.number || 0 };
  }
  return { phase: "night", number: (state && state.night && state.night.number) || 0 };
}

function effectCycle(effect) {
  return effect.start ? cycleOf(effect.start) : -Infinity;
}

function started(effect, at) {
  return !effect.start || cycleOf(effect.start) <= cycleOf(at);
}

function expired(effect, at) {
  return Boolean(effect.expires) && cycleOf(at) >= cycleOf(effect.expires);
}

function impairing(effect) {
  return Boolean(effect) && (effect.kind === "poison" || effect.kind === "drunk");
}

function validSource(effect, players) {
  const source = players[effect.sourceId];
  if (!source || source.roleId === "drunk") return false;
  return effect.kind === "poison" ? Boolean(source.alive) : true;
}

function compareEffects(left, right) {
  const leftCycle = effectCycle(left);
  const rightCycle = effectCycle(right);
  if (leftCycle !== rightCycle) return leftCycle - rightCycle;
  return String(left.id).localeCompare(String(right.id));
}

function topological(list) {
  const byId = new Map(list.map((effect) => [effect.id, effect]));
  const ids = [...byId.keys()].sort();
  const edges = new Map(ids.map((id) => [id, new Set()]));
  const indegree = new Map(ids.map((id) => [id, 0]));

  for (const from of list) {
    for (const to of list) {
      if (from === to) continue;
      if (String(from.targetId) !== String(to.sourceId)) continue;
      if (edges.get(from.id).has(to.id)) continue;
      edges.get(from.id).add(to.id);
      indegree.set(to.id, indegree.get(to.id) + 1);
    }
  }

  const ready = ids.filter((id) => indegree.get(id) === 0);
  const order = [];
  while (ready.length) {
    ready.sort((left, right) => compareEffects(byId.get(left), byId.get(right)));
    const id = ready.shift();
    order.push(byId.get(id));
    for (const next of [...edges.get(id)].sort()) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) ready.push(next);
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

function resolveAt(state, at, candidates) {
  const players = state.players || {};
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

  const activePoison = new Set();
  const activeDrunk = new Set();
  for (const effect of sorted.order) {
    const sourceId = String(effect.sourceId);
    const source = players[effect.sourceId];
    // A dead source keeps an on-death drunk effect (Sweetheart) alive.
    const deadDrunk = effect.kind === "drunk" && source && !source.alive;
    if (impaired.has(sourceId) && !deadDrunk) continue;
    if (effect.kind === "poison") activePoison.add(effect.id);
    else activeDrunk.add(effect.id);
    if (effect.targetId != null) impaired.add(String(effect.targetId));
  }
  return { ok: true, activePoison, activeDrunk, impaired };
}

function creationInvalid(state, effects) {
  const players = state.players || {};
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
    const source = players[effect.sourceId];
    if (effect.kind === "drunk" && source && !source.alive) continue;
    if (historical.impaired.has(String(effect.sourceId))) invalid.add(effect.id);
  }
  return { ok: true, invalid };
}

export function effectGraph(state, at = stateAt(state)) {
  const effects = ((state && state.effects) || []).filter(impairing);
  const creation = creationInvalid(state, effects);
  if (!creation.ok) return creation;
  const current = effects.filter((effect) => !creation.invalid.has(effect.id));

  // Reject a cycle that only appears at a future start or expiry, including a
  // saved game still in setup. The current-time result is returned below.
  const probes = new Map();
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
