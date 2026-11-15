import type { Alignment, DeadAt, Death, RoleId } from "../model/types.ts";

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
}

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
  | { readonly kind: "resolve-death"; readonly pendingId: string };

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
   * The ability did nothing because its owner is drunk or poisoned. The engine
   * writes its generic failure note unless the rule supplies its own. A rule
   * may still suspend its pending deaths, but no kill or new poison is applied
   * on this path.
   */
  | {
      readonly kind: "suppressed";
      readonly effects?: readonly RoleEffect[];
      readonly noteKey?: string;
      readonly text?: string;
      readonly result?: Readonly<Record<string, unknown>>;
    }
  | { readonly kind: "no-effect" };

/** The optional capability a role module declares. */
export interface RoleAbility {
  resolve(context: AbilityContext): AbilityDecision;
}

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
  | { readonly kind: "no-effect"; readonly reason: "impaired" | "in-play" };

/** Read-only facts for an information capability. */
export interface InformationContext {
  readonly actorId: string;
  readonly infoKind: string;
  readonly targetIds: readonly string[];
  readonly impaired: boolean;
  readonly at: DeadAt;
  aliveNeighborIds(playerId: string): readonly string[];
  registeredTeamOf(playerId: string): "good" | "evil" | null;
  actualRoleOf(playerId: string): RoleId | null;
  hasPlayer(playerId: string): boolean;
}

export type InformationDecision =
  | { readonly kind: "answer"; readonly value: boolean | number | string }
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

/** The step-kind arms. An arm is added with its first migrated role. */
export type RoleCapability =
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
