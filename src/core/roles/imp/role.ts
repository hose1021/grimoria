import { becomeDemon } from "../../engine/becoming.ts";
import { isImpaired } from "../../engine/effects.ts";
import { roleTeam } from "../../model/rules.ts";
import { livingPlayers } from "../../model/state.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "imp",
  edition: "tb",
  nightStep: { target: "one-any" },
  // Imp r3116 and Scarlet Woman r3117: the Scarlet Woman takes the role first;
  // a self-kill with one Minion left passes the role to that Minion, and with
  // several Minions the host chooses the heir.
  onDeath(state, event) {
    const living = livingPlayers(state);
    const scarlet = living.find(
      (player) => player.roleId === "scarletwoman" && !isImpaired(state, player.id, event.at),
    );
    if (scarlet && event.livingBefore >= 5) {
      becomeDemon(state, scarlet, "scarletwoman", event.at);
      return { inherited: true, playerId: scarlet.id, via: "scarletwoman" };
    }

    if (event.cause === "imp-self-kill") {
      const minions = living.filter((player) => roleTeam(player.roleId || "") === "minion");
      if (minions.length === 1) {
        becomeDemon(state, minions[0]!, "imp", event.at);
        return { inherited: true, playerId: minions[0]!.id, via: "imp" };
      }
      if (minions.length > 1) {
        return {
          inherited: false,
          pendingInheritance: {
            kind: "demon-inheritance",
            options: minions.map((player) => ({
              id: player.id,
              name: player.name,
              roleId: player.roleId,
            })),
          },
        };
      }
    }
    return { inherited: false };
  },
} satisfies RoleModule;
