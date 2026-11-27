import { tableProjection } from "../../../application/read-models/table.ts";
import type { GameState } from "../../../core/model/types.ts";
import { handoffSession } from "../player-projection.ts";
import { cardRoleId } from "./helpers.ts";

export type PrivateOverlay = "player" | "info" | "grimoire";

export function correctionContext(state: GameState): string {
  return JSON.stringify([
    handoffSession(state),
    state.order.map((id) => {
      const player = state.players[id];
      return [id, player?.name, player?.roleId, player?.shownRoleId];
    }),
  ]);
}

export function privateContext(
  state: GameState,
  kind: PrivateOverlay,
  key: string | null,
): string | null {
  const session = handoffSession(state);
  if (kind === "player") {
    const player = key ? state.players[key] : null;
    const role = cardRoleId(player);
    return player && role && state.order.includes(player.id)
      ? JSON.stringify([
          session,
          state.phase,
          Boolean(state.winner),
          player.id,
          player.name,
          state.order.indexOf(player.id),
          player.seat,
          player.roleId,
          role,
        ])
      : null;
  }
  const { step, pendingDemonChange } = tableProjection(state);
  if (state.phase !== "night" || state.winner || pendingDemonChange || !step || step.key !== key)
    return null;
  if (kind === "grimoire" && step.roleId !== "spy") return null;
  return JSON.stringify([
    session,
    state.night.number,
    step,
    state.order,
    state.players,
    state.effects,
    state.setup,
    state.bluffs,
    state.herringId,
  ]);
}
