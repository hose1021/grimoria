// Domain rules for Trouble Brewing. Pure functions: no DOM, no storage.
// Every mutation is explicit and appends a log entry. The UI calls these
// functions and persists the state; tests call them directly.
import {
  ALL_ROLES, bagErrors, compositionFor, isGoodRole, isTbRole, nightSequence,
  roleLabel, roleTeam, requiredBluffs
} from "./rules.js";
import {
  clone, effectiveRoleId, livingPlayers, nowIso, orderedPlayers,
  playerById, realTeamOf, seatOf, seatName
} from "./model.js";

const DEMON_REASONS = {
  "demon-dead": "Демон мёртв, и никто не унаследовал его роль.",
  saint: "Святой казнён, и его способность действовала.",
  mayor: "Мэр жив, в городе ровно три игрока и казни не было.",
  "two-alive": "В живых осталось двое."
};

export function nightAt(state) {
  return { phase: "night", number: Math.max(1, state.night.number || 1) };
}

export function executionThreshold(livingCount) {
  return Math.floor(Math.max(0, Number(livingCount) || 0) / 2) + 1;
}

export function dayAt(state) {
  return {
    phase: "day",
    number: Math.max(1, state.day.number || state.night.number || 1)
  };
}

export function currentAt(state) {
  return state.phase === "day" ? dayAt(state) : nightAt(state);
}

export function cycleOf(at) {
  return at.phase === "night" ? at.number * 2 - 1 : at.number * 2;
}

export function addLog(state, entry) {
  const phase = state.phase === "day"
    ? "День " + dayAt(state).number
    : state.phase === "night"
      ? "Ночь " + nightAt(state).number
      : state.phase === "over"
        ? "Итог"
        : "Подготовка";
  const item = {
    id: "log-" + (state.log.length + 1) + "-" + Math.random().toString(36).slice(2, 7),
    at: nowIso(),
    phase,
    kind: entry.kind || "game",
    title: entry.title || "",
    detail: entry.detail || "",
    playerId: entry.playerId || null,
    secret: Boolean(entry.secret)
  };
  state.log.push(item);
  return item;
}

export function playerName(state, id) {
  return seatName(state, id);
}

export function actorForRole(state, roleId, includeDead = false) {
  return orderedPlayers(state).find((p) => {
    if (!includeDead && !p.alive) return false;
    return effectiveRoleId(p) === roleId;
  }) || null;
}

export function playersWithEffectiveRole(state, roleId) {
  return orderedPlayers(state).filter((p) => effectiveRoleId(p) === roleId);
}

export function aliveNeighbors(state, id) {
  const ids = state.order;
  const at = ids.indexOf(String(id));
  if (at === -1) return [];
  const alive = new Set(livingPlayers(state).map((p) => p.id));
  const found = [];
  for (const dir of [-1, 1]) {
    for (let step = 1; step < ids.length; step += 1) {
      const index = (at + dir * step + ids.length) % ids.length;
      const candidate = String(ids[index]);
      if (candidate === String(id)) continue;
      if (alive.has(candidate)) {
        found.push(candidate);
        break;
      }
    }
  }
  return found.filter((value, index) => found.indexOf(value) === index);
}

export function allNeighbors(state, id) {
  const ids = state.order;
  const at = ids.indexOf(String(id));
  if (at === -1 || ids.length < 2) return [];
  return [
    String(ids[(at - 1 + ids.length) % ids.length]),
    String(ids[(at + 1) % ids.length])
  ];
}

// ---------------------------------------------------------------------------
// Effects

export function effectActive(state, effect, at = currentAt(state)) {
  if (!effect || effect.active === false) return false;
  if (effect.expires && cycleOf(at) >= cycleOf(effect.expires)) return false;
  if (effect.kind === "role-change") return true;

  const source = playerById(state, effect.sourceId);
  if (!source || !source.alive) return false;
  if (source.roleId === "drunk") return false;

  if (effect.kind === "poison") {
    // A poisoned Poisoner loses the ability; their existing poison ends.
    return !state.effects.some((other) => (
      other.id !== effect.id
      && other.kind === "poison"
      && other.targetId === source.id
      && effectActive(state, other, at)
    ));
  }
  return !isImpaired(state, source.id, at);
}

export function activeEffects(state, kind, at = currentAt(state)) {
  return state.effects.filter((effect) => (
    (!kind || effect.kind === kind) && effectActive(state, effect, at)
  ));
}

export function isImpaired(state, playerId, at = currentAt(state)) {
  const player = playerById(state, playerId);
  if (!player) return false;
  if (player.roleId === "drunk") return true;
  return state.effects.some((effect) => (
    effect.kind === "poison"
    && effect.targetId === playerId
    && effectActive(state, effect, at)
  ));
}

export function protectionFor(state, targetId, at = currentAt(state)) {
  return activeEffects(state, "protected", at)
    .find((effect) => effect.targetId === targetId) || null;
}

export function soldierSafe(state, playerId, at = currentAt(state)) {
  const player = playerById(state, playerId);
  return Boolean(player && player.roleId === "soldier" && !isImpaired(state, playerId, at));
}

export function mayorRedirects(state, playerId, at = currentAt(state)) {
  const player = playerById(state, playerId);
  return Boolean(player && player.roleId === "mayor" && !isImpaired(state, playerId, at));
}

export function butlerMaster(state, playerId, at = currentAt(state)) {
  const player = playerById(state, playerId);
  if (!player || player.roleId !== "butler" || isImpaired(state, playerId, at)) return null;
  const effect = activeEffects(state, "butler", at)
    .find((candidate) => candidate.sourceId === playerId);
  return effect ? effect.targetId : null;
}

// ---------------------------------------------------------------------------
// Registration choices. Only Spy and Recluse can change how they register.

export function alignmentOf(state, player, registrations = {}) {
  if (!player) return null;
  const override = registrations[player.id];
  if (override === "good" || override === "evil") return override;
  return realTeamOf(player) === "evil" ? "evil" : "good";
}

export function registersAsDemon(state, player, registrations = {}) {
  if (!player) return false;
  if (roleTeam(player.roleId) === "demon") return true;
  if (player.roleId === "recluse") {
    return registrations[player.id] === "demon" || registrations[player.id] === "evil";
  }
  return false;
}

export function registersAsTownsfolk(state, player, registrations = {}) {
  if (!player) return false;
  if (roleTeam(player.roleId) === "townsfolk") return true;
  return player.roleId === "spy" && registrations[player.id] === "townsfolk";
}

export function registersAsMinion(state, player, registrations = {}) {
  if (!player) return false;
  if (roleTeam(player.roleId) === "minion") return true;
  return player.roleId === "recluse" && registrations[player.id] === "minion";
}

export function registersAsOutsider(state, player, registrations = {}) {
  if (!player) return false;
  if (roleTeam(player.roleId) === "outsider") return true;
  return player.roleId === "spy" && registrations[player.id] === "outsider";
}

export function chefCount(state, registrations = {}) {
  const ids = state.order;
  let pairs = 0;
  for (let i = 0; i < ids.length; i += 1) {
    const a = playerById(state, ids[i]);
    const b = playerById(state, ids[(i + 1) % ids.length]);
    if (
      alignmentOf(state, a, registrations) === "evil"
      && alignmentOf(state, b, registrations) === "evil"
    ) pairs += 1;
  }
  return pairs;
}

export function empathCount(state, playerId, registrations = {}) {
  return aliveNeighbors(state, playerId)
    .map((id) => playerById(state, id))
    .filter((player) => alignmentOf(state, player, registrations) === "evil")
    .length;
}

export function fortuneTellerYes(state, targetIds, registrations = {}) {
  const herringId = state.setup && state.setup.herringId
    ? state.setup.herringId
    : state.herringId;
  return (targetIds || []).some((id) => {
    const player = playerById(state, id);
    if (!player) return false;
    if (id === herringId) return true;
    return registersAsDemon(state, player, registrations);
  });
}

