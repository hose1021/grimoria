// @ts-check
// Sects and Violets scenario support. Host-adjudicated: the Storyteller runs
// the printed abilities; the engine owns the official night order, setup
// prompts, death bookkeeping, No Dashii poison, Fang Gu succession and the
// Vortox/Evil Twin/Witch win conditions.
import { isSnvScript, nightSequence, roleLabel, roleTeam } from "../rules.js";

/** @typedef {import("../types.js").GameState} GameState */
/** @typedef {import("../types.js").Player} Player */
/** @typedef {import("../types.js").NightStep} NightStep */
/** @typedef {import("../types.js").RoleId} RoleId */
/** @typedef {{ targetMode?: string, minTargets?: number, maxTargets?: number, infoKind?: string, optional?: boolean, canKill?: boolean, canResurrect?: boolean, note?: string|null, roleChoices?: RoleId[], [key: string]: unknown }} StepSpec */
/** @typedef {{ targetIds?: string[], given?: Record<string, any>, redirectId?: string|null, registrations?: Record<string, string>, roleId?: RoleId|null, targetId?: string|null, deathIds?: string[], resurrectId?: string|null }} SvOptions */
/** @typedef {{ targetIds?: string[], registrations?: Record<string, string> }} SvInfoOptions */
import { livingPlayers, orderedPlayers, playerById, realTeamOf } from "../model.js";

import { addLog, currentAt, nightAt } from "./context.js";
import { kill, checkWin } from "./death.js";
import { isImpaired } from "./effects.js";

const DEMON_ROLES = new Set(["fanggu", "nodashii", "vigormortis", "vortox"]);

// The Fang Gu's ONCE reminder stays in the centre for the whole game, even
// after the Demon changes character (wiki r2974). Older saves recorded it only
// on the acting Demon, so honour that marker too.
/** @param {GameState} state @returns {boolean} */
function fangguJumpUsed(state) {
  if (state.fangguJumped) return true;
  return Object.values(state.players || {}).some((player) => (
    player && player.used && player.used.fanggu === true
  ));
}

