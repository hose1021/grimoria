// Typed domain events. The payload map mirrors the names emitted by
// deriveEvents in src/core/engine/commands.ts; the type test keeps them in step.
import type { CommandType, Phase } from "./contracts.ts";

export interface EffectLike {
  id: string;
  kind: string;
  active?: boolean;
}

export type EventPayloads = {
  "player.removed": { playerId: string };
  "player.added": { playerId: string };
  "player.alive_changed": { playerId: string; alive: boolean; cause?: string };
  "player.role_changed": { playerId: string; from: string | null; to: string | null };
  "player.shown_role_changed": { playerId: string; from: string | null; to: string | null };
  "player.team_changed": {
    playerId: string;
    from: "good" | "evil" | null;
    to: "good" | "evil" | null;
  };
  "player.registered_dead_changed": { playerId: string; registeredDead: boolean };
  "player.vote_token_changed": { playerId: string; voteToken: boolean };
  "player.butler_master_changed": { playerId: string; masterId: string | null };
  "player.used_changed": { playerId: string; used: Record<string, unknown> };
  "player.reminders_changed": { playerId: string; reminders: string[] };
  "player.dead_at_changed": { playerId: string; deadAt: Record<string, unknown> | null };
  "effect.added": { effect: EffectLike };
  "effect.removed": { effect: EffectLike };
  "effect.active_changed": { effectId: string; active: boolean };
  "effect.updated": { effectId: string; effect: EffectLike };
  "death.recorded": { death: Record<string, unknown> };
  "execution.recorded": { execution: Record<string, unknown> };
  "nomination.added": { nomination: Record<string, unknown> };
  "nomination.cancelled": { nominationId: string };
  "votes.recorded": { nominationId: string; count: number; threshold: number; votes: string[] };
  "step.added": { step: Record<string, unknown> };
  "step.removed": { stepKey: string };
  "step.skipped": { stepKey: string; roleId: string | null };
  "step.completed": { stepKey: string; roleId: string | null };
  "step.updated": { stepKey: string; roleId: string | null };
  "phase.changed": { from: Phase; to: Phase };
  "winner.declared": { winner: Record<string, unknown> };
  "winner.cleared": Record<string, never>;
  "script.changed": { scriptId: string };
  "order.changed": { order: string[] };
  "setup.changed": { setup: Record<string, unknown> };
  "notes.changed": { notes: string };
  "review.changed": { open: boolean };
};

export type DomainEventType = keyof EventPayloads;

export type DomainEvent<K extends DomainEventType = DomainEventType> = {
  id: string;
  commandId: string;
  commandType: CommandType;
  at: string;
  phase: Phase | null;
} & { [P in K]: { type: P; payload: EventPayloads[P] } }[K];

/** The shape the domain event sink accepts; a name outside the map is a type error. */
export interface EventSink {
  push<K extends DomainEventType>(type: K, payload: EventPayloads[K]): void;
}
