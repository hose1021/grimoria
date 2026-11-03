function reminderFor(role, night) {
  if (night === 1) {
    return role.firstNight > 0 ? role.firstNightReminder || "" : null;
  }
  return role.otherNight > 0 ? role.otherNightReminder || "" : null;
}

export function buildOrder(players, catalog, night) {
  const seen = new Set();
  const entries = [];

  for (const player of players || []) {
    const roleId = player && player.roleId;
    if (!roleId || seen.has(roleId)) continue;
    seen.add(roleId);

    const role = (catalog || []).find((candidate) => candidate.id === roleId);
    if (!role) continue;

    const step = reminderFor(role, night);
    if (step === null) continue;

    entries.push({
      roleId,
      role: role.name,
      step,
      done: false,
      wake: night === 1 ? role.firstNight : role.otherNight
    });
  }

  entries.sort((a, b) => a.wake - b.wake);
  return entries.map(({ wake, ...row }) => row);
}

export function advanceNight(state, catalog) {
  state.night += 1;

  const order = state.order || Object.keys(state.players || {});
  const players = order
    .map((id) => state.players && state.players[id])
    .filter(Boolean);

  state.nightOrder = buildOrder(players, catalog, state.night);
  state.log = state.log || [];
  state.log.push({
    phase: "Night " + state.night,
    title: "Night " + state.night + " begins",
    detail: "Wake each role in order.",
    player: null,
    done: false
  });

  return state.nightOrder;
}
