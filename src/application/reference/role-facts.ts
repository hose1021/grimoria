// Read-only engine facts for the Storyteller reference. The page shows what
// this app actually adjudicates, so the facts come from the role modules
// rather than from prose.
import { roleModule } from "../../core/roles/registry.ts";
import type { RoleCapability } from "../../core/roles/ability.ts";

export type ReferenceTarget = "none" | "one-any" | "one-other" | "two" | "po";

export interface RoleFacts {
  /** Player targeting of the role's night step, if it has one. */
  readonly target: ReferenceTarget | null;
  readonly optional: boolean;
  readonly canKill: boolean;
  readonly canResurrect: boolean;
  /** Capability kinds the engine implements for this role, sorted. */
  readonly capabilities: readonly string[];
  /** Locale keys for the console notes of this role's night steps. */
  readonly noteKeys: readonly string[];
  readonly registersToStoryteller: boolean;
}

export function roleFacts(id: string): RoleFacts | null {
  const module = roleModule(id);
  if (!module) return null;
  const capabilities: readonly RoleCapability[] = module.capabilities ?? [];
  const steps = [module.firstNightStep, module.nightStep]
    .filter((step) => step !== undefined)
    .concat(
      capabilities.flatMap((capability) =>
        capability.kind === "night-step" ? [capability.step] : [],
      ),
    );
  const target =
    steps.map((step) => step.target ?? null).find((value) => value !== null) ??
    (capabilities.some((capability) => capability.kind === "night-step") ? "none" : null);
  const kinds = capabilities.map((capability) => capability.kind).sort();
  if (module.deathStep && !kinds.includes("death-trigger")) kinds.push("death-trigger");
  const noteKeys = [
    ...new Set(
      [...steps, module.deathStep]
        .map((step) => step?.noteKey)
        .filter((key): key is string => typeof key === "string"),
    ),
  ];
  return {
    target,
    optional: steps.some((step) => step.optional === true),
    canKill: steps.some((step) => step.canKill === true) || Boolean(module.deathStep),
    canResurrect: steps.some((step) => step.canResurrect === true),
    capabilities: [...new Set(kinds)].sort(),
    noteKeys,
    registersToStoryteller: capabilities.some(
      (capability) => capability.kind === "adjudication" && capability.case === "registration",
    ),
  };
}
