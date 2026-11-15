import { effectiveRoleId, executionDeathForDay, livingPlayers } from "../../model/state.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "undertaker",
  edition: "tb",
  // Undertaker r3115: learns only an execution death from today.
  nightStep: {
    actor(state, night) {
      if (!executionDeathForDay(state, night - 1)) return null;
      return (
        livingPlayers(state).find((player) => effectiveRoleId(player) === "undertaker") ?? null
      );
    },
    extra(state, night) {
      const death = executionDeathForDay(state, night - 1);
      return { executedId: death?.playerId ?? null, executedRoleId: death?.roleId || null };
    },
  },
} satisfies RoleModule;
