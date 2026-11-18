import type { RoleModule } from "../types.ts";

export const role = {
  id: "pithag",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      // Pit-Hag r2998: "Each night except the first, wake the Pit-Hag. They
      // point at any player and any character icon." The character is the
      // host's answer; only "if a Demon is created" the host marks tonight's
      // deaths, so the step gains the death control after that completion.
      timing: "other",
      step: { target: "one-any", infoKind: "note" },
    },
    {
      kind: "transformation",
      cause: "pithag",
      resolve(context) {
        if (context.impaired) return { kind: "no-effect", reason: "impaired" };
        if (context.roleInPlay(context.newRoleId)) {
          return { kind: "no-effect", reason: "in-play" };
        }
        return {
          kind: "replace",
          playerId: context.targetId,
          roleId: context.newRoleId,
        };
      },
    },
  ],
} satisfies RoleModule;
