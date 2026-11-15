import { livingPlayers } from "../../model/state.ts";
import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "chambermaid",
  edition: "bmr",
  nightStep: {
    target: "two",
    infoKind: "number",
    // Chambermaid r1784: needs two living players besides herself.
    actor(state) {
      const holder = roleHolder(state, "chambermaid");
      if (!holder?.alive) return null;
      return livingPlayers(state).filter((player) => player.id !== holder.id).length >= 2
        ? holder
        : null;
    },
  },
} satisfies RoleModule;
