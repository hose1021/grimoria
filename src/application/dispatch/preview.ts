// The preview boundary for the console. A fresh id per preview pins the
// timestamp the apply reuses; a content id would make a later identical
// command idempotent instead of applying.
import { RULESET_VERSION, previewCommand } from "../../core/engine/index.ts";
import { newCommandId } from "../../core/engine/commands.ts";
import type { CommandInput } from "../../core/commands/contracts.ts";
import type { Command, CommandResult, GameState } from "../../core/model/types.ts";

export function previewOnState(state: GameState, command: CommandInput): CommandResult {
  return previewCommand(state, {
    ...command,
    id: newCommandId(),
    rulesetVersion: RULESET_VERSION,
  } as Command);
}
