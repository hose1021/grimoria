import { diedByDemon } from "../sv-common.ts";
import type { GameState, Player } from "../../model/types.ts";
import type { RoleModule } from "../types.ts";

// Sage r3009: wakes only when the Demon killed the Sage.
function sageAfterDemonDeath(
  state: GameState,
  _night: number,
  candidate: Player | null | undefined,
): Player | null {
  if (!candidate || candidate.alive) return null;
  return diedByDemon(state, candidate.id, "sage") ? candidate : null;
}

export const role = {
  id: "sage",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      timing: "other",
      step: { target: "none", infoKind: "note", actor: sageAfterDemonDeath },
    },
    {
      kind: "death-step",
      step: { target: "none", infoKind: "note", actor: sageAfterDemonDeath },
    },
  ],
} satisfies RoleModule;
