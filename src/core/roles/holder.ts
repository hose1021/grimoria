import type { SupportedRoleId } from "../model/role-ids.ts";
import type { GameState, Player } from "../model/types.ts";

import { effectiveRoleId, orderedPlayers } from "../model/state.ts";

/** The first player in seat order who holds a role, alive or not. */
export function roleHolder(state: GameState, id: SupportedRoleId): Player | null {
  return orderedPlayers(state).find((player) => effectiveRoleId(player) === id) ?? null;
}
