import { stillWakes } from "../sv-common.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "juggler",
  edition: "snv",
  nightStep: {
    target: "none",
    infoKind: "number",
    // Juggler r2401: the answer follows the first day the guesses were made.
    actor(state, night, candidate) {
      if (!candidate || !stillWakes(state, candidate)) return null;
      if (candidate.used?.juggler) return null;
      const guessingDay =
        state.juggler && typeof state.juggler.day === "number" ? state.juggler.day : null;
      return guessingDay === night - 1 ? candidate : null;
    },
  },
} satisfies RoleModule;
