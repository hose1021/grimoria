// Which setup answers the Secrets screen may offer. The engine already admits
// the Librarian's zero when the only Outsider is a Recluse, and a shown
// character held by a registering Spy or Recluse; the screen must offer the
// same options. Pure functions, so the rules stay testable without a DOM.
import { ALL_ROLES, roleTeam } from "../../core/model/rules.ts";
import type { RoleId, Team } from "../../core/model/types.ts";

export interface PlayerRole {
  roleId?: string | null;
}

/** The Librarian's zero is true while every Outsider in play is a Recluse. */
export function librarianZeroLegal(players: readonly PlayerRole[]): boolean {
  return !players.some(
    (player) => roleTeam(player.roleId ?? "") === "outsider" && player.roleId !== "recluse",
  );
}

/**
 * Whether the stored answer of an information role is shown as the zero.
 * "Zero are in play" is the Librarian's answer alone (Librarian r1721). A zero
 * held for the Washerwoman or the Investigator is no answer, so their editor
 * keeps the fields the host prepares one with.
 */
export function zeroShown(roleId: string, stored: unknown): boolean {
  return (
    roleId === "librarian" && typeof stored === "object" && stored !== null && "zero" in stored
  );
}

/**
 * The role options for one information editor. A real role offers the
 * characters held by the players of that team; a registering Spy (Townsfolk or
 * Outsider) or Recluse (Minion) also offers the not-in-play characters of that
 * team, which the engine accepts as a registration. The Drunk may be told any
 * character of the shown role's team.
 */
export function infoRoleChoices({
  team,
  forDrunk,
  held,
  scriptRoles,
  pairRoles,
}: {
  team: Team;
  forDrunk: boolean;
  held: readonly RoleId[];
  scriptRoles: readonly RoleId[];
  /** The roles of the two chosen players, or of the chosen player still pending. */
  pairRoles: ReadonlyArray<string | null | undefined>;
}): RoleId[] {
  if (forDrunk) return ALL_ROLES.filter((id) => roleTeam(id) === team);
  const choices = held.filter((id) => roleTeam(id) === team);
  // The engine accepts a not-in-play character only while the registering Spy
  // or Recluse is one of the two chosen players, so the pair decides.
  const registering = pairRoles.some((roleId) =>
    team === "minion" ? roleId === "recluse" : roleId === "spy",
  );
  if (registering) {
    for (const id of scriptRoles) {
      if (roleTeam(id) === team && !held.includes(id) && !choices.includes(id)) choices.push(id);
    }
  }
  return choices;
}

/**
 * The write boundary between the engine's `secretsErrors` and the checklist's
 * done mark. A row is done only while the engine reports no problem for that
 * obligation, so the tick and the "ready" gate cannot disagree.
 */
export function obligationDone(id: string, problems: ReadonlyArray<{ code: string }>): boolean {
  if (id === "herring")
    return !problems.some(
      (problem) => problem.code === "herring" || problem.code === "herring-team",
    );
  return !problems.some(
    (problem) =>
      problem.code === "info-" + id ||
      problem.code.endsWith("-" + id) ||
      (id === "librarian" && problem.code === "librarian-zero"),
  );
}

export interface ReminderRow {
  roleId: string;
  name: string;
  tokens: string[];
}

/** One checklist row per role in play that has reminders, in bag order. */
export function reminderRows(
  roles: readonly string[],
  reminders: Record<string, string[] | undefined>,
  nameOf: (id: string) => string,
): ReminderRow[] {
  const rows: ReminderRow[] = [];
  const seen = new Set<string>();
  for (const roleId of roles) {
    if (seen.has(roleId)) continue;
    seen.add(roleId);
    const tokens = reminders[roleId] ?? [];
    if (tokens.length) rows.push({ roleId, name: nameOf(roleId), tokens });
  }
  return rows;
}
