import { roleTeam } from "../../model/rules.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "imp",
  edition: "tb",
  capabilities: [
    {
      kind: "night-step",
      // Imp r3116: each night except the first, choose a player: they die. Any
      // player may be chosen, alive or dead, the Imp included.
      timing: "other",
      step: { target: "one-any" },
      resolve({ targetIds }) {
        const targetId = targetIds[0];
        if (!targetId) return { kind: "no-effect" };
        // Whether anyone dies is the shared attack path's answer, which the
        // table also asks before the step completes: a poisoned Imp, a dead
        // target, the Monk and the Soldier stop the attack, and a working
        // Mayor is the host's redirect.
        return { kind: "attack", playerId: targetId, title: "Имп атакует" };
      },
    },
    // Imp r3116 and Scarlet Woman r3117: the Scarlet Woman takes the role first;
    // a self-kill with one Minion left passes the role to that Minion, and with
    // several Minions the host chooses the heir.
    {
      kind: "death-trigger",
      onDeath(context) {
        // Fang Gu r2974 + Scarlet Woman r3117 jinx: if another Demon still
        // lives (the Fang Gu's possession), the Scarlet Woman remains a Minion.
        if (
          context.livingPlayerIds.some(
            (playerId) => roleTeam(context.actualRoleOf(playerId) || "") === "demon",
          )
        ) {
          return { kind: "no-effect" };
        }
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
