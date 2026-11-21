import type { Alignment, DeadAt, Death, RoleId } from "../model/types.ts";
import type { NightStepSpec } from "./types.ts";

/** One pending delayed death the actor's ability currently owns. */
export interface PendingDeathFact {
  readonly id: string;
  readonly playerId: string | null;
  readonly suspended: boolean;
  /** True while the death waits for the actor to become healthy again. */
  readonly resumeOnHealthy: boolean;
  readonly resolveAtNight: number | null;
}

/**
 * The facts one ability may read. The game state is not reachable, so a role
 * cannot write unrelated state, set a winner or bypass a shared invariant.
 */
export interface AbilityContext {
  /** The seat taking the step. */
  readonly actorId: string;
  /** Targets the command path already validated, in the host's order. */
  readonly targetIds: readonly string[];
  /** The host's character answer for the step: the Courtier's character or the Gambler's guess. */
  readonly chosenRoleId: RoleId | null;
  /**
   * The host's answer for who the ability makes drunk: the Sailor or the
   * chosen player, one of the Innkeeper's two players. Null when the host
   * named nobody; the command path checks the answer against the step.
   */
  readonly drunkId: string | null;
  /** True when the effect graph says the actor is drunk or poisoned now. */
  readonly impaired: boolean;
  /** The night the step resolves in. */
  readonly at: { readonly phase: "night"; readonly number: number };
  /** Delayed deaths owned by this actor, earliest resolution first. */
  readonly pendings: readonly PendingDeathFact[];
  /** The character on a seat; never a registration, a bluff or a shown mask. */
  actualRoleOf(playerId: string): RoleId | null;
  /** False when the id names no seat. */
  hasPlayer(playerId: string): boolean;
  /** The seat's name, for a rule note. */
  nameOf(playerId: string): string;
}

/**
 * The effect kinds a dated intent may add. A kind arrives with its first
 * migrated role. `protected` is safe from the Demon (the Monk); `safe` cannot
 * die tonight from any ability (the Innkeeper); `survives-execution` stays
 * alive if executed the next day (the Devil's Advocate).
 */
export type TimedEffectKind =
  | "poison"
  | "protected"
  | "butler"
  | "drunk"
  | "safe"
  | "survives-execution";

/** An intent the engine applies through a shared mechanic. */
export type RoleEffect =
  | {
      readonly kind: "kill";
      readonly playerId: string;
      /** The death record cause; the engine defaults to the acting ability. */
      readonly cause?: string;
      /** Run the shared Demon succession and win check after the death. */
      readonly succession?: boolean;
    }
  /**
   * An indefinite poison owned by the acting ability. The ability releases it
   * with `release-poisons`, resolves it with `resolve-death`, or the victim's
   * delayed death clears it.
   */
  | { readonly kind: "poison"; readonly playerId: string }
  /** A death that waits until the named night. */
  | { readonly kind: "delay-death"; readonly playerId: string; readonly resolveAtNight: number }
  /** Hold a pending death; `resumeOnHealthy` makes the source's recovery release it. */
  | {
      readonly kind: "suspend-death";
      readonly pendingId: string;
      readonly reason: string;
      readonly resumeOnHealthy?: boolean;
    }
  /** Release this ability's poisons except the named player. */
  | { readonly kind: "release-poisons"; readonly keepPlayerId?: string }
  /** Resolve one pending death now, through the shared death path. */
  | { readonly kind: "resolve-death"; readonly pendingId: string }
  /**
   * A dated effect of the acting ability on one player. The engine mints the
   * id and stamps the source and the start. `replacesPrevious` first ends the
   * effects of the same kind this ability already holds. On the `suppressed`
   * path the engine keeps the effect as a record that never applies and ends
   * nothing.
   */
  | {
      readonly kind: "timed-effect";
      readonly effect: TimedEffectKind;
      readonly playerId: string;
      /** The first moment the effect no longer applies. */
      readonly expires: DeadAt;
      readonly replacesPrevious?: boolean;
    }
  /**
   * The master the acting seat chose, written on that seat. It is the reminder
   * of the choice, not the restriction, so it is recorded whether or not the
   * ability works.
   */
  | { readonly kind: "record-master"; readonly playerId: string }
  /**
   * The player the acting seat chose tonight, or null for nobody. The step
   * builder reads it for "different to last night", which is about the
   * choice, so it is recorded whether or not the ability works.
   */
  | { readonly kind: "record-choice"; readonly playerId: string | null }
  /**
   * Whether the acting seat chose no one tonight. The step builder reads it
   * for the size of the next night's step, which depends on the choice, not
   * on whether the ability worked.
   */
  | { readonly kind: "record-no-one"; readonly noOne: boolean }
  /**
   * The players the acting seat chose tonight. The engine keeps the record it
   * replaces as last night's choice, which the outcome reads for a player
   * chosen last night, and writes both on the acting seat under the acting
   * role.
   */
  | { readonly kind: "record-choices"; readonly playerIds: readonly string[] }
  /**
   * The chosen player is mad about being a character until `expires`, the
   * first moment the madness no longer applies. The engine writes the
   * madness token under the acting ability, with an id made of the ability,
   * the acting seat, the player and the night, and the Storyteller reviews
   * it on each day it applies. On the `suppressed` path nothing is written.
   */
  | {
      readonly kind: "madness";
      readonly playerId: string;
      readonly roleId: RoleId;
      readonly expires: DeadAt;
    }
  /**
   * The Demon on this seat does not wake tonight; its other abilities still
   * resolve. The engine finds the Demon's step in tonight's queue and writes
   * `note` on it, and adds `log` as a secret log line. The role names a seat
   * that holds the Demon.
   */
  | {
      readonly kind: "block-demon";
      readonly playerId: string;
      readonly note: AbilityNote;
      readonly log: { readonly title: string; readonly detail: string };
    };

