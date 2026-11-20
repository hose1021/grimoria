import type { AbilityContext, AbilityDecision, NightTiming, RoleCapability } from "./ability.ts";
import type { NightStepSpec, RoleModule } from "./types.ts";

// One lookup for a role's night step. A migrated module declares a
// `night-step` capability; a module that has not moved yet keeps the legacy
// `nightStep` and `firstNightStep` fields. A module uses one form, never
// both, so the engine reads every declaration through these functions. A
// resolver has one form only: the `resolve` of a `night-step` capability.

export type NightStepArm = Extract<RoleCapability, { kind: "night-step" }>;
type InformationArm = Extract<RoleCapability, { kind: "information" }>;
type Declared = RoleModule | null | undefined;

/** The resolver of a completed night step. */
export type NightStepResolver = (context: AbilityContext) => AbilityDecision;

function hasArms(module: RoleModule): boolean {
  return (module.capabilities ?? []).some((capability) => capability.kind === "night-step");
}

function armFor(module: RoleModule, timing: NightTiming): NightStepArm | undefined {
  const arms = (module.capabilities ?? []).filter(
    (capability): capability is NightStepArm => capability.kind === "night-step",
  );
  return (
    arms.find((capability) => capability.timing === timing) ??
    arms.find((capability) => capability.timing === "any")
  );
}

/** The step a module declares for the first night. */
export function firstNightStepOf(module: Declared): NightStepSpec | undefined {
  if (!module) return undefined;
  if (hasArms(module)) return armFor(module, "first")?.step;
  return module.firstNightStep ?? module.nightStep;
}

/** The step a module declares for every night after the first. */
export function otherNightStepOf(module: Declared): NightStepSpec | undefined {
  if (!module) return undefined;
  if (hasArms(module)) return armFor(module, "other")?.step;
  return module.nightStep;
}

/** The step a module declares for one night. */
export function nightStepFor(module: Declared, night: number): NightStepSpec | undefined {
  return night === 1 ? firstNightStepOf(module) : otherNightStepOf(module);
}

/** The step a module declares when it dies outside the printed order. */
export function deathStepOf(module: Declared): NightStepSpec | undefined {
  if (!module) return undefined;
  const arm = (module.capabilities ?? []).find(
    (capability): capability is Extract<RoleCapability, { kind: "death-step" }> =>
      capability.kind === "death-step",
  );
  return arm?.step ?? module.deathStep;
}

/**
 * The resolver for a step completed on one night. Undefined means the module
 * owns no resolution for that night and the engine keeps its own path: a
 * module without a `night-step` capability never owns one.
 */
export function nightResolverFor(module: Declared, night: number): NightStepResolver | undefined {
  return nightArmFor(module, night)?.resolve;
}

/** The `night-step` capability that covers one night, if the module has moved. */
export function nightArmFor(module: Declared, night: number): NightStepArm | undefined {
  if (!module) return undefined;
  return armFor(module, night === 1 ? "first" : "other");
}

/**
 * The information a module's night step yields. Undefined means the module
 * owns no answer and the engine keeps its own path. A module declares one
 * information capability; a role with two kinds of answer has not moved yet.
 */
export function informationOf(module: Declared): InformationArm | undefined {
  return (module?.capabilities ?? []).find(
    (capability): capability is InformationArm => capability.kind === "information",
  );
}
