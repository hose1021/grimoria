import type { GameState, Player } from "../model/types.ts";

import { nightAt } from "../engine/context.ts";
import { minionRetainsAbility } from "../engine/retention.ts";

// Sects & Violets predicates shared by the role modules and the scenario
// engine. "Recently" means tonight or the day that just ended.

/** A player still acts: alive, or a Minion kept by the Vigormortis. */
export function stillWakes(state: GameState, player: Player | null): boolean {
  return Boolean(player && (player.alive || minionRetainsAbility(state, player.id)));
}

/** The player died tonight or during the day before this night. */
export function diedRecently(state: GameState, playerId: string): boolean {
  const night = nightAt(state).number;
  return state.deaths.some(
    (death) =>
      !death.fake &&
      death.playerId === playerId &&
      ((death.phase === "night" && death.number === night) ||
        (death.phase === "day" && death.number === night - 1)),
  );
}

/** The Demon killed this player tonight or during the day before this night. */
export function diedByDemon(state: GameState, playerId: string): boolean {
  const night = nightAt(state).number;
  return state.deaths.some(
    (death) =>
      !death.fake &&
      death.playerId === playerId &&
      death.demon === true &&
      ((death.phase === "night" && death.number === night) ||
        (death.phase === "day" && death.number === night - 1)),
  );
}
