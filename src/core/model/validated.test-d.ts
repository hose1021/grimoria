// The brand stops ordinary assignment only. Casts compile; the runtime
// validator and the policy scan are the remaining controls, so no test here
// expects a cast to fail.
import type { GameState } from "./types.ts";
import type { ValidatedState } from "./validated.ts";

declare const plain: GameState;
// @ts-expect-error -- a plain game state is not a validated state
const forged: ValidatedState = plain;

declare const unknownValue: unknown;
// @ts-expect-error -- unknown data cannot be narrowed by assignment
const narrowed: ValidatedState = unknownValue;

declare const validated: ValidatedState;
const state: GameState = validated;

void forged;
void narrowed;
void state;
