import type { RoleModule } from "../types.ts";

export const role = {
  id: "imp",
  edition: "tb",
  nightStep: { target: "one-any" },
  // Imp r3116 and Scarlet Woman r3117: the Scarlet Woman takes the role first;
  // a self-kill with one Minion left passes the role to that Minion, and with
  // several Minions the host chooses the heir.
  capabilities: [
    {
      kind: "death-trigger",
      onDeath(context) {
        const scarlet = context.livingPlayerIds.find(
          (playerId) =>
            context.actualRoleOf(playerId) === "scarletwoman" && !context.impairedOf(playerId),
        );
        if (scarlet && context.livingBefore >= 5) {
          return { kind: "inherit", heirId: scarlet, via: "scarletwoman" };
        }

        if (context.cause === "imp-self-kill") {
          const minions = context.livingMinionIds;
          if (minions.length === 1) {
            return { kind: "inherit", heirId: minions[0]!, via: "imp" };
          }
          if (minions.length > 1) {
            return {
              kind: "choose-heir",
              options: minions.map((playerId) => ({
                id: playerId,
                name: context.nameOf(playerId),
                roleId: context.actualRoleOf(playerId),
              })),
            };
          }
        }
        return { kind: "no-effect" };
      },
    },
  ],
} satisfies RoleModule;
