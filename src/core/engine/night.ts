import type { DeadAt, GameState, NightStep, Player, RoleId } from "../model/types.ts";
import {
  caseForStep,
  describeGiven,
  describeRegistrations,
  givenIsLegal,
  recordHostChoice,
  registrationError,
} from "./host-choice.ts";

type NightOptions = {
  given?: Record<string, unknown>;
  redirectId?: string | null;
  registrations?: Record<string, string>;
  targetIds?: string[];
  resurrectId?: string | null;
  roleId?: RoleId | null;
  drunkId?: string | null;
  deathIds?: string[];
};

const givenRejected = (info: unknown) => ({
  ok: false as const,
  needsChoice: true,
  info,
  errorCode: "error.66",
  error: "Выберите один из предложенных вариантов.",
});

type PendingChoice = { caseId: Parameters<typeof recordHostChoice>[1]; detail: string };

// The host answer must be one of the offered options. Validation happens before
// any mutation; the journal line is written only after the step succeeds.
function validateGiven(
  state: GameState,
  step: NightStep,
  info: { kind?: string; needsChoice?: boolean; options?: unknown[]; impaired?: boolean },
  options: NightOptions,
  version?: string,
): { rejection: Record<string, unknown> } | { pending: PendingChoice | null } {
  const hasOptions = Array.isArray(info.options) && info.options.length > 0;
  const pairKind = info.kind === "role-pair" || info.kind === "player-pair";
  // A checked pair without a legal option must not fall through to the
  // free-text path: an empty list can never admit an answer.
  if (pairKind && info.needsChoice && !hasOptions) {
    return { rejection: givenRejected(info) };
  }
  if (info.needsChoice && !options.given) {
    return { rejection: { ok: false as const, needsChoice: true, info } };
  }
  if (hasOptions && options.given && !givenIsLegal(info, options.given)) {
    return { rejection: givenRejected(info) };
  }
  step.given = options.given || info;
  if (hasOptions && options.given) {
    return {
      pending: {
        caseId: caseForStep(step, info, version),
        detail: describeGiven(options.given, state),
      },
    };
  }
  return { pending: null };
}

function recordPending(
  state: GameState,
  pending: PendingChoice | null,
  step: NightStep,
  ports: CommandExecutionContext,
): void {
  if (pending) recordHostChoice(state, pending.caseId, pending.detail, step.actorId || null, ports);
}

// Trouble Brewing domain: night. No DOM or persistence.
import {
  isBmrScript,
  isManualScript,
  isSnvScript,
  nightSequence,
  roleLabel,
  roleTeam,
} from "../model/rules.ts";
import {
  effectiveRoleId,
  livingPlayers,
  nowIso,
  orderedPlayers,
  playerById,
  realTeamOf,
  registersAlive,
  seatName,
} from "../model/state.ts";

import { nightAt, addLog, insertStepInto, setStepNote } from "./context.ts";
import { lifecycleGuard } from "./lifecycle.ts";
import { rejectsMandatorySkip } from "./command-versions.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { systemPorts } from "../model/ports.ts";
import { applyRoleAbility } from "./ability.ts";
import type { AttackResult } from "./ability.ts";
import { isImpaired } from "./effects.ts";

import { infoForStep } from "./information.ts";
import { checkWin, evilTwinPartnerMissing } from "./death.ts";
import { secretsErrors, setupErrors } from "./setup.ts";
import {
  appendBmrConditionalSteps,
  applyBmrGoonTrigger,
  buildBmrNightQueue,
  completeBmrStep,
} from "./bmr.ts";
import { appendSvConditionalSteps, buildSvNightQueue, completeSvStep } from "./sv.ts";
import { minionRetainsAbility } from "./retention.ts";
import { informationOf, nightResolverFor, nightStepFor } from "../roles/night-step.ts";
import { roleModule } from "../roles/registry.ts";

// Steps kept when their owner dies: the dead actor may still complete them.
const DEATH_TRIGGERED: Record<string, true> = {
  ravenkeeper: true,
  grandmother: true,
  moonchild: true,
  barber: true,
  sweetheart: true,
  sage: true,
  klutz: true,
};

export function stepKey(
  state: GameState,
  sequenceIndex: number,
  roleId: RoleId | null,
  actorId: string | null,
): string {
  return ["n" + nightAt(state).number, sequenceIndex, roleId || "system", actorId || "all"].join(
    "-",
  );
}

