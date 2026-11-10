// @ts-check
/** @typedef {{ id: string, name: string, firstNight?: number | null, otherNight?: number | null, firstNightReminder?: string, otherNightReminder?: string }} CatalogRole */
/** @typedef {{ roleId?: string | null }} OrderPlayer */
/** @typedef {{ roleId: string, role: string, step: string, done: boolean }} OrderEntry */
/** @typedef {{ phase: string, title: string, detail: string, player: null, done: boolean }} LogRow */
/** @typedef {{ night: number, order?: string[], players?: Record<string, OrderPlayer>, nightOrder?: OrderEntry[], log?: LogRow[] }} NightStateLike */

/**
 * @param {CatalogRole} role
 * @param {number} night
 * @returns {string | null}
 */
function reminderFor(role, night) {
  if (night === 1) {
    return (role.firstNight || 0) > 0 ? role.firstNightReminder || "" : null;
  }
  return (role.otherNight || 0) > 0 ? role.otherNightReminder || "" : null;
}

/**
 * @param {OrderPlayer[]} players
 * @param {CatalogRole[]} catalog
 * @param {number} night
 * @returns {OrderEntry[]}
 */
export function buildOrder(players, catalog, night) {
  const seen = new Set();
  /** @type {Array<OrderEntry & { wake: number }>} */
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
      wake: /** @type {number} */ (night === 1 ? role.firstNight : role.otherNight)
    });
  }

  entries.sort((a, b) => a.wake - b.wake);
  return entries.map(({ wake, ...row }) => row);
}

/**
 * @param {NightStateLike} state
 * @param {CatalogRole[]} catalog
 * @returns {OrderEntry[]}
 */
export function advanceNight(state, catalog) {
  state.night += 1;

  const order = state.order || Object.keys(state.players || {});
  const players = order
    .map((id) => state.players && state.players[id])
    .filter((player) => player !== undefined);

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
