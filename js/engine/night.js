// Trouble Brewing domain: night. No DOM or persistence.
import { isBmrScript, isManualScript, isSnvScript, nightSequence, roleLabel, roleTeam } from "../rules.js";
import { effectiveRoleId, livingPlayers, nowIso, orderedPlayers, playerById, seatName } from "../model.js";

import { nightAt, addLog } from "./context.js";
import { isImpaired } from "./effects.js";
import { infoForStep } from "./information.js";
import { resolveAttack, checkWin } from "./death.js";
import { secretsErrors, setupErrors } from "./setup.js";
import { appendBmrConditionalSteps, bmrInfoForStep, buildBmrNightQueue, completeBmrStep } from "./bmr.js";
import { appendSvConditionalSteps, buildSvNightQueue, completeSvStep } from "./sv.js";

export function stepKey(state, sequenceIndex, roleId, actorId) {
  return [
    "n" + nightAt(state).number,
    sequenceIndex,
    roleId || "system",
    actorId || "all"
  ].join("-");
}


export function targetModeFor(roleId) {
  if (roleId === "poisoner" || roleId === "imp" || roleId === "ravenkeeper") return "one-any";
  if (roleId === "monk" || roleId === "butler") return "one-other";
  if (roleId === "fortuneteller") return "two";
  return "none";
}


export function infoKindFor(roleId) {
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


export function makeRoleStep(state, sequenceIndex, roleId, actor, extra = {}) {
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


export function makeSystemStep(state, sequenceIndex, system, extra = {}) {
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
  // Manual-only games have no automatic night steps. The host resolves every
  // ability and records deaths and changes through corrections.
  if (isManualScript(state.script)) return [];
  if (isBmrScript(state.script)) return buildBmrNightQueue(state);
  if (isSnvScript(state.script)) return buildSvNightQueue(state);
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
    if (step.roleId === "ravenkeeper" || step.roleId === "moonchild" || step.roleId === "grandmother"
      || step.roleId === "barber" || step.roleId === "sweetheart" || step.roleId === "sage") continue;
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
  if (isBmrScript(state.script)) {
    appendBmrConditionalSteps(state);
    pruneDeadSteps(state);
    return;
  }
  if (isSnvScript(state.script)) {
    appendSvConditionalSteps(state);
    pruneDeadSteps(state);
    return;
  }
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
  if (state.winner) return { ok: false, errorCode: "error.6", error: "Игра уже окончена." };
  if (state.phase === "night" && state.night.queue.length) {
    return { ok: true, queue: state.night.queue, resumed: true };
  }
  const errors = isManualScript(state.script) ? setupErrors(state) : secretsErrors(state);
  if (errors.length) return { ok: false, errors };
  if (!state.setup.roles.length) return { ok: false, errorCode: "error.34", error: "Сначала раздайте роли." };
  if (!orderedPlayers(state).every((player) => player.roleId)) {
    return { ok: false, errorCode: "error.35", error: "Раздайте роли всем игрокам." };
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
  if (!step) return { ok: false, errorCode: "error.36", error: "Шаг не найден." };
  if (step.done) return { ok: false, errorCode: "error.37", error: "Этот шаг уже выполнен." };
  if (state.winner) return { ok: false, errorCode: "error.6", error: "Игра уже окончена." };

  const at = nightAt(state);
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const targets = Array.isArray(options.targetIds) ? options.targetIds.map(String) : [];
  if (actor && !actor.alive && step.roleId !== "ravenkeeper") {
    step.done = true;
    step.skipped = true;
    step.note = "Игрок погиб до своего шага.";
    return { ok: false, errorCode: "error.38", error: "Игрок погиб до своего шага." };
  }

  if (step.bmr || step.sv) {
    if (targets.length < (step.minTargets || 0) || targets.length > (step.maxTargets || 0)) {
      return {
        ok: false,
        errorCode: "error.39",
        error: "Нужно выбрать от " + (step.minTargets || 0) + " до " + (step.maxTargets || 0) + " целей."
      };
    }
    if (step.sv && ["dreamer", "seamstress"].includes(step.roleId)
      && targets.includes(step.actorId)) {
      return { ok: false, errorCode: "error.40", error: "Нельзя выбрать себя." };
    }
  } else if (!step.sv && step.targetMode === "one-any" && targets.length !== 1) {
    return { ok: false, errorCode: "error.39", error: "Выберите одну цель." };
  }
  if (!step.bmr && step.targetMode === "one-other" && targets.length !== 1) {
    return { ok: false, errorCode: "error.39", error: "Выберите одну цель." };
  }
  if (!step.bmr && !step.sv && step.targetMode === "one-other" && targets[0] === step.actorId) {
    return { ok: false, errorCode: "error.40", error: "Нельзя выбрать себя." };
  }
  for (const id of targets) {
    if (!playerById(state, id)) return { ok: false, errorCode: "error.31", error: "Цель не найдена." };
  }
  if (!step.bmr && !step.sv && step.targetMode === "two") {
    if (targets.length !== 2) return { ok: false, errorCode: "error.41", error: "Выберите двух разных игроков." };
    if (targets[0] === targets[1]) return { ok: false, errorCode: "error.42", error: "Нужны два разных игрока." };
  }

  if (step.kind === "system") {
    return completeSystemStep(state, step, options);
  }

  if (step.sv) {
    if (step.infoKind !== "none") {
      const info = infoForStep(state, step, options);
      step.given = options.given || info;
    }
    completeSvStep(state, step, options);
    return finishStep(state, step, options, targets, at);
  }

  if (step.bmr) {
    if (step.infoKind !== "none") {
      const info = infoForStep(state, step, options);
      if (info.needsChoice && !options.given) return { ok: false, needsChoice: true, info };
      step.given = options.given || info;
    }
    const actor = step.actorId ? playerById(state, step.actorId) : null;
    if (step.roleId === "grandmother" && step.kind === "role" && nightAt(state).number === 1) {
      state.setup.grandmotherId = targets[0] || null;
    }
    if (step.roleId === "lunatic" && actor && targets[0]) {
      actor.used = actor.used || {};
      actor.used.lunaticTarget = targets[0];
    }
    completeBmrStep(state, step, options);
    return finishStep(state, step, options, targets, at);
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
        errorCode: "error.43", error: "Выберите, умирает Мэр, кто-то вместо него или никто."
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
      return { ok: false, needsSetup: true, info, errorCode: "error.44", error: "Секретная информация ещё не настроена." };
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


export function finishStep(state, step, options, targets, at) {
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


export function completeSystemStep(state, step, options) {
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


export function endNight(state) {
  if (state.winner) return { ok: false, errorCode: "error.6", error: "Игра уже окончена." };
  const pending = demonChangePending(state);
  if (pending) return { ok: false, errorCode: "error.45", error: "Сначала выберите наследника Демона." };
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
  if (!isManualScript(state.script)) checkWin(state);
  return { ok: true, day: state.day };
}


export function skipStep(state, key, reason) {
  const step = state.night.queue.find((candidate) => candidate.key === key);
  if (!step) return { ok: false, errorCode: "error.36", error: "Шаг не найден." };
  if (step.done) return { ok: false, errorCode: "error.46", error: "Шаг уже выполнен." };
  if (!String(reason || "").trim()) return { ok: false, errorCode: "error.47", error: "Укажите причину пропуска." };
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

