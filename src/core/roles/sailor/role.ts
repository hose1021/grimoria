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
      resolve({ targetIds, drunkId, impaired, at, nameOf }) {
        // An impaired Sailor makes nobody drunk (States r1039).
        if (impaired) return { kind: "suppressed" };
        if (!drunkId) return { kind: "no-effect" };
        const chosen = targetIds[0] ? nameOf(targetIds[0]) : "";
        const drunk = nameOf(drunkId);
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
          // The log keeps the choice: the step note otherwise stays the prompt.
          note: {
            key: "note.bmr.sailorChoice",
            vars: { target: chosen, drunk },
            text: "Выбор: " + chosen + ". Пьян до заката: " + drunk + ".",
          },
        };
      },
    },
  ],
} satisfies RoleModule;
