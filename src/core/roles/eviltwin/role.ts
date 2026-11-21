import type { RoleModule } from "../types.ts";

export const role = {
  id: "eviltwin",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      // Evil Twin r3101: "During the first night, wake both Twins." The pair
      // is shown from `sv.ts`.
      timing: "first",
      step: { target: "none", infoKind: "note" },
    },
    {
      kind: "information",
      infoKind: "eviltwin",
      // Evil Twin r3101: point at the Evil Twin and show the Evil Twin token
      // to the Good Twin; point at the Good Twin and show the Good Twin's
      // character token to the Evil Twin. The pair and its validation are the
      // engine's; the wording stays in `sv.ts`.
      resolve(context) {
        const twins = context.twins;
        if (!twins) return { kind: "note", text: "Партнёр Близнеца ещё не выбран." };
        return {
          kind: "note",
          text: "Покажите Близнецам друг друга.",
          shown: [
            { playerId: twins.evilId, roleId: context.actualRoleOf(twins.evilId) },
            { playerId: twins.goodId, roleId: context.actualRoleOf(twins.goodId) },
          ],
        };
      },
    },
  ],
} satisfies RoleModule;
