// Deterministic poison dependency graph. Pure: no DOM, no persistence.
//
// A poison is active only while its source is not impaired by another active
// poison or a drunk effect. Effects are resolved in chronological creation
// order so a later poison cannot invalidate an earlier one. A dependency cycle
// with no chronological order is rejected instead of guessed.

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

function expired(effect, at) {
  return Boolean(effect.expires) && cycleOf(at) >= cycleOf(effect.expires);
}

function topological(group) {
  const byId = new Map(group.map((effect) => [effect.id, effect]));
  const ids = [...byId.keys()].sort();
  const edges = new Map(ids.map((id) => [id, new Set()]));
  const indegree = new Map(ids.map((id) => [id, 0]));
  for (const from of group) {
    for (const to of group) {
      if (from === to) continue;
      if (String(from.targetId) !== String(to.sourceId)) continue;
      if (edges.get(from.id).has(to.id)) continue;
      edges.get(from.id).add(to.id);
      indegree.set(to.id, indegree.get(to.id) + 1);
    }
  }

  const ready = ids.filter((id) => indegree.get(id) === 0).sort();
  const order = [];
  while (ready.length) {
    const id = ready.shift();
    order.push(byId.get(id));
    for (const next of [...edges.get(id)].sort()) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        ready.push(next);
        ready.sort();
      }
    }
  }

  if (order.length !== group.length) {
    return {
      ok: false,
      cycle: ids.filter((id) => !order.some((effect) => effect.id === id))
    };
  }
  return { ok: true, order };
}

export function effectGraph(state, at = stateAt(state)) {
  const players = (state && state.players) || {};
  const effects = (state && state.effects) || [];
  const impaired = new Set();

  for (const effect of effects) {
    if (!effect || effect.kind !== "drunk" || effect.active === false) continue;
    if (expired(effect, at)) continue;
    if (effect.targetId != null) impaired.add(String(effect.targetId));
  }
  for (const player of Object.values(players)) {
    if (player && player.roleId === "drunk") impaired.add(String(player.id));
  }

  const groups = new Map();
  for (const effect of effects) {
    if (!effect || effect.kind !== "poison" || effect.active === false) continue;
    if (expired(effect, at)) continue;
    const source = players[effect.sourceId];
    if (!source || !source.alive || source.roleId === "drunk") continue;
    if (impaired.has(String(source.id))) continue;
    const key = effectCycle(effect);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(effect);
  }

  const activePoison = new Set();
  for (const key of [...groups.keys()].sort((left, right) => left - right)) {
    const sorted = topological(groups.get(key));
    if (!sorted.ok) {
      return {
        ok: false,
        errorCode: CYCLIC_EFFECT_DEPENDENCY,
        effectIds: sorted.cycle.sort()
      };
    }
    for (const effect of sorted.order) {
      if (impaired.has(String(effect.sourceId))) continue;
      activePoison.add(effect.id);
      impaired.add(String(effect.targetId));
    }
  }

  return { ok: true, activePoison, impaired };
}
