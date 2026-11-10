// The legacy command shape is the outer boundary of the migration: screens and
// the existing test suite still produce it, so it is mapped into the typed
// input without losing the identity a caller already supplied.
import type { CommandInput } from "../../core/commands/contracts.ts";
import type { Command as LegacyCommand } from "../../../js/types.js";

export function toCommandInput(command: LegacyCommand): CommandInput {
  const payload = command.payload === undefined ? {} : command.payload;
  const input: Record<string, unknown> = { type: command.type, payload };

  if (command.id !== undefined) input.id = command.id;
  if (command.at !== undefined) {
    input.at = typeof command.at === "number" ? new Date(command.at).toISOString() : command.at;
  }
  if (command.rulesetVersion !== undefined) input.rulesetVersion = String(command.rulesetVersion);

  return input as CommandInput;
}
