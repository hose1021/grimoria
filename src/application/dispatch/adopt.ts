import type { DomainOutcome } from "../../core/commands/result.ts";

/**
 * The engine still reports its own result union; the store consumes the typed
 * one. This is the single conversion point for that contract, and the policy
 * confines the assertion to this module next to the validated-state cast.
 */
export function asDomainOutcome(
  result: ReturnType<typeof import("../../core/engine/index.ts").validateCommand>
): DomainOutcome {
  return result as unknown as DomainOutcome;
}
