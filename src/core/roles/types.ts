import type { SupportedRoleId } from "../model/role-ids.ts";
import type { DeadAt, GameState } from "../model/types.ts";

/** The player targeting a role night step takes. */
export type TargetMode = "none" | "one-any" | "one-other" | "two" | "po";

export interface NightStepSpec {
  readonly target?: TargetMode;
  readonly minTargets?: number;
  readonly maxTargets?: number;
  readonly optional?: boolean;
  readonly canKill?: boolean;
  readonly canResurrect?: boolean;
  /** Absent means "wake when the role is in play and can act tonight". */
  readonly present?: (state: GameState, night: number) => boolean;
  /** Extra step fields, or null when the step must not be built tonight. */
  readonly extra?: (state: GameState, night: number) => Record<string, unknown> | null;
}

export interface RoleDeathEvent {
  readonly playerId: string;
  readonly cause: string;
  readonly at: DeadAt;
}

export interface RoleModule {
  readonly id: SupportedRoleId;
  readonly edition: "tb" | "bmr" | "snv";
  readonly nightStep?: NightStepSpec;
  readonly onDeath?: (state: GameState, event: RoleDeathEvent) => void;
}
