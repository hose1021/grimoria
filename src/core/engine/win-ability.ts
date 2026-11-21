import type { GameState } from "../model/types.ts";
import { orderedPlayers, playerById, realTeamOf } from "../model/state.ts";
import type { WinContext, WinDecision } from "../roles/ability.ts";
import type { RoleModule } from "../roles/types.ts";
import type { Death } from "../model/types.ts";
import { currentAt } from "./context.ts";

function winResolver(
  module: RoleModule | null | undefined,
): ((context: WinContext) => WinDecision) | null {
  for (const capability of module?.capabilities || []) {
    if (capability.kind === "win") return capability.resolve;
  }
  return null;
}

/**
 * Runs a module's win capability against the day's execution death. Returns
 * null when the module declares no win contribution, so the engine keeps its
 * shared checks.
 */
export function resolveWinCapability(
  state: GameState,
  module: RoleModule | null | undefined,
  executionDeath: Death | null,
): WinDecision | null {
  const resolve = winResolver(module);
  if (!resolve) return null;
  return resolve({
    livingCount: orderedPlayers(state).filter((player) => player.alive).length,
    executionDeath,
    at: currentAt(state),
    actualRoleOf: (playerId) => playerById(state, playerId)?.roleId ?? null,
    teamOf: (playerId) => realTeamOf(playerById(state, playerId)),
    hasPlayer: (playerId) => playerById(state, playerId) != null,
  });
}
