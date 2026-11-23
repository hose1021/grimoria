import type { RoleId } from "./types.js";
import { JINX_PAIRS, JINX_RESOURCES_VERSION, type JinxPair } from "./jinxes.ts";

// Cross-character rules that are not part of one role's own ability: official
// jinxes and, later, printed cross-role effects. Each entry names the pinned
// evidence and whether the engine implements the behavior.
//
// The official snapshot proves that a pair exists, not that the engine resolves
// it. A pair without an asserting behavioral test is `unsupported`: the
// automatic engine does not run it, and an imported script that can trigger it
// needs the explicit manual-only fallback. `requires-storyteller-choice` is
// reserved for a behavior the engine implements but the host must decide.
export type InteractionStatus = "verified" | "requires-storyteller-choice" | "unsupported";

export interface InteractionDefinition {
  readonly id: string;
  readonly roles: readonly [RoleId, RoleId];
  readonly kind: "jinx" | "cross-role";
  readonly reason: string;
  /** Pinned evidence: snapshot path and pair anchor, or a wiki revision. */
  readonly source: string;
  /** Snapshot version or wiki revision the entry is pinned to. */
  readonly pin: string;
  readonly status: InteractionStatus;
  /** Why the status is what it is; names the missing behavior for `unsupported`. */
  readonly statusReason: string;
  /** The behavioral test that proves the status, or null while it is missing. */
  readonly test: string | null;
}

const JINX_BEHAVIOR: Record<
  string,
  { status: InteractionStatus; statusReason: string; test: string }
> = {
  "chambermaid+mathematician": {
    status: "verified",
    statusReason:
      "The Chambermaid counts the whole night's wake set, including the later Mathematician.",
    test: "the Chambermaid counts the Mathematician's scheduled wake (JINX-CHAMBERMAID-01)",
  },
  "drunk+mathematician": {
    status: "verified",
    statusReason:
      "A Drunk's false information or failed ability writes the ABNORMAL mark the Mathematician counts.",
    test: "the Drunk's false information becomes a Mathematician abnormality (JINX-DRUNK-01); a Drunk's failed non-information ability is a Mathematician abnormality (JINX-DRUNK-02); a true prepared or alternative one-of-two answer is not marked (JINX-DRUNK-04, JINX-DRUNK-06); the legacy false default is marked (JINX-DRUNK-05)",
  },
  "fanggu+scarletwoman": {
    status: "verified",
    statusReason:
      "The Fang Gu possession leaves the Scarlet Woman a Minion; a second living Demon blocks inheritance.",
    test: "a second living Demon blocks the Scarlet Woman's inheritance (JINX-FANGGU-02)",
  },
  "goon+pithag": {
    status: "verified",
    statusReason:
      "A Goon the Pit-Hag creates from an evil player cannot turn good through its own ability.",
    test: "an evil Goon made by the Pit-Hag cannot turn good (JINX-GOON-01)",
  },
  "lunatic+mathematician": {
    status: "verified",
    statusReason:
      "The Mathematician gains one ABNORMAL when the Lunatic's chosen set differs from the acting Demon's.",
    test: "the Lunatic's different attack becomes a Mathematician abnormality (JINX-LUNATIC-01)",
  },
  "mastermind+vigormortis": {
    status: "verified",
    statusReason:
      "A Mastermind killed by the Vigormortis keeps its ability after the Vigormortis dies.",
    test: "a dead Mastermind retained by the Vigormortis still grants the extra day (JINX-MASTERMIND-01)",
  },
  "recluse+sage": {
    status: "verified",
    statusReason:
      "A Recluse pair is legal for the Sage and records the implied Demon registration.",
    test: "the Recluse can be the Demon in the Sage's pair (JINX-SAGE-01); the Sage's Recluse pair records the implied registration (JINX-SAGE-02)",
  },
};

function jinxInteraction(pair: JinxPair): InteractionDefinition {
  const key = [...pair.roles].sort().join("+");
  const behavior = JINX_BEHAVIOR[key];
  if (!behavior) {
    // A new official pair must be classified before it can reach a verdict.
    throw new Error("Unclassified official jinx: " + key);
  }
  return {
    id: "jinx:" + key,
    roles: pair.roles,
    kind: "jinx",
    reason: pair.reason,
    source: pair.source,
    pin: JINX_RESOURCES_VERSION,
    status: behavior.status,
    statusReason: behavior.statusReason,
    test: behavior.test,
  };
}

export const INTERACTIONS: readonly InteractionDefinition[] = JINX_PAIRS.map(jinxInteraction);

const BY_KEY = new Map(
  INTERACTIONS.map((entry) => [[...entry.roles].sort().join("+"), entry] as const),
);
if (BY_KEY.size !== INTERACTIONS.length) throw new Error("Duplicate interaction pair");

/** Every registered interaction whose characters are all in the pool. */
export function interactionsFor(roles: readonly RoleId[]): readonly InteractionDefinition[] {
  const pool = new Set(roles);
  return INTERACTIONS.filter((entry) => entry.roles.every((id) => pool.has(id)));
}

/** One registered interaction by its two characters, or null. */
export function interactionFor(a: RoleId, b: RoleId): InteractionDefinition | null {
  return BY_KEY.get([a, b].sort().join("+")) ?? null;
}

export function interactionStatusOf(roles: readonly RoleId[]): InteractionStatus {
  const entries = interactionsFor(roles);
  if (entries.some((entry) => entry.status === "unsupported")) return "unsupported";
  if (entries.some((entry) => entry.status === "requires-storyteller-choice"))
    return "requires-storyteller-choice";
  return "verified";
}