/** The target count a step takes; mirrors the bounds the completion check enforces. */
export interface TargetBounds {
  min: number;
  max: number;
}

export function targetBounds(step: NightStep): TargetBounds {
  const min =
    step.bmr || step.sv
      ? step.minTargets || 0
      : step.targetMode === "none"
        ? 0
        : step.targetMode === "two"
          ? 2
          : 1;
  return { min, max: step.bmr || step.sv ? step.maxTargets || 0 : min };
}

export function makeRoleStep(
  state: GameState,
  sequenceIndex: number,
  roleId: RoleId,
  actor: Player | null,
  extra: Record<string, unknown> = {},
): NightStep {
  const declared = nightStepFor(roleModule(roleId), nightAt(state).number);
  return {
    key: stepKey(state, sequenceIndex, roleId, actor ? actor.id : null),
    kind: "role",
    roleId,
    actorId: actor ? actor.id : null,
    actorName: actor ? actor.name : "",
    actorAlive: actor ? actor.alive : false,
    order: sequenceIndex,
    targetMode: declared?.target ?? "none",
    // A role declares the shape of its answer with its step.
    infoKind: declared?.infoKind ?? "none",
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
    ...extra,
  };
}

export function makeSystemStep(
  state: GameState,
  sequenceIndex: number,
  system: string,
  extra: Record<string, unknown> = {},
): NightStep {
  return {
    key: stepKey(state, sequenceIndex, system, null),
    kind: "system",
    system,
    roleId: null,
    actorId: null,
    actorIds: [],
    order: sequenceIndex,
    targetMode: "none",
    infoKind:
      system === "demonchange"
        ? "note"
        : system === "minioninfo"
          ? "minion-info"
          : system === "demoninfo"
            ? "demon-info"
            : "none",
    targetIds: [],
    given: null,
    result: null,
    note: null,
    pending: null,
    done: false,
    skipped: false,
    completedAt: null,
    ...extra,
  };
}

export function demonChangePending(state: GameState): NightStep | null {
  return (
    state.night.queue.find((step) => step.pending && step.pending.kind === "demon-inheritance") ||
    null
  );
}

export function buildNightQueue(
  state: GameState,
  ports: CommandExecutionContext = systemPorts,
): NightStep[] {
  // Manual-only games have no automatic night steps. The host resolves every
  // ability and records deaths and changes through corrections.
  if (isManualScript(state.script)) return [];
  if (isBmrScript(state.script)) return buildBmrNightQueue(state, ports);
  if (isSnvScript(state.script)) return buildSvNightQueue(state);
  const night = nightAt(state).number;
  const sequence = nightSequence(night);
  const steps: NightStep[] = [];
  const size = orderedPlayers(state).length;
  const living = livingPlayers(state);

  sequence.forEach((roleId, index) => {
    if (roleId === "minioninfo") {
      if (night !== 1 || size < 7) return;
      const minions = living.filter((p) => roleTeam(p.roleId || "") === "minion");
      const demon = living.find((p) => roleTeam(p.roleId || "") === "demon");
      if (!minions.length || !demon) return;
      steps.push(
        makeSystemStep(state, index, "minioninfo", {
          actorIds: minions.map((p) => p.id),
          demonId: demon.id,
        }),
      );
      return;
    }

    if (roleId === "demoninfo") {
      if (night !== 1 || size < 7) return;
      const demon = living.find((p) => roleTeam(p.roleId || "") === "demon");
      if (!demon) return;
      steps.push(
        makeSystemStep(state, index, "demoninfo", {
          actorIds: [demon.id],
          demonId: demon.id,
          bluffs: (state.bluffs || []).slice(),
        }),
      );
      return;
    }

    const spec = nightStepFor(roleModule(roleId), night);
    if (!spec) return;
    const actor = spec.actor
      ? spec.actor(state, night)
      : (living.find((p) => effectiveRoleId(p) === roleId) ?? null);
    if (!actor) return;
    steps.push(makeRoleStep(state, index, roleId, actor, spec.extra?.(state, night) ?? {}));
  });

  return steps;
}

export function insertStepByOrder(state: GameState, step: NightStep) {
  insertStepInto(state.night.queue, step);
}

