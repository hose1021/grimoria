import { roleTeam } from "../../model/rules.ts";
import type { InformationContext, InformationDecision } from "../ability.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "clockmaker",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      // Clockmaker r2967: "You start knowing"; "During the first night, wake
      // the Clockmaker." Presentation stays in `sv.ts`.
      timing: "first",
      step: { target: "none", infoKind: "number" },
    },
    {
      kind: "information",
      infoKind: "clockmaker",
      // Clockmaker r2967: the distance from the Demon to the nearest Minion,
      // either way around the circle, and a Minion who is dead is still in
      // play (Glossary "In play").
      resolve(context: InformationContext): InformationDecision {
        const seats = context.seatIds;
        const demonSeat = seats.findIndex(
          (playerId) => roleTeam(context.actualRoleOf(playerId) || "") === "demon",
        );
        const minionSeats = seats.flatMap((playerId, index) =>
          roleTeam(context.actualRoleOf(playerId) || "") === "minion" ? [index] : [],
        );
        const distance =
          demonSeat < 0 || minionSeats.length === 0
            ? 0
            : Math.min(
                ...minionSeats.map((seat) => {
                  const raw = Math.abs(seat - demonSeat);
                  return Math.min(raw, seats.length - raw);
                }),
              );
        return {
          kind: "answer",
          value: distance,
          possible: Array.from({ length: seats.length + 1 }, (_, index) => index),
        };
      },
    },
  ],
} satisfies RoleModule;
