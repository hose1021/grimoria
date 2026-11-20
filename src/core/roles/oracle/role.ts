import type { InformationContext, InformationDecision } from "../ability.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "oracle",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      // Oracle r2909: "Each night except the first, wake the Oracle."
      // Presentation stays in `sv.ts`.
      timing: "other",
      step: { target: "none", infoKind: "number" },
    },
    {
      kind: "information",
      infoKind: "oracle",
      // Oracle r2909: how many dead players are evil, counted from the
      // current roster. The wrapper passes no registrations, so the team is
      // the real one, as the engine counted it.
      resolve(context: InformationContext): InformationDecision {
        const seats = context.seatIds;
        return {
          kind: "answer",
          value: seats.filter(
            (playerId) =>
              !context.isAlive(playerId) && context.registeredTeamOf(playerId) === "evil",
          ).length,
          possible: Array.from({ length: seats.length + 1 }, (_, index) => index),
        };
      },
    },
  ],
} satisfies RoleModule;