export function pruneDeadSteps(state: GameState, ports: CommandExecutionContext) {
  for (const step of state.night.queue) {
    if (step.done || step.skipped) continue;
    if (!step.actorId) continue;
    if (DEATH_TRIGGERED[step.roleId || ""]) continue;
    const actor = playerById(state, step.actorId);
    if (!actor || actor.alive) continue;
    if (minionRetainsAbility(state, actor.id)) continue;
    step.done = true;
    step.skipped = true;
    if (step.roleId === "mathematician") state.abnormal = [];
    setStepNote(step, "note.actorDied", null, "Игрок погиб до своего шага.");
    addLog(
      state,
      {
        secret: true,
        kind: "night",
        title: "Шаг пропущен: " + (step.roleId ? roleLabel(step.roleId) : "система"),
        detail: (actor ? actor.name : "Игрок") + " погиб до пробуждения.",
      },
      ports,
    );
  }
}

export function appendConditionalSteps(
  state: GameState,
  ports: CommandExecutionContext = systemPorts,
) {
  if (isBmrScript(state.script)) {
    appendBmrConditionalSteps(state, ports);
    pruneDeadSteps(state, ports);
    return;
  }
  if (isSnvScript(state.script)) {
    appendSvConditionalSteps(state);
    pruneDeadSteps(state, ports);
    return;
  }
  const night = nightAt(state).number;
  const queue = state.night.queue;

  const ravenkeeper = orderedPlayers(state).find(
    (p) =>
      effectiveRoleId(p) === "ravenkeeper" &&
      !p.alive &&
      p.deadAt &&
      p.deadAt.phase === "night" &&
      p.deadAt.number === night,
  );
  if (
    ravenkeeper &&
    !queue.some((step) => step.roleId === "ravenkeeper" && step.actorId === ravenkeeper.id)
  ) {
    const sequence = nightSequence(night);
    const order = sequence.indexOf("ravenkeeper");
    const step = makeRoleStep(state, order, "ravenkeeper", ravenkeeper, {
      actorAlive: false,
      deadTonight: true,
    });
    insertStepByOrder(state, step);
  }

  if (state.night.demonChanged && !queue.some((step) => step.system === "demonchange")) {
    const impIndex = queue.findIndex((step) => step.roleId === "imp");
    const order = impIndex === -1 ? 100 : (queue[impIndex]!.order || 0) + 0.5;
    insertStepByOrder(
      state,
      makeSystemStep(state, order, "demonchange", {
        note: "Демон сменился. Разбудите нового Демона и покажите жетон Чёрта. Новый Демон не действует этой ночью повторно.",
        noteKey: "note.demonChanged",
      }),
    );
  }
  pruneDeadSteps(state, ports);
}

export function startNight(state: GameState, ports: CommandExecutionContext = systemPorts) {
  const guard = lifecycleGuard(state, "startNight");
  if (guard) return guard;
  if (state.phase === "night" && state.night.queue.length) {
    return { ok: true, queue: state.night.queue, resumed: true };
  }
  const errors = isManualScript(state.script) ? setupErrors(state) : secretsErrors(state);
  if (errors.length) return { ok: false, errors };
  if (!state.setup.roles.length)
    return { ok: false, errorCode: "error.34", error: "Сначала раздайте роли." };
  if (!orderedPlayers(state).every((player) => player.roleId)) {
    return { ok: false, errorCode: "error.35", error: "Раздайте роли всем игрокам." };
  }

  if (!state.night.number || state.night.number < 1) state.night.number = 1;
  state.phase = "night";
  state.day.number = state.night.number;
  state.night.demonChanged = false;
  state.night.queue = buildNightQueue(state, ports);
  state.night.currentIndex = 0;
  state.setup.ready = true;
  addLog(
    state,
    {
      kind: "phase",
      title: "Ночь " + state.night.number,
      detail: "Разбудите роли по порядку. Не называйте роли вслух.",
    },
    ports,
  );
  return { ok: true, queue: state.night.queue };
}

