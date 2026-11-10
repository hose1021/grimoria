// Result of a command, split by responsibility: the domain reports what
// happened, the store adds whether it reached the disk.
import type { Alignment, CommandType, Phase } from "./contracts.ts";
import type { DomainEvent } from "./events.ts";

export type ChoiceKind = "info" | "redirect" | "setup";
export type ChoiceOption = Record<string, unknown>;
export type ChoiceContext = Record<string, unknown>;
export type CommandResultPayload = Record<string, unknown> | null;

export interface FollowUp {
  type: "chooseDemonHeir";
  options: ChoiceOption[];
  context: ChoiceContext;
}

export interface DomainDiff {
  events: number;
  deaths: string[];
  phase: { from: Phase; to: Phase } | null;
  winner: { team: Alignment; reason: string } | null;
  effects: { added: string[]; deactivated: string[] };
}

export interface EffectMark {
  phase: Phase;
  number: number;
  cause?: string;
}

export interface FutureEffect {
  id: string;
  kind: string;
  sourceId?: string | null;
  targetId?: string | null;
  expires: EffectMark | null;
  resolve?: EffectMark | null;
  suspended?: string | null;
  resumeOnHealthy: boolean;
}

export interface FutureStep {
  key: string;
  roleId: string | null;
  system: string | null;
  actorId: string | null;
}

export interface FutureView {
  phase: Phase;
  winner: { team: Alignment; reason: string } | null;
  followUp: FollowUp | null;
  pendingSteps: FutureStep[];
  activeEffects: FutureEffect[];
  delayedEffects: FutureEffect[];
  pendingInheritance: ChoiceContext | null;
}

export type RejectCode =
  | "command-missing-id"
  | "command-unknown"
  | "command-payload"
  | "command-payload-unknown-field"
  | "command-payload-type"
  | "command-at"
  | "command-fingerprint"
  | "ruleset-version-unsupported"
  | "command-id-conflict"
  | "invariant-violation"
  | "persist-failed";

export interface DomainAllowed {
  status: "allowed";
  id: string;
  type: CommandType;
  at: string;
  result: CommandResultPayload;
  followUp: FollowUp | null;
  events: DomainEvent[];
  changes: DomainDiff | null;
  future: FutureView | null;
  undoable: boolean;
  idempotent?: boolean;
  /** True when the command resets undo history (a new game, an import). */
  resetHistory?: boolean;
}

export interface DomainRejected {
  status: "rejected";
  id: string | null;
  type: CommandType | null;
  reason: string;
  errorCode: RejectCode | string | null;
  errors: string[] | null;
}

export interface StorytellerChoice {
  status: "requires-storyteller-choice";
  choice: { kind: ChoiceKind; options: ChoiceOption[]; context: ChoiceContext };
  reason: string;
  errorCode: string | null;
}

export type DomainOutcome = DomainAllowed | DomainRejected | StorytellerChoice;

export type DispatchResult =
  | (DomainAllowed & { persisted: true })
  | (DomainRejected & { persisted: false })
  | StorytellerChoice;
