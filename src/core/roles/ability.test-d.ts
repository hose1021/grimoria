// Compile-time contract checks. `tsc -p tsconfig.test.json` consumes them.
import type {
  AbilityContext,
  AbilityDecision,
  InformationContext,
  InformationDecision,
  RoleCapability,
  RoleEffect,
  TransformationDecision,
} from "./ability.ts";
import type { RoleModule } from "./types.ts";

// A resolver reads facts. The game state and the players map are not reachable,
// so a role cannot mutate unrelated state from its ability.
// @ts-expect-error -- the context exposes no game state
export type StateAccess = AbilityContext["state"];
// @ts-expect-error -- the context exposes no players map
export type PlayersAccess = AbilityContext["players"];

// The engine applies a closed set of intents.
export const unknownEffect: RoleEffect = {
  // @ts-expect-error -- a role cannot invent an effect kind
  kind: "set-winner",
  playerId: "1",
  ability: "gambler",
};

// A dated effect names a mechanic the engine already has.
export const unknownTimedEffect: RoleEffect = {
  kind: "timed-effect",
  // @ts-expect-error -- a role cannot invent an effect kind for the effect graph
  effect: "winner",
  playerId: "1",
  expires: { phase: "night", number: 2 },
};

// The engine stamps the source and mints the id of a dated effect.
export const forgedTimedEffect: RoleEffect = {
  kind: "timed-effect",
  effect: "poison",
  playerId: "1",
  expires: { phase: "night", number: 2 },
  // @ts-expect-error -- a role cannot choose the effect id
  id: "eff-1-abcd",
};

// The master record belongs to the acting seat: a role cannot write it on
// another player.
export const foreignMaster: RoleEffect = {
  kind: "record-master",
  playerId: "2",
  // @ts-expect-error -- a role cannot name the seat the record is written on
  actorId: "3",
};

// A role cannot switch a dated effect off or on: the engine derives that from
// the decision, so a suppressed ability never leaves a working effect.
export const selfActivatedEffect: RoleEffect = {
  kind: "timed-effect",
  effect: "butler",
  playerId: "2",
  expires: { phase: "night", number: 2 },
  // @ts-expect-error -- a role cannot choose whether the effect applies
  active: true,
};

// A night-step resolver reads the same facts as every ability: no game state.
type NightStepArm = Extract<RoleCapability, { kind: "night-step" }>;
type NightStepFacts = Parameters<NonNullable<NightStepArm["resolve"]>>[0];
// @ts-expect-error -- the night-step context exposes no game state
export type NightStepStateAccess = NightStepFacts["state"];

// Who is drunk is the host's answer: a resolver reads it and cannot change it.
export function rewriteDrunkAnswer(facts: NightStepFacts): void {
  // @ts-expect-error -- the host's drunk answer is read-only
  facts.drunkId = "2";
}

// A use ends only dated effects the engine applies for the acting ability: an
// arm cannot end another mechanic's record, such as the Goon's.
export const endsForeignKind: NightStepArm = {
  kind: "night-step",
  timing: "any",
  step: {},
  // @ts-expect-error -- an arm cannot end an effect kind the engine does not date
  endsOnUse: ["goon"],
};

// The record of tonight's choice is written on the acting seat, under the
// acting role: a role cannot name the record or the seat.
export const foreignChoice: RoleEffect = {
  kind: "record-choice",
  playerId: "2",
  // @ts-expect-error -- a role cannot name the record it writes
  roleId: "exorcist",
};
export const choiceOnAnotherSeat: RoleEffect = {
  kind: "record-choice",
  playerId: "2",
  // @ts-expect-error -- a role cannot name the seat the record is written on
  actorId: "3",
};

