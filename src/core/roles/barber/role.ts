import { diedRecently } from "../sv-common.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "barber",
  edition: "snv",
  // Barber r1757: the swap is offered only after the Barber's own death.
  nightStep: {
    target: "two",
    optional: true,
    infoKind: "note",
    actor(state, night, candidate) {
      if (!candidate || candidate.alive) return null;
      return diedRecently(state, candidate.id) ? candidate : null;
    },
  },
  deathStep: {
    target: "two",
    optional: true,
    infoKind: "note",
    actor(state, night, candidate) {
      if (!candidate || candidate.alive) return null;
      return diedRecently(state, candidate.id) ? candidate : null;
    },
  },
} satisfies RoleModule;
