import { diedByDemon } from "../sv-common.ts";
import type { GameState, Player } from "../../model/types.ts";
import type { RoleModule } from "../types.ts";

// Sage r3009: wakes only when the Demon killed the Sage. Drunk r3165: a Drunk
// shown the Sage wakes as the Sage but has no ability; the Storyteller may show
// a false pair.
function sageAfterDemonDeath(
  state: GameState,
  _night: number,
  candidate: Player | null | undefined,
): Player | null {
  if (!candidate || candidate.alive) return null;
  if (candidate.roleId === "sage" || candidate.used?.philosopherAbility === "sage") {
    return diedByDemon(state, candidate.id, "sage") ? candidate : null;
  }
  if (candidate.roleId === "drunk" && candidate.shownRoleId === "sage") {
    return diedByDemon(state, candidate.id) ? candidate : null;
  }
  return null;
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
