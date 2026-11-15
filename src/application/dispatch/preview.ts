// The preview boundary for the console. The caller supplies a fresh id, so the
// preview pins the timestamp the apply reuses and the id source stays injected;
// a content id would make a later identical command idempotent instead of applying.
import { RULESET_VERSION, previewCommand } from "../../core/engine/index.ts";
import type { CommandInput } from "../../core/commands/contracts.ts";
import type { Command, CommandResult, GameState } from "../../core/model/types.ts";

export function previewOnState(state: GameState, command: CommandInput, id: string): CommandResult {
  return previewCommand(state, {
    ...command,
    id,
    rulesetVersion: RULESET_VERSION,
  } as Command);
}
