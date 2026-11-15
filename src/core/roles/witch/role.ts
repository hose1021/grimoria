import { livingPlayers } from "../../model/state.ts";
import { stillWakes } from "../sv-common.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "witch",
  edition: "snv",
  nightStep: {
    target: "one-any",
    infoKind: "note",
    // Witch r2682: "If just 3 players live, you lose this ability."
    actor(state, night, candidate) {
      if (!candidate || !stillWakes(state, candidate)) return null;
      return livingPlayers(state).length > 3 ? candidate : null;
    },
  },
} satisfies RoleModule;
