import type { RoleEffect } from "../ability.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "innkeeper",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      // Innkeeper r3160: "Each night except the first, wake the Innkeeper."
      timing: "other",
      step: { target: "two", noteKey: "note.bmr.innkeeper" },
      // "Choose 2 players: they can't die tonight, but 1 is drunk until
      // dusk." Tonight's choice replaces the last one, also when the
      // Innkeeper is drunk or poisoned now.
      endsOnUse: ["safe", "drunk"],
      resolve({ targetIds, drunkId, impaired, at, nameOf }) {
        // The command path requires the two players.
        if (targetIds.length !== 2) return { kind: "no-effect" };
        // An impaired Innkeeper protects nobody and makes nobody drunk.
        if (impaired) return { kind: "suppressed" };
        // "At dawn, remove the SAFE reminders. At dusk, remove the DRUNK
        // reminder." The Storyteller chooses which of the two is drunk.
        const effects: RoleEffect[] = targetIds.map((playerId) => ({
          kind: "timed-effect",
          effect: "safe",
          playerId,
          expires: { phase: "day", number: at.number },
        }));
        if (drunkId) {
          effects.push({
            kind: "timed-effect",
            effect: "drunk",
            playerId: drunkId,
            expires: { phase: "night", number: at.number + 1 },
          });
        }
        // The log keeps the choice: the step note otherwise stays the prompt.
        const protectedNames = targetIds.map((id) => nameOf(id)).join(", ");
        return {
          kind: "effects",
          effects,
          note: {
            key: "note.bmr.innkeeperChoice",
            vars: { targets: protectedNames, drunk: drunkId ? nameOf(drunkId) : "" },
            text:
              "Защищены: " +
              protectedNames +
              ". Пьян до заката: " +
              (drunkId ? nameOf(drunkId) : "") +
              ".",
          },
        };
      },
    },
  ],
} satisfies RoleModule;
