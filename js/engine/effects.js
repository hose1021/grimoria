// Trouble Brewing domain: effects. No DOM or persistence.

import { playerById } from "../model.js";

import { currentAt, cycleOf } from "./context.js";

export function effectActive(state, effect, at = currentAt(state)) {
  if (!effect || effect.active === false) return false;
  if (effect.kind === "drunk") {
    return !effect.expires || cycleOf(at) < cycleOf(effect.expires);
  }
  if (effect.expires && cycleOf(at) >= cycleOf(effect.expires)) return false;
  if (effect.kind === "role-change") return true;

  const source = playerById(state, effect.sourceId);
  if (!source || !source.alive) return false;
  if (source.roleId === "drunk") return false;

  if (effect.kind === "poison") {
    // A poisoned Poisoner loses the ability; their existing poison ends.
    return !state.effects.some((other) => (
      other.id !== effect.id
      && other.kind === "poison"
      && other.targetId === source.id
      && effectActive(state, other, at)
    ));
  }
  return !isImpaired(state, source.id, at);
}


export function activeEffects(state, kind, at = currentAt(state)) {
  return state.effects.filter((effect) => (
    (!kind || effect.kind === kind) && effectActive(state, effect, at)
  ));
}


export function isImpaired(state, playerId, at = currentAt(state)) {
  const player = playerById(state, playerId);
  if (!player) return false;
  if (player.roleId === "drunk") return true;
  return state.effects.some((effect) => (
    (effect.kind === "poison" || effect.kind === "drunk")
    && effect.targetId === playerId
    && effectActive(state, effect, at)
  ));
}


export function protectionFor(state, targetId, at = currentAt(state)) {
  return activeEffects(state, "protected", at)
    .find((effect) => effect.targetId === targetId) || null;
}


export function soldierSafe(state, playerId, at = currentAt(state)) {
  const player = playerById(state, playerId);
  return Boolean(player && player.roleId === "soldier" && !isImpaired(state, playerId, at));
}


export function mayorRedirects(state, playerId, at = currentAt(state)) {
  const player = playerById(state, playerId);
  return Boolean(player && player.roleId === "mayor" && !isImpaired(state, playerId, at));
}


export function butlerMaster(state, playerId, at = currentAt(state)) {
  const player = playerById(state, playerId);
  if (!player || player.roleId !== "butler" || isImpaired(state, playerId, at)) return null;
  const effect = activeEffects(state, "butler", at)
    .find((candidate) => candidate.sourceId === playerId);
  return effect ? effect.targetId : null;
}

// ---------------------------------------------------------------------------
// Registration choices. Only Spy and Recluse can change how they register.


// ---------------------------------------------------------------------------
// Bad Moon Rising protection and drunk effects

export function bmrDrunkEffect(state, playerId, at = currentAt(state)) {
  return state.effects.find((effect) => (
    effect.kind === "drunk"
    && effect.targetId === playerId
    && effectActive(state, effect, at)
  )) || null;
}

function neighbourPair(state, playerId) {
  const ids = state.order;
  const at = ids.indexOf(String(playerId));
  if (at === -1 || ids.length < 3) return [];
  return [ids[(at - 1 + ids.length) % ids.length], ids[(at + 1) % ids.length]];
}

function teaLadyProtects(state, targetId, at) {
  if (!state.script || !Array.isArray(state.script.roles) || !state.script.roles.includes("tealady")) return null;
  const players = Object.values(state.players || {});
  const teaLady = players.find((player) => (
    player.roleId === "tealady" && player.alive && !isImpaired(state, player.id, at)
  ));
  if (!teaLady) return null;
  const neighbours = neighbourPair(state, teaLady.id);
  if (!neighbours.includes(String(targetId))) return null;
  const bothGood = neighbours.every((id) => {
    const player = playerById(state, id);
    return player && player.alive && !isImpaired(state, id, at)
      && player.team !== "evil";
  });
  if (!bothGood) return null;
  const target = playerById(state, targetId);
  if (!target || target.team === "evil") return null;
  return "tea-lady";
}

export function bmrCannotDie(state, playerId, at = currentAt(state), context = {}) {
  const player = playerById(state, playerId);
  if (!player) return null;
  const cause = context.cause || "";
  const bypass = context.bypassProtection === true;
  const sober = !isImpaired(state, playerId, at);
  // The Zombuul's first death is replaced, not prevented, so even an Assassin
  // cannot take it. Every other protection is bypassed by the Assassin.
  if (player.roleId === "zombuul" && !(player.used && player.used.zombuul)) return "zombuul";
  if (bypass) return null;
  if (player.roleId === "fool" && sober && !(player.used && player.used.fool)) return "fool";
  if (player.roleId === "soldier" && sober && (cause === "demon" || cause === "ability")) return "soldier";
  if (player.roleId === "sailor" && !bmrDrunkEffect(state, playerId, at)) return "sailor";
  if (teaLadyProtects(state, playerId, at)) return "tea-lady";
  const innkeeper = state.effects.find((effect) => (
    effect.kind === "protected"
    && effect.targetId === playerId
    && effectActive(state, effect, at)
    && effect.bmr === "innkeeper"
    && (cause === "demon" || cause === "ability")
  ));
  if (innkeeper) return "innkeeper";
  if (cause === "execution") {
    const advocate = state.effects.find((effect) => (
      effect.kind === "devilsadvocate"
      && effect.targetId === playerId
      && effectActive(state, effect, at)
      && effect.day === at.number
    ));
    if (advocate) return "devilsadvocate";
  }
  return null;
}