export interface AbilityNote {
  readonly key: string;
  readonly text: string;
  readonly vars?: Readonly<Record<string, string | number>>;
}

export type AbilityDecision =
  | {
      readonly kind: "effects";
      readonly effects: readonly RoleEffect[];
      readonly note?: AbilityNote;
      /** Role-facing step result; the engine adds the actual death outcome. */
      readonly result?: Readonly<Record<string, unknown>>;
    }
  /**
   * The acting ability attacks one player as the Demon. The engine resolves
   * the attack through the shared attack path, in this order: an impaired
   * attacker, a dead target, the Monk's protection and the Soldier stop it; a
   * working Mayor makes the step wait for the host's redirect; a death runs
   * the Demon succession and the win check. The role does not read `impaired`
   * for it and cannot name the attacker, the redirect or the cause of death.
   * The step keeps the attack's own record: the outcome as its result, the
   * victim or the reason nobody died as its note, and one secret log line
   * under `title`.
   */
  | { readonly kind: "attack"; readonly playerId: string; readonly title: string }
  /**
   * The ability did nothing because its owner is drunk or poisoned. The engine
   * writes its generic failure note unless the rule supplies its own. A rule
   * may still suspend its pending deaths and record the choice that was made,
   * but no kill or new poison is applied on this path, and a dated effect is
   * kept as a record that never applies.
   */
  | {
      readonly kind: "suppressed";
      readonly effects?: readonly RoleEffect[];
      readonly noteKey?: string;
      readonly text?: string;
      readonly result?: Readonly<Record<string, unknown>>;
    }
  | { readonly kind: "no-effect" };

/** One heir a Demon may pass the role to. */
export interface HeirOption {
  readonly id: string;
  readonly name: string;
  readonly roleId: RoleId | null;
}

/** Read-only facts for a death-triggered capability. */
export interface DeathContext {
  /** The dead player whose death is resolving. */
  readonly deadId: string;
  readonly deadRoleId: RoleId | null;
  readonly cause: string;
  /** Players another ability saw as alive just before the death. */
  readonly livingBefore: number;
  readonly livingPlayerIds: readonly string[];
  readonly livingMinionIds: readonly string[];
  readonly at: DeadAt;
  impairedOf(playerId: string): boolean;
  nameOf(playerId: string): string;
  actualRoleOf(playerId: string): RoleId | null;
  hasPlayer(playerId: string): boolean;
}

