import type { RoleId, Script, ScriptEdition } from "./types.js";
import { editionsIn, isManualScript, roleTeam } from "./rules.ts";
import { orderedScriptRoles } from "./night-order.ts";
import { JINX_RESOURCES_VERSION } from "./jinxes.ts";
import type { JinxPair } from "./jinxes.ts";
import {
  interactionsFor,
  type InteractionDefinition,
  type InteractionStatus,
} from "./interactions.ts";
import { roleSupport, scriptSupport, type SupportLevel } from "./support.ts";

// A script is data: a normalized character set plus the evidence that this
// build can compose those characters. It is never a second engine and never a
// promise that arbitrary imported JSON runs automatically.

export type ScriptOrigin = "official" | "imported";

export interface ScriptRoleVerdict {
  readonly roleId: RoleId;
  readonly level: SupportLevel;
  readonly reason: string;
}

export interface ScriptInteractionVerdict {
  readonly id: string;
  readonly roles: readonly [RoleId, RoleId];
  readonly kind: InteractionDefinition["kind"];
  readonly status: InteractionStatus;
  readonly reason: string;
  readonly statusReason: string;
  readonly source: string;
  readonly pin: string;
  readonly test: string | null;
}

export interface ScriptCompatibility {
  /** The weakest role, or an unsupported interaction: the script's own level. */
  readonly level: SupportLevel;
  /** Automatic play is safe; host choices stay journaled, manual fallback is off. */
  readonly automatic: boolean;
  readonly manualOnly: boolean;
  readonly mixed: boolean;
  readonly editions: readonly Exclude<ScriptEdition, "custom">[];
  readonly roles: readonly ScriptRoleVerdict[];
  readonly interactions: readonly ScriptInteractionVerdict[];
  readonly unknown: readonly RoleId[];
  readonly jinxes: readonly JinxPair[];
  /** The official interaction snapshot the verdict is pinned to. */
  readonly evidenceRevision: string;
}

export interface ScriptDefinition {
  readonly script: Script;
  readonly origin: ScriptOrigin;
  readonly rulesetRevision: string | null;
  readonly roles: readonly RoleId[];
  readonly mixed: boolean;
  readonly editions: readonly Exclude<ScriptEdition, "custom">[];
  readonly teams: Readonly<Record<"townsfolk" | "outsider" | "minion" | "demon", number>>;
  readonly nightOrder: { readonly first: readonly RoleId[]; readonly other: readonly RoleId[] };
  readonly compatibility: ScriptCompatibility;
}

function interactionVerdict(entry: InteractionDefinition): ScriptInteractionVerdict {
  return {
    id: entry.id,
    roles: entry.roles,
    kind: entry.kind,
    status: entry.status,
    reason: entry.reason,
    statusReason: entry.statusReason,
    source: entry.source,
    pin: entry.pin,
    test: entry.test,
  };
}

/**
 * The one compatibility computation. A role's own support level is the floor;
 * a registered interaction can lower it. An interaction with no implemented
 * behavior is `unsupported`, not a Storyteller choice, because there is no
 * legal command that resolves it.
 */
export function scriptCompatibility(script: Script | null | undefined): ScriptCompatibility {
  if (!script) {
    return {
      level: "unsupported",
      automatic: false,
      manualOnly: false,
      mixed: false,
      editions: [],
      roles: [],
      interactions: [],
      unknown: [],
      jinxes: [],
      evidenceRevision: JINX_RESOURCES_VERSION,
    };
  }
  const roles = [...new Set(script.roles ?? [])];
  const support = scriptSupport(roles);
  const roleVerdicts = roles.map((roleId) => {
    const verdict = roleSupport(roleId);
    return { roleId, level: verdict.level, reason: verdict.reason };
  });
  const interactions = interactionsFor(roles).map(interactionVerdict);
  const levels: SupportLevel[] = [support.level, ...interactions.map((entry) => entry.status)];
  const level: SupportLevel = levels.includes("unsupported")
    ? "unsupported"
    : levels.includes("requires-storyteller-choice")
      ? "requires-storyteller-choice"
      : "verified";
  const manualOnly = isManualScript(script);
  return {
    level,
    automatic: !manualOnly && level !== "unsupported" && support.unknown.length === 0,
    manualOnly,
    mixed: editionsIn(roles).size > 1,
    editions: [...editionsIn(roles)],
    roles: roleVerdicts,
    interactions,
    unknown: support.unknown,
    jinxes: support.jinxes,
    evidenceRevision: JINX_RESOURCES_VERSION,
  };
}

/** Whether this script runs through the automatic engine without manual fallback. */
export function scriptRunsAutomatically(script: Script | null | undefined): boolean {
  return scriptCompatibility(script).automatic;
}

export function defineScript(script: Script): ScriptDefinition {
  const compatibility = scriptCompatibility(script);
  const editions = [...editionsIn(script.roles ?? [])];
  const teams = {
    townsfolk: 0,
    outsider: 0,
    minion: 0,
    demon: 0,
  };
  for (const roleId of script.roles ?? []) {
    const team = roleTeam(roleId);
    if (team) teams[team] += 1;
  }
  const official =
    script.source === "official" &&
    (script.edition === "tb" || script.edition === "bmr" || script.edition === "snv");
  return {
    script,
    origin: official ? "official" : "imported",
    rulesetRevision:
      typeof script.rulesetRevision === "string" && script.rulesetRevision
        ? script.rulesetRevision
        : null,
    roles: [...(script.roles ?? [])],
    mixed: editions.length > 1,
    editions,
    teams,
    nightOrder: {
      first: orderedScriptRoles(script.roles ?? [], 1),
      other: orderedScriptRoles(script.roles ?? [], 2),
    },
    compatibility,
  };
}
