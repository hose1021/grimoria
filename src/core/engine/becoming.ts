import type { DeadAt, GameState, Player, RoleId } from "../model/types.ts";

import { addLog, currentAt } from "./context.ts";
import { systemPorts } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";

// A Minion becomes the Demon. The old role ends: any of its effects stop and
// its remaining night steps are skipped.
export function becomeDemon(
  state: GameState,
  player: Player,
  via: string,
  _at: DeadAt = currentAt(state),
  ports: CommandExecutionContext = systemPorts,
  demonRole: RoleId = "imp",
): Player {
  const previous = player.roleId;
  player.changedFrom = previous;
  player.roleId = demonRole;
  player.shownRoleId = demonRole;
  player.team = "evil";
  for (const step of state.night.queue) {
    if (step.done || step.skipped) continue;
    if (step.actorId !== player.id) continue;
    if (!step.roleId || step.roleId === demonRole) continue;
    step.done = true;
    step.skipped = true;
    step.note = "Роль изменилась до шага: теперь это Демон.";
    step.noteKey = "note.roleChangedDemon";
  }
  player.reminders = Array.isArray(player.reminders) ? player.reminders : [];
  if (!player.reminders.includes("Демон")) player.reminders.push("Демон");
  // Poisoner r1737: when the Poisoner becomes the Imp there is no Poisoner in
  // play, so every effect that player sourced ends with the role change.
  for (const effect of state.effects) {
    if (effect.sourceId === player.id) effect.active = false;
  }
  state.night.demonChanged = true;
  addLog(
    state,
    {
      secret: true,
      kind: "role-change",
      title: "Новый Демон: " + player.name,
      detail:
        via === "scarletwoman"
          ? "Алая женщина становится Демоном. Порог живых соблюдён."
          : "Приспешник получает роль Демона после самоубийства Чёрта.",
      playerId: player.id,
    },
    ports,
  );
  return player;
}
