// Trouble Brewing domain: effects. No DOM or persistence.

import { playerById } from "../model.js";

import { currentAt, cycleOf } from "./context.js";

export function effectActive(state, effect, at = currentAt(state)) {
  if (!effect || effect.active === false) return false;
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
    effect.kind === "poison"
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

