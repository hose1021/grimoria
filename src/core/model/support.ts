import type { RoleId } from "./types.js";
import { SUPPORTED_ROLES } from "./rules.ts";
import { scriptJinxes, type JinxPair } from "./jinxes.ts";
import { interactionStatusOf } from "./interactions.ts";

// One classification for every supported character, derived from the audit
// table in `docs/rules-matrix.md`. `src/core/model/support.test.ts` recomputes the level
// from the matrix rows, so the code cannot claim more than the table proves.
//
// - verified: every matrix row is verified.
// - requires-storyteller-choice: at least one row is an official host choice or
//   implemented without an asserting test, so the Storyteller must resolve or
//   verify it; the app must not present it as automated.
// - unsupported: at least one row is not modeled at all.
export type SupportLevel = "verified" | "requires-storyteller-choice" | "unsupported";

export const SUPPORT_LEVELS: readonly SupportLevel[] = [
  "verified",
  "requires-storyteller-choice",
  "unsupported",
];

export interface SupportVerdict {
  level: SupportLevel;
  reason: string;
}

/** The three level lists; exported so the partition invariant is testable. */
export const SUPPORT_VERIFIED: readonly RoleId[] = [
  "assassin",
  "barber",
  "baron",
  "butler",
  "clockmaker",
  "courtier",
  "devilsadvocate",
  "drunk",
  "exorcist",
  "fanggu",
  "flowergirl",
  "fool",
  "fortuneteller",
  "gambler",
  "godfather",
  "goon",
  "gossip",
  "grandmother",
  "imp",
  "innkeeper",
  "investigator",
  "juggler",
  "klutz",
  "librarian",
  "lunatic",
  "mastermind",
  "mayor",
  "minstrel",
  "monk",
  "moonchild",
  "nodashii",
  "oracle",
  "philosopher",
  "pithag",
  "po",
  "poisoner",
  "professor",
  "ravenkeeper",
  "recluse",
  "sage",
  "sailor",
  "saint",
  "scarletwoman",
  "seamstress",
  "shabaloth",
  "slayer",
  "snakecharmer",
  "soldier",
  "spy",
  "sweetheart",
  "tealady",
  "towncrier",
  "undertaker",
  "vigormortis",
  "virgin",
  "washerwoman",
  "witch",
  "zombuul",
];

export const SUPPORT_STORYTELLER: readonly RoleId[] = [
  "artist",
  "cerenovus",
  "chambermaid",
  "chef",
  "dreamer",
  "empath",
  "eviltwin",
  "mathematician",
  "mutant",
  "pacifist",
  "pukka",
  "savant",
  "tinker",
  "vortox",
];

export const SUPPORT_UNSUPPORTED: readonly RoleId[] = [];

export const ROLE_SUPPORT: Readonly<Record<RoleId, SupportLevel>> = Object.fromEntries([
  ...SUPPORT_VERIFIED.map((id) => [id, "verified"] as const),
  ...SUPPORT_STORYTELLER.map((id) => [id, "requires-storyteller-choice"] as const),
  ...SUPPORT_UNSUPPORTED.map((id) => [id, "unsupported"] as const),
]);

const REASONS: Record<SupportLevel, string> = {
  verified: "the pinned ruleset implements every named behavior and a test asserts it",
  "requires-storyteller-choice": "the Storyteller resolves or verifies at least one printed choice",
  unsupported: "the engine does not model this character's ability",
};

export function roleSupport(id: RoleId): SupportVerdict {
  const level = ROLE_SUPPORT[id];
  if (!level) return { level: "unsupported", reason: "unknown character" };
  return { level, reason: REASONS[level] };
}

// The screens render this table. Every requested role gets an entry, including
// an unknown one, so a manual fallback is never hidden by an omission.
export type RoleSupportStatus = "verified" | "host-choice" | "unsupported";

export interface RoleSupportEntry {
  roleId: RoleId;
  status: RoleSupportStatus;
  /** Translation key; the screens resolve it in the active language. */
  detail: string;
}

const UI_STATUS: Record<SupportLevel, RoleSupportStatus> = {
  verified: "verified",
  "requires-storyteller-choice": "host-choice",
  unsupported: "unsupported",
};

const DETAIL_KEYS: Partial<Record<RoleId, string>> = {
  goon: "roleSupport.goon",
  lunatic: "roleSupport.lunatic",
  tinker: "roleSupport.tinker",
  pacifist: "roleSupport.pacifist",
  mastermind: "roleSupport.mastermind",
};

export function roleSupportEntries(roles: readonly RoleId[] = []): RoleSupportEntry[] {
  return roles.map((roleId) => {
    const level = ROLE_SUPPORT[roleId] ?? "unsupported";
    return {
      roleId,
      status: UI_STATUS[level],
      detail: DETAIL_KEYS[roleId] ?? "roleSupport.detail." + level,
    };
  });
}

export interface ScriptSupport {
  /** The weakest level across the pool; a jinx pair also needs the Storyteller. */
  level: SupportLevel;
  counts: Record<SupportLevel, number>;
  roles: Partial<Record<RoleId, SupportLevel>>;
  unknown: RoleId[];
  jinxes: readonly JinxPair[];
}

// A script's level is never stronger than its weakest role or its registered
// interactions. A jinx whose behavior is missing is `unsupported`; a jinx the
// host must resolve is `requires-storyteller-choice`.
export function scriptSupport(roles: readonly RoleId[]): ScriptSupport {
  const unique = [...new Set(roles)];
  const counts: Record<SupportLevel, number> = {
    verified: 0,
    "requires-storyteller-choice": 0,
    unsupported: 0,
  };
  const levels: Partial<Record<RoleId, SupportLevel>> = {};
  for (const id of unique) {
    const level = ROLE_SUPPORT[id] ?? "unsupported";
    levels[id] = level;
    counts[level] += 1;
  }
  const jinxes = scriptJinxes(unique);
  const interactionLevel = interactionStatusOf(unique);
  const level: SupportLevel =
    counts.unsupported > 0 || interactionLevel === "unsupported"
      ? "unsupported"
      : counts["requires-storyteller-choice"] > 0 ||
          interactionLevel === "requires-storyteller-choice"
        ? "requires-storyteller-choice"
        : "verified";
  return {
    level,
    counts,
    roles: levels,
    unknown: unique.filter((id) => !SUPPORTED_ROLES.includes(id)),
    jinxes,
  };
}
