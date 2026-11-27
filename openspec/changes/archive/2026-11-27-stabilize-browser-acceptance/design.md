# Design

The seat regression swaps two seats through the editor, publishes a player rename, then publishes a competing order through the game store. It checks every displayed seat and the disabled commit control. This exercises the existing seat-draft contract in `openspec/specs/app/ui-shell/spec.md`.

Scenario navigation waits for the destination route before inspecting its contents. The language scenario reads the locked seat view directly so a fallback to the table cannot satisfy the translation checks.
