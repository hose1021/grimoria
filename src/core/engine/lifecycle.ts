// Game lifecycle: the phases a command may run in and the one guard for them.
// A handler calls the guard before it writes, so a direct engine caller sees the
// same rejection as the command path.
import type { CommandType } from "../commands/contracts.ts";
import type { GameState, Phase } from "../model/types.ts";

export interface PhaseRejection {
  ok: false;
  errorCode: string;
  error: string;
  [key: string]: unknown;
}

export interface PhasePolicy {
  readonly phases: readonly Phase[] | "any";
  readonly reject: PhaseRejection;
}

const reject = (errorCode: string, error: string): PhaseRejection => ({
  ok: false,
  errorCode,
  error,
});

const GAME_OVER = reject("error.6", "Игра уже окончена.");
const NOT_DAY = reject("error.7", "Сейчас не день.");
const GAME_STARTED = reject("error.47", "Игра уже началась.");
const DAY_FIRST = reject("error.68", "Сейчас день: сначала завершите день.");
const NOT_NIGHT = reject("error.78", "Сейчас не ночь.");

export const COMMAND_PHASES: Record<CommandType, PhasePolicy> = {
  // The night path. startNight also resumes an unfinished night.
  startNight: { phases: ["deal", "seat", "night"], reject: DAY_FIRST },
  completeStep: { phases: ["night"], reject: NOT_NIGHT },
  completeNightStep: { phases: ["night"], reject: NOT_NIGHT },
  endNight: { phases: ["night"], reject: NOT_NIGHT },
  skipStep: { phases: ["night"], reject: NOT_NIGHT },
  chooseDemonHeir: { phases: ["night"], reject: NOT_NIGHT },
  recordBmrOutcome: { phases: ["night"], reject: NOT_NIGHT },
  recordSvOutcome: { phases: ["night"], reject: NOT_NIGHT },
  resurrectPlayer: { phases: ["night"], reject: NOT_NIGHT },

  // Day actions.
  openNominations: { phases: ["day"], reject: NOT_DAY },
  nominate: { phases: ["day"], reject: NOT_DAY },
  recordVirginNomination: { phases: ["day"], reject: NOT_DAY },
  recordVotes: { phases: ["day"], reject: NOT_DAY },
  setVoteCount: { phases: ["day"], reject: NOT_DAY },
  setDeadVoteUsed: { phases: ["day"], reject: NOT_DAY },
  cancelNomination: { phases: ["day"], reject: NOT_DAY },
  resetVotes: { phases: ["day"], reject: NOT_DAY },
  execute: { phases: ["day"], reject: NOT_DAY },
  endDay: { phases: ["day"], reject: NOT_DAY },
  useSlayer: { phases: ["day"], reject: NOT_DAY },
  gossipStatement: { phases: ["day"], reject: NOT_DAY },
  jugglerGuess: { phases: ["day"], reject: NOT_DAY },
  artistQuestion: { phases: ["day"], reject: NOT_DAY },
  savantVisit: { phases: ["day"], reject: NOT_DAY },
  moonchildChoice: { phases: ["day"], reject: NOT_DAY },

  // Host records that a printed ability may resolve in either play phase.
  executeByDecision: { phases: ["day", "night"], reject: NOT_DAY },
  madnessPenalty: { phases: ["day", "night"], reject: NOT_DAY },
  recordAbnormal: { phases: ["day", "night"], reject: NOT_DAY },
  recordKlutzChoice: { phases: ["day", "night"], reject: NOT_DAY },
  tinkerDeath: { phases: ["day", "night"], reject: NOT_DAY },

  // Claim recovery is a table correction, not a day or night action.
  recoverClaim: {
    phases: ["setup", "deal", "seat", "night", "day"],
    reject: GAME_OVER,
  },

  // Setup family.
  dealGame: { phases: ["setup", "deal", "seat"], reject: GAME_STARTED },
  startGame: { phases: ["setup", "deal", "seat"], reject: GAME_STARTED },
  autoSecrets: { phases: ["setup", "deal", "seat"], reject: GAME_STARTED },
  bagUpdate: { phases: ["setup", "deal", "seat"], reject: GAME_STARTED },
  claimSeat: { phases: ["deal", "seat"], reject: GAME_STARTED },

  // Host bookkeeping that is legal in every phase. Setup secret and seat-order
  // corrections stay reachable from /secrets and /seat during play.
  setOrder: { phases: "any", reject: GAME_OVER },
  setHerring: { phases: "any", reject: GAME_OVER },
  setSetupInfo: { phases: "any", reject: GAME_OVER },
  setSetupInfoZero: { phases: "any", reject: GAME_OVER },
  normalizeSecrets: { phases: "any", reject: GAME_OVER },
  setWinner: { phases: "any", reject: GAME_OVER },
  manualCorrection: { phases: "any", reject: GAME_OVER },
  setNotes: { phases: "any", reject: GAME_OVER },
  setReviewOpen: { phases: "any", reject: GAME_OVER },
  newGame: { phases: "any", reject: GAME_OVER },
  importGame: { phases: "any", reject: GAME_OVER },
};

export function lifecycleGuard(state: GameState, type: CommandType): PhaseRejection | null {
  const policy = COMMAND_PHASES[type];
  if (policy.phases === "any") return null;
  if (state.winner) return GAME_OVER;
  if (policy.phases.includes(state.phase)) return null;
  return policy.reject;
}
