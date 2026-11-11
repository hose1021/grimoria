// The controller object the console cards receive. The screen builds it once
// per render; the cards stay presentational and take every action from here.
import type { DispatchResult } from "../../../core/commands/result.ts";
import type { GameState } from "../../../core/model/types.ts";
import type { ShellPorts } from "../../ports.ts";
import type { TableDrafts } from "./drafts.ts";

export interface TableActions {
  /** Dispatches one command and reports a rejection with the legacy alert. */
  run(command: Parameters<ShellPorts["commands"]["dispatch"]>[0]): DispatchResult;
  undo(): void;
  closeOverlay(): void;
  /** Closes the role card back to the overlay it opened from. */
  closeRole(): void;
  openRole(id: string): void;
  openInfo(key: string): void;
  openCorrection(playerId: string): void;
  openGrimoire(): void;
  openExport(): void;
  openImport(): void;
  toggleGuided(open: boolean): void;
  startTimer(): void;
  stopTimer(): void;
  armNew(): void;
  startNewGame(): void;
  applyImport(): void;
  download(): void;
  copy(): void;
  /** Current clock for the day timer, refreshed once per second. */
  now: number;
}

export interface TableView {
  state: GameState;
  ports: ShellPorts;
  drafts: TableDrafts;
  actions: TableActions;
}
