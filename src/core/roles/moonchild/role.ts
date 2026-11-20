import { hasTrueAbility, orderedPlayers } from "../../model/state.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "moonchild",
  edition: "bmr",
  nightStep: {
    target: "one-any",
    canKill: true,
    noteKey: "note.bmr.moonchild",
    // The Moonchild wakes only once already dead, to resolve the choice made
    // while alive. A second death is never resolved again. A borrowed ability
    // belongs to the Philosopher, and a Drunk's shown character does nothing,
    // so only a real or borrowed holder wakes (Philosopher r2421, Drunk r3165).
    actor(state) {
      const holder = orderedPlayers(state).find((player) => hasTrueAbility(player, "moonchild"));
      if (!holder || holder.alive) return null;
      const used = holder.used;
      if (!used?.moonchildTarget || used.moonchildResolved) return null;
      return holder;
    },
  },
} satisfies RoleModule;
