// Bad Moon Rising scenario support. The Storyteller runs the printed
// abilities; the engine owns the official night order, conditional wakes,
// death/resurrection bookkeeping, and the Mastermind win condition.
import { roleTeam, isBmrScript, nightSequence, roleLabel } from "../rules.js";
import { effectiveRoleId, livingPlayers, orderedPlayers, playerById } from "../model.js";

import { addLog, nightAt, currentAt, cycleOf } from "./context.js";
import { kill, checkWin } from "./death.js";
import { effectActive, isImpaired } from "./effects.js";

const DEMON_ROLES = new Set(["po", "pukka", "shabaloth", "zombuul"]);

// The Pukka's poison and its delayed death are two effects from one ability:
// the poison impairs the target from the moment it is chosen, and the pending
// death resolves at the next Pukka step (or an Exorcist skip). A dead or
// impaired Pukka keeps the pending death on hold until the source is healthy
// again (wiki r3074).
function pukkaPending(state, sourceId) {
  return state.effects.find((effect) => (
    effect.kind === "pukka-death"
    && effect.sourceId === sourceId
    && effect.active !== false
  )) || null;
}

function resolvePukkaDeath(state, pending, at) {
  if (!pending || !effectActive(state, pending, at)) return null;
  if (pending.resolve && cycleOf(at) < cycleOf(pending.resolve)) return null;
  const poison = state.effects.find((effect) => (
    effect.kind === "poison"
    && effect.pukka === true
    && effect.sourceId === pending.sourceId
    && effect.targetId === pending.targetId
    && effect.active !== false
  ));
  const target = playerById(state, pending.targetId);
  const wasAlive = Boolean(target && target.alive);
  // Kill while the poison is still active so the death record keeps the
  // impaired state; then the victim becomes healthy.
  const death = wasAlive
    ? kill(state, target.id, "ability", at, { demon: true, ability: "pukka" })
    : null;
  pending.active = false;
  if (poison) poison.active = false;
  return { targetId: pending.targetId, death, skipped: !wasAlive, prevented: wasAlive && !death };
}

function poisonPukkaTarget(state, actor, targetId, at) {
  const target = playerById(state, targetId);
  if (!target) return null;
  const poison = {
    id: "eff-pukka-poison-" + actor.id + "-" + at.number,
    kind: "poison",
    pukka: true,
    sourceId: actor.id,
    targetId: target.id,
    start: at,
    expires: null,
    active: true
  };
  const pending = {
    id: "eff-pukka-death-" + actor.id + "-" + at.number,
    kind: "pukka-death",
    sourceId: actor.id,
    targetId: target.id,
    start: at,
    resolve: { phase: "night", number: at.number + 1 },
    expires: null,
    active: true
  };
  state.effects.push(poison, pending);
  return poison;
}

function isDemonActor(state, player) {
  return Boolean(player && player.roleId && DEMON_ROLES.has(player.roleId));
}

function outsiderDiedToday(state, night) {
  return state.deaths.some((death) => (
    !death.fake
    && death.phase === "day"
    && death.number === night - 1
    && roleTeam(death.roleId) === "outsider"
  ));
}

function anyoneDiedToday(state, night) {
  return state.deaths.some((death) => (
    !death.fake && death.phase === "day" && death.number === night - 1
  ));
}

function gossipWasTrue(state, night) {
  return Boolean(state.gossip && state.gossip.truth && state.gossip.day === night - 1);
}