export function completeStep(
  state: GameState,
  key: string,
  options: NightOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "completeStep");
  if (guard) return guard;
  const step = state.night.queue.find((candidate) => candidate.key === key);
  if (!step) return { ok: false, errorCode: "error.36", error: "Шаг не найден." };
  if (step.done) return { ok: false, errorCode: "error.37", error: "Этот шаг уже выполнен." };
  const badRegistration = registrationError(state, options.registrations);
  if (badRegistration) {
    return { ok: false, errorCode: "error.67", error: badRegistration };
  }

  const at = nightAt(state);
  const actor = (step.actorId ? playerById(state, step.actorId) : null) as Player;
  let targets = Array.isArray(options.targetIds) ? options.targetIds.map(String) : [];
  if (step.roleId === "moonchild") {
    // The public choice made when the Moonchild died is the only legal target.
    // A missing target reuses the record; a different one is a rejection.
    const recorded = Array.isArray(step.targetIds) ? step.targetIds.map(String) : [];
    if (recorded.length) {
      if (!targets.length) {
        targets = recorded.slice();
        options = { ...options, targetIds: targets.slice() };
      } else if (
        targets.length !== recorded.length ||
        targets.some((id, index) => id !== recorded[index])
      ) {
        return {
          ok: false,
          errorCode: "error.51",
          error: "Цель не совпадает с публичным выбором Дитя Луны.",
        };
      }
    }
  }
  if (
    actor &&
    !actor.alive &&
    !DEATH_TRIGGERED[step.roleId || ""] &&
    !minionRetainsAbility(state, actor.id)
  ) {
    step.done = true;
    step.skipped = true;
    setStepNote(step, "note.actorDied", null, "Игрок погиб до своего шага.");
    return { ok: false, errorCode: "error.38", error: "Игрок погиб до своего шага." };
  }

  if (step.bmr || step.sv) {
    if (targets.length < (step.minTargets || 0) || targets.length > (step.maxTargets || 0)) {
      return {
        ok: false,
        errorCode: "error.39",
        error:
          "Нужно выбрать от " +
          (step.minTargets || 0) +
          " до " +
          (step.maxTargets || 0) +
          " целей.",
      };
    }
    if (
      step.sv &&
      step.roleId != null &&
      ["dreamer", "seamstress"].includes(step.roleId) &&
      step.actorId != null &&
      targets.includes(step.actorId)
    ) {
      return { ok: false, errorCode: "error.40", error: "Нельзя выбрать себя." };
    }
  } else if (!step.sv && step.targetMode === "one-any" && targets.length !== 1) {
    return { ok: false, errorCode: "error.39", error: "Выберите одну цель." };
  }
  if (!step.bmr && step.targetMode === "one-other" && targets.length !== 1) {
    return { ok: false, errorCode: "error.39", error: "Выберите одну цель." };
  }
  if (!step.bmr && !step.sv && step.targetMode === "one-other" && targets[0]! === step.actorId) {
    return { ok: false, errorCode: "error.40", error: "Нельзя выбрать себя." };
  }
  for (const id of targets) {
    if (!playerById(state, id))
      return { ok: false, errorCode: "error.31", error: "Цель не найдена." };
  }
  // Bad Moon Rising target text: Sailor r1768 and Devil's Advocate r2594 choose
  // an alive/living player, Chambermaid r2966 chooses 2 alive players (not
  // themself). A registered-dead Zombuul counts as dead for the ability.
  const registeredLiving = (id: string): boolean => registersAlive(playerById(state, id));
  if (
    step.bmr &&
    (step.roleId === "sailor" || step.roleId === "devilsadvocate") &&
    targets.some((id) => !registeredLiving(id))
  ) {
    return { ok: false, errorCode: "error.55", error: "Нельзя выбрать мёртвого игрока." };
  }
  if (step.bmr && step.roleId === "chambermaid") {
    if (step.actorId != null && targets.includes(step.actorId)) {
      return { ok: false, errorCode: "error.40", error: "Нельзя выбрать себя." };
    }
    if (targets.some((id) => !registeredLiving(id))) {
      return { ok: false, errorCode: "error.55", error: "Нельзя выбрать мёртвого игрока." };
    }
  }
  if (step.previousTarget && targets.includes(step.previousTarget)) {
    return {
      ok: false,
      errorCode: "error.50",
      error: "Нельзя выбрать ту же цель, что в прошлую ночь.",
    };
  }
  if (!step.bmr && !step.sv && step.targetMode === "two") {
    if (targets.length !== 2)
      return { ok: false, errorCode: "error.41", error: "Выберите двух разных игроков." };
    if (targets[0]! === targets[1])
      return { ok: false, errorCode: "error.42", error: "Нужны два разных игрока." };
  }

  if (step.kind === "system") {
    return completeSystemStep(state, step, options, ports);
  }

  if (step.sv) {
    let pending: PendingChoice | null = null;
    if (step.infoKind !== "none") {
      const checked = validateGiven(
        state,
        step,
        infoForStep(state, step, options, ports),
        options,
        ports.rulesetVersion,
      );
      if ("rejection" in checked) return checked.rejection;
      pending = checked.pending;
    }
    const result = completeSvStep(state, step, options, ports);
    if (result && result.ok === false) return result;
    const finished = finishStep(state, step, options, targets, at, ports);
    recordPending(state, pending, step, ports);
    return finished;
  }

  if (step.bmr) {
    if (step.roleId === "professor" && targets[0]) {
      const target = playerById(state, targets[0]);
      if (target && target.alive) {
        return {
          ok: false,
          errorCode: "error.professor-dead-only",
          error: "Профессор выбирает мёртвого игрока.",
        };
      }
    }
    if (step.roleId === "sailor" || step.roleId === "innkeeper") {
      const legalDrunk = step.roleId === "sailor" ? [step.actorId, ...targets] : targets;
      const holder = step.actorId ? playerById(state, step.actorId) : null;
      const functioning = holder ? !isImpaired(state, holder.id, at) : false;
      if (functioning && !options.drunkId) {
        return {
          ok: false,
          errorCode: "error.drunk-required",
          error: "Выберите, кто из выбранных игроков пьян.",
        };
      }
      if (options.drunkId != null && !legalDrunk.includes(options.drunkId)) {
        return {
          ok: false,
          errorCode: "error.drunk-recipient",
          error: "Пьяным становится только один из выбранных игроков.",
        };
      }
    }
    let pending: PendingChoice | null = null;
    if (step.infoKind !== "none") {
      // A note-only Bad Moon Rising answer is free-form narration; a step that
      // computes options is held to them like every other information step.
      const checked = validateGiven(
        state,
        step,
        infoForStep(state, step, options, ports),
        options,
        ports.rulesetVersion,
      );
      if ("rejection" in checked) return checked.rejection;
      pending = checked.pending;
    }
    const actor = step.actorId ? playerById(state, step.actorId) : null;
    // The Goon makes its first chooser drunk immediately, before the ability
    // resolves. Apply it after the information gate so a rejected completion
    // does not leave a half-applied effect.
    applyBmrGoonTrigger(state, step, targets, ports);
    if (step.roleId === "grandmother" && step.kind === "role" && nightAt(state).number === 1) {
      const grandchild = targets[0] ? playerById(state, targets[0]) : null;
      const team = grandchild ? roleTeam(grandchild.roleId || "") : "";
      if (
        !grandchild ||
        realTeamOf(grandchild) === "evil" ||
        (team !== "townsfolk" && team !== "outsider")
      ) {
        return {
          ok: false,
          errorCode: "error.grandchild",
          error: "Внук должен быть добрым Горожанином или Изгоем.",
        };
      }
      state.setup.grandmotherId = grandchild.id;
    }
    if (step.roleId === "lunatic" && actor && targets[0]! && nightAt(state).number > 1) {
      actor.used = actor.used || {};
      actor.used.lunaticTarget = targets[0]!;
      actor.used.lunaticTargetNight = nightAt(state).number;
    }
    completeBmrStep(state, step, options, ports);
    const finished = finishStep(state, step, options, targets, at, ports);
    recordPending(state, pending, step, ports);
    return finished;
  }

  const role = step.roleId;

  const module = role ? roleModule(role) : null;
  if (module && nightResolverFor(module, at.number)) {
    // A migrated role never falls through to the branches below, so a missing
    // resolution is a visible test failure instead of a silent fallback.
    const outcome = applyRoleAbility(
      state,
      module,
      step,
      targets,
      at,
      { redirectId: options.redirectId || null },
      ports,
    );
    if (outcome.kind === "needs-redirect") {
      return {
        ok: false,
        needsRedirect: true,
        options: outcome.options,
        errorCode: "error.43",
        error: "Выберите, умирает Мэр, кто-то вместо него или никто.",
      };
    }
    if (outcome.kind === "attack") {
      return finishAttackStep(state, step, options, outcome.attack, outcome.title, ports);
    }
    return finishStep(state, step, options, targets, at, ports);
  }

  // A role that owns its answer is an information step by its declaration.
  if (informationOf(module)) {
    const info = infoForStep(state, step, options, ports);
    if (info.missing) {
      return {
        ok: false,
        needsSetup: true,
        info,
        errorCode: "error.44",
        error: "Секретная информация ещё не настроена.",
      };
    }
    if (info.kind === "grimoire") {
      // The Grimoire is shown, not told. No answer can stand in its place, so
      // one sent with the step is not stored.
      step.given = info;
      return finishStep(state, step, options, targets, at, ports);
    }
    const checked = validateGiven(state, step, info, options, ports.rulesetVersion);
    if ("rejection" in checked) return checked.rejection;
    const finished = finishStep(state, step, options, targets, at, ports);
    recordPending(state, checked.pending, step, ports);
    return finished;
  }

  return finishStep(state, step, options, targets, at, ports);
}

