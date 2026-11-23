import { livingPlayers, registersAlive } from "../../model/state.ts";
import type { InformationContext, InformationDecision } from "../ability.ts";
import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "chambermaid",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      timing: "any",
      step: {
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
    },
    {
      kind: "information",
      infoKind: "chambermaid",
      // Chambermaid r2966: how many chosen characters woke tonight to use
      // their ability. The wake set is the whole night, so a role printed
      // after the Chambermaid (the Mathematician, the jinx) still counts.
      resolve(context: InformationContext): InformationDecision {
        const value = context.targetIds.filter(
          (playerId) => context.wokeTonight?.(playerId) === true,
        ).length;
        return { kind: "answer", value, possible: [0, 1, 2] };
      },
    },
  ],
} satisfies RoleModule;
