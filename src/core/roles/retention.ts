import type { DeadAt, GameState } from "../model/types.ts";
import { effectGraph } from "../model/effect-graph.ts";
import { roleTeam } from "../model/rules.ts";
import { orderedPlayers, playerById } from "../model/state.ts";

// Vigormortis r3015: "Minions you kill keep their ability". This predicate is
// shared by the role predicates, the step builders, the dead-actor guards and
// the Evil Twin pair. It reads only model facts, so a role module can use it.

function currentAt(state: GameState): DeadAt {
  return state.phase === "day"
    ? { phase: "day", number: Math.max(1, state.day.number || 1) }
    : { phase: "night", number: Math.max(1, state.night.number || 1) };
}

function impaired(state: GameState, playerId: string, at: DeadAt): boolean {
  const graph = effectGraph(state, at);
  return graph.ok && graph.impaired.has(String(playerId));
}

export function vigormortisActive(state: GameState): boolean {
  const at = currentAt(state);
  return orderedPlayers(state).some(
    (player) => player.roleId === "vigormortis" && player.alive && !impaired(state, player.id, at),
  );
}

export function minionRetainsAbility(state: GameState, playerId: string): boolean {
  const player = playerById(state, playerId);
  if (!player || player.alive) return false;
  if (roleTeam(player.roleId || "") !== "minion") return false;
  if (impaired(state, playerId, currentAt(state))) return false;
  const killedByVigormortis = state.deaths.some(
    (death) =>
      !death.fake &&
      death.playerId === playerId &&
      death.demon === true &&
      death.ability === "vigormortis",
  );
  return killedByVigormortis && vigormortisActive(state);
}