// A madness token is the acting ability's: the engine mints its id, stamps its
// source and start, and decides whether it applies.
export const forgedMadness: RoleEffect = {
  kind: "madness",
  playerId: "2",
  roleId: "artist",
  expires: { phase: "day", number: 2 },
  // @ts-expect-error -- a role cannot choose the token id
  id: "eff-madness-cerenovus-1-2-1",
};
export const foreignMadness: RoleEffect = {
  kind: "madness",
  playerId: "2",
  roleId: "artist",
  expires: { phase: "day", number: 2 },
  // @ts-expect-error -- a role cannot name another ability as the token's owner
  madness: "mutant",
};
export const selfActivatedMadness: RoleEffect = {
  kind: "madness",
  playerId: "2",
  roleId: "artist",
  expires: { phase: "day", number: 2 },
  // @ts-expect-error -- a role cannot switch the token on
  active: true,
};
export const madnessFromAnotherSeat: RoleEffect = {
  kind: "madness",
  playerId: "2",
  roleId: "artist",
  expires: { phase: "day", number: 2 },
  // @ts-expect-error -- a role cannot name the seat the madness comes from
  sourceId: "3",
};

// The Po's and the Shabaloth's records are written the same way: on the acting
// seat, under the acting role. Last night's players are the engine's to keep.
export const foreignNoOne: RoleEffect = {
  kind: "record-no-one",
  noOne: true,
  // @ts-expect-error -- a role cannot name the record it writes
  roleId: "po",
};
export const noOneOnAnotherSeat: RoleEffect = {
  kind: "record-no-one",
  noOne: true,
  // @ts-expect-error -- a role cannot name the seat the record is written on
  actorId: "3",
};
export const foreignChoices: RoleEffect = {
  kind: "record-choices",
  playerIds: ["2", "4"],
  // @ts-expect-error -- a role cannot name the record it writes
  roleId: "shabaloth",
};
export const choicesOnAnotherSeat: RoleEffect = {
  kind: "record-choices",
  playerIds: ["2", "4"],
  // @ts-expect-error -- a role cannot name the seat the record is written on
  actorId: "3",
};
export const rewrittenLastNight: RoleEffect = {
  kind: "record-choices",
  playerIds: ["2", "4"],
  // @ts-expect-error -- last night's record is kept by the engine, not written by the role
  previousIds: ["5"],
};

// Keeping the Demon asleep is the engine's: the role names the seat and says
// why, and cannot change the Demon's step itself.
// @ts-expect-error -- a block says on the Demon's step why it does not wake
export const silentBlock: RoleEffect = {
  kind: "block-demon",
  playerId: "7",
  log: { title: "t", detail: "d" },
};
export const rewrittenDemonStep: RoleEffect = {
  kind: "block-demon",
  playerId: "7",
  note: { key: "k", text: "t" },
  log: { title: "t", detail: "d" },
  // @ts-expect-error -- a role cannot choose how the Demon's step changes
  targetMode: "none",
};

// A resolver is declared on a `night-step` capability and nowhere else: the
// module has no resolver field of its own.
export const resolverBesideCapabilities: RoleModule = {
  id: "gambler",
  edition: "bmr",
  // @ts-expect-error -- a module declares no resolver outside a capability
  ability: { resolve: () => ({ kind: "no-effect" }) },
};

// An attack names the chosen player and the title of its log line. The engine
// derives the attacker from the acting seat, takes the Mayor's redirect from
// the host and writes the cause of death.
type AttackDecision = Extract<AbilityDecision, { kind: "attack" }>;
export const foreignAttack: AttackDecision = {
  kind: "attack",
  playerId: "2",
  title: "attack",
  // @ts-expect-error -- a role cannot name the attacker
  attackerId: "3",
};
export const selfRedirectedAttack: AttackDecision = {
  kind: "attack",
  playerId: "2",
  title: "attack",
  // @ts-expect-error -- the redirect is the host's answer, not the role's
  redirectId: "4",
};
export const renamedDeath: AttackDecision = {
  kind: "attack",
  playerId: "2",
  title: "attack",
  // @ts-expect-error -- a role cannot choose the cause of the death
  cause: "execution",
};

// An information capability reads facts and returns the answer and the values
// it can take. The engine decides whether the ability works, whether the host
// answers and which options one step offers.
// @ts-expect-error -- the information context exposes no game state
export type InformationStateAccess = InformationContext["state"];
// The engine applies the host's registrations behind `registersAsDemon` and
// `registeredTeamOf`, and names the red herring by id only.
// @ts-expect-error -- the information context exposes no host registrations
export type InformationRegistrationAccess = InformationContext["registrations"];
// @ts-expect-error -- the information context exposes no setup secrets
export type InformationSetupAccess = InformationContext["setup"];
// A role asks whether a player may register as a team. Which characters may,
// and whether they are sober and healthy, is the engine's.
export const characterRegistration = (context: InformationContext): boolean =>
  // @ts-expect-error -- a role asks about a team, not a character type
  context.mayRegisterAs("1", "demon");
