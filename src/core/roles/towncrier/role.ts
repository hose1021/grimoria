import type { InformationContext, InformationDecision } from "../ability.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "towncrier",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      // Town Crier r3145: "Each night except the first, wake the Town Crier."
      // Presentation stays in `sv.ts`.
      timing: "other",
      step: { target: "none", infoKind: "yes-no" },
    },
    {
      kind: "information",
      infoKind: "towncrier",
      // Town Crier r3145: whether a Minion nominated today. The engine records
      // the nominator's team at nomination time in the "today" fact.
      resolve(context: InformationContext): InformationDecision {
        return {
          kind: "answer",
          value: Boolean(context.votesToday?.minionNominated),
          possible: [true, false],
        };
      },
    },
  ],
} satisfies RoleModule;
