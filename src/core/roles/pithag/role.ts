import type { RoleModule } from "../types.ts";

export const role = {
  id: "pithag",
  edition: "snv",
  nightStep: { target: "one-any", infoKind: "note", canKill: true },
  capabilities: [
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