/**
 * Completes a step whose ability was an attack. The attack keeps its own
 * record, which differs from the shared one: the outcome is the step result,
 * the note names the victim or the reason nobody died, and the secret log line
 * carries the title the role gave and a `prevented` mark when nobody died.
 */
function finishAttackStep(
  state: GameState,
  step: NightStep,
  options: NightOptions,
  attack: AttackResult,
  title: string,
  ports: CommandExecutionContext,
) {
  step.result = attack;
  // The redirect is a Storyteller decision: it belongs in the secret journal
  // even though this path completes the step itself.
  if (options.redirectId) {
    recordHostChoice(
      state,
      "mayor-redirect",
      seatName(state, String(options.redirectId)),
      step.actorId || null,
      ports,
    );
  }
  if (attack.noDeath) {
    step.note = attack.reason || "";
  } else {
    setStepNote(
      step,
      "note.impKilled",
      { name: seatName(state, attack.deathId || "") },
      "Погиб: " + seatName(state, attack.deathId || "") + ".",
    );
  }
  step.done = true;
  step.completedAt = nowIso(ports);
  step.given = null;
  addLog(
    state,
    {
      secret: true,
      kind: "night",
      title,
      detail: step.note || "",
      ...(attack.noDeath ? { consequence: "prevented" as const } : {}),
    },
    ports,
  );
  appendConditionalSteps(state, ports);
  if (attack.pendingInheritance) {
    step.pending = attack.pendingInheritance;
  }
  checkWin(state, {}, ports);
  return { ok: true, step, result: step.result };
}