type InformationAnswer = Extract<InformationDecision, { kind: "answer" }>;
export const selfFalsifiedAnswer: InformationAnswer = {
  kind: "answer",
  value: 1,
  possible: [0, 1, 2],
  // @ts-expect-error -- a role cannot mark its own answer as false
  impaired: true,
};
export const selfRequiredChoice: InformationAnswer = {
  kind: "answer",
  value: 1,
  // @ts-expect-error -- a role cannot require the host's answer
  needsChoice: true,
};
export const selfOfferedOptions: InformationAnswer = {
  kind: "answer",
  value: 1,
  // @ts-expect-error -- a role cannot name the options of one step
  options: [0, 1, 2],
};

// A role-pair names the player, the two character pools and what the player
// may register as. The pair, whether it must be false and the step's options
// stay the engine's.
type InformationRolePair = Extract<InformationDecision, { kind: "role-pair" }>;
export const namedRolePair: InformationRolePair = {
  kind: "role-pair",
  subjectId: "2",
  good: ["chef"],
  evil: ["imp"],
  possible: ["chef"],
};
export const selfChosenPair: InformationRolePair = {
  kind: "role-pair",
  subjectId: "2",
  good: ["chef"],
  evil: ["imp"],
  possible: ["chef"],
  // @ts-expect-error -- the engine builds the legal pairs
  pair: ["chef", "imp"],
};
export const selfFalsifiedPair: InformationRolePair = {
  kind: "role-pair",
  subjectId: "2",
  good: ["chef"],
  evil: ["imp"],
  possible: ["chef"],
  // @ts-expect-error -- a role cannot mark the pair as false
  impaired: true,
};

// A role is told who died by execution today: the player and the character on
// record. The list of deaths, with its causes and times, stays the engine's.
// @ts-expect-error -- the information context exposes no death records
export type InformationDeathsAccess = InformationContext["deaths"];
type ExecutedToday = NonNullable<InformationContext["executedToday"]>;
// @ts-expect-error -- the fact names no cause of death
export type ExecutedCauseAccess = ExecutedToday["cause"];
export const rewrittenExecution = (context: InformationContext): void => {
  if (!context.executedToday) return;
  // @ts-expect-error -- a role cannot rewrite who was executed
  context.executedToday.playerId = "1";
};
// A role names the player its answer is about. The record of the step, with
// its own field for the player, is the engine's.
export const selfRecordedPlayer: InformationAnswer = {
  kind: "answer",
  value: "chef",
  subjectId: "2",
  // @ts-expect-error -- a role cannot write the field of the step's record
  playerId: "2",
};
// A note says why there is nothing to learn. It carries no answer and asks
// nobody.
type InformationNote = Extract<InformationDecision, { kind: "note" }>;
export const answeringNote: InformationNote = {
  kind: "note",
  text: "nothing to learn",
  // @ts-expect-error -- a note carries no answer
  value: "chef",
};
export const questioningNote: InformationNote = {
  kind: "note",
  text: "nothing to learn",
  // @ts-expect-error -- a note cannot require the host's answer
  needsChoice: true,
};

// An introduction note names the players it shows and the character each
// other learns. Names and the sentence stay the engine's presentation.
type ShownPlayer = NonNullable<InformationNote["shown"]>[number];
export const introductionNote: InformationNote = {
  kind: "note",
  text: "point the twins at each other",
  shown: [
    { playerId: "8", roleId: "eviltwin" },
    { playerId: "1", roleId: "clockmaker" },
  ],
};
export const shownWithoutCharacter: ShownPlayer = { playerId: "1", roleId: null };
export const shownWithName: ShownPlayer = {
  playerId: "1",
  roleId: "clockmaker",
  // @ts-expect-error -- the record holds ids, not presentation
  name: "P1",
};
// @ts-expect-error -- a shown player names its character, even when null
export const shownWithoutCharacterField: ShownPlayer = { playerId: "1" };

