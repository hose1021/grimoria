import type { InformationContext, InformationDecision } from "../ability.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "mathematician",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      // Mathematician r3153: "Each night, wake the Mathematician." The
      // presentation and the removal of the ABNORMAL reminders stay in
      // `sv.ts`.
      timing: "any",
      step: { target: "none", infoKind: "number" },
    },
    {
      kind: "information",
      infoKind: "mathematician",
      // Mathematician r3153: the number of characters whose ability worked
      // abnormally since the last Mathematician wake. The Storyteller marks
      // each one; the fact is a count, never a reason.
      resolve(context: InformationContext): InformationDecision {
        return {
          kind: "answer",
          value: context.abnormalCount,
          possible: Array.from({ length: context.seatIds.length + 1 }, (_, index) => index),
        };
      },
    },
  ],
} satisfies RoleModule;