export function finishStep(
  state: GameState,
  step: NightStep,
  options: NightOptions,
  targets: string[],
  at: DeadAt,
  ports: CommandExecutionContext,
) {
  step.targetIds = targets.slice();
  step.registrations = options.registrations || {};
  if (Object.keys(step.registrations).length) {
    recordHostChoice(
      state,
      "registration",
      describeRegistrations(state, step.registrations),
      step.actorId || null,
      ports,
    );
  }
  if (options.redirectId) {
    recordHostChoice(
      state,
      "mayor-redirect",
      seatName(state, String(options.redirectId)),
      step.actorId || null,
      ports,
    );
  }
  step.impaired = step.actorId ? isImpaired(state, step.actorId, at) : false;
  step.done = true;
  step.completedAt = nowIso(ports);
  if (!step.note) setStepNote(step, "note.finished", null, "Шаг выполнен.");
  const line = addLog(
    state,
    {
      secret: true,
      kind: "night",
      title: (step.roleId ? roleLabel(step.roleId) : step.system) || "Ночной шаг",
      detail: step.note ?? "",
    },
    ports,
  );
  // The console renders the localized note, role and phase instead of the
  // Russian detail, title and prefix.
  if (step.roleId) line.roleId = step.roleId;
  line.phaseCode = "night";
  line.phaseNumber = nightAt(state).number;
  if (step.noteKey) {
    line.noteKey = step.noteKey;
    line.noteVars = step.noteVars ?? null;
  }
  appendConditionalSteps(state, ports);
  checkWin(state, {}, ports);
  return { ok: true, step };
}

