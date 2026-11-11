import type {
  AllowedResult,
  CommandResult,
  Correction,
  Effect,
  EffectGraphResult,
  GameState,
  NightStep,
  RejectedResult,
} from "./types.js";

declare const state: GameState;

const order: string[] = state.order;
const phase: "setup" | "deal" | "seat" | "night" | "day" | "over" = state.phase;

// @ts-expect-error -- a seat order is a string array, not a number
const wrongOrder: number = state.order;

// @ts-expect-error -- a phase is not an arbitrary string
const wrongPhase: "lobby" = state.phase;

declare const effect: Effect;
const effectKind: string = effect.kind;
// @ts-expect-error -- an effect kind is a string, not a number
const wrongEffectKind: number = effect.kind;

declare const activeGraph: Extract<EffectGraphResult, { ok: true }>;
const activePoison: Set<string> = activeGraph.activePoison;
declare const failedGraph: Extract<EffectGraphResult, { ok: false }>;
const failedIds: string[] = failedGraph.effectIds;
// @ts-expect-error -- a failed graph has no activePoison
const missingActivePoison: Set<string> = failedGraph.activePoison;

declare const step: NightStep;
const stepKey: string = step.key;
// @ts-expect-error -- a night step key is a string, not a number
const wrongStepKey: number = step.key;

declare const correction: Correction;
const correctionAt: string = correction.at;
// @ts-expect-error -- a correction timestamp is a string, not a number
const wrongCorrectionAt: number = correction.at;

const svFlag: boolean | undefined = step.sv;
// @ts-expect-error -- the BMR marker is a boolean, not a string
const wrongBmrFlag: string = step.bmr;

declare const commandResult: CommandResult;
if (commandResult.status === "allowed") {
  const allowedId: string = commandResult.id;
  void allowedId;
} else if (commandResult.status === "rejected") {
  const rejectionReason: string = commandResult.reason;
  void rejectionReason;
} else {
  const choiceKind: string = commandResult.choice.kind;
  void choiceKind;
}
// @ts-expect-error -- a reason exists only on a rejected result
const wrongResultReason: string = commandResult.reason;

declare const allowedResult: AllowedResult;
const persisted: boolean | undefined = allowedResult.persisted;
declare const rejectedResult: RejectedResult;
const rejectedReason: string = rejectedResult.reason;
const persistFailedCode: string | null | undefined = rejectedResult.errorCode;
// @ts-expect-error -- an allowed result has no rejection reason
const wrongAllowedReason: string = allowedResult.reason;

void order;
void phase;
void wrongOrder;
void wrongPhase;
void effectKind;
void wrongEffectKind;
void activePoison;
void failedIds;
void missingActivePoison;
void stepKey;
void wrongStepKey;
void correctionAt;
void wrongCorrectionAt;
void svFlag;
void wrongBmrFlag;
void wrongResultReason;
void persisted;
void rejectedReason;
void persistFailedCode;
void wrongAllowedReason;