/** What a death capability may ask the engine to apply. */
export type DeathDecision =
  | { readonly kind: "inherit"; readonly heirId: string; readonly via: string }
  | { readonly kind: "choose-heir"; readonly options: readonly HeirOption[] }
  | { readonly kind: "no-effect" };

/** Day actions a role may own. */
export type DayActionKind =
  | "slayer-shot"
  | "artist-question"
  | "savant-visit"
  | "juggler-guess"
  | "gossip-statement"
  | "moonchild-choice"
  | "klutz-choice"
  | "madness-penalty";

/** Read-only facts for a day-action capability. */
export interface DayContext {
  readonly actorId: string;
  readonly action: DayActionKind;
  readonly targetIds: readonly string[];
  readonly targetId: string;
  readonly impaired: boolean;
  readonly targetAlive: boolean;
  /** The host's registration answer: a Recluse may register as a Demon. */
  readonly targetRegistersDemon: boolean;
  readonly at: DeadAt;
  actualRoleOf(playerId: string): RoleId | null;
  hasPlayer(playerId: string): boolean;
}

/** What a day capability may ask the engine to apply. */
export type DayDecision =
  | { readonly kind: "effects"; readonly effects: readonly RoleEffect[] }
  | { readonly kind: "record"; readonly result: Readonly<Record<string, unknown>> }
  | { readonly kind: "no-effect" };

/** Read-only facts for a win-contribution capability. */
export interface WinContext {
  readonly livingCount: number;
  /** The day's execution death, when one happened in this day phase. */
  readonly executionDeath: Death | null;
  readonly at: DeadAt;
  actualRoleOf(playerId: string): RoleId | null;
  hasPlayer(playerId: string): boolean;
}

export type WinDecision =
  | { readonly kind: "win"; readonly team: Alignment; readonly reason: string }
  | { readonly kind: "no-effect" };

/** Causes a character transformation may have. */
export type TransformationCause = "pithag" | "snakecharmer" | "barber" | "fanggu" | "philosopher";

/** Read-only facts for a transformation capability. */
export interface TransformationContext {
  readonly actorId: string;
  readonly targetId: string;
  /** The character the change gives; for a swap, the one the acting seat would take. */
  readonly newRoleId: RoleId;
  readonly cause: TransformationCause;
  readonly impaired: boolean;
  readonly at: DeadAt;
  roleInPlay(roleId: RoleId): boolean;
  nameOf(playerId: string): string;
  actualRoleOf(playerId: string): RoleId | null;
  hasPlayer(playerId: string): boolean;
}

export type TransformationDecision =
  | { readonly kind: "replace"; readonly playerId: string; readonly roleId: RoleId }
  /**
   * The acting seat and the player swap characters through the shared swap,
   * which requeues tonight's steps. `alignments` exchanges their alignments
   * too. `poisoned` poisons the player for good by the acting ability once
   * the swap is done; the engine mints the effect's id from the ability, the
   * acting seat and the player, and writes it once.
   */
  | {
      readonly kind: "swap";
      readonly playerId: string;
      readonly alignments: boolean;
      readonly poisoned: boolean;
    }
  | { readonly kind: "no-effect"; readonly reason: "impaired" | "in-play" | "not-demon" };

