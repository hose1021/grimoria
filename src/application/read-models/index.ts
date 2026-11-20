// Read models exposed to the UI. They are pure functions of the saved state:
// the public model carries no role, bluff, note or effect, and the player model
// carries only the shown role of one seat.
import type { GameState } from "../../core/model/types.ts";

export interface PlayerSnapshot {
  id: string;
  seat: number;
  name: string;
  claimed: boolean;
  hasRole: boolean;
  shownRoleId: string | null;
}

/** @param seat 0-based position in `state.order`. */
export function playerSnapshot(state: GameState, seat: number): PlayerSnapshot | null {
  const id = (state.order || [])[seat];
  if (!id) return null;
  const player = state.players[id];
  if (!player) return null;
  return {
    id,
    seat: seat + 1,
    name: player.name,
    claimed: Boolean(player.claimed),
    hasRole: Boolean(player.shownRoleId),
    shownRoleId: player.shownRoleId || null,
  };
}