/** @param {GameState} state @returns {RoleId[]} */
const GOOD_ROLES = (state) => (state.script && state.script.roles ? state.script.roles : [])
  .filter((/** @type {RoleId} */ id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider");

/** @param {GameState} state @param {number} index @param {RoleId|null} roleId @param {string|null} actorId @returns {string} */
function svStepKey(state, index, roleId, actorId) {
  return ["n" + nightAt(state).number, index, roleId || "system", actorId || "all"].join("-");
}

/** @param {RoleId} roleId @param {number} night @returns {StepSpec|null} */
function stepSpec(roleId, night) {
  if (night === 1) {
    return {
      philosopher: { targetMode: "none", optional: true, infoKind: "note" },
      snakecharmer: { targetMode: "one-any", infoKind: "note" },
      eviltwin: { targetMode: "none", infoKind: "note" },
      witch: { targetMode: "one-any", infoKind: "note" },
      cerenovus: { targetMode: "one-any", infoKind: "note" },
      clockmaker: { targetMode: "none", infoKind: "number" },
      dreamer: { targetMode: "one-any", infoKind: "note" },
      seamstress: { targetMode: "two", optional: true, infoKind: "note" },
      mathematician: { targetMode: "none", infoKind: "number" }
    }[roleId] || null;
  }
  return {
    philosopher: { targetMode: "none", optional: true, infoKind: "note" },
    snakecharmer: { targetMode: "one-any", infoKind: "note" },
    witch: { targetMode: "one-any", infoKind: "note" },
    cerenovus: { targetMode: "one-any", infoKind: "note" },
    pithag: { targetMode: "one-any", infoKind: "note" },
    fanggu: { targetMode: "one-any", canKill: true },
    nodashii: { targetMode: "one-any", canKill: true },
    vortox: { targetMode: "one-any", canKill: true },
    vigormortis: { targetMode: "one-any", canKill: true },
    barber: { targetMode: "two", optional: true, infoKind: "note" },
    sweetheart: { targetMode: "one-any", infoKind: "note" },
    sage: { targetMode: "none", infoKind: "note" },
    dreamer: { targetMode: "one-any", infoKind: "note" },
    flowergirl: { targetMode: "none", infoKind: "yes-no" },
    towncrier: { targetMode: "none", infoKind: "yes-no" },
    oracle: { targetMode: "none", infoKind: "number" },
    seamstress: { targetMode: "two", optional: true, infoKind: "note" },
    juggler: { targetMode: "none", infoKind: "number" },
    mathematician: { targetMode: "none", infoKind: "number" }
  }[roleId] || null;
}

/** @param {GameState} state @param {string} playerId @returns {boolean} */
function diedRecently(state, playerId) {
  const night = nightAt(state).number;
  return state.deaths.some((death) => (
    !death.fake && death.playerId === playerId
    && ((death.phase === "night" && death.number === night)
      || (death.phase === "day" && death.number === night - 1))
  ));
}

/** @param {GameState} state @param {string} playerId @returns {boolean} */
function diedByDemon(state, playerId) {
  const night = nightAt(state).number;
  return state.deaths.some((death) => (
    !death.fake && death.playerId === playerId && death.demon === true
    && ((death.phase === "night" && death.number === night)
      || (death.phase === "day" && death.number === night - 1))
  ));
}

/** @param {GameState} state @param {RoleId} roleId @param {Player|null} actor @param {number} night @returns {boolean} */
function stepAllowed(state, roleId, actor, night) {
  if (!actor) return false;
  if (roleId === "barber") return !actor.alive && diedRecently(state, actor.id);
  if (roleId === "sweetheart") return !actor.alive && diedRecently(state, actor.id);
  if (roleId === "sage") return !actor.alive && diedByDemon(state, actor.id);
  if (!actor.alive) return false;
  if (roleId === "philosopher") return !(actor.used && actor.used.philosopher);
  if (roleId === "seamstress") return !(actor.used && actor.used.seamstress);
  if (roleId === "juggler") return Boolean(actor.used && actor.used.jugglerGuesses);
  if (roleId === "witch") return livingPlayers(state).length > 3;
  return true;
}

/** @param {GameState} state @param {number} index @param {RoleId} roleId @param {Player|null} actor @param {StepSpec} spec @returns {NightStep} */
function makeStep(state, index, roleId, actor, spec) {
  const targetMode = spec.targetMode || "none";
  const minTargets = spec.minTargets != null
    ? spec.minTargets
    : targetMode === "none" ? 0 : targetMode === "two" ? 2 : 1;
  const maxTargets = spec.maxTargets != null
    ? spec.maxTargets
    : targetMode === "none" ? 0 : targetMode === "two" ? 2 : 1;
  const extra = {};
  if (roleId === "philosopher" || roleId === "cerenovus") {
    extra.roleChoices = GOOD_ROLES(state);
  }
  if (roleId === "pithag") {
    extra.roleChoices = (state.script && state.script.roles ? state.script.roles : []).slice();
  }
  return {
    key: svStepKey(state, index, roleId, actor ? actor.id : null),
    kind: "role",
    sv: true,
    roleId,
    actorId: actor ? actor.id : null,
    actorName: actor ? actor.name : "",
    actorAlive: actor ? actor.alive : false,
    order: index,
    targetMode,
    minTargets,
    maxTargets,
    infoKind: spec.infoKind || "none",
    optional: Boolean(spec.optional),
    canKill: Boolean(spec.canKill),
    targetIds: [],
    given: null,
    result: null,
    note: null,
    pending: null,
    done: false,
    skipped: false,
    completedAt: null,
    ...extra
  };
}

/** @param {GameState} state @param {number} index @param {string} system @returns {NightStep|null} */
function infoStep(state, index, system) {
  const size = orderedPlayers(state).length;
  if (nightAt(state).number !== 1 || size < 7) return null;
  const living = livingPlayers(state);
  const minions = living.filter((player) => roleTeam(player.roleId || "") === "minion");
  const demon = living.find((player) => roleTeam(player.roleId || "") === "demon");
  if (!minions.length || !demon) return null;
  if (system === "minioninfo") {
    return {
      key: svStepKey(state, index, "minioninfo", null),
      kind: "system", system: "minioninfo", roleId: null, actorId: null,
      actorIds: minions.map((player) => player.id), order: index, targetMode: "none",
      minTargets: 0, maxTargets: 0, infoKind: "minion-info", targetIds: [],
      demonId: demon.id, given: null, result: null, note: null, pending: null,
      done: false, skipped: false, completedAt: null
    };
  }
  return {
    key: svStepKey(state, index, "demoninfo", null),
    kind: "system", system: "demoninfo", roleId: null, actorId: null,
    actorIds: [demon.id], order: index, targetMode: "none",
    minTargets: 0, maxTargets: 0, infoKind: "demon-info", targetIds: [],
    demonId: demon.id, bluffs: (state.bluffs || []).slice(), given: null,
    result: null, note: null, pending: null, done: false, skipped: false,
    completedAt: null
  };
}

/** @param {GameState} state @returns {NightStep[]} */
export function buildSvNightQueue(state) {
  const night = nightAt(state).number;
  const sequence = nightSequence(night, "snv");
  /** @type {NightStep[]} */
  const steps = [];
  sequence.forEach((roleId, index) => {
    if (roleId === "info") {
      const minion = infoStep(state, index, "minioninfo");
      if (minion) steps.push(minion);
      const demon = infoStep(state, index + 0.1, "demoninfo");
      if (demon) steps.push(demon);
      return;
    }
    const spec = stepSpec(roleId, night);
    if (!spec) return;
    const actor = orderedPlayers(state).find((player) => player.roleId === roleId);
    if (!actor || !stepAllowed(state, roleId, actor, night)) return;
    steps.push(makeStep(state, index, roleId, actor, spec));
  });
  reconcileNoDashiiPoison(state);
  return steps;
}

// The No Dashii poisons the nearest Townsfolk on each side by role, not by
// living status: a dead Townsfolk is still the nearest Townsfolk. Recompute and
// reconcile the active effects after role changes, deaths and source loss.
/** @param {GameState} state */
export function reconcileNoDashiiPoison(state) {
  const sources = orderedPlayers(state).filter((player) => (
    player.roleId === "nodashii" && player.alive
    && !isImpaired(state, player.id, currentAt(state))
  ));
  const targets = new Map();
  for (const source of sources) {
    const ids = state.order.map(String);
    const seat = ids.indexOf(source.id);
    if (seat === -1) { targets.set(source.id, new Set()); continue; }
    /** @param {number} direction @returns {string|null} */
    const nearestTownsfolk = (direction) => {
      for (let step = 1; step < ids.length; step += 1) {
        const id = ids[(seat + direction * step + ids.length * step) % ids.length];
        const player = playerById(state, id);
        if (player && roleTeam(player.roleId || "") === "townsfolk") return id;
      }
      return null;
    };
    targets.set(source.id, new Set([nearestTownsfolk(-1), nearestTownsfolk(1)].filter(Boolean)));
  }
  for (const effect of state.effects) {
    if (effect.kind !== "poison") continue;
    const source = effect.sourceId == null ? null : playerById(state, effect.sourceId);
    const isNoDashii = effect.nodashii === true || (source && source.roleId === "nodashii");
    if (!isNoDashii) continue;
    const allowed = targets.get(effect.sourceId);
    if (!allowed || effect.targetId == null || !allowed.has(effect.targetId)) effect.active = false;
  }
  for (const [sourceId, wanted] of targets) {
    for (const targetId of wanted) {
      const exists = state.effects.some((effect) => (
        effect.kind === "poison" && effect.nodashii === true
        && effect.sourceId === sourceId && effect.targetId === targetId && effect.active
      ));
      if (exists) continue;
      state.effects.push({
        id: "eff-nodashii-" + sourceId + "-" + targetId,
        kind: "poison",
        nodashii: true,
        sourceId,
        targetId,
        start: currentAt(state),
        expires: null,
        active: true
      });
    }
  }
}

/** @param {GameState} state @param {NightStep} step @param {SvInfoOptions} [options] */
export function svInfoForStep(state, step, options = {}) {
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const role = step.roleId;
  const at = nightAt(state);
  const impaired = actor ? isImpaired(state, actor.id, at) : false;
  const targetIds = options.targetIds || step.targetIds || [];
  const target = targetIds[0] ? playerById(state, targetIds[0]) : null;

  if (role === "eviltwin") {
    const twin = state.setup.evilTwinGoodId
      ? orderedPlayers(state).find((player) => player.roleId === state.setup.evilTwinGoodId)
      : null;
    return {
      kind: "note",
      text: "Покажите Близнецам друг друга: " + (actor ? actor.name : "—") + " и "
        + (twin ? twin.name + " (" + roleLabel(twin.roleId) + ")" : "—") + "."
    };
  }
  if (role === "clockmaker") {
    const demon = livingPlayers(state).find((player) => roleTeam(player.roleId || "") === "demon");
    const minions = livingPlayers(state).filter((player) => roleTeam(player.roleId || "") === "minion");
    const ids = state.order;
    let distance = null;
    if (demon && minions.length) {
      const seat = ids.indexOf(demon.id);
      distance = Math.min(...minions.map((minion) => {
        const atSeat = ids.indexOf(minion.id);
        const raw = Math.abs(atSeat - seat);
        return Math.min(raw, ids.length - raw);
      }));
    }
    return {
      kind: "number",
      value: distance == null ? 0 : distance,
      text: "Расстояние от Демона до ближайшего Приспешника: " + (distance == null ? "—" : distance) + "."
    };
  }
  if (role === "oracle") {
    const value = state.deaths.filter((death) => {
      if (death.fake) return false;
      const player = playerById(state, death.playerId);
      return player && realTeamOf(player) === "evil";
    }).length;
    return { kind: "number", value, text: "Мёртвых злых игроков: " + value + "." };
  }
  if (role === "dreamer") {
    return {
      kind: "note",
      text: target
        ? "Сон о " + target.name + ": покажите 1 добрую и 1 злую роль; одна из них — роль " + target.name + "."
        : "Выберите игрока: покажите 1 добрую и 1 злую роль."
    };
  }
  if (role === "seamstress") {
    const [a, b] = targetIds.map((id) => playerById(state, id));
    if (!a || !b) return { kind: "note", text: "Выберите двух игроков." };
    const same = realTeamOf(a) === realTeamOf(b);
    return { kind: "note", text: a.name + " и " + b.name + ": " + (same ? "на одной стороне." : "на разных сторонах.") };
  }
  if (role === "sage") {
    return { kind: "note", text: "Демон убил Мудреца. Покажите 2 игроков, один из которых — Демон." };
  }
  if (role === "sweetheart") {
    return { kind: "note", text: "Выберите игрока: он пьян до конца игры." };
  }
  if (role === "barber") {
    return { kind: "note", text: "Демон может выбрать двух игроков (не Демона) и поменять их роли." };
  }
  if (role === "philosopher") {
    return { kind: "note", text: "Выберите добрую роль; Философ получает её способность, а её владелец пьян." };
  }
  if (role === "cerenovus") {
    return { kind: "note", text: "Выберите игрока и добрую роль: завтра он должен быть «помешан» на этой роли." };
  }
  if (role === "pithag") {
    return { kind: "note", text: "Выберите игрока и роль: если роли нет в игре, он становится ею. Новый Демон убивает по решению ведущего." };
  }
  if (role === "snakecharmer") {
    return { kind: "note", text: "Если выбрали Демона, поменяйте роли и стороны; Демон становится отравлен." };
  }
  if (role === "flowergirl" || role === "towncrier") {
    return { kind: "note", text: "Ведущий проверяет голосование/выдвижение и показывает да или нет." };
  }
  if (role === "juggler") {
    return { kind: "number", value: 0, text: "Ведущий считает верные догадки Жонглёра." };
  }
  if (role === "mathematician") {
    return { kind: "note", text: "Ведущий считает, у скольких игроков способность сработала некорректно." };
  }
  return { kind: "none" };
}

/** @param {GameState} state @param {NightStep} step @param {SvOptions} [options] */
export function completeSvStep(state, step, options = {}) {
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  if (!actor) return;
  actor.used = actor.used || {};
  const targets = options.targetIds || [];
  if (step.roleId === "philosopher") actor.used.philosopher = true;
  if (step.roleId === "seamstress" && targets.length === 2) actor.used.seamstress = true;
  if (step.roleId === "juggler") actor.used.juggler = true;
  if (step.roleId === "witch" && targets[0]
    && !isImpaired(state, actor.id, currentAt(state))
    && livingPlayers(state).length > 3) {
    state.effects.forEach((effect) => {
      if (effect.kind === "witch" && effect.sourceId === actor.id) effect.active = false;
    });
    const at = currentAt(state);
    state.effects.push({
      id: "eff-witch-" + actor.id + "-" + targets[0],
      kind: "witch",
      sourceId: actor.id,
      targetId: targets[0],
      day: at.number,
      start: at,
      expires: { phase: "night", number: at.number + 1 },
      active: true
    });
  }
  if (step.roleId === "sweetheart" && targets[0] && !isImpaired(state, actor.id, currentAt(state))) {
    state.effects.push({
      id: "eff-sweetheart-" + targets[0],
      kind: "drunk",
      sourceId: actor.id,
      targetId: targets[0],
      start: currentAt(state),
      expires: null,
      active: true
    });
  }
}

/** @param {GameState} state @param {string} stepKey @param {SvOptions} [options] */
export function recordSvOutcome(state, stepKey, options = {}) {
  const step = state.night.queue.find((candidate) => candidate.key === stepKey);
  if (!step || !step.sv) return { ok: false, errorCode: "error.36", error: "Шаг не найден." };
  if (state.winner) return { ok: false, errorCode: "error.6", error: "Игра уже окончена." };
  const at = currentAt(state);
  const deathIds = Array.isArray(options.deathIds)
    ? options.deathIds.map(String).filter((id) => playerById(state, id))
    : [];
  const demon = DEMON_ROLES.has(step.roleId || "");
  const deaths = [];
  let jumped = false;
  if (step.roleId === "fanggu") {
    const oldDemon = step.actorId ? playerById(state, step.actorId) : null;
    const target = deathIds[0] ? playerById(state, deathIds[0]) : null;
    if (oldDemon && target && roleTeam(target.roleId || "") === "outsider"
      && !isImpaired(state, oldDemon.id, at)
      && !fangguJumpUsed(state)) {
      jumped = true;
      state.fangguJumped = true;
      oldDemon.used = oldDemon.used || {};
      oldDemon.used.fanggu = true;
      target.changedFrom = target.roleId;
      target.roleId = "fanggu";
      target.shownRoleId = "fanggu";
      target.team = "evil";
      target.used = target.used || {};
      addLog(state, {
        secret: true,
        kind: "ability",
        title: "Фань Гу переселяется",
        detail: target.name + " становится злым Фань Гу; прежний Демон умирает."
      });
      if (oldDemon.alive) {
        const death = kill(state, oldDemon.id, "ability", at, { demon: false, ability: "fanggu" });
        if (death) deaths.push(death);
      }
    }
  }
  if (!jumped) {
    for (const id of deathIds) {
      const death = kill(state, id, "ability", at, { demon, ability: step.roleId || "" });
      if (death) deaths.push(death);
    }
  }
  reconcileNoDashiiPoison(state);
  appendSvConditionalSteps(state);
  checkWin(state);
  return { ok: true, deaths };
}

// Adds Sects and Violets steps that only exist after a death: the Sweetheart's
// drunk choice, the Barber's swap and the Sage's information.
/** @param {GameState} state */
export function appendSvConditionalSteps(state) {
  const night = nightAt(state).number;
  const queue = state.night.queue;
  /** @param {RoleId} roleId @param {number} index @param {StepSpec} spec */
  const add = (roleId, index, spec) => {
    if (queue.some((step) => step.roleId === roleId && !step.done && !step.skipped)) return;
    const actor = orderedPlayers(state).find((player) => player.roleId === roleId);
    if (!actor || !stepAllowed(state, roleId, actor, night)) return;
    queue.push(makeStep(state, index, roleId, actor, spec));
  };
  const sweetheart = orderedPlayers(state).find((player) => player.roleId === "sweetheart");
  if (sweetheart && !sweetheart.alive && diedRecently(state, sweetheart.id)) {
    add("sweetheart", 60, { targetMode: "one-any", infoKind: "note" });
  }
  const barber = orderedPlayers(state).find((player) => player.roleId === "barber");
  if (barber && !barber.alive && diedRecently(state, barber.id)) {
    add("barber", 59, { targetMode: "two", optional: true, infoKind: "note" });
  }
  const sage = orderedPlayers(state).find((player) => player.roleId === "sage");
  if (sage && !sage.alive && diedByDemon(state, sage.id)) {
    add("sage", 62, { targetMode: "none", infoKind: "note" });
  }
}

export { DEMON_ROLES };
