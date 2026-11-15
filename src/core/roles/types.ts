import type { SupportedRoleId } from "../model/role-ids.ts";
import type { DeadAt, GameState, Player, RoleId } from "../model/types.ts";
import type { RoleAbility, RoleCapability } from "./ability.ts";

/** The player targeting a role night step takes. */
export type TargetMode = "none" | "one-any" | "one-other" | "two" | "po";

export interface NightStepSpec {
  readonly target?: TargetMode;
  readonly minTargets?: number;
  readonly maxTargets?: number;
  readonly optional?: boolean;
  readonly canKill?: boolean;
  readonly canResurrect?: boolean;
  /** The information the step yields; "none" when the step only takes a target. */
  readonly infoKind?: string;
  /** Locale key for the console note that explains the step. */
  readonly noteKey?: string;
  /** The player who wakes. Absent means the living player holding the role. */
  readonly actor?: (state: GameState, night: number, candidate?: Player | null) => Player | null;
  /** Extra step fields. Absent means none. */
  readonly extra?: (state: GameState, night: number) => Record<string, unknown>;
}

export interface RoleDeathEvent {
  readonly playerId: string;
  readonly roleId: RoleId | null;
  readonly cause: string;
  readonly at: DeadAt;
  /** Players another ability sees as alive, just before the death was written. */
  readonly livingBefore: number;
}

/** What a Demon's death resolved to, reported to the host. */
export interface DeathOutcome {
  readonly inherited: boolean;
  readonly playerId?: string;
  readonly via?: string;
  readonly pendingInheritance?: {
    readonly kind: string;
    readonly options: { id: string; name: string; roleId: RoleId | null }[];
  };
}

export interface RoleModule {
  readonly id: SupportedRoleId;
  readonly edition: "tb" | "bmr" | "snv";
  readonly nightStep?: NightStepSpec;
  /** Replaces `nightStep` on the first night, where the shape differs. */
  readonly firstNightStep?: NightStepSpec;
  /** The step built when this role dies outside the printed order. */
  readonly deathStep?: NightStepSpec;
  /** Resolves the role's night step. Absent means the engine keeps its own path. */
  readonly ability?: RoleAbility;
  /** Step-kind capabilities added by the migration. */
  readonly capabilities?: readonly RoleCapability[];
}
