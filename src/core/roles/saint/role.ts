import type { RoleModule } from "../types.ts";

export const role = {
  id: "saint",
  edition: "tb",
  capabilities: [
    {
      kind: "win",
      resolve(context) {
        const death = context.executionDeath;
        if (death && death.roleId === "saint" && !death.impaired) {
          // Saint r3119: the executed Saint's team loses, so an evil Saint
          // makes good win.
          const evil = context.teamOf(death.playerId) === "evil";
          return { kind: "win", team: evil ? "good" : "evil", reason: "saint" };
        }
        return { kind: "no-effect" };
      },
    },
  ],
} satisfies RoleModule;
