// Compile-time contract checks. `tsc -p tsconfig.test.json` consumes them.
import type {
  CommandInput,
  CommandPayloads,
  CommandType,
  Phase,
  PreparedCommand
} from "./contracts.ts";
import type { DispatchResult, DomainOutcome } from "./result.ts";
import type { DomainEvent, EventSink } from "./events.ts";
import type { CommandType as LegacyCommandType, Phase as LegacyPhase } from "../../../js/types.js";

// The legacy and core unions must stay identical, in both directions.
declare const legacyCommandType: LegacyCommandType;
const coreCommandType: CommandType = legacyCommandType;
declare const coreCommandTypeValue: CommandType;
const legacyCommandTypeValue: LegacyCommandType = coreCommandTypeValue;

declare const legacyPhase: LegacyPhase;
const corePhase: Phase = legacyPhase;
declare const corePhaseValue: Phase;
const legacyPhaseValue: LegacyPhase = corePhaseValue;

// CommandInput is a discriminated union: the payload must match the type.
const night: CommandInput = { type: "startNight", payload: {} };
const votes: CommandInput = { type: "recordVotes", payload: { nominationId: "n", voterIds: ["1"] } };
// @ts-expect-error -- recordVotes carries voterIds, not votes
const wrongPayload: CommandInput = { type: "recordVotes", payload: { nominationId: "n", votes: ["1"] } };
// @ts-expect-error -- startNight takes no payload fields
const extraPayload: CommandInput = { type: "startNight", payload: { key: "x" } };

// A prepared command is immutable.
declare const prepared: PreparedCommand;
// @ts-expect-error -- a prepared command cannot be edited in place
prepared.id = "other";

// Result narrowing.
declare const outcome: DomainOutcome;
if (outcome.status === "allowed") {
  const at: string = outcome.at;
  // @ts-expect-error -- an allowed result has no rejection reason
  const reason = outcome.reason;
  void at;
  void reason;
} else if (outcome.status === "rejected") {
  const reason: string = outcome.reason;
  // @ts-expect-error -- a rejected result has no events
  const events = outcome.events;
  void reason;
  void events;
} else {
  const kind: "info" | "redirect" | "setup" = outcome.choice.kind;
  // @ts-expect-error -- the choice kind is a closed union
  const badKind: "teleport" = outcome.choice.kind;
  void kind;
  void badKind;
}

// Persistence is reported by the store, never by the domain.
declare const dispatchResult: DispatchResult;
if (dispatchResult.status === "allowed") {
  const persisted: true = dispatchResult.persisted;
  void persisted;
} else if (dispatchResult.status === "rejected") {
  const persisted: false = dispatchResult.persisted;
  void persisted;
}

// Event names and payloads are closed.
declare const sink: EventSink;
sink.push("phase.changed", { from: "day", to: "night" });
// @ts-expect-error -- an unlisted event name is rejected
sink.push("game.bogus", {});
// @ts-expect-error -- the payload must match the event
sink.push("phase.changed", { from: "day" });

declare const event: DomainEvent;
if (event.type === "phase.changed") {
  const to: Phase = event.payload.to;
  void to;
}

// Every command type has exactly one payload entry.
type MissingPayload = Exclude<CommandType, keyof CommandPayloads>;
type ExtraPayload = Exclude<keyof CommandPayloads, CommandType>;
const noMissingPayload: MissingPayload extends never ? true : false = true;
const noExtraPayload: ExtraPayload extends never ? true : false = true;

void coreCommandType;
void legacyCommandTypeValue;
void corePhase;
void legacyPhaseValue;
void night;
void votes;
void wrongPayload;
void extraPayload;
void noMissingPayload;
void noExtraPayload;