function bmrStepSpec(roleId, night) {
  if (night === 1) {
    return {
      sailor: { targetMode: "one-any", note: "Choose an alive player. Decide whether the Sailor or that player is drunk until dusk." },
      courtier: { targetMode: "none", optional: true, note: "Once per game: choose a character; they are drunk for 3 nights and 3 days." },
      godfather: { targetMode: "none", infoKind: "note" },
      devilsadvocate: { targetMode: "one-any", note: "Choose a living player. If they are executed tomorrow, they do not die." },
      pukka: { targetMode: "one-any", canKill: true, note: "Choose a player: they are poisoned. The engine resolves the previous victim's death and applies the new poison." },
      grandmother: { targetMode: "one-any", infoKind: "character" },
      chambermaid: { targetMode: "two", infoKind: "number" },
      lunatic: { targetMode: "none", infoKind: "note" }
    }[roleId] || null;
  }
  return {
    sailor: { targetMode: "one-any", note: "Choose an alive player. Decide whether the Sailor or that player is drunk until dusk." },
    courtier: { targetMode: "none", optional: true, note: "Once per game: choose a character; they are drunk for 3 nights and 3 days." },
    innkeeper: { targetMode: "two", note: "Choose two players: they are safe tonight. Decide which one is drunk until dusk." },
    gambler: { targetMode: "one-any", canKill: true, note: "Choose a player and ask for a role guess. If the guess is wrong, the Gambler dies." },
    devilsadvocate: { targetMode: "one-any", note: "Choose a living player (different from last night). If executed tomorrow, they do not die." },
    lunatic: { targetMode: "one-any", note: "The Lunatic chooses a player as if they were the Demon. No one dies; tell the real Demon." },
    exorcist: { targetMode: "one-any", note: "Choose a player (different from last night). If they are the Demon, the Demon learns who the Exorcist is and does not wake." },
    zombuul: { targetMode: "one-any", canKill: true, note: "No one died today, so the Zombuul may choose a player: they die." },
    pukka: { targetMode: "one-any", canKill: true, note: "Choose a player: they are poisoned. The engine resolves the previous victim's death and applies the new poison." },
    shabaloth: { targetMode: "two", canKill: true, canResurrect: true, note: "Choose two players: they die. You may resurrect one dead player you chose last night." },
    po: { targetMode: "po", minTargets: 0, maxTargets: 3, canKill: true, note: "Choose no one or one player. If the last choice was no one, choose three players tonight." },
    assassin: { targetMode: "one-any", optional: true, canKill: true, note: "Once per game: choose a player. They die even if protected." },
    godfather: { targetMode: "one-any", canKill: true, note: "An Outsider died today. Choose a player: they die." },
    gossip: { targetMode: "one-any", canKill: true, note: "The Gossip's statement was true. Choose a player: they die." },
    professor: { targetMode: "one-any", optional: true, canResurrect: true, note: "Once per game: choose a dead player. If they are a Townsfolk, they are resurrected." },
    tinker: { targetMode: "none", canKill: true, note: "The Tinker might die. Record the death only if it happens." },
    moonchild: { targetMode: "one-any", canKill: true, note: "The Moonchild chose this player when they died. If the player is good, they die." },
    grandmother: { targetMode: "none", canKill: true, note: "The Demon killed the grandchild. The Grandmother dies." },
    chambermaid: { targetMode: "two", infoKind: "number" }
  }[roleId] || null;
}

function stepAllowed(state, roleId, actor, night) {
  if (!actor) return false;
  if (roleId === "moonchild") {
    return !actor.alive
      && Boolean(actor.used && actor.used.moonchildTarget)
      && !(actor.used && actor.used.moonchildResolved);
  }
  if (!actor.alive) return false;
  if (roleId === "zombuul") return !anyoneDiedToday(state, night);
  if (roleId === "godfather") return night === 1 || outsiderDiedToday(state, night);
  if (roleId === "gossip") return gossipWasTrue(state, night);
  if (roleId === "professor") return !(actor.used && actor.used.professor);
  if (roleId === "assassin") return !(actor.used && actor.used.assassin);
  if (roleId === "courtier") return !(actor.used && actor.used.courtier);
  if (roleId === "grandmother") return night === 1;
  return true;
}

function bmrStepKey(state, index, roleId, actorId) {
  return ["n" + nightAt(state).number, index, roleId || "system", actorId || "all"].join("-");
}

