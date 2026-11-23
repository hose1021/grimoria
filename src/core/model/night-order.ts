import type { RoleId } from "./types.js";

// The official first-night and other-night order from
// `docs/official/nightsheet.json`, restricted to the characters this build
// supports and the two system introductions. Characters the build does not
// support are omitted; the relative order of the supported ones is unchanged.
//
// `src/core/model/night-order.test.ts` recomputes both lists from the snapshot
// and proves that each edition's projection still equals its own published
// sequence, so this file cannot drift from either source.

export const NIGHT_FIRST_ORDER: readonly RoleId[] = [
  "philosopher",
  "minioninfo",
  "lunatic",
  "demoninfo",
  "sailor",
  "poisoner",
  "courtier",
  "snakecharmer",
  "godfather",
  "devilsadvocate",
  "eviltwin",
  "witch",
  "cerenovus",
  "pukka",
  "washerwoman",
  "librarian",
  "investigator",
  "chef",
  "empath",
  "fortuneteller",
  "butler",
  "grandmother",
  "clockmaker",
  "dreamer",
  "seamstress",
  "spy",
  "chambermaid",
  "mathematician",
];

export const NIGHT_OTHER_ORDER: readonly RoleId[] = [
  "philosopher",
  "sailor",
  "poisoner",
  "courtier",
  "innkeeper",
  "gambler",
  "snakecharmer",
  "monk",
  "devilsadvocate",
  "witch",
  "cerenovus",
  "pithag",
  "scarletwoman",
  "lunatic",
  "exorcist",
  "imp",
  "zombuul",
  "pukka",
  "shabaloth",
  "po",
  "fanggu",
  "nodashii",
  "vortox",
  "vigormortis",
  "assassin",
  "godfather",
  "gossip",
  "barber",
  "sweetheart",
  "sage",
  "professor",
  "tinker",
  "moonchild",
  "grandmother",
  "ravenkeeper",
  "empath",
  "fortuneteller",
  "undertaker",
  "dreamer",
  "flowergirl",
  "towncrier",
  "oracle",
  "seamstress",
  "juggler",
  "butler",
  "spy",
  "chambermaid",
  "mathematician",
];

/** The official order for one night: the first night differs from the rest. */
export function officialNightOrder(night: number): readonly RoleId[] {
  return night === 1 ? NIGHT_FIRST_ORDER : NIGHT_OTHER_ORDER;
}

/**
 * The position of a character in the official order, or -1 when the character
 * does not wake that night. A caller keeps its own fallback for -1.
 */
export function nightOrderRank(roleId: RoleId, night: number): number {
  return officialNightOrder(night).indexOf(roleId);
}

/**
 * The characters of a script in official order, without the system
 * introductions. A role that does not wake that night is absent, exactly as
 * the official nightsheet prints it.
 */
export function orderedScriptRoles(roles: readonly RoleId[], night: number): RoleId[] {
  const pool = new Set(roles);
  return officialNightOrder(night).filter(
    (id) => pool.has(id) && id !== "minioninfo" && id !== "demoninfo",
  );
}
