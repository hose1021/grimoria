import { deathAsRecently } from "../sv-common.ts";
import type { GameState, Player } from "../../model/types.ts";
import type { RoleModule } from "../types.ts";

function barberAfterSoberDeath(
  state: GameState,
  _night: number,
  candidate: Player | null | undefined,
): Player | null {
  if (!candidate || candidate.alive) return null;
  const death = deathAsRecently(state, candidate.id, "barber");
  // Barber r1757: the swap follows the Barber's own death. A player who died
  // before becoming the Barber, or who died drunk or poisoned, has no ability.
  return death && !death.impaired ? candidate : null;
}

export const role = {
  id: "barber",
  edition: "snv",
  // Barber r1757: the swap is offered only after the Barber's own death.
  nightStep: {
    target: "two",
    optional: true,
    infoKind: "note",
    actor: barberAfterSoberDeath,
  },
  deathStep: {
    target: "two",
    optional: true,
    infoKind: "note",
    actor: barberAfterSoberDeath,
  },
} satisfies RoleModule;
