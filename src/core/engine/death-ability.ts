import type { DeadAt, GameState } from "../model/types.ts";
import { orderedPlayers, playerById } from "../model/state.ts";
import { roleTeam } from "../model/rules.ts";
import type { DeathContext, DeathDecision } from "../roles/ability.ts";
import type { DeathOutcome, RoleModule } from "../roles/types.ts";
import { becomeDemon } from "./becoming.ts";
import { isImpaired } from "./effects.ts";
import { systemPorts } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";

type DeathEvent = {
  playerId: string;
  roleId: string | null;
  cause: string;
  at: DeadAt;
  livingBefore: number;
};

function deathResolver(
  module: RoleModule | null | undefined,
): ((context: DeathContext) => DeathDecision) | null {
  for (const capability of module?.capabilities || []) {
    if (capability.kind === "death-trigger" && capability.onDeath) return capability.onDeath;
  }
  return null;
}

/**
 * Runs a module's death-trigger capability and applies its decision through the
 * shared succession path. Returns null when the module has no such capability,
 * so the caller can try the fallback Demon hook.
 */
export function resolveDeathCapability(
  state: GameState,
  module: RoleModule | null | undefined,
  event: DeathEvent,
  ports: CommandExecutionContext = systemPorts,
): DeathOutcome | null {
  const resolve = deathResolver(module);
  if (!resolve) return null;

  const living = orderedPlayers(state).filter((player) => player.alive);
  const context: DeathContext = {
    deadId: event.playerId,
    deadRoleId: event.roleId,
    cause: event.cause,
    livingBefore: event.livingBefore,
    livingPlayerIds: living.map((player) => player.id),
    livingMinionIds: living
      .filter((player) => roleTeam(player.roleId || "") === "minion")
      .map((player) => player.id),
    at: event.at,
    impairedOf: (playerId) => isImpaired(state, playerId, event.at),
    nameOf: (playerId) => playerById(state, playerId)?.name || "",
    actualRoleOf: (playerId) => playerById(state, playerId)?.roleId ?? null,
    hasPlayer: (playerId) => playerById(state, playerId) != null,
  };

  const decision = resolve(context);
  if (decision.kind === "inherit") {
    const heir = playerById(state, decision.heirId);
    if (!heir || !heir.alive) return { inherited: false };
    becomeDemon(state, heir, decision.via, event.at, ports, event.roleId || "imp");
    return { inherited: true, playerId: heir.id, via: decision.via };
  }
  if (decision.kind === "choose-heir") {
    return {
      inherited: false,
      pendingInheritance: {
        kind: "demon-inheritance",
        options: decision.options.map((option) => ({ ...option })),
      },
    };
  }
  return { inherited: false };
}