function makeBmrStep(state, index, roleId, actor, spec) {
  const targetMode = spec.targetMode || "none";
  const minTargets = spec.minTargets != null
    ? spec.minTargets
    : targetMode === "none" ? 0 : targetMode === "two" ? 2 : 1;
  const maxTargets = spec.maxTargets != null
    ? spec.maxTargets
    : targetMode === "none" ? 0 : targetMode === "two" ? 2 : 1;
  const specExtra = {};
  if (roleId === "courtier" || roleId === "gambler") {
    specExtra.roleChoices = (state.script && state.script.roles ? state.script.roles : []).slice();
  }
  if (roleId === "exorcist") {
    // Remember the previous target so the Exorcist cannot repeat it.
    const previous = actor && actor.used && actor.used.exorcistTarget;
    if (previous) specExtra.previousTarget = previous;
  }
  return {
    key: bmrStepKey(state, index, roleId, actor ? actor.id : null),
    kind: "role",
    bmr: true,
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
    canResurrect: Boolean(spec.canResurrect),
    note: spec.note || null,
    targetIds: [],
    registrations: {},
    given: null,
    result: null,
    pending: null,
    done: false,
    skipped: false,
    completedAt: null,
    ...specExtra
  };
}

function minionInfoStep(state, index) {
  const size = orderedPlayers(state).length;
  const night = nightAt(state).number;
  if (night !== 1 || size < 7) return null;
  const living = livingPlayers(state);
  const minions = living.filter((p) => roleTeam(p.roleId) === "minion");
  const demon = living.find((p) => roleTeam(p.roleId) === "demon");
  if (!minions.length || !demon) return null;
  return {
    key: bmrStepKey(state, index, "minioninfo", null),
    kind: "system", system: "minioninfo", roleId: null, actorId: null,
    actorIds: minions.map((p) => p.id), order: index, targetMode: "none",
    minTargets: 0, maxTargets: 0, infoKind: "minion-info", targetIds: [],
    demonId: demon.id, given: null, result: null, note: null, pending: null,
    done: false, skipped: false, completedAt: null
  };
}

function demonInfoStep(state, index) {
  const size = orderedPlayers(state).length;
  const night = nightAt(state).number;
  if (night !== 1 || size < 7) return null;
  const demon = livingPlayers(state).find((p) => roleTeam(p.roleId) === "demon");
  if (!demon) return null;
  return {
    key: bmrStepKey(state, index, "demoninfo", null),
    kind: "system", system: "demoninfo", roleId: null, actorId: null,
    actorIds: [demon.id], order: index, targetMode: "none",
    minTargets: 0, maxTargets: 0, infoKind: "demon-info", targetIds: [],
    demonId: demon.id, bluffs: (state.bluffs || []).slice(), given: null,
    result: null, note: null, pending: null, done: false, skipped: false,
    completedAt: null
  };
}

export function buildBmrNightQueue(state) {
  const night = nightAt(state).number;
  const sequence = nightSequence(night, "bmr");
  const steps = [];
  sequence.forEach((roleId, index) => {
    if (roleId === "info") {
      if (night !== 1) return;
      const minion = minionInfoStep(state, index);
      if (minion) steps.push(minion);
      const demon = demonInfoStep(state, index + 0.1);
      if (demon) steps.push(demon);
      return;
    }
    if (roleId === "minioninfo") {
      const step = minionInfoStep(state, index);
      if (step) steps.push(step);
      return;
    }
    if (roleId === "demoninfo") {
      const step = demonInfoStep(state, index);
      if (step) steps.push(step);
      return;
    }
    const actor = orderedPlayers(state).find((player) => effectiveRoleId(player) === roleId);
    if (!actor) return;
    if (roleId === "grandmother" && night !== 1) return;
    const spec = bmrStepSpec(roleId, night);
    if (!spec) return;
    if (!stepAllowed(state, roleId, actor, night)) return;
    if (roleId === "po") {
      const three = Boolean(actor.used && actor.used.poNoOne);
      spec.minTargets = three ? 3 : 0;
      spec.maxTargets = three ? 3 : 1;
    }
    if (roleId === "moonchild") {
      const chosen = actor.used && actor.used.moonchildTarget;
      if (!chosen) return;
      spec.targetIds = [chosen];
    }
    steps.push(makeBmrStep(state, index, roleId, actor, spec));
  });
  return steps;
}

