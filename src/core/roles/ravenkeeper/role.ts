import { effectiveRoleId, orderedPlayers } from "../../model/state.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "ravenkeeper",
  edition: "tb",
  // Ravenkeeper r3125: woken on the night they die, immediately.
  nightStep: {
    target: "one-any",
    actor(state, night) {
      return (
        orderedPlayers(state).find(
          (player) =>
            effectiveRoleId(player) === "ravenkeeper" &&
            !player.alive &&
            player.deadAt?.phase === "night" &&
            player.deadAt.number === night,
        ) ?? null
      );
    },
    extra() {
      return { actorAlive: false, deadTonight: true };
    },
  },
} satisfies RoleModule;
