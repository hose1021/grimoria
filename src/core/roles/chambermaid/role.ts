import { livingPlayers, registersAlive } from "../../model/state.ts";
import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "chambermaid",
  edition: "bmr",
  nightStep: {
    target: "two",
    infoKind: "number",
    // Chambermaid r1784: needs two players other abilities see as alive and
    // can legally choose. A registered-dead Zombuul is not a legal choice.
    actor(state) {
      const holder = roleHolder(state, "chambermaid");
      if (!holder?.alive) return null;
      return livingPlayers(state).filter(
        (player) => player.id !== holder.id && registersAlive(player),
      ).length >= 2
        ? holder
        : null;
    },
  },
} satisfies RoleModule;
