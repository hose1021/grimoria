// The engine's facts for one information ability. Extracted from
// `information.ts` so an engine path that decorates an answer in place (the
// Sects & Violets answer factory) can hand a role module the same context
// without importing the dispatcher and closing a cycle.
import type { DeadAt, GameState, Player, RoleId } from "../model/types.ts";

import { ALL_ROLES, roleTeam } from "../model/rules.ts";
import { playerById, realTeamOf, executionDeathForDay } from "../model/state.ts";

import { aliveNeighbors } from "./context.ts";
import { isImpaired } from "./effects.ts";
import type { InformationContext } from "../roles/ability.ts";

export type Registrations = Record<string, string>;

// Registration is an ability (Spy r3118, Recluse r3007): a drunk or poisoned
// registrant has no ability, so the override never reaches an information path.
function registrationApplies(state: GameState, player: Player | null): boolean {
  return player ? !isImpaired(state, player.id) : false;
}

export function alignmentOf(
  state: GameState,
  player: Player | null,
  registrations: Registrations = {},
): "good" | "evil" | null {
  if (!player) return null;
  const override = registrationApplies(state, player) ? registrations[player.id] : undefined;
  if (override === "good" || override === "evil") return override;
  return realTeamOf(player) === "evil" ? "evil" : "good";
}

export function registersAsDemon(
  state: GameState,
  player: Player | null,
  registrations: Registrations = {},
): boolean {
  if (!player) return false;
  if (roleTeam(player.roleId || "") === "demon") return true;
  if (player.roleId === "recluse") {
    return registrationApplies(state, player) && registrations[player.id] === "demon";
  }
  return false;
}

export function registersAsTownsfolk(
  state: GameState,
  player: Player | null,
  registrations: Registrations = {},
): boolean {
  if (!player) return false;
  if (roleTeam(player.roleId || "") === "townsfolk") return true;
  return (
    player.roleId === "spy" &&
    registrationApplies(state, player) &&
    registrations[player.id] === "townsfolk"
  );
}

export function registersAsMinion(
  state: GameState,
  player: Player | null,
  registrations: Registrations = {},
): boolean {
  if (!player) return false;
  if (roleTeam(player.roleId || "") === "minion") return true;
  return (
    player.roleId === "recluse" &&
    registrationApplies(state, player) &&
    registrations[player.id] === "minion"
  );
}

export function registersAsOutsider(
  state: GameState,
  player: Player | null,
  registrations: Registrations = {},
): boolean {
  if (!player) return false;
  if (roleTeam(player.roleId || "") === "outsider") return true;
  return (
    player.roleId === "spy" &&
    registrationApplies(state, player) &&
    registrations[player.id] === "outsider"
  );
}

export function characterChoices(
  state: GameState,
  targetId: string,
  actorImpaired: boolean = false,
): RoleId[] {
  if (actorImpaired) return ALL_ROLES.slice();
  const player = playerById(state, targetId);
  if (!player) return [];
  // A drunk or poisoned Spy or Recluse has no registration to show.
  if (isImpaired(state, targetId)) return [player.roleId as RoleId];
  if (player.roleId === "recluse") {
    return [player.roleId].concat(
      ALL_ROLES.filter((id) => roleTeam(id) === "minion" || roleTeam(id) === "demon"),
    );
  }
  if (player.roleId === "spy") {
    return [player.roleId].concat(
      ALL_ROLES.filter((id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider"),
    );
  }
  return [player.roleId as RoleId];
}

function executedOn(state: GameState, dayNumber: number): InformationContext["executedToday"] {
  const death = executionDeathForDay(state, dayNumber);
  return death ? { playerId: death.playerId, roleId: death.roleId } : null;
}

/** The read-only facts an information capability resolves from. */
export function informationFacts(
  state: GameState,
  query: {
    actorId: string;
    infoKind: string;
    targetIds: readonly string[];
    registrations: Registrations;
    impaired: boolean;
    at: DeadAt;
  },
): InformationContext {
  const { registrations } = query;
  return {
    actorId: query.actorId,
    infoKind: query.infoKind,
    targetIds: query.targetIds,
    impaired: query.impaired,
    at: query.at,
    seatIds: state.order.slice(),
    isAlive: (playerId) => Boolean(playerById(state, playerId)?.alive),
    aliveNeighborIds: (playerId) => aliveNeighbors(state, playerId),
    registeredTeamOf: (playerId) => alignmentOf(state, playerById(state, playerId), registrations),
    // Recluse r3007 and Spy r3118: a sober and healthy Recluse might register
    // as evil and a sober and healthy Spy as good, whatever the host has
    // chosen for this step so far.
    mayRegisterAs: (playerId, team) => {
      const player = playerById(state, playerId);
      if (alignmentOf(state, player) === team) return true;
      return Boolean(
        player &&
        player.roleId === (team === "evil" ? "recluse" : "spy") &&
        registrationApplies(state, player),
      );
    },
    registersAsDemon: (playerId) =>
      registersAsDemon(state, playerById(state, playerId), registrations),
    // The setup secret first, then the top-level field, as before the move.
    redHerringId:
      (state.setup && state.setup.herringId ? state.setup.herringId : state.herringId) ?? null,
    // Undertaker r3115: the death by execution of the day that just ended.
    executedToday: executedOn(state, query.at.number - 1),
    // The seat's own character and, for a sober and healthy Spy or Recluse,
    // the characters it might register as, whatever the acting player's state.
    mayRegisterAsCharacters: (playerId) => characterChoices(state, playerId),
    actualRoleOf: (playerId) => playerById(state, playerId)?.roleId ?? null,
    hasPlayer: (playerId) => playerById(state, playerId) != null,
  };
}