export function appendBmrConditionalSteps(state) {
  const night = nightAt(state).number;
  const grandmother = orderedPlayers(state).find((player) => (
    player.roleId === "grandmother" && player.alive
  ));
  const grandchildId = state.setup && state.setup.grandmotherId;
  if (!grandmother || !grandchildId) return;
  const grandchildDeath = state.deaths.find((death) => (
    death.playerId === grandchildId
    && death.phase === "night"
    && death.number === night
    && death.demon === true
  ));
  if (!grandchildDeath) return;
  if (state.night.queue.some((step) => step.roleId === "grandmother" && step.note && step.note.includes("Demon"))) return;
  const step = makeBmrStep(state, 73, "grandmother", grandmother, {
    targetMode: "none",
    canKill: true,
    note: "The Demon killed the grandchild. The Grandmother dies."
  });
  state.night.queue.push(step);
  addLog(state, {
    secret: true,
    kind: "night",
    title: "Бабушка: внук убит Демоном",
    detail: grandmother.name + " должна умереть."
  });
}

export function completeBmrStep(state, step, options) {
  const role = step.roleId;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const targets = options.targetIds || [];
  const at = currentAt(state);
  if (actor) actor.used = actor.used || {};
  if (role === "pukka" && actor) {
    if (isImpaired(state, actor.id, at)) {
      step.note = "Способность не сработала: Пукка отравлен или пьян. Яд на прежней цели приостановлен.";
      step.result = { deaths: [], poisonedId: null, suspended: true };
      return;
    }
    // The new poison lands first: it can impair a protector (for example the
    // Tea Lady) before the previous victim's death is resolved.
    const pending = pukkaPending(state, actor.id);
    const poison = poisonPukkaTarget(state, actor, targets[0], at);
    const resolved = resolvePukkaDeath(state, pending, at);
    step.result = {
      deaths: resolved && resolved.death ? [resolved.death] : [],
      resolved: resolved || null,
      poisonedId: poison ? poison.targetId : null
    };
    return;
  }
  if (role === "po" && actor) actor.used.poNoOne = targets.length === 0;
  if (role === "sailor" && actor) {
    const drunkId = options.drunkId || targets[0] || null;
    if (drunkId) {
      state.effects.forEach((effect) => {
        if (effect.kind === "drunk" && effect.sourceId === actor.id) effect.active = false;
      });
      state.effects.push({
        id: "eff-" + (state.effects.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
        kind: "drunk",
        sourceId: actor.id,
        targetId: drunkId,
        start: at,
        expires: { phase: "night", number: at.number + 1 },
        active: true
      });
    }
    return;
  }
  if (role === "innkeeper" && actor && targets.length === 2) {
    state.effects.forEach((effect) => {
      if ((effect.kind === "protected" && effect.sourceId === actor.id)
        || (effect.kind === "drunk" && effect.sourceId === actor.id)) effect.active = false;
    });
    for (const targetId of targets) {
      state.effects.push({
        id: "eff-" + (state.effects.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
        kind: "protected",
        bmr: "innkeeper",
        sourceId: actor.id,
        targetId,
        start: at,
        expires: { phase: "day", number: at.number },
        active: true
      });
    }
    const drunkId = options.drunkId || targets[0];
    state.effects.push({
      id: "eff-" + (state.effects.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
      kind: "drunk",
      sourceId: actor.id,
      targetId: drunkId,
      start: at,
      expires: { phase: "night", number: at.number + 1 },
      active: true
    });
    return;
  }
  if (role === "devilsadvocate" && actor && targets[0]) {
    state.effects.forEach((effect) => {
      if (effect.kind === "devilsadvocate" && effect.sourceId === actor.id) effect.active = false;
    });
    state.effects.push({
      id: "eff-" + (state.effects.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
      kind: "devilsadvocate",
      sourceId: actor.id,
      targetId: targets[0],
      start: at,
      day: at.number,
      expires: { phase: "night", number: at.number + 1 },
      active: true
    });
    return;
  }
  if (role === "courtier" && actor) {
    actor.used.courtier = true;
    const roleId = options.roleId;
    if (roleId) {
      for (const player of orderedPlayers(state)) {
        if (player.roleId !== roleId) continue;
        state.effects.push({
          id: "eff-" + (state.effects.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
          kind: "drunk",
          sourceId: actor.id,
          targetId: player.id,
          start: at,
          expires: { phase: "night", number: at.number + 3 },
          active: true
        });
      }
    }
    return;
  }
  if (role === "professor" && actor && targets[0]) {
    actor.used.professor = true;
    const target = playerById(state, targets[0]);
    if (target && !target.alive && roleTeam(target.roleId) === "townsfolk") {
      resurrectPlayer(state, target.id);
    }
    return;
  }
  if (role === "assassin" && actor && targets[0]) {
    actor.used.assassin = true;
    const target = playerById(state, targets[0]);
    if (target && target.alive) {
      kill(state, target.id, "ability", at, {
        demon: false,
        ability: "assassin",
        bmr: true,
        bypassProtection: true
      });
    }
    return;
  }
  if (role === "gambler" && actor && targets[0]) {
    const target = playerById(state, targets[0]);
    if (target && options.roleId && target.roleId !== options.roleId
      && !(target.roleId === "recluse" && options.roleId === "demon")) {
      kill(state, actor.id, "ability", at, { ability: "gambler", bmr: true });
    }
    return;
  }
  if (role === "moonchild" && actor && targets[0]) {
    const target = playerById(state, targets[0]);
    actor.used.moonchildResolved = true;
    if (target && target.alive && (target.team === "good" || target.team == null)) {
      kill(state, target.id, "ability", at, { ability: "moonchild", bmr: true });
    }
    return;
  }
  if (role === "tinker" && actor) {
    // The host decides whether the Tinker dies; the outcome controls record it.
    return;
  }
  if (role === "exorcist" && actor) {
    const targetId = targets[0];
    actor.used.exorcistTarget = targetId || null;
    const target = targetId ? playerById(state, targetId) : null;
    if (target && roleTeam(target.roleId) === "demon") {
      const demonStep = state.night.queue.find((candidate) => (
        candidate.kind === "role" && candidate.roleId === target.roleId && !candidate.done
      ));
      if (demonStep) {
        demonStep.done = true;
        demonStep.skipped = true;
        demonStep.note = "Экзорцист выбрал Демона. Демон узнаёт Экзорциста и не просыпается.";
      }
      addLog(state, {
        secret: true,
        kind: "night",
        title: "Экзорцист выбрал Демона",
        detail: target.name + " узнаёт Экзорциста и не действует этой ночью."
      });
      if (target.roleId === "pukka") {
        const resolved = resolvePukkaDeath(state, pukkaPending(state, target.id), at);
        if (resolved) step.result = { ...(step.result || {}), pukkaDeath: resolved };
      }
    }
    return;
  }
  if (role === "grandmother" && actor && step.note && step.note.includes("Demon")) {
    addLog(state, {
      secret: true,
      kind: "night",
      title: "Бабушка умирает",
      detail: "Демон убил её внука."
    });
  }
}

export function bmrInfoForStep(state, step, options = {}) {
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const role = step.roleId;
  const at = nightAt(state);
  const impaired = actor ? isImpaired(state, actor.id, at) : false;
  const targetIds = options.targetIds || step.targetIds || [];
  if (role === "chambermaid") {
    const count = targetIds.filter((id) => state.night.queue.some((candidate) => (
      candidate.kind === "role"
      && candidate.actorId === id
      && candidate.bmr
      && !candidate.skipped
      && (candidate.done || candidate.key === step.key)
    ))).length;
    return {
      kind: "number",
      value: count,
      impaired,
      needsChoice: impaired,
      options: impaired ? [0, 1, 2] : []
    };
  }
  if (role === "grandmother") {
    const target = targetIds[0] ? playerById(state, targetIds[0]) : null;
    return {
      kind: "character",
      roleId: target ? target.roleId : null,
      playerId: target ? target.id : null,
      impaired,
      needsChoice: impaired,
      options: impaired ? orderedPlayers(state).map((player) => player.roleId) : []
    };
  }
  if (role === "godfather" && step.kind === "role" && state.night.number === 1) {
    const outsiders = livingPlayers(state)
      .filter((player) => roleTeam(player.roleId) === "outsider")
      .map((player) => player.name || "Игрок " + player.seat);
    return { kind: "note", text: "Изгои в игре: " + (outsiders.join(", ") || "—") + "." };
  }
  if (role === "lunatic") {
    return {
      kind: "note",
      text: state.night.number === 1
        ? "Покажите 3 добрые роли не в игре и укажите на любых игроков как на Приспешников. Настоящий Демон узнаёт Безумца."
        : "Безумец выбирает как Демон. Смертей нет; покажите выбор настоящему Демону."
    };
  }
  if (role && DEMON_ROLES.has(role)) {
    const lunatic = orderedPlayers(state).find((player) => player.roleId === "lunatic");
    if (lunatic) {
      const target = lunatic.used && lunatic.used.lunaticTarget
        ? playerById(state, lunatic.used.lunaticTarget)
        : null;
      return {
        kind: "note",
        text: "Безумец: " + lunatic.name + (target ? "; выбрал " + target.name : "") + ". Сообщите это Демону."
      };
    }
  }
  if (role === "exorcist") {
    const target = targetIds[0] ? playerById(state, targetIds[0]) : null;
    if (target && roleTeam(target.roleId) === "demon") {
      return { kind: "note", text: "Демон узнаёт Экзорциста и не просыпается этой ночью." };
    }
    return { kind: "note", text: "Цель не Демон: способность не сработала." };
  }
  return { kind: "none" };
}

export function recordBmrOutcome(state, stepKey, options = {}) {
  const step = state.night.queue.find((candidate) => candidate.key === stepKey);
  if (!step || !step.bmr) return { ok: false, errorCode: "error.36", error: "Шаг не найден." };
  if (step.roleId === "pukka") {
    // The Pukka's deaths are resolved by the ability itself; outcome controls
    // must not add a second, host-computed death.
    return { ok: true, deaths: (step.result && step.result.deaths) || [], resurrected: null };
  }
  if (state.winner) return { ok: false, errorCode: "error.6", error: "Игра уже окончена." };
  const at = currentAt(state);
  const deathIds = Array.isArray(options.deathIds)
    ? options.deathIds.map(String).filter((id) => playerById(state, id))
    : [];
  const demon = DEMON_ROLES.has(step.roleId);
  const deaths = [];
  for (const id of deathIds) {
    const death = kill(state, id, "ability", at, {
      demon,
      ability: step.roleId,
      bmr: true,
      bypassProtection: step.roleId === "assassin"
    });
    if (death) deaths.push(death);
  }
  let resurrected = null;
  if (options.resurrectId) {
    resurrected = resurrectPlayer(state, options.resurrectId);
  }
  if (step.roleId === "shabaloth" && deathIds.length) {
    const actor = step.actorId ? playerById(state, step.actorId) : null;
    if (actor) {
      actor.used = actor.used || {};
      actor.used.shabalothTargets = deathIds.slice();
    }
  }
  appendBmrConditionalSteps(state);
  checkWin(state);
  addLog(state, {
    secret: true,
    kind: "night",
    title: "Итог: " + roleLabel(step.roleId),
    detail: deaths.length
      ? "Погибли: " + deaths.map((death) => (playerById(state, death.playerId) || {}).name).join(", ") + "."
      : "Смертей нет."
  });
  return { ok: true, deaths, resurrected };
}

export function resurrectPlayer(state, playerId) {
  const player = playerById(state, playerId);
  if (!player || player.alive) return null;
  player.alive = true;
  player.deadAt = null;
  player.registeredDead = false;
  player.voteToken = true;
  addLog(state, {
    secret: true,
    kind: "death",
    title: player.name + " возвращается",
    detail: "Роль: " + roleLabel(player.roleId) + ".",
    playerId: player.id
  });
  return player;
}

export function bmrDemonHasLunatic(state) {
  return Boolean(orderedPlayers(state).find((player) => player.roleId === "lunatic"));
}
