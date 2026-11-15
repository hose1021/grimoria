import type { GameState } from "../model/types.ts";

import { roleTeam } from "../model/rules.ts";

// Bad Moon Rising predicates shared by the role modules and the scenario
// engine. "Today" means the day that just ended before the current night.

/** A real death occurred during the day before this night. */
export function anyoneDiedToday(state: GameState, night: number): boolean {
  return state.deaths.some(
    (death) => !death.fake && death.phase === "day" && death.number === night - 1,
  );
}

/** An Outsider died during the day before this night. */
export function outsiderDiedToday(state: GameState, night: number): boolean {
  return state.deaths.some(
    (death) =>
      !death.fake &&
      death.phase === "day" &&
      death.number === night - 1 &&
      roleTeam(death.roleId || "") === "outsider",
  );
}

/** The Gossip said something true during the day before this night. */
export function gossipWasTrue(state: GameState, night: number): boolean {
  return Boolean(state.gossip && state.gossip.truth && state.gossip.day === night - 1);
}