/** Read-only facts for an information capability. */
export interface InformationContext {
  readonly actorId: string;
  readonly infoKind: string;
  readonly targetIds: readonly string[];
  readonly impaired: boolean;
  readonly at: DeadAt;
  /** Every seat in order around the circle, living or dead. */
  readonly seatIds: readonly string[];
  /** Whether the player is alive now, dead players included in `seatIds`. */
  isAlive(playerId: string): boolean;
  /**
   * How many distinct players carry an ABNORMAL reminder since the last
   * Mathematician wake. The count only: a mark's reason is a secret.
   */
  readonly abnormalCount: number;
  aliveNeighborIds(playerId: string): readonly string[];
  registeredTeamOf(playerId: string): "good" | "evil" | null;
  /**
   * Whether the player may register as this team to this ability: their own
   * team, or the other one while the Storyteller may still register them so.
   * The team the host has chosen for this step is `registeredTeamOf`.
   */
  mayRegisterAs(playerId: string, team: "good" | "evil"): boolean;
  /**
   * Whether the player registers as a Demon to this ability: a Demon, alive
   * or dead, or a player the host registered as one for this step.
   */
  registersAsDemon(playerId: string): boolean;
  /** The good player chosen in setup as the red herring, if the game has one. */
  readonly redHerringId: string | null;
  /**
   * The player who died by execution today and the character recorded at the
   * death. Null when no execution caused a death today.
   */
  readonly executedToday: {
    readonly playerId: string;
    readonly roleId: RoleId | null;
  } | null;
  /**
   * The vote facts of the day that just ended, read by the next night's
   * "today" questions. Null when there is no complete ended-day ledger.
   */
  readonly votesToday: {
    readonly demonVoted: boolean;
    readonly minionNominated: boolean;
  } | null;
  /**
   * The two players the Storyteller paired for the Evil Twin, the good
   * member first, as ids only. Null when the pair is unset or invalid.
   * Characters come from `actualRoleOf`; names stay the engine's presentation.
   */
  readonly twins: { readonly goodId: string; readonly evilId: string } | null;
  /**
   * The characters the player may register as to this ability, their own
   * first: more than one only while the Storyteller may still register them
   * as another character.
   */
  mayRegisterAsCharacters(playerId: string): readonly RoleId[];
  actualRoleOf(playerId: string): RoleId | null;
  hasPlayer(playerId: string): boolean;
}

/** One value an information answer can take. */
export type InformationValue = boolean | number | string;

/** One player an introduction note shows, with the character the other twin learns. */
export interface ShownTwin {
  readonly playerId: string;
  readonly roleId: RoleId | null;
}

export type InformationDecision =
  /**
   * What the ability learns. The role gives the same decision whether or not
   * its owner is drunk or poisoned, and does not read `impaired` for it: the
   * engine decides who answers. A working ability shows `value`. For one that
   * does not work the engine asks the host and offers `possible`, every value
   * the answer can take, the true one included. The role cannot mark the
   * answer as false, require the host or name the options of one step.
   *
   * `legal` is every value a working ability may show when the answer depends
   * on how a player registers. More than one means the Storyteller chooses
   * among them, and the engine asks; the role still gives `value`, the answer
   * under the registrations chosen so far.
   *
   * `subjectId` is the player the answer is about, when the ability learns
   * one player's character.
   */
  | {
      readonly kind: "answer";
      readonly value: InformationValue;
      readonly possible?: readonly InformationValue[];
      readonly legal?: readonly InformationValue[];
      readonly subjectId?: string;
    }
  /**
   * The ability learns which two characters a player might be: one of each of
   * two kinds. The role names the player and the two character pools, and the
   * characters the player may register as; it does not choose the pair, mark
   * it false or read whether its owner works. The engine builds the legal
   * pairs from the player's character and the registration facts, and asks
   * the host.
   *
   * `good` and `evil` are the pools a pair draws from, by kind. `possible` is
   * every character the player may be shown as to this ability, their own
   * first.
   */
  | {
      readonly kind: "role-pair";
      readonly subjectId: string;
      readonly good: readonly RoleId[];
      readonly evil: readonly RoleId[];
      readonly possible: readonly RoleId[];
    }
  /**
   * The answer is the one the Storyteller prepared for this ability before the
   * first night: that one of two players is a particular character. The engine
   * reads it from setup and writes the record of the step: the character and
   * the two players, the zero setup may hold in their place, or a request for
   * setup while nothing is prepared. The role sees none of it. It names
   * `possible`, every character the answer can show, and the engine offers
   * them when the owner is drunk or poisoned.
   *
   * `orZero` says the ability itself has a zero answer ("Or that zero are in
   * play", Librarian r1721), so setup may hold a zero in place of the two
   * players. Whether zero are in play stays a fact of setup. A zero held for
   * a role that does not declare it is no prepared answer.
   */
  | {
      readonly kind: "prepared";
      readonly possible: readonly InformationValue[];
      readonly orZero?: true;
    }
  /**
   * The ability shows the Grimoire itself. Nothing is computed and nothing is
   * asked: the engine records that the Grimoire was shown, also for an owner
   * who is drunk or poisoned, and stores no answer in its place. What a
   * Storyteller shows an impaired owner is done at the table.
   */
  | { readonly kind: "grimoire" }
  /**
   * The ability has nothing to learn this time, and the text says why. The
   * engine stores it as the answer of the step; nobody is asked. An
   * introduction note names the players it introduces through `shown`.
   */
  | {
      readonly kind: "note";
      readonly text: string;
      /**
       * The players this note introduces to each other, in the order the
       * engine words them: the Evil Twin first, the Good Twin second, each
       * with the character the other learns. Only an introduction carries it.
       */
      readonly shown?: readonly ShownTwin[];
    }
  /**
   * No answer yet. A step that learns a character and has no player to read
   * stays a question the Storyteller may fill with any character.
   */
  | { readonly kind: "no-effect" };

