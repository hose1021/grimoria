import type { RoleModule } from "../types.ts";

export const role = {
  id: "sailor",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      // Sailor r1768: "Each night, wake the Sailor", the first night included.
      timing: "any",
      step: { target: "one-any", noteKey: "note.bmr.sailor" },
      // "Either you or they are drunk until dusk": the Storyteller chooses
      // who. Tonight's choice replaces the last one, also when the Sailor is
      // drunk or poisoned now.
      endsOnUse: ["drunk"],
      resolve({ drunkId, impaired, at }) {
        // An impaired Sailor makes nobody drunk (States r1039).
        if (impaired) return { kind: "suppressed" };
        if (!drunkId) return { kind: "no-effect" };
        return {
          kind: "effects",
          effects: [
            {
              kind: "timed-effect",
              effect: "drunk",
              playerId: drunkId,
              // Dusk is the start of the next night.
              expires: { phase: "night", number: at.number + 1 },
            },
          ],
        };
      },
    },
  ],
} satisfies RoleModule;
