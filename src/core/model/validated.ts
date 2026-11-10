// The validated state is a nominal marker, not an access control: it stops an
// ordinary assignment of raw data, and it is produced only through a runtime
// validator. A cast still compiles, which is why the validator stays mandatory
// and the policy scan confines assertions to this module.
import type { GameState } from "../../../js/types.js";

declare const validated: unique symbol;

export type ValidatedState = GameState & { readonly [validated]: true };

export interface ValidationProblem {
  code: string;
  message: string;
}

export type ValidationOutcome =
  | { ok: true; state: ValidatedState }
  | { ok: false; errors: ValidationProblem[] };

/** A runtime validator: it receives unknown data and returns messages, not a state. */
export type StateValidator = (value: unknown) => string[];

export function validatedFromUnknown(value: unknown, validate: StateValidator): ValidationOutcome {
  if (typeof value !== "object" || value === null) {
    return { ok: false, errors: [{ code: "state-missing", message: "Saved game is missing." }] };
  }

  let problems: string[];
  try {
    problems = validate(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [{ code: "state-validator-failed", message }] };
  }

  if (problems.length) {
    return {
      ok: false,
      errors: problems.map((message) => ({ code: "state-invalid", message }))
    };
  }

  return { ok: true, state: value as ValidatedState };
}