/** Read-only facts for an execution contribution. */
export interface ExecutionContext {
  readonly executedId: string;
  readonly executedRoleId: RoleId | null;
  readonly executedTeam: "good" | "evil" | null;
  readonly cause: string;
  readonly death: Death | null;
  readonly livingCount: number;
  readonly at: DeadAt;
  hasLivingUnimpairedRole(roleId: RoleId): boolean;
  actualRoleOf(playerId: string): RoleId | null;
  hasPlayer(playerId: string): boolean;
}

export type ExecutionDecision =
  | { readonly kind: "survives" }
  | { readonly kind: "dies" }
  | { readonly kind: "win"; readonly team: Alignment; readonly reason: string }
  | { readonly kind: "no-effect" };

/** Host-choice cases a role may own. */
export type AdjudicationCase = "registration";

/**
 * The nights a night-step declaration covers. "any" is one shape for every
 * night the role wakes; "first" and "other" split a role whose first night
 * differs, and "other" alone is a role that does not act on the first night.
 */
export type NightTiming = "first" | "other" | "any";

/** The step-kind arms. An arm is added with its first migrated role. */
export type RoleCapability =
  | {
      readonly kind: "night-step";
      readonly timing: NightTiming;
      /** The step the night queue builds for the role. */
      readonly step: NightStepSpec;
      /**
       * The kinds of dated effect this ability gave that end each time the
       * step resolves. The engine ends them before the resolver runs, also
       * when the ability does not work now: tonight's choice replaces the
       * last one. An arm that attacks does not declare them, because an
       * attack may wait for the host before anything is written.
       */
      readonly endsOnUse?: readonly TimedEffectKind[];
      /** Resolves the completed step. Absent means the engine keeps its own path. */
      readonly resolve?: (context: AbilityContext) => AbilityDecision;
    }
  | {
      readonly kind: "death-step";
      /** The step built when this role dies outside the printed order. */
      readonly step: NightStepSpec;
    }
  | {
      readonly kind: "death-trigger";
      readonly onDeath?: (context: DeathContext) => DeathDecision;
    }
  | {
      readonly kind: "day-action";
      readonly action: DayActionKind;
      readonly resolve: (context: DayContext) => DayDecision;
    }
  | {
      readonly kind: "win";
      readonly resolve: (context: WinContext) => WinDecision;
    }
  | {
      readonly kind: "transformation";
      readonly cause: TransformationCause;
      readonly resolve: (context: TransformationContext) => TransformationDecision;
    }
  | {
      readonly kind: "information";
      readonly infoKind: string;
      readonly resolve: (context: InformationContext) => InformationDecision;
    }
  | {
      readonly kind: "adjudication";
      readonly case: AdjudicationCase;
      readonly options: readonly string[];
    }
  | {
      readonly kind: "execution";
      readonly resolve: (context: ExecutionContext) => ExecutionDecision;
    };
