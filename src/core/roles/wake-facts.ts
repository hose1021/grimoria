import type { GameState } from "../model/types.ts";

// Roles printed as a choice or a consequence but with no wake of their own.
// The Chambermaid counts characters who woke to use an ability, so these steps
// never count even when the host opens them to mark a death or a choice.
export const NOT_A_WAKE: Readonly<Record<string, true>> = {
  gossip: true,
  tinker: true,
  moonchild: true,
  barber: true,
  sweetheart: true,
  klutz: true,
};

/** True when the player has a step tonight that woke them for their ability. */
export function wokeTonight(state: GameState, playerId: string): boolean {
  return state.night.queue.some(
    (step) =>
      step.kind === "role" &&
      step.actorId === playerId &&
      !step.skipped &&
      !step.blocked &&
      !NOT_A_WAKE[step.roleId || ""] &&
      step.noteKey !== "note.bmr.grandmotherDeath",
  );
}
