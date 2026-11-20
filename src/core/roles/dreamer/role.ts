import { SUPPORTED_ROLES, roleTeam } from "../../model/rules.ts";
import type { RoleModule } from "../types.ts";

// Dreamer r2904: "you learn 1 good & 1 evil character, 1 of which is
// correct." The official text names a kind, not the script, so a custom
// script does not reduce the legal answers.
const goodCharacters = SUPPORTED_ROLES.filter(
  (id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider",
);
const evilCharacters = SUPPORTED_ROLES.filter(
  (id) => roleTeam(id) === "minion" || roleTeam(id) === "demon",
);

export const role = {
  id: "dreamer",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      // Dreamer r2904: "Each night, wake the Dreamer. They point at any
      // player." The command refuses the Dreamer themself; the pair is built
      // by the engine from the facts below.
      timing: "any",
      step: { target: "one-any", infoKind: "note" },
    },
    {
      kind: "information",
      infoKind: "dreamer",
      // The role names the target, the two pools and what the target may
      // register as (Spy r3118, Recluse r3007); which pair is legal, and
      // whether it must be false, is the engine's.
      resolve(context) {
        const targetId = context.targetIds[0];
        if (!targetId || !context.hasPlayer(targetId)) return { kind: "no-effect" };
        return {
          kind: "role-pair",
          subjectId: targetId,
          good: goodCharacters,
          evil: evilCharacters,
          possible: context.mayRegisterAsCharacters(targetId),
        };
      },
    },
  ],
} satisfies RoleModule;
