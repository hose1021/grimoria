import type { RoleId } from "./types.js";
import { SUPPORTED_ROLES } from "./rules.ts";

// Official jinxes that apply to the supported ruleset. The table is a verbatim
// subset of the pinned official resources snapshot in
// `docs/official/jinxes.json`; `js/support.test.mjs` fails when the two drift
// apart. `JINX_RESOURCES_VERSION` is the snapshot date, so a table update must
// name the resource version it was taken from.
export const JINX_RESOURCES_VERSION = "2026-11-11";
export const JINX_SOURCE_PATH = "docs/official/jinxes.json";

export interface JinxPair {
  /** The two role ids, sorted, exactly as the official entry names them. */
  readonly roles: readonly [RoleId, RoleId];
  readonly reason: string;
  /** Snapshot path with the pair anchor, for a traceable citation. */
  readonly source: string;
}

const pair = (a: RoleId, b: RoleId, reason: string): JinxPair => ({
  roles: [a, b],
  reason,
  source: JINX_SOURCE_PATH + "#" + a + "/" + b,
});

export const JINX_PAIRS: readonly JinxPair[] = [
  pair(
    "chambermaid",
    "mathematician",
    "The Chambermaid can detect if the Mathematician will wake tonight.",
  ),
  pair(
    "drunk",
    "mathematician",
    "The Mathematician learns if the Drunk’s ability yielded false info or failed to work properly.",
  ),
  pair(
    "fanggu",
    "scarletwoman",
    "If there would be two Demons, one of which was the Scarlet Woman, the Scarlet Woman remains the Scarlet Woman.",
  ),
  pair(
    "goon",
    "pithag",
    "If the Pit-Hag turns an evil player into the Goon, they can't turn good due to their own ability.",
  ),
  pair(
    "lunatic",
    "mathematician",
    "The Mathematician learns if the Lunatic attacks a different player than the real Demon attacked.",
  ),
  pair(
    "mastermind",
    "vigormortis",
    "A Mastermind that has their ability keeps it if the Vigormortis dies.",
  ),
  pair("recluse", "sage", "The Recluse might register as the Demon to the Sage."),
];

const PAIRS_BY_KEY = new Map(JINX_PAIRS.map((entry) => [entry.roles.join("+"), entry]));

export function jinxFor(a: RoleId, b: RoleId): JinxPair | null {
  return PAIRS_BY_KEY.get([a, b].sort().join("+")) ?? null;
}

export function scriptJinxes(roles: readonly RoleId[]): readonly JinxPair[] {
  const unique = [...new Set(roles)];
  return JINX_PAIRS.filter((entry) => entry.roles.every((id) => unique.includes(id)));
}

export type JinxStatus =
  | { status: "verified"; pair: JinxPair }
  | { status: "none" }
  | { status: "unsupported"; reason: string };

// An unknown character is never treated as "no jinx": it is an explicit
// unsupported result so an import cannot silently fall back to manual play.
export function lookupJinx(
  a: RoleId,
  b: RoleId,
  known: readonly RoleId[] = SUPPORTED_ROLES,
): JinxStatus {
  if (!known.includes(a) || !known.includes(b)) {
    return { status: "unsupported", reason: "unknown character in jinx pair" };
  }
  const entry = jinxFor(a, b);
  return entry ? { status: "verified", pair: entry } : { status: "none" };
}
