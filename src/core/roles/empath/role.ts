import type { RoleModule } from "../types.ts";

export const role = {
  id: "empath",
  edition: "tb",
  nightStep: {},
  capabilities: [
    {
      kind: "information",
      infoKind: "empath",
      resolve(context) {
        const value = context
          .aliveNeighborIds(context.actorId)
          .filter((playerId) => context.registeredTeamOf(playerId) === "evil").length;
        return { kind: "answer", value };
      },
    },
  ],
} satisfies RoleModule;