export function completeSystemStep(
  state: GameState,
  step: NightStep,
  _options: NightOptions,
  ports: CommandExecutionContext = systemPorts,
) {
  if (step.system === "demonchange") {
    step.done = true;
    step.completedAt = nowIso(ports);
    step.given = { kind: "note", text: step.note || "Демон сменился." };
    addLog(
      state,
      {
        secret: true,
        kind: "night",
        title: "Смена Демона",
        detail: step.note || "Демон сменился.",
      },
      ports,
    );
    return { ok: true, step };
  }
  step.done = true;
  step.completedAt = nowIso(ports);
  if (step.system === "minioninfo") {
    step.given = { kind: "minion-info", demonId: step.demonId, actorIds: step.actorIds };
  } else if (step.system === "demoninfo") {
    step.given = {
      kind: "demon-info",
      bluffs: step.bluffs,
      lunaticId: step.lunaticId ?? null,
      actorIds: step.actorIds,
    };
  } else {
    step.given = { kind: "note", text: step.note || "Шаг выполнен." };
  }
  addLog(
    state,
    {
      secret: true,
      kind: "night",
      title: step.system === "minioninfo" ? "Знакомство Приспешников" : "Знакомство Демона",
      detail: "Информация показана.",
    },
    ports,
  );
  return { ok: true, step };
}

// ---------------------------------------------------------------------------
// Information

export function endNight(state: GameState, ports: CommandExecutionContext = systemPorts) {
  const guard = lifecycleGuard(state, "endNight");
  if (guard) return guard;
  const pending = demonChangePending(state);
  if (pending)
    return { ok: false, errorCode: "error.45", error: "Сначала выберите наследника Демона." };
  if (evilTwinPartnerMissing(state)) {
    return {
      ok: false,
      errorCode: "error.77",
      error: "Выберите партнёра Злого Близнеца: без него ночь не завершится.",
    };
  }
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
    open: false,
  };
  // Mastermind r2993 retains the intervening night: the extra day starts only
  // at the following dawn, after the other characters had their night steps.
  if (
    isBmrScript(state.script) &&
    state.mastermind?.active &&
    !state.mastermind.extraDay &&
    night > Number(state.mastermind.triggerDay)
  ) {
    state.mastermind.extraDay = true;
  }
  addLog(
    state,
    {
      kind: "phase",
      title: "Утро " + night,
      detail: morning.length
        ? "Погибли: " + morning.map((death) => seatName(state, death.playerId)).join(", ") + "."
        : "Ночью никто не погиб.",
    },
    ports,
  );
  if (!isManualScript(state.script)) checkWin(state, {}, ports);
  return { ok: true, day: state.day };
}

/**
 * Whether the host may leave a step unrecorded. A living actor's mandatory
 * wake must resolve or be refused by its own ability, so only optional steps,
 * steps without a living actor and the death-triggered wakes can be skipped.
 */
export function canSkipStep(state: GameState, step: NightStep): boolean {
  if (step.done || step.skipped) return false;
  if (step.optional) return true;
  if (!step.actorId) return true;
  if (DEATH_TRIGGERED[step.roleId || ""]) return true;
  const actor = playerById(state, step.actorId);
  return !actor || !actor.alive;
}

export function skipStep(
  state: GameState,
  key: string,
  reason: string = "",
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "skipStep");
  if (guard) return guard;
  const step = state.night.queue.find((candidate) => candidate.key === key);
  if (!step) return { ok: false, errorCode: "error.36", error: "Шаг не найден." };
  if (step.done) return { ok: false, errorCode: "error.46", error: "Шаг уже выполнен." };
  if (!canSkipStep(state, step) && rejectsMandatorySkip(ports.rulesetVersion)) {
    return {
      ok: false,
      errorCode: "error.80",
      error: "Обязательный шаг живого игрока нельзя пропустить.",
    };
  }
  const note = String(reason || "").trim();
  step.skipped = true;
  step.done = true;
  if (step.roleId === "mathematician") state.abnormal = [];
  if (note) {
    setStepNote(step, "note.skipped", { reason: note }, "Пропущено: " + note);
  } else {
    setStepNote(step, "note.skippedNone", null, "Пропущено");
  }
  addLog(
    state,
    {
      secret: true,
      kind: "night",
      title: "Шаг пропущен",
      detail: note
        ? (step.roleId || step.system || "") + ": " + note
        : step.roleId || step.system || "",
    },
    ports,
  );
  appendConditionalSteps(state, ports);
  checkWin(state, {}, ports);
  return { ok: true, step };
}

export function currentStep(state: GameState): NightStep | null {
  return state.night.queue.find((step) => !step.done && !step.skipped) || null;
}

export function stepProgress(state: GameState): { done: number; total: number } {
  const total = state.night.queue.length;
  const done = state.night.queue.filter((step) => step.done || step.skipped).length;
  return { done, total };
}
