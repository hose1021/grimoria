import { anyoneDiedToday } from "../bmr-common.ts";
import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "zombuul",
  edition: "bmr",
  nightStep: {
    target: "one-any",
    canKill: true,
    noteKey: "note.bmr.zombuul",
    // Zombuul r3022: it does not wake when a player died today.
    actor(state, night) {
      const holder = roleHolder(state, "zombuul");
      if (!holder?.alive) return null;
      return anyoneDiedToday(state, night) ? null : holder;
    },
  },
} satisfies RoleModule;