export function characterChoices(state, targetId, actorImpaired = false) {
  if (actorImpaired) return ALL_ROLES.slice();
  const player = playerById(state, targetId);
  if (!player) return [];
  if (player.roleId === "recluse") {
    return [player.roleId].concat(
      ALL_ROLES.filter((id) => roleTeam(id) === "minion" || roleTeam(id) === "demon")
    );
  }
  if (player.roleId === "spy") {
    return [player.roleId].concat(
      ALL_ROLES.filter((id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider")
    );
  }
  return [player.roleId];
}

// ---------------------------------------------------------------------------
// Night queue

function stepKey(state, sequenceIndex, roleId, actorId) {
  return [
    "n" + nightAt(state).number,
    sequenceIndex,
    roleId || "system",
    actorId || "all"
  ].join("-");
}

function targetModeFor(roleId) {
  if (roleId === "poisoner" || roleId === "imp" || roleId === "ravenkeeper") return "one-any";
  if (roleId === "monk" || roleId === "butler") return "one-other";
  if (roleId === "fortuneteller") return "two";
  return "none";
}

function infoKindFor(roleId) {
  return {
    washerwoman: "one-of-two",
    librarian: "one-of-two",
    investigator: "one-of-two",
    chef: "number",
    empath: "number",
    fortuneteller: "yes-no",
    undertaker: "character",
    ravenkeeper: "character",
    spy: "grimoire"
  }[roleId] || "none";
}

function makeRoleStep(state, sequenceIndex, roleId, actor, extra = {}) {
  return {
    key: stepKey(state, sequenceIndex, roleId, actor ? actor.id : null),
    kind: "role",
    roleId,
    actorId: actor ? actor.id : null,
    actorName: actor ? actor.name : "",
    actorAlive: actor ? actor.alive : false,
    order: sequenceIndex,
    targetMode: targetModeFor(roleId),
    infoKind: infoKindFor(roleId),
    targetIds: [],
    redirectId: null,
    registrations: {},
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

function makeSystemStep(state, sequenceIndex, system, extra = {}) {
  return {
    key: stepKey(state, sequenceIndex, system, null),
    kind: "system",
    system,
    roleId: null,
    actorId: null,
    actorIds: [],
    order: sequenceIndex,
    targetMode: "none",
    infoKind: system === "demonchange" ? "note" : system === "minioninfo" ? "minion-info" : system === "demoninfo" ? "demon-info" : "none",
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

export function executionDeathForDay(state, dayNumber) {
  const deaths = state.deaths.filter((death) => (
    death.cause === "execution"
    && death.phase === "day"
    && death.number === dayNumber
  ));
  return deaths.length ? deaths[deaths.length - 1] : null;
}

export function demonChangePending(state) {
  return state.night.queue.find((step) => step.pending && step.pending.kind === "demon-inheritance") || null;
}

export function buildNightQueue(state) {
  const night = nightAt(state).number;
  const sequence = nightSequence(night);
  const steps = [];
  const size = orderedPlayers(state).length;
  const living = livingPlayers(state);

  sequence.forEach((roleId, index) => {
    if (roleId === "scarletwoman") return; // passive; resolved at Demon death

    if (roleId === "minioninfo") {
      if (night !== 1 || size < 7) return;
      const minions = living.filter((p) => roleTeam(p.roleId) === "minion");
      const demon = living.find((p) => roleTeam(p.roleId) === "demon");
      if (!minions.length || !demon) return;
      steps.push(makeSystemStep(state, index, "minioninfo", {
        actorIds: minions.map((p) => p.id),
        demonId: demon.id
      }));
      return;
    }

    if (roleId === "demoninfo") {
      if (night !== 1 || size < 7) return;
      const demon = living.find((p) => roleTeam(p.roleId) === "demon");
      if (!demon) return;
      steps.push(makeSystemStep(state, index, "demoninfo", {
        actorIds: [demon.id],
        demonId: demon.id,
        bluffs: (state.bluffs || []).slice()
      }));
      return;
    }

    if (roleId === "ravenkeeper") {
      const dead = orderedPlayers(state).find((p) => (
        effectiveRoleId(p) === "ravenkeeper"
        && !p.alive
        && p.deadAt
        && p.deadAt.phase === "night"
        && p.deadAt.number === night
      ));
      if (!dead) return;
      steps.push(makeRoleStep(state, index, "ravenkeeper", dead, {
        actorAlive: false,
        deadTonight: true
      }));
      return;
    }

    if (roleId === "undertaker") {
      const actor = living.find((p) => effectiveRoleId(p) === "undertaker");
      if (!actor) return;
      const death = executionDeathForDay(state, night - 1);
      if (!death) return;
      steps.push(makeRoleStep(state, index, "undertaker", actor, {
        executedId: death.playerId,
        executedRoleId: death.roleId || null
      }));
      return;
    }

    const actor = living.find((p) => effectiveRoleId(p) === roleId);
    if (!actor) return;
    steps.push(makeRoleStep(state, index, roleId, actor));
  });

  return steps;
}

export function insertStepByOrder(state, step) {
  const queue = state.night.queue;
  const at = queue.findIndex((candidate) => candidate.order > step.order);
  if (at === -1) queue.push(step);
  else queue.splice(at, 0, step);
}

export function pruneDeadSteps(state) {
  for (const step of state.night.queue) {
    if (step.done || step.skipped) continue;
    if (!step.actorId) continue;
    if (step.roleId === "ravenkeeper") continue;
    const actor = playerById(state, step.actorId);
    if (!actor || actor.alive) continue;
    step.done = true;
    step.skipped = true;
    step.note = "Игрок погиб до своего шага.";
    addLog(state, {
      secret: true,
      kind: "night",
      title: "Шаг пропущен: " + (step.roleId ? roleLabel(step.roleId) : "система"),
      detail: (actor ? actor.name : "Игрок") + " погиб до пробуждения."
    });
  }
}

export function appendConditionalSteps(state) {
  const night = nightAt(state).number;
  const queue = state.night.queue;

  const ravenkeeper = orderedPlayers(state).find((p) => (
    effectiveRoleId(p) === "ravenkeeper"
    && !p.alive
    && p.deadAt
    && p.deadAt.phase === "night"
    && p.deadAt.number === night
  ));
  if (ravenkeeper && !queue.some((step) => step.roleId === "ravenkeeper" && step.actorId === ravenkeeper.id)) {
    const sequence = nightSequence(night);
    const order = sequence.indexOf("ravenkeeper");
    const step = makeRoleStep(state, order, "ravenkeeper", ravenkeeper, {
      actorAlive: false,
      deadTonight: true
    });
    insertStepByOrder(state, step);
  }

  if (state.night.demonChanged && !queue.some((step) => step.system === "demonchange")) {
    const impIndex = queue.findIndex((step) => step.roleId === "imp");
    const order = impIndex === -1 ? 100 : queue[impIndex].order + 0.5;
    insertStepByOrder(state, makeSystemStep(state, order, "demonchange", {
      note: "Демон сменился. Разбудите нового Демона и покажите жетон Чёрта. Новый Демон не действует этой ночью повторно."
    }));
  }
  pruneDeadSteps(state);
}

export function startNight(state) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  if (state.phase === "night" && state.night.queue.length) {
    return { ok: true, queue: state.night.queue, resumed: true };
  }
  const errors = secretsErrors(state);
  if (errors.length) return { ok: false, errors };
  if (!state.setup.roles.length) return { ok: false, error: "Сначала раздайте роли." };
  if (!orderedPlayers(state).every((player) => player.roleId)) {
    return { ok: false, error: "Раздайте роли всем игрокам." };
  }

  if (state.phase !== "deal" && state.phase !== "seat" && state.phase !== "night") {
    // Night can restart after a reload; only block clearly wrong phases.
    if (state.phase !== "day") state.phase = "deal";
  }
  if (!state.night.number || state.night.number < 1) state.night.number = 1;
  state.phase = "night";
  state.day.number = state.night.number;
  state.night.demonChanged = false;
  state.night.queue = buildNightQueue(state);
  state.night.currentIndex = 0;
  state.setup.ready = true;
  addLog(state, {
    kind: "phase",
    title: "Ночь " + state.night.number,
    detail: "Разбудите роли по порядку. Не называйте роли вслух."
  });
  return { ok: true, queue: state.night.queue };
}

export function completeStep(state, key, options = {}) {
  const step = state.night.queue.find((candidate) => candidate.key === key);
  if (!step) return { ok: false, error: "Шаг не найден." };
  if (step.done) return { ok: false, error: "Этот шаг уже выполнен." };
  if (state.winner) return { ok: false, error: "Игра уже окончена." };

  const at = nightAt(state);
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const targets = Array.isArray(options.targetIds) ? options.targetIds.map(String) : [];
  if (actor && !actor.alive && step.roleId !== "ravenkeeper") {
    step.done = true;
    step.skipped = true;
    step.note = "Игрок погиб до своего шага.";
    return { ok: false, error: "Игрок погиб до своего шага." };
  }

  if (step.targetMode === "one-any" && targets.length !== 1) {
    return { ok: false, error: "Выберите одну цель." };
  }
  if (step.targetMode === "one-other" && targets.length !== 1) {
    return { ok: false, error: "Выберите одну цель." };
  }
  if (step.targetMode === "one-other" && targets[0] === step.actorId) {
    return { ok: false, error: "Нельзя выбрать себя." };
  }
  for (const id of targets) {
    if (!playerById(state, id)) return { ok: false, error: "Цель не найдена." };
  }
  if (step.targetMode === "two") {
    if (targets.length !== 2) return { ok: false, error: "Выберите двух разных игроков." };
    if (targets[0] === targets[1]) return { ok: false, error: "Нужны два разных игрока." };
  }

  if (step.kind === "system") {
    return completeSystemStep(state, step, options);
  }

  const role = step.roleId;

  if (role === "poisoner") {
    if (isImpaired(state, actor.id, at)) {
      step.note = "Способность не сработала: игрок отравлен или пьян.";
    } else {
      state.effects.forEach((effect) => {
        if (effect.kind === "poison" && effect.sourceId === actor.id) effect.active = false;
      });
      state.effects.push({
        id: "eff-" + (state.effects.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
        kind: "poison",
        sourceId: actor.id,
        targetId: targets[0],
        start: at,
        expires: { phase: "night", number: at.number + 1 },
        active: true
      });
      step.note = "Отравлен: " + seatName(state, targets[0]) + ".";
    }
    return finishStep(state, step, options, targets, at);
  }

  if (role === "monk") {
    if (isImpaired(state, actor.id, at)) {
      step.note = "Способность не сработала: игрок отравлен или пьян.";
    } else {
      state.effects.forEach((effect) => {
        if (effect.kind === "protected" && effect.sourceId === actor.id) effect.active = false;
      });
      state.effects.push({
        id: "eff-" + (state.effects.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
        kind: "protected",
        sourceId: actor.id,
        targetId: targets[0],
        start: at,
        expires: { phase: "day", number: at.number },
        active: true
      });
      step.note = "Защищён этой ночью: " + seatName(state, targets[0]) + ".";
    }
    return finishStep(state, step, options, targets, at);
  }

  if (role === "butler") {
    const impaired = isImpaired(state, actor.id, at);
    actor.butlerMasterId = targets[0];
    state.effects.push({
      id: "eff-" + (state.effects.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
      kind: "butler",
      sourceId: actor.id,
      targetId: targets[0],
      start: at,
      expires: { phase: "night", number: at.number + 1 },
      active: !impaired
    });
    step.note = impaired
      ? "Способность не сработала: игрок отравлен или пьян."
      : "Завтра голосует только вместе с: " + seatName(state, targets[0]) + ".";
    return finishStep(state, step, options, targets, at);
  }

  if (role === "imp") {
    const attack = resolveAttack(state, {
      attackerId: actor.id,
      targetId: targets[0],
      at,
      redirectId: options.redirectId || null
    });
    if (attack.needsRedirect) {
      return {
        ok: false,
        needsRedirect: true,
        options: attack.options,
        error: "Мэр может перенаправить смерть. Выберите, кто умирает."
      };
    }
    step.result = attack;
    step.note = attack.noDeath
      ? attack.reason
      : "Погиб: " + seatName(state, attack.deathId) + ".";
    step.done = true;
    step.completedAt = nowIso();
    step.given = null;
    addLog(state, {
      secret: true,
      kind: "night",
      title: "Имп атакует",
      detail: step.note
    });
    appendConditionalSteps(state);
    if (attack.pendingInheritance) {
      step.pending = attack.pendingInheritance;
    }
    checkWin(state);
    return { ok: true, step, result: step.result };
  }

  if (role === "ravenkeeper") {
    const info = infoForStep(state, step, options);
    if (info.needsChoice && !options.given) return { ok: false, needsChoice: true, info };
    step.given = options.given || info;
    return finishStep(state, step, options, targets, at);
  }

  if (role === "undertaker") {
    const info = infoForStep(state, step, options);
    if (info.needsChoice && !options.given) return { ok: false, needsChoice: true, info };
    step.given = options.given || info;
    return finishStep(state, step, options, targets, at);
  }

  if (role === "chef" || role === "empath" || role === "fortuneteller"
    || role === "washerwoman" || role === "librarian" || role === "investigator") {
    const info = infoForStep(state, step, options);
    if (info.missing) {
      return { ok: false, needsSetup: true, info, error: "Секретная информация ещё не настроена." };
    }
    if (info.needsChoice && !options.given) return { ok: false, needsChoice: true, info };
    step.given = options.given || info;
    return finishStep(state, step, options, targets, at);
  }

  if (role === "spy") {
    step.given = { kind: "grimoire" };
    return finishStep(state, step, options, targets, at);
  }

  return finishStep(state, step, options, targets, at);
}

function finishStep(state, step, options, targets, at) {
  step.targetIds = targets.slice();
  step.registrations = options.registrations || {};
  step.impaired = step.actorId ? isImpaired(state, step.actorId, at) : false;
  step.done = true;
  step.completedAt = nowIso();
  if (!step.note) step.note = "Шаг выполнен.";
  addLog(state, {
    secret: true,
    kind: "night",
    title: (step.roleId ? roleLabel(step.roleId) : step.system) || "Ночной шаг",
    detail: step.note
  });
  appendConditionalSteps(state);
  checkWin(state);
  return { ok: true, step };
}

function completeSystemStep(state, step, options) {
  if (step.system === "demonchange") {
    step.done = true;
    step.completedAt = nowIso();
    step.given = { kind: "note", text: step.note || "Демон сменился." };
    addLog(state, { secret: true, kind: "night", title: "Смена Демона", detail: step.given.text });
    return { ok: true, step };
  }
  step.done = true;
  step.completedAt = nowIso();
  if (step.system === "minioninfo") {
    step.given = { kind: "minion-info", demonId: step.demonId, actorIds: step.actorIds };
  } else if (step.system === "demoninfo") {
    step.given = { kind: "demon-info", bluffs: step.bluffs, actorIds: step.actorIds };
  } else {
    step.given = { kind: "note", text: step.note || "Шаг выполнен." };
  }
  addLog(state, {
    secret: true,
    kind: "night",
    title: step.system === "minioninfo" ? "Знакомство Приспешников" : "Знакомство Демона",
    detail: "Информация показана."
  });
  return { ok: true, step };
}

// ---------------------------------------------------------------------------
// Information

export function infoForStep(state, step, options = {}) {
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const at = nightAt(state);
  const impaired = actor ? isImpaired(state, actor.id, at) : false;
  const registrations = options.registrations || step.registrations || {};
  const role = step.roleId;

  if (step.kind === "system") {
    if (step.system === "demoninfo") {
      return { kind: "demon-info", bluffs: step.bluffs || [] };
    }
    if (step.system === "minioninfo") {
      return { kind: "minion-info", demonId: step.demonId };
    }
    return { kind: "note", text: step.note || "" };
  }

  if (role === "washerwoman" || role === "librarian" || role === "investigator") {
    const setup = state.setup.info[role];
    if (!setup) {
      if (actor && actor.roleId === "drunk") {
        const team = role === "washerwoman" ? "townsfolk" : role === "librarian" ? "outsider" : "minion";
        const options = ALL_ROLES.filter((id) => roleTeam(id) === team);
        const others = orderedPlayers(state).filter((player) => player.id !== actor.id).map((player) => player.id);
        return {
          kind: "one-of-two",
          missing: false,
          roleId: options[0] || null,
          pair: others.slice(0, 2),
          matchIndex: 0,
          impaired: true,
          needsChoice: true,
          options,
          text: "Пьяница: предложена ложная информация."
        };
      }
      return { kind: "one-of-two", missing: true, needsChoice: true };
    }
    if (setup.zero) {
      return { kind: "one-of-two", zero: true, text: "В игре нет Изгоев." };
    }
    if (!setup.roleId || !Array.isArray(setup.pair) || setup.pair.length !== 2) {
      return { kind: "one-of-two", missing: true, needsChoice: true };
    }
    return {
      kind: "one-of-two",
      roleId: setup.roleId,
      pair: setup.pair.slice(),
      matchIndex: setup.matchIndex || 0,
      impaired,
      needsChoice: impaired,
      options: impaired
        ? ALL_ROLES.filter((id) => roleTeam(id) === (role === "washerwoman" ? "townsfolk" : role === "librarian" ? "outsider" : "minion"))
        : []
    };
  }

  if (role === "chef") {
    const value = chefCount(state, registrations);
    return {
      kind: "number",
      value,
      impaired,
      needsChoice: impaired,
      options: impaired ? uniqueNumbers(0, orderedPlayers(state).length) : []
    };
  }

  if (role === "empath") {
    const value = empathCount(state, actor.id, registrations);
    return {
      kind: "number",
      value,
      impaired,
      needsChoice: impaired,
      options: impaired ? uniqueNumbers(0, 2) : []
    };
  }

  if (role === "fortuneteller") {
    const value = fortuneTellerYes(state, options.targetIds || step.targetIds, registrations);
    return {
      kind: "yes-no",
      value,
      impaired,
      needsChoice: impaired,
      options: impaired ? [true, false] : []
    };
  }

  if (role === "undertaker") {
    const death = executionDeathForDay(state, nightAt(state).number - 1);
    if (!death) return { kind: "none", text: "Сегодня казни со смертью не было." };
    const choices = characterChoices(state, death.playerId, impaired);
    return {
      kind: "character",
      roleId: death.roleId,
      playerId: death.playerId,
      impaired,
      needsChoice: impaired || choices.length > 1,
      options: choices
    };
  }

  if (role === "spy") {
    return { kind: "grimoire" };
  }

  if (role === "ravenkeeper") {
    const targetId = (options.targetIds || step.targetIds || [])[0];
    const target = playerById(state, targetId);
    if (!target) return { kind: "character", roleId: null, needsChoice: true, options: ALL_ROLES.slice() };
    const choices = characterChoices(state, target.id, impaired);
    return {
      kind: "character",
      roleId: target.roleId,
      playerId: target.id,
      impaired,
      needsChoice: impaired || choices.length > 1,
      options: choices
    };
  }

  return { kind: "none" };
}

function uniqueNumbers(from, to) {
  const out = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}

// ---------------------------------------------------------------------------
// Death, inheritance and win

export function kill(state, playerId, cause, at = currentAt(state), extra = {}) {
  const player = playerById(state, playerId);
  if (!player || !player.alive) return null;
  const livingBefore = livingPlayers(state).length;
  const impaired = isImpaired(state, playerId, at);
  player.alive = false;
  player.deadAt = { phase: at.phase, number: at.number, cause };
  player.voteToken = true;
  const death = {
    id: "death-" + (state.deaths.length + 1) + "-" + Math.random().toString(36).slice(2, 6),
    playerId,
    roleId: player.roleId,
    cause,
    phase: at.phase,
    number: at.number,
    at: nowIso(),
    impaired,
    livingBefore,
    ...extra
  };
  state.deaths.push(death);
  addLog(state, {
    secret: true,
    kind: "death",
    title: player.name + " погибает",
    detail: "Причина: " + cause + ". Роль: " + roleLabel(player.roleId) + ".",
    playerId
  });
  return death;
}

export function becomeDemon(state, player, via, at = currentAt(state)) {
  const previous = player.roleId;
  player.changedFrom = previous;
  player.roleId = "imp";
  player.shownRoleId = "imp";
  player.team = "evil";
  for (const step of state.night.queue) {
    if (step.done || step.skipped) continue;
    if (step.actorId !== player.id) continue;
    if (!step.roleId || step.roleId === "imp") continue;
    step.done = true;
    step.skipped = true;
    step.note = "Роль изменилась до шага: теперь это Демон.";
  }
  player.reminders = Array.isArray(player.reminders) ? player.reminders : [];
  if (!player.reminders.includes("Демон")) player.reminders.push("Демон");
  state.night.demonChanged = true;
  addLog(state, {
    secret: true,
    kind: "role-change",
    title: "Новый Демон: " + player.name,
    detail: via === "scarletwoman"
      ? "Алая женщина становится Демоном. Порог живых соблюдён."
      : "Приспешник получает роль Демона после самоубийства Чёрта.",
    playerId: player.id
  });
  return player;
}

export function resolveDemonDeath(state, { cause, livingBefore, at = currentAt(state) }) {
  const living = livingPlayers(state);
  const scarlet = living.find((player) => (
    player.roleId === "scarletwoman" && !isImpaired(state, player.id, at)
  ));
  if (scarlet && livingBefore >= 5) {
    becomeDemon(state, scarlet, "scarletwoman", at);
    return { inherited: true, playerId: scarlet.id, via: "scarletwoman" };
  }

  if (cause === "imp-self-kill") {
    const minions = living.filter((player) => roleTeam(player.roleId) === "minion");
    if (minions.length === 1) {
      becomeDemon(state, minions[0], "imp", at);
      return { inherited: true, playerId: minions[0].id, via: "imp" };
    }
    if (minions.length > 1) {
      return {
        inherited: false,
        pendingInheritance: {
          kind: "demon-inheritance",
          options: minions.map((player) => ({ id: player.id, name: player.name, roleId: player.roleId }))
        }
      };
    }
  }
  return { inherited: false };
}

export function chooseDemonHeir(state, stepKey, heirId) {
  const step = state.night.queue.find((candidate) => candidate.key === stepKey);
  if (!step || !step.pending || step.pending.kind !== "demon-inheritance") {
    return { ok: false, error: "Здесь нет выбора наследника." };
  }
  const heir = playerById(state, heirId);
  if (!heir || !heir.alive || roleTeam(heir.roleId) !== "minion") {
    return { ok: false, error: "Наследником может стать только живой Приспешник." };
  }
  becomeDemon(state, heir, "imp", currentAt(state));
  step.pending = null;
  checkWin(state);
  return { ok: true, heir };
}

export function resolveAttack(state, { attackerId, targetId, at, redirectId = null }) {
  const attacker = playerById(state, attackerId);
  const target = playerById(state, targetId);
  if (!attacker || !target) return { noDeath: true, reason: "Цель не найдена." };
  if (isImpaired(state, attackerId, at)) {
    return { noDeath: true, reason: "Демон отравлен или пьян: смерти нет." };
  }
  if (!target.alive) {
    return { noDeath: true, reason: "Игрок уже мёртв: повторной смерти нет." };
  }
  if (protectionFor(state, targetId, at)) {
    return { noDeath: true, reason: "Цель защищена Монахом." };
  }
  if (soldierSafe(state, targetId, at)) {
    return { noDeath: true, reason: "Солдат не может умереть от Демона." };
  }

  let victimId = targetId;
  let redirected = false;
  if (mayorRedirects(state, targetId, at)) {
    if (!redirectId) {
      return {
        needsRedirect: true,
        options: livingPlayers(state)
          .filter((player) => player.id !== targetId)
          .map((player) => ({ id: player.id, name: player.name }))
      };
    }
    if (redirectId !== "none") {
      const victim = playerById(state, redirectId);
      if (!victim || !victim.alive || victim.id === targetId) {
        return { noDeath: true, reason: "Перенаправление отменено." };
      }
      if (protectionFor(state, victim.id, at) || soldierSafe(state, victim.id, at)) {
        return { noDeath: true, reason: "Перенаправленная смерть предотвращена защитой." };
      }
      victimId = victim.id;
      redirected = true;
    }
  }

  const victim = playerById(state, victimId);
  const wasDemon = roleTeam(victim.roleId) === "demon";
  const livingBefore = livingPlayers(state).length;
  const selfKill = victimId === attackerId;
  const death = kill(state, victimId, selfKill ? "imp-self-kill" : "demon", at);

  let inheritance = null;
  if (wasDemon && death) {
    inheritance = resolveDemonDeath(state, {
      cause: death.cause,
      livingBefore,
      at
    });
  }

  return {
    noDeath: false,
    deathId: victimId,
    redirected,
    wasDemon,
    inheritance,
    pendingInheritance: inheritance && inheritance.pendingInheritance
      ? inheritance.pendingInheritance
      : null
  };
}

export function checkWin(state, { endOfDay = false } = {}) {
  if (state.winner) return state.winner;
  if (demonChangePending(state)) return null;

  const saintDeath = state.deaths.find((death) => (
    death.cause === "execution"
    && !death.impaired
    && death.roleId === "saint"
  ));
  if (saintDeath) return setWinner(state, "evil", "saint");

  const living = livingPlayers(state);
  if (endOfDay && state.day && !state.day.execution && living.length === 3) {
    const mayor = living.find((player) => mayorRedirects(state, player.id, dayAt(state)));
    if (mayor) return setWinner(state, "good", "mayor");
  }

  const demon = living.find((player) => roleTeam(player.roleId) === "demon");
  if (!demon) return setWinner(state, "good", "demon-dead");
  if (living.length <= 2) return setWinner(state, "evil", "two-alive");
  return null;
}

export function setWinner(state, team, reason) {
  state.winner = {
    team,
    reason,
    title: team === "good" ? "Победа добра" : "Победа зла",
    detail: DEMON_REASONS[reason] || "",
    at: nowIso()
  };
  state.phase = "over";
  state.reviewOpen = false;
  addLog(state, {
    kind: "winner",
    title: state.winner.title,
    detail: state.winner.detail
  });
  return state.winner;
}

// ---------------------------------------------------------------------------
// Night end and day

export function endNight(state) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  const pending = demonChangePending(state);
  if (pending) return { ok: false, error: "Сначала выберите наследника Демона." };
  const unfinished = state.night.queue.filter((step) => !step.done && !step.skipped);
  if (unfinished.length) {
    return { ok: false, error: "Остались ночные шаги: " + unfinished.length + "." };
  }

  const night = nightAt(state).number;
  const morning = state.deaths
    .filter((death) => death.phase === "night" && death.number === night)
    .map((death) => ({ playerId: death.playerId }));
  state.phase = "day";
  state.day = {
    number: night,
    morning,
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: false
  };
  addLog(state, {
    kind: "phase",
    title: "Утро " + night,
    detail: morning.length
      ? "Погибли: " + morning.map((death) => seatName(state, death.playerId)).join(", ") + "."
      : "Ночью никто не погиб."
  });
  checkWin(state);
  return { ok: true, day: state.day };
}

export function openNominations(state) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  if (state.phase !== "day") return { ok: false, error: "Сейчас не день." };
  if (state.day.ended) return { ok: false, error: "День уже завершён." };
  state.day.open = true;
  addLog(state, {
    kind: "phase",
    title: "Номинации открыты",
    detail: "Номинировать может только живой игрок, один раз за день."
  });
  return { ok: true };
}

function virginTriggers(state, nominee, nominator, options = {}) {
  if (!nominee || nominee.roleId !== "virgin" || !nominee.alive) return false;
  if (nominee.used.virgin) return false;
  if (isImpaired(state, nominee.id, dayAt(state))) return false;
  const realTownsfolk = roleTeam(nominator.roleId) === "townsfolk";
  const spyTownsfolk = nominator.roleId === "spy" && options.spyRegistersTownsfolk === true;
  return realTownsfolk || spyTownsfolk;
}

export function nominate(state, nominatorId, nomineeId, options = {}) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  if (state.phase !== "day" || !state.day.open) return { ok: false, error: "Номинации не открыты." };
  if (state.day.ended) return { ok: false, error: "День уже завершён." };
  if (state.day.activeNominationId) {
    return { ok: false, error: "Сначала завершите текущее голосование." };
  }
  const nominator = playerById(state, nominatorId);
  const nominee = playerById(state, nomineeId);
  if (!nominator || !nominator.alive) return { ok: false, error: "Номинировать может только живой." };
  if (!nominee) return { ok: false, error: "Номинант не найден." };
  if (state.day.nominations.some((nomination) => nomination.nominatorId === nominator.id)) {
    return { ok: false, error: "Этот игрок уже номинировал сегодня." };
  }
  if (state.day.nominations.some((nomination) => nomination.nomineeId === nominee.id)) {
    return { ok: false, error: "Этого игрока уже номинировали сегодня." };
  }

  const virgin = nominee.roleId === "virgin" ? nominee : null;
  if (virgin && virgin.alive && !virgin.used.virgin) {
    const triggers = virginTriggers(state, virgin, nominator, options);
    virgin.used.virgin = true;
    if (triggers) {
      state.day.execution = {
        playerId: nominator.id,
        cause: "virgin",
        at: nowIso(),
        nominationId: null
      };
      state.day.ended = true;
      state.day.open = false;
      const death = kill(state, nominator.id, "execution", dayAt(state));
      state.executions.push({
        playerId: nominator.id,
        cause: "virgin",
        at: nowIso(),
        deathId: death ? death.id : null
      });
      if (death && roleTeam(nominator.roleId) === "demon") {
        resolveDemonDeath(state, {
          cause: "execution",
          livingBefore: death.livingBefore,
          at: dayAt(state)
        });
      }
      checkWin(state);
      addLog(state, {
        kind: "execution",
        title: "Девственница срабатывает",
        detail: nominator.name + " казнён сразу. День завершён."
      });
      return { ok: true, virgin: true, execution: state.day.execution };
    }
  }

  const nomination = {
    id: "nom-" + state.day.number + "-" + (state.day.nominations.length + 1),
    nominatorId: nominator.id,
    nomineeId: nominee.id,
    at: nowIso(),
    votes: [],
    count: 0,
    threshold: executionThreshold(livingPlayers(state).length),
    recorded: false,
    result: "pending",
    butlerWarning: []
  };
  state.day.nominations.push(nomination);
  state.day.activeNominationId = nomination.id;
  addLog(state, {
    kind: "nomination",
    title: nominator.name + " номинирует " + nominee.name,
    detail: "Порог: " + nomination.threshold + ".",
    playerId: nominee.id
  });
  return { ok: true, nomination };
}

export function recordVotes(state, nominationId, voterIds) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  if (state.phase !== "day") return { ok: false, error: "Сейчас не день." };
  const nomination = state.day.nominations.find((item) => item.id === nominationId);
  if (!nomination) return { ok: false, error: "Номинация не найдена." };
  if (nomination.recorded) return { ok: false, error: "Голоса уже записаны." };
  if (state.day.ended) return { ok: false, error: "День уже завершён." };

  const at = dayAt(state);
  const valid = new Set();
  const warnings = [];
  for (const rawId of voterIds || []) {
    const id = String(rawId);
    const player = playerById(state, id);
    if (!player) continue;
    if (player.alive) {
      valid.add(id);
      continue;
    }
    if (player.voteToken) {
      valid.add(id);
      player.voteToken = false;
    } else {
      warnings.push(player.name + ": голос мёртвого уже использован.");
    }
  }

  for (const player of livingPlayers(state)) {
    if (player.roleId !== "butler") continue;
    if (!valid.has(player.id)) continue;
    const master = butlerMaster(state, player.id, at);
    if (master && !valid.has(master)) {
      valid.delete(player.id);
      warnings.push("Дворецкий не голосует без своего хозяина. Это видит только ведущий.");
    }
  }

  const ordered = Array.from(valid).sort((a, b) => {
    if (a === nomination.nomineeId) return 1;
    if (b === nomination.nomineeId) return -1;
    return seatOf(state, a) - seatOf(state, b);
  });
  nomination.votes = ordered;
  nomination.count = ordered.length;
  nomination.threshold = executionThreshold(livingPlayers(state).length);
  nomination.recorded = true;
  nomination.result = ordered.length >= nomination.threshold ? "qualified" : "failed";
  nomination.butlerWarning = warnings;
  nomination.deadVoters = ordered.filter((id) => {
    const player = playerById(state, id);
    return player && !player.alive;
  });
  state.day.activeNominationId = null;
  addLog(state, {
    kind: "vote",
    title: "Голосование: " + nomination.count + " из " + nomination.threshold,
    detail: warnings.join(" "),
    playerId: nomination.nomineeId
  });
  return { ok: true, nomination };
}

export function cancelNomination(state, nominationId) {
  const nomination = state.day.nominations.find((item) => item.id === nominationId);
  if (!nomination) return { ok: false, error: "Номинация не найдена." };
  if (nomination.recorded) return { ok: false, error: "Голоса уже записаны. Используйте ручную правку." };
  state.day.nominations = state.day.nominations.filter((item) => item.id !== nominationId);
  if (state.day.activeNominationId === nominationId) state.day.activeNominationId = null;
  addLog(state, { secret: true, kind: "nomination", title: "Номинация отменена", detail: nomination.id });
  return { ok: true };
}

export function resetVotes(state, nominationId, reason) {
  if (!String(reason || "").trim()) return { ok: false, error: "Укажите причину." };
  const nomination = state.day.nominations.find((item) => item.id === nominationId);
  if (!nomination) return { ok: false, error: "Номинация не найдена." };
  if (!nomination.recorded) return { ok: false, error: "Голоса ещё не записаны." };
  if (state.day.execution) return { ok: false, error: "Казнь уже состоялась." };
  for (const id of nomination.deadVoters || []) {
    const player = playerById(state, id);
    if (player && !player.alive) player.voteToken = true;
  }
  nomination.votes = [];
  nomination.deadVoters = [];
  nomination.count = 0;
  nomination.recorded = false;
  nomination.result = "pending";
  nomination.butlerWarning = [];
  state.day.activeNominationId = nomination.id;
  addLog(state, {
    secret: true,
    kind: "correction",
    title: "Голоса возвращены на пересчёт",
    detail: reason
  });
  return { ok: true };
}

export function leader(state) {
  const recorded = state.day.nominations.filter((nomination) => nomination.recorded);
  if (!recorded.length) return { nomination: null };
  const max = Math.max(...recorded.map((nomination) => nomination.count));
  const top = recorded.filter((nomination) => nomination.count === max);
  if (top.length !== 1) {
    return { tie: true, count: max, nominations: top };
  }
  const nomination = top[0];
  if (nomination.count < nomination.threshold) {
    return {
      nomination,
      belowThreshold: true,
      count: nomination.count,
      threshold: nomination.threshold
    };
  }
  return { nomination, count: nomination.count, threshold: nomination.threshold };
}

function executePlayer(state, playerId, cause, at) {
  const player = playerById(state, playerId);
  if (!player) return null;
  const livingBefore = livingPlayers(state).length;
  const death = kill(state, playerId, "execution", at);
  state.executions.push({
    playerId,
    cause,
    at: nowIso(),
    deathId: death ? death.id : null
  });
  if (death && roleTeam(player.roleId) === "demon") {
    resolveDemonDeath(state, { cause: "execution", livingBefore, at });
  }
  return death;
}

export function execute(state, nominationId) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  if (state.phase !== "day") return { ok: false, error: "Сейчас не день." };
  if (state.day.execution) return { ok: false, error: "Сегодня уже была казнь." };
  if (state.day.ended) return { ok: false, error: "День уже завершён." };
  const current = leader(state);
  if (!current.nomination) return { ok: false, error: "Нет номинации с голосами." };
  if (current.tie) return { ok: false, error: "Ничья на максимуме: казни нет." };
  if (current.belowThreshold) return { ok: false, error: "Голосов меньше порога." };
  if (nominationId && current.nomination.id !== nominationId) {
    return { ok: false, error: "Казнить можно только единоличного лидера." };
  }

  const nomination = current.nomination;
  const nominee = playerById(state, nomination.nomineeId);
  state.day.execution = {
    playerId: nomination.nomineeId,
    cause: "vote",
    at: nowIso(),
    nominationId: nomination.id
  };
  state.day.ended = true;
  state.day.open = false;
  state.day.activeNominationId = null;

  const at = dayAt(state);
  const livingBefore = livingPlayers(state).length;
  const death = executePlayer(state, nomination.nomineeId, "vote", at);
  if (death && nominee && roleTeam(nominee.roleId) === "demon") {
    // executePlayer already resolved inheritance.
  }
  checkWin(state);
  addLog(state, {
    kind: "execution",
    title: "Казнь: " + (nominee ? nominee.name : "—"),
    detail: death
      ? "Казнён и умер."
      : "Игрок был уже мёртв: смерть не наступила.",
    playerId: nomination.nomineeId
  });
  return { ok: true, execution: state.day.execution, death, livingBefore };
}

export function executeByDecision(state, playerId) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  if (state.phase !== "day") return { ok: false, error: "Сейчас не день." };
  if (state.day.execution) return { ok: false, error: "Сегодня уже была казнь." };
  if (state.day.ended) return { ok: false, error: "День уже завершён." };
  const player = playerById(state, playerId);
  if (!player) return { ok: false, error: "Игрок не найден." };
  const at = dayAt(state);
  state.day.execution = {
    playerId,
    cause: "vote",
    at: nowIso(),
    nominationId: null,
    deathId: null
  };
  state.day.ended = true;
  state.day.open = false;
  state.day.activeNominationId = null;
  const death = executePlayer(state, playerId, "vote", at);
  state.day.execution.deathId = death ? death.id : null;
  checkWin(state);
  addLog(state, {
    kind: "execution",
    title: "Казнь: " + (player.name || "Игрок " + player.seat),
    detail: death ? "Казнён и умер." : "Игрок был уже мёртв: смерть не наступила.",
    playerId
  });
  return { ok: true, execution: state.day.execution, death };
}

export function endDay(state) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  if (state.phase !== "day") return { ok: false, error: "Сейчас не день." };

  if (!state.day.ended) {
    state.day.ended = true;
    state.day.open = false;
    state.day.activeNominationId = null;
    if (!state.day.execution) {
      checkWin(state, { endOfDay: true });
    }
  }
  if (state.winner) return { ok: true, winner: state.winner };

  const nextNight = Math.max(1, (state.night.number || state.day.number) + 1);
  state.night = { number: nextNight, queue: [], currentIndex: 0, demonChanged: false };
  state.day = {
    number: nextNight,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: false
  };
  state.phase = "night";
  state.night.queue = buildNightQueue(state);
  addLog(state, {
    kind: "phase",
    title: "Ночь " + nextNight,
    detail: "Город засыпает. Разбудите роли по порядку."
  });
  return { ok: true, night: state.night };
}

export function useSlayer(state, slayerId, targetId, options = {}) {
  if (state.winner) return { ok: false, error: "Игра уже окончена." };
  if (state.phase !== "day") return { ok: false, error: "Способность работает днём." };
  if (state.day.ended) return { ok: false, error: "День уже завершён." };
  const slayer = playerById(state, slayerId);
  if (!slayer || !slayer.alive || slayer.roleId !== "slayer") {
    return { ok: false, error: "Истребитель не может действовать." };
  }
  if (slayer.used.slayer) return { ok: false, error: "Истребитель уже использовал способность." };
  const target = playerById(state, targetId);
  if (!target) return { ok: false, error: "Цель не найдена." };

  slayer.used.slayer = true;
  const at = dayAt(state);
  addLog(state, {
    kind: "ability",
    title: "Истребитель выбирает " + target.name,
    detail: "Публичная попытка. Способность одноразовая."
  });

  if (isImpaired(state, slayerId, at)) {
    addLog(state, {
      secret: true,
      kind: "ability",
      title: "Истребитель: способность не сработала",
      detail: "Игрок был отравлен или пьян."
    });
    return { ok: true, hit: false, impaired: true };
  }

  const isDemon = roleTeam(target.roleId) === "demon"
    || (target.roleId === "recluse" && options.recluseRegistersDemon === true);
  if (!isDemon || !target.alive) {
    addLog(state, {
      kind: "ability",
      title: "Истребитель промахивается",
      detail: target.name + " не Демон (или уже мёртв)."
    });
    return { ok: true, hit: false };
  }

  const livingBefore = livingPlayers(state).length;
  const death = kill(state, target.id, "slayer", at);
  let inheritance = null;
  if (death && roleTeam(target.roleId) === "demon") {
    inheritance = resolveDemonDeath(state, {
      cause: "slayer",
      livingBefore,
      at
    });
  }
  checkWin(state);
  return { ok: true, hit: true, death, inheritance };
}

// ---------------------------------------------------------------------------
// Setup and secrets

export function setupErrors(state) {
  return bagErrors({
    count: state.setup.count,
    roles: state.setup.roles,
    bluffs: state.setup.bluffs,
    drunkShownId: state.setup.drunkShownId
  });
}

export function secretsErrors(state) {
  const errors = setupErrors(state);
  if (errors.length) return errors;
  if (state.phase === "setup") {
    errors.push({ code: "not-dealt", message: "Сначала раздайте роли." });
    return errors;
  }

  const players = orderedPlayers(state);
  // Setup secrets are needed only for the real role. A Drunk who was shown
  // this role wakes and receives false information; no real red herring is due.
  const has = (roleId) => players.some((player) => player.roleId === roleId);

  if (has("fortuneteller")) {
    const herring = state.setup.herringId ? playerById(state, state.setup.herringId) : null;
    if (!herring) {
      errors.push({ code: "herring", message: "Выберите красную селёдку Гадалки." });
    } else if (realTeamOf(herring) !== "good") {
      errors.push({ code: "herring-team", message: "Красная селёдка должна быть добрым игроком." });
    } else if (herring.roleId === "fortuneteller") {
      errors.push({ code: "herring-self", message: "Гадалка не может быть своей же ложной целью." });
    }
  }

  const infoChecks = [
    ["washerwoman", "townsfolk", "Прачка"],
    ["librarian", "outsider", "Библиотекарь"],
    ["investigator", "minion", "Сыщик"]
  ];
  for (const [roleId, team, label] of infoChecks) {
    if (!has(roleId)) continue;
    const info = state.setup.info[roleId];
    if (roleId === "librarian" && info && info.zero) {
      if (players.some((player) => roleTeam(player.roleId) === "outsider")) {
        errors.push({ code: "librarian-zero", message: "Библиотекарь не может узнать «ноль», если Изгои в игре есть." });
      }
      continue;
    }
    if (!info || !info.roleId || !Array.isArray(info.pair) || info.pair.length !== 2) {
      errors.push({ code: "info-" + roleId, message: label + ": выберите роль и двух игроков." });
      continue;
    }
    if (info.pair[0] === info.pair[1]) {
      errors.push({ code: "info-pair-" + roleId, message: label + ": нужны два разных игрока." });
    }
    if (!players.some((player) => player.id === info.pair[0]) || !players.some((player) => player.id === info.pair[1])) {
      errors.push({ code: "info-missing-" + roleId, message: label + ": один из игроков не найден." });
    }
    if (roleTeam(info.roleId) !== team) {
      errors.push({ code: "info-team-" + roleId, message: label + ": выбранная роль не того типа." });
    }
    if (!state.setup.roles.includes(info.roleId)) {
      errors.push({ code: "info-inplay-" + roleId, message: label + ": выбранная роль должна быть в игре." });
    }
    const infoTeam = roleTeam(info.roleId);
    const pairPlayers = info.pair.map((id) => playerById(state, id));
    const includesTrue = pairPlayers.some((player) => (
      player && (
        player.roleId === info.roleId
        || ((infoTeam === "townsfolk" || infoTeam === "outsider") && player.roleId === "spy")
        || (infoTeam === "minion" && player.roleId === "recluse")
      )
    ));
    if (!includesTrue) {
      errors.push({
        code: "info-true-" + roleId,
        message: label + ": хотя бы один из двух должен быть этой ролью или подходящей регистрацией."
      });
    }
  }

  const drunk = players.find((player) => player.roleId === "drunk");
  const mask = drunk && drunk.shownRoleId;
  const maskCheck = mask && infoChecks.find(([id]) => id === mask);
  if (maskCheck) {
    const info = state.setup.info[mask];
    const expectedTeam = maskCheck[1];
    const validPair = info && Array.isArray(info.pair) && info.pair.length === 2
      && info.pair[0] && info.pair[1] && info.pair[0] !== info.pair[1]
      && players.some((player) => player.id === info.pair[0])
      && players.some((player) => player.id === info.pair[1]);
    if (!info || !info.forDrunk || !info.roleId || !validPair) {
      errors.push({
        code: "drunk-info",
        message: "Пьяница: выберите ложную роль и двух игроков."
      });
    } else if (roleTeam(info.roleId) !== expectedTeam) {
      errors.push({
        code: "drunk-info-team",
        message: "Пьяница: ложная роль должна быть того же типа, что показанная роль."
      });
    }
  }
  return errors;
}

export function autoSecrets(state, options = {}) {
  const onlyMissing = options.onlyMissing === true;
  const players = orderedPlayers(state);
  const byTeam = (team) => players.filter((player) => roleTeam(player.roleId) === team);

  if (state.setup.roles.includes("fortuneteller") && (!onlyMissing || !state.setup.herringId)) {
    const good = players.filter((player) => realTeamOf(player) === "good" && player.roleId !== "fortuneteller");
    if (good.length) state.setup.herringId = good[0].id;
  }

  const pickPair = (truePlayer) => {
    const decoy = players.find((player) => player.id !== truePlayer.id);
    if (!decoy) return null;
    return {
      roleId: truePlayer.roleId,
      pair: [truePlayer.id, decoy.id],
      matchIndex: 0
    };
  };

  if (state.setup.roles.includes("washerwoman") && (!onlyMissing || !state.setup.info.washerwoman)) {
    const actor = players.find((player) => player.roleId === "washerwoman");
    const truePlayer = byTeam("townsfolk").find((player) => !actor || player.id !== actor.id)
      || byTeam("townsfolk")[0];
    if (truePlayer) state.setup.info.washerwoman = pickPair(truePlayer);
  }
  if (state.setup.roles.includes("librarian") && (!onlyMissing || !state.setup.info.librarian)) {
    const outsiders = byTeam("outsider");
    if (!outsiders.length) {
      state.setup.info.librarian = { zero: true, pair: [] };
    } else {
      state.setup.info.librarian = pickPair(outsiders[0]);
    }
  }
  if (state.setup.roles.includes("investigator") && (!onlyMissing || !state.setup.info.investigator)) {
    const minions = byTeam("minion");
    if (minions.length) state.setup.info.investigator = pickPair(minions[0]);
  }
  return state;
}

export function dealGame(state, options = {}) {
  const errors = setupErrors(state);
  if (errors.length) return { ok: false, errors };
  const roles = state.setup.roles.slice();
  const assignment = options.assignment || null;
  if (assignment) {
    for (const [id, roleId] of Object.entries(assignment)) {
      if (!state.players[id]) return { ok: false, error: "Место " + id + " не найдено." };
      if (!isTbRole(roleId)) return { ok: false, error: "Неизвестная роль: " + roleId };
    }
  }

  const shuffled = roles.slice();
  if (!assignment) {
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor((options.random || Math.random)() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
  }

  orderedPlayers(state).forEach((player, index) => {
    const roleId = assignment ? assignment[player.id] : shuffled[index];
    const shown = roleId === "drunk" ? state.setup.drunkShownId : roleId;
    player.roleId = roleId || null;
    player.shownRoleId = shown || null;
    player.team = roleId ? (roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good") : null;
    player.alive = true;
    player.claimed = false;
    player.reminders = [];
    player.used = {};
    player.voteToken = true;
    player.butlerMasterId = null;
    player.changedFrom = null;
    player.deadAt = null;
    player.notes = "";
  });

  state.bluffs = (state.setup.count >= 7 ? state.setup.bluffs : []).slice();
  state.herringId = null;
  state.setup.herringId = null;
  state.setup.info = { washerwoman: null, librarian: null, investigator: null };
  state.phase = "deal";
  state.night = { number: 1, queue: [], currentIndex: 0, demonChanged: false };
  state.day = {
    number: 1, morning: [], nominations: [], activeNominationId: null,
    execution: null, ended: false, open: false
  };
  state.deaths = [];
  state.executions = [];
  state.effects = [];
  state.winner = null;
  state.reviewOpen = false;
  state.publicRevealed = false;
  state.setup.ready = false;
  state.log = [];
  addLog(state, {
    kind: "setup",
    title: "Роли разданы",
    detail: "Передайте устройство по кругу. Не обсуждайте роли до конца первой ночи."
  });
  return { ok: true };
}

export function claimSeat(state, playerId, name) {
  const player = playerById(state, playerId);
  if (!player) return { ok: false, error: "Игрок не найден." };
  if (!player.roleId) return { ok: false, error: "Роль ещё не раздана." };
  if (player.claimed) return { ok: false, error: "Этот номер уже занят." };
  player.name = String(name || "").trim().slice(0, 24) || player.name;
  player.claimed = true;
  addLog(state, {
    secret: true,
    kind: "deal",
    title: "Место " + player.seat + " занято",
    detail: player.name,
    playerId: player.id
  });
  return { ok: true, player };
}

// ---------------------------------------------------------------------------
// Manual correction

export function manualCorrection(state, change) {
  const reason = String(change && change.reason || "").trim();
  if (!reason) return { ok: false, error: "Укажите причину ручной правки." };
  const at = nowIso();
  const player = change.playerId ? playerById(state, change.playerId) : null;
  const record = { at, reason, ...change };
  state.corrections.push(record);

  if (change.kind === "alive") {
    if (!player) return { ok: false, error: "Игрок не найден." };
    const alive = Boolean(change.value);
    if (alive && !player.alive) {
      player.alive = true;
      player.deadAt = null;
      player.voteToken = true;
    } else if (!alive && player.alive) {
      player.alive = false;
      player.deadAt = { phase: state.phase === "day" ? "day" : "night", number: currentAt(state).number, cause: "manual" };
      player.voteToken = true;
    }
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка: " + (alive ? "возвращён" : "отмечен мёртвым"),
      detail: player.name + ". Причина: " + reason,
      playerId: player.id
    });
    return { ok: true };
  }

  if (change.kind === "role") {
    if (!player) return { ok: false, error: "Игрок не найден." };
    const roleId = change.value;
    if (!isTbRole(roleId)) return { ok: false, error: "Неизвестная роль." };
    player.changedFrom = player.roleId;
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка роли",
      detail: player.name + ": " + roleLabel(roleId) + ". Причина: " + reason,
      playerId: player.id
    });
    return { ok: true };
  }

  if (change.kind === "shown") {
    if (!player) return { ok: false, error: "Игрок не найден." };
    if (!isTbRole(change.value) && change.value !== null) {
      return { ok: false, error: "Неизвестная роль." };
    }
    player.shownRoleId = change.value;
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка показанной роли",
      detail: player.name + ". Причина: " + reason,
      playerId: player.id
    });
    return { ok: true };
  }

  if (change.kind === "reminder") {
    if (!player) return { ok: false, error: "Игрок не найден." };
    const text = String(change.value || "").trim();
    if (!text) return { ok: false, error: "Пустое напоминание." };
    player.reminders = Array.isArray(player.reminders) ? player.reminders : [];
    if (change.remove) {
      player.reminders = player.reminders.filter((item) => item !== text);
    } else if (!player.reminders.includes(text)) {
      player.reminders.push(text);
    }
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка напоминаний",
      detail: player.name + ": " + text + ". Причина: " + reason,
      playerId: player.id
    });
    return { ok: true };
  }

  if (change.kind === "effect") {
    const effect = state.effects.find((item) => item.id === change.effectId);
    if (!effect) return { ok: false, error: "Эффект не найден." };
    effect.active = Boolean(change.value);
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Ручная правка эффекта",
      detail: effect.kind + ". Причина: " + reason
    });
    return { ok: true };
  }

  if (change.kind === "clear-winner") {
    state.winner = null;
    state.reviewOpen = false;
    state.publicRevealed = false;
    state.phase = state.day && state.day.number ? "day" : "night";
    addLog(state, {
      secret: true,
      kind: "correction",
      title: "Результат партии сброшен",
      detail: "Причина: " + reason
    });
    return { ok: true };
  }

  return { ok: false, error: "Неизвестный тип правки." };
}

export function skipStep(state, key, reason) {
  const step = state.night.queue.find((candidate) => candidate.key === key);
  if (!step) return { ok: false, error: "Шаг не найден." };
  if (step.done) return { ok: false, error: "Шаг уже выполнен." };
  if (!String(reason || "").trim()) return { ok: false, error: "Укажите причину пропуска." };
  step.skipped = true;
  step.done = true;
  step.note = "Пропущено: " + reason;
  addLog(state, {
    secret: true,
    kind: "night",
    title: "Шаг пропущен",
    detail: (step.roleId || step.system || "") + ": " + reason
  });
  appendConditionalSteps(state);
  checkWin(state);
  return { ok: true, step };
}

export function currentStep(state) {
  return state.night.queue.find((step) => !step.done && !step.skipped) || null;
}

export function stepProgress(state) {
  const total = state.night.queue.length;
  const done = state.night.queue.filter((step) => step.done || step.skipped).length;
  return { done, total };
}

export function bagSummary(state) {
  return {
    count: state.setup.count,
    required: compositionFor(state.setup.count, state.setup.roles),
    errors: setupErrors(state),
    secrets: secretsErrors(state)
  };
}
