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

const JINX_BEHAVIOR: Record<string, { status: InteractionStatus; statusReason: string }> = {
  "chambermaid+mathematician": {
    status: "unsupported",
    statusReason:
      "The Chambermaid's wake count reads its own edition's queue; it does not detect whether the Mathematician will wake.",
  },
  "drunk+mathematician": {
    status: "unsupported",
    statusReason:
      "The Mathematician counts host-marked abnormalities; the engine does not derive the Drunk's failed ability.",
  },
  "fanggu+scarletwoman": {
    status: "unsupported",
    statusReason:
      "The Fang Gu jump writes a direct Demon change and does not consult the Scarlet Woman's two-Demon rule.",
  },
  "goon+pithag": {
    status: "unsupported",
    statusReason:
      "A player made Goon from evil can currently turn good through a later ability; the jinx guard is not implemented.",
  },
  "lunatic+mathematician": {
    status: "unsupported",
    statusReason:
      "The engine records the Lunatic's and the Demon's targets but does not compare them for the Mathematician.",
  },
  "mastermind+vigormortis": {
    status: "unsupported",
    statusReason:
      "Retention covers the Vigormortis's dead Minions, not the Mastermind's extra day after the Vigormortis dies.",
  },
  "recluse+sage": {
    status: "unsupported",
    statusReason:
      "The Sage names the recorded killer; a Recluse registration as the Demon to the Sage is not offered.",
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
    test: null,
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
