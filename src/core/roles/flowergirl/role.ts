import type { InformationContext, InformationDecision } from "../ability.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "flowergirl",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      // Flowergirl r2907: "Each night except the first, wake the Flowergirl."
      // Presentation stays in `sv.ts`.
      timing: "other",
      step: { target: "none", infoKind: "yes-no" },
    },
    {
      kind: "information",
      infoKind: "flowergirl",
      // Flowergirl r2907: whether a Demon voted today. The engine records the
      // Demon voters at vote time in the "today" fact.
      resolve(context: InformationContext): InformationDecision {
        return {
          kind: "answer",
          value: Boolean(context.votesToday?.demonVoted),
          possible: [true, false],
        };
      },
    },
  ],
} satisfies RoleModule;
