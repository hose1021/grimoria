import { diedRecently } from "../sv-common.ts";
import type { GameState, Player } from "../../model/types.ts";
import type { RoleModule } from "../types.ts";

// Sweetheart r2704: the choice follows the Sweetheart's own recent death.
function sweetheartAfterDeath(
  state: GameState,
  _night: number,
  candidate: Player | null | undefined,
): Player | null {
  if (!candidate || candidate.alive) return null;
  return diedRecently(state, candidate.id, "sweetheart") ? candidate : null;
}

export const role = {
  id: "sweetheart",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      timing: "other",
      step: { target: "one-any", infoKind: "note", actor: sweetheartAfterDeath },
    },
    {
      kind: "death-step",
      step: { target: "one-any", infoKind: "note", actor: sweetheartAfterDeath },
    },
  ],
} satisfies RoleModule;
