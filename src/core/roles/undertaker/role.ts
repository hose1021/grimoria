import { ALL_ROLES } from "../../model/rules.ts";
import { effectiveRoleId, executionDeathForDay, livingPlayers } from "../../model/state.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "undertaker",
  edition: "tb",
  // Undertaker r3115: "Each night*, if any player died by execution today,
  // wake the Undertaker." Who wakes and the fields of the step are still read
  // from the game; the answer and its shape are declared here.
  capabilities: [
    {
      kind: "night-step",
      timing: "other",
      step: {
        infoKind: "character",
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
    },

    {
      kind: "information",
      infoKind: "undertaker",
      // Undertaker r3115: "you learn which character died by execution today."
      // The Drunk is shown as the Drunk; a Spy or a Recluse may be shown as
      // another character (Example 3), which is the Storyteller's choice among
      // the characters the engine says the player may register as. A drunk or
      // poisoned Undertaker may be shown any character.
      resolve(context) {
        const death = context.executedToday;
        if (!death) return { kind: "note", text: "Сегодня казни со смертью не было." };
        if (!death.roleId) return { kind: "no-effect" };
        return {
          kind: "answer",
          value: death.roleId,
          subjectId: death.playerId,
          possible: ALL_ROLES,
          legal: context.mayRegisterAsCharacters(death.playerId),
        };
      },
    },
  ],
} satisfies RoleModule;
