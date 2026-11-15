import type { GameState, Player } from "../model/types.ts";

import { minionRetainsAbility } from "./retention.ts";

// Sects & Violets predicates shared by the role modules and the scenario
// engine. "Recently" means tonight or the day that just ended.

function nightNumber(state: GameState): number {
  return Math.max(1, state.night.number || 1);
}

/** A player still acts: alive, or a Minion kept by the Vigormortis. */
export function stillWakes(state: GameState, player: Player | null): boolean {
  return Boolean(player && (player.alive || minionRetainsAbility(state, player.id)));
}

/** The player died recently while holding this role, or null. */
export function deathAsRecently(
  state: GameState,
  playerId: string,
  roleId: string,
): { impaired: boolean } | null {
  const night = nightNumber(state);
  const death = [...state.deaths]
    .reverse()
    .find(
      (entry) =>
        !entry.fake &&
        entry.playerId === playerId &&
        entry.roleId === roleId &&
        ((entry.phase === "night" && entry.number === night) ||
          (entry.phase === "day" && entry.number === night - 1)),
    );
  return death ? { impaired: Boolean(death.impaired) } : null;
}

/** The player died tonight or during the day before this night. */
export function diedRecently(state: GameState, playerId: string): boolean {
  const night = nightNumber(state);
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
  const night = nightNumber(state);
  return state.deaths.some(
    (death) =>
      !death.fake &&
      death.playerId === playerId &&
      death.demon === true &&
      ((death.phase === "night" && death.number === night) ||
        (death.phase === "day" && death.number === night - 1)),
  );
}