// A prepared answer is the Storyteller's, kept in setup and read by the
// engine. The role names the characters it can show and nothing of the answer.
// @ts-expect-error -- the information context exposes no prepared answer
export type InformationPreparedAccess = InformationContext["prepared"];
type PreparedAnswer = Extract<InformationDecision, { kind: "prepared" }>;
export const selfPreparedCharacter: PreparedAnswer = {
  kind: "prepared",
  possible: ["chef"],
  // @ts-expect-error -- a role cannot name the prepared character
  value: "chef",
};
export const selfPreparedPlayers: PreparedAnswer = {
  kind: "prepared",
  possible: ["chef"],
  // @ts-expect-error -- a role cannot name the two players
  pair: ["1", "2"],
};
export const selfPreparedZero: PreparedAnswer = {
  kind: "prepared",
  possible: ["saint"],
  // @ts-expect-error -- a role cannot declare that zero are in play
  zero: true,
};
export const selfMissingAnswer: PreparedAnswer = {
  kind: "prepared",
  possible: ["chef"],
  // @ts-expect-error -- a role cannot say whether setup is complete
  missing: true,
};
// @ts-expect-error -- a prepared answer always names what it can show
export const silentPreparedAnswer: PreparedAnswer = { kind: "prepared" };
// The zero is a form of the ability (Librarian r1721): a role may say that its
// answer can be a zero, and nothing more about it.
export const preparedOrZero: PreparedAnswer = {
  kind: "prepared",
  possible: ["saint"],
  orZero: true,
};
export const preparedNeverZero: PreparedAnswer = {
  kind: "prepared",
  possible: ["chef"],
  // @ts-expect-error -- a role whose ability has no zero leaves the declaration out
  orZero: false,
};
export const computedOrZero: Extract<InformationDecision, { kind: "answer" }> = {
  kind: "answer",
  value: 0,
  // @ts-expect-error -- only a prepared answer can be a zero held in setup
  orZero: true,
};

// The Grimoire is shown, not told: the decision has nothing a role could fill
// in, change for an impaired owner or hand to the host.
type GrimoireShown = Extract<InformationDecision, { kind: "grimoire" }>;
export const grimoireShown: GrimoireShown = { kind: "grimoire" };
export const grimoireWithValue: GrimoireShown = {
  kind: "grimoire",
  // @ts-expect-error -- the Grimoire is not a value the role computes
  value: "imp",
};
export const grimoireWithOptions: GrimoireShown = {
  kind: "grimoire",
  // @ts-expect-error -- a role cannot offer other answers in place of the Grimoire
  possible: ["chef"],
};
export const grimoireWithText: GrimoireShown = {
  kind: "grimoire",
  // @ts-expect-error -- a role cannot write the record of the step
  text: "a false Grimoire",
};
export const grimoireForImpaired: GrimoireShown = {
  kind: "grimoire",
  // @ts-expect-error -- a role cannot mark what an impaired owner is shown
  impaired: true,
};

// A swap names the other player and what the role's rule does with the
// alignments and the poison. The acting seat, the poison's id and its source
// are the engine's.
export const swapWithPoisonId: TransformationDecision = {
  kind: "swap",
  playerId: "8",
  alignments: true,
  poisoned: true,
  // @ts-expect-error -- a role cannot choose the poison's id
  id: "eff-snakecharmer-3-8",
};
export const swapFromAnotherSeat: TransformationDecision = {
  kind: "swap",
  playerId: "8",
  alignments: true,
  poisoned: true,
  // @ts-expect-error -- a role cannot name the seat the swap starts from
  actorId: "4",
};
// @ts-expect-error -- a swap says whether the alignments are exchanged
export const swapWithoutAlignments: TransformationDecision = {
  kind: "swap",
  playerId: "8",
  poisoned: true,
};
export const unknownTransformationReason: TransformationDecision = {
  kind: "no-effect",
  // @ts-expect-error -- a role cannot invent a reason for nothing happening
  reason: "bored",
};
