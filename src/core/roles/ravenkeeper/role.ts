import { ALL_ROLES } from "../../model/rules.ts";
import { effectiveRoleId, orderedPlayers } from "../../model/state.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "ravenkeeper",
  edition: "tb",
  // Ravenkeeper r3125: woken on the night they die, immediately. Who wakes and
  // the fields of the step are still read from the game; the answer and its
  // shape are declared here.
  capabilities: [
    {
      kind: "night-step",
      timing: "any",
      step: {
        target: "one-any",
        infoKind: "character",
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
    },

    {
      kind: "information",
      infoKind: "ravenkeeper",
      // Ravenkeeper r3125: "choose a player: you learn their character." Any
      // player may be chosen, alive or dead. A Spy or a Recluse may be shown as
      // another character (Example 2), which is the Storyteller's choice among
      // the characters the engine says the player may register as. A drunk or
      // poisoned Ravenkeeper may be shown any character.
      resolve(context) {
        const targetId = context.targetIds[0];
        const roleId = targetId ? context.actualRoleOf(targetId) : null;
        // No player is chosen yet, or the seat does not exist.
        if (!targetId || !roleId) return { kind: "no-effect" };
        return {
          kind: "answer",
          value: roleId,
          subjectId: targetId,
          possible: ALL_ROLES,
          legal: context.mayRegisterAsCharacters(targetId),
        };
      },
    },
  ],
} satisfies RoleModule;
