import { deathAsRecently } from "../sv-common.ts";
import type { GameState, Player } from "../../model/types.ts";
import type { RoleModule } from "../types.ts";

function barberAfterSoberDeath(
  state: GameState,
  _night: number,
  candidate: Player | null | undefined,
): Player | null {
  if (!candidate || candidate.alive) return null;
  // The death record must name the candidate's current character: a player who
  // died before becoming the Barber has no ability. A Philosopher who borrowed
  // the Barber keeps `roleId = "philosopher"` at death, so the record matches.
  const death = candidate.roleId ? deathAsRecently(state, candidate.id, candidate.roleId) : null;
  const hasBarber =
    candidate.roleId === "barber" || candidate.used?.philosopherAbility === "barber";
  // Barber r1757: the swap follows the Barber's own sober death.
  return hasBarber && death && !death.impaired ? candidate : null;
}

export const role = {
  id: "barber",
  edition: "snv",
  // Barber r1757: the swap is offered only after the Barber's own death.
  capabilities: [
    {
      kind: "night-step",
      timing: "other",
      step: {
        target: "two",
        optional: true,
        infoKind: "note",
        actor: barberAfterSoberDeath,
      },
    },
    {
      kind: "death-step",
      step: {
        target: "two",
        optional: true,
        infoKind: "note",
        actor: barberAfterSoberDeath,
      },
    },
  ],
} satisfies RoleModule;
