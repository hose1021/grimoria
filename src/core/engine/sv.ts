import type { GameState, NightStep, Player, RoleId } from "../model/types.ts";

type StepSpec = {
  targetMode?: string;
  minTargets?: number;
  maxTargets?: number;
  infoKind?: string;
  optional?: boolean;
  canKill?: boolean;
  canResurrect?: boolean;
  note?: string | null;
  roleChoices?: RoleId[];
  [key: string]: unknown;
};
type SvOptions = {
  targetIds?: string[];
  given?: Record<string, unknown>;
  redirectId?: string | null;
  registrations?: Record<string, string>;
  roleId?: RoleId | null;
  targetId?: string | null;
  deathIds?: string[];
  resurrectId?: string | null;
};
type SvInfoOptions = { targetIds?: string[]; registrations?: Record<string, string> };

// Sects and Violets scenario support. Host-adjudicated: the Storyteller runs
// the printed abilities; the engine owns the official night order, setup
// prompts, death bookkeeping, No Dashii poison, Fang Gu succession and the
// Vortox/Evil Twin/Witch win conditions.
import { isSupportedRole, nightSequence, roleLabel, roleTeam } from "../model/rules.ts";

import { livingPlayers, orderedPlayers, playerById, realTeamOf } from "../model/state.ts";

import { addLog, currentAt, insertStepInto, nightAt } from "./context.ts";
import { checkWin, evilTwinPair, kill } from "./death.ts";
import { isImpaired } from "./effects.ts";

const DEMON_ROLES = new Set(["fanggu", "nodashii", "vigormortis", "vortox"]);

// The Fang Gu's ONCE reminder stays in the centre for the whole game, even
// after the Demon changes character (wiki r2974). Older saves recorded it only
// on the acting Demon, so honour that marker too.
function fangguJumpUsed(state: GameState): boolean {
  if (state.fangguJumped) return true;
  return Object.values(state.players || {}).some(
    (player) => player && player.used && player.used.fanggu === true,
  );
}

const GOOD_ROLES = (state: GameState): RoleId[] =>
  (state.script && state.script.roles ? state.script.roles : []).filter(
    (/** @type {RoleId} */ id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider",
  );

function svStepKey(
  state: GameState,
  index: number,
  roleId: RoleId | null,
  actorId: string | null,
): string {
  return ["n" + nightAt(state).number, index, roleId || "system", actorId || "all"].join("-");
}

function stepSpec(roleId: RoleId, night: number): StepSpec | null {
  if (night === 1) {
    return (
      {
        philosopher: { targetMode: "none", optional: true, infoKind: "note" },
        snakecharmer: { targetMode: "one-any", infoKind: "note" },
        eviltwin: { targetMode: "none", infoKind: "note" },
        witch: { targetMode: "one-any", infoKind: "note" },
        cerenovus: { targetMode: "one-any", infoKind: "note" },
        clockmaker: { targetMode: "none", infoKind: "number" },
        dreamer: { targetMode: "one-any", infoKind: "note" },
        seamstress: { targetMode: "two", optional: true, infoKind: "note" },
        mathematician: { targetMode: "none", infoKind: "number" },
      }[roleId] || null
    );
  }
  return (
    {
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
      mathematician: { targetMode: "none", infoKind: "number" },
    }[roleId] || null
  );
}

function diedRecently(state: GameState, playerId: string): boolean {
  const night = nightAt(state).number;
  return state.deaths.some(
    (death) =>
      !death.fake &&
      death.playerId === playerId &&
      ((death.phase === "night" && death.number === night) ||
        (death.phase === "day" && death.number === night - 1)),
  );
}

function diedByDemon(state: GameState, playerId: string): boolean {
  const night = nightAt(state).number;
  return state.deaths.some(
    (death) =>
      !death.fake &&
      death.playerId === playerId &&
      death.demon === true &&
      ((death.phase === "night" && death.number === night) ||
        (death.phase === "day" && death.number === night - 1)),
  );
}

function stepAllowed(
  state: GameState,
  roleId: RoleId,
  actor: Player | null,
  _night: number,
): boolean {
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

function makeStep(
  state: GameState,
  index: number,
  roleId: RoleId,
  actor: Player | null,
  spec: StepSpec,
): NightStep {
  const targetMode = spec.targetMode || "none";
  const minTargets =
    spec.minTargets != null
      ? spec.minTargets
      : targetMode === "none"
        ? 0
        : targetMode === "two"
          ? 2
          : 1;
  const maxTargets =
    spec.maxTargets != null
      ? spec.maxTargets
      : targetMode === "none"
        ? 0
        : targetMode === "two"
          ? 2
          : 1;
  const extra: Record<string, unknown> = {};
  if (roleId === "philosopher" || roleId === "cerenovus") {
    extra.roleChoices = GOOD_ROLES(state);
  }
  if (roleId === "pithag") {
    extra.roleChoices = (state.script && state.script.roles ? state.script.roles : []).filter(
      (id) => !holderOf(state, id),
    );
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
    ...extra,
  };
}

function infoStep(state: GameState, index: number, system: string): NightStep | null {
  const size = orderedPlayers(state).length;
  if (nightAt(state).number !== 1 || size < 7) return null;
  const living = livingPlayers(state);
  const minions = living.filter((player) => roleTeam(player.roleId || "") === "minion");
  const demon = living.find((player) => roleTeam(player.roleId || "") === "demon");
  if (!minions.length || !demon) return null;
  if (system === "minioninfo") {
    return {
      key: svStepKey(state, index, "minioninfo", null),
      kind: "system",
      system: "minioninfo",
      roleId: null,
      actorId: null,
      actorIds: minions.map((player) => player.id),
      order: index,
      targetMode: "none",
      minTargets: 0,
      maxTargets: 0,
      infoKind: "minion-info",
      targetIds: [],
      demonId: demon.id,
      given: null,
      result: null,
      note: null,
      pending: null,
      done: false,
      skipped: false,
      completedAt: null,
    };
  }
  return {
    key: svStepKey(state, index, "demoninfo", null),
    kind: "system",
    system: "demoninfo",
    roleId: null,
    actorId: null,
    actorIds: [demon.id],
    order: index,
    targetMode: "none",
    minTargets: 0,
    maxTargets: 0,
    infoKind: "demon-info",
    targetIds: [],
    demonId: demon.id,
    bluffs: (state.bluffs || []).slice(),
    given: null,
    result: null,
    note: null,
    pending: null,
    done: false,
    skipped: false,
    completedAt: null,
  };
}

type SvStepResult = { ok: true } | { ok: false; errorCode: string; error: string };

function holderOf(state: GameState, roleId: RoleId): Player | null {
  return orderedPlayers(state).find((player) => player.roleId === roleId) || null;
}

// The Philosopher's drunk follows the chosen character: it exists while that
// character is in play and its owner is a different seat only when the
// Philosopher chose their own character. The effect ends when the Philosopher
// dies or is impaired; effectGraph enforces that for philosopher effects.
function reconcilePhilosopherDrunk(state: GameState) {
  const wanted = new Map<string, { sourceId: string; targetId: string }>();
  for (const player of orderedPlayers(state)) {
    if (player.roleId !== "philosopher") continue;
    const ability = player.used ? player.used.philosopherAbility : null;
    if (typeof ability !== "string") continue;
    const owner = holderOf(state, ability as RoleId);
    if (!owner) continue;
    wanted.set("eff-philosopher-" + player.id + "-" + owner.id, {
      sourceId: player.id,
      targetId: owner.id,
    });
  }
  for (const effect of state.effects) {
    if (effect.philosopher !== true) continue;
    const want = wanted.get(effect.id);
    if (want && want.targetId === effect.targetId && effect.active !== false) continue;
    effect.active = false;
  }
  for (const [id, want] of wanted) {
    const existing = state.effects.find((effect) => effect.id === id);
    if (existing && existing.active !== false) continue;
    const at = currentAt(state);
    if (existing) {
      existing.active = true;
      existing.targetId = want.targetId;
      existing.start = at;
      continue;
    }
    state.effects.push({
      id,
      kind: "drunk",
      philosopher: true,
      sourceId: want.sourceId,
      targetId: want.targetId,
      start: at,
      expires: null,
      active: true,
    });
  }
}

// Recalculate the current night after a character change: the changed player
// loses their unfinished step of the old character and gains one for the new
// character when its official wake time is still ahead. A wake whose slot has
// already passed is not retroactively added.
function requeueForCharacter(
  state: GameState,
  player: Player,
  order: number,
  currentKey: string | null,
) {
  for (const step of state.night.queue) {
    if (step.done || step.skipped || step.key === currentKey) continue;
    if (step.actorId !== player.id) continue;
    step.done = true;
    step.skipped = true;
    step.note = "Персонаж сменился до пробуждения.";
  }
  if (state.phase !== "night" || !player.roleId) return;
  const night = nightAt(state).number;
  const roleId = player.roleId;
  const spec = stepSpec(roleId, night);
  const index = nightSequence(night, "snv").indexOf(roleId);
  if (!spec || index === -1 || index <= order) return;
  if (!player.alive || !stepAllowed(state, roleId, player, night)) return;
  const step = makeStep(state, index, roleId, player, spec);
  if (state.night.queue.some((candidate) => candidate.key === step.key)) return;
  insertStepInto(state.night.queue, step);
}

// Atomically replace one player's character: the character, the shown
// character, the Evil Twin reference, the demon bluffs and the current night's
// queue. The alignment is not part of the change (Pit-Hag r2998: "The
// character changes, but the alignment does not"). Callers must reject a
// character already in play first.
export function replaceCharacter(
  state: GameState,
  playerId: string,
  roleId: RoleId,
  options: { order?: number; currentKey?: string | null } = {},
): SvStepResult {
  const player = playerById(state, playerId);
  if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
  if (player.roleId === roleId) return { ok: true };
  const previous = player.roleId;
  // Pin the current alignment first: a character change never changes it, even
  // when the saved team is still null.
  player.team = realTeamOf(player);
  player.changedFrom = previous;
  player.roleId = roleId;
  player.shownRoleId = roleId;
  if (player.used) {
    if (previous === "philosopher") delete player.used.philosopherAbility;
    // A player who gains the character again has a fresh once-per-game ability.
    if (roleId === "philosopher") delete player.used.philosopher;
  }
  if (Array.isArray(state.bluffs)) state.bluffs = state.bluffs.filter((id) => id !== roleId);
  requeueForCharacter(state, player, options.order || 0, options.currentKey ?? null);
  reconcileNoDashiiPoison(state);
  reconcilePhilosopherDrunk(state);
  return { ok: true };
}

// Swap two characters without changing who is seated. The Evil Twin pair is
// tracked by the `evilTwinGoodPlayerId`/`evilTwinPlayerId` player ids, so a swap
// needs no reference rewrite. `alignments` exchanges the current teams instead
// of following the characters: the Snake Charmer swaps alignments (r2905), the
// Barber does not (r1757).
function swapCharacters(
  state: GameState,
  first: Player,
  second: Player,
  options: { order?: number; currentKey?: string | null; alignments?: boolean } = {},
) {
  const firstRole = first.roleId;
  const secondRole = second.roleId;
  if (!firstRole || !secondRole || firstRole === secondRole) return;
  const firstTeam = realTeamOf(first);
  const secondTeam = realTeamOf(second);
  for (const [player, roleId, team] of [
    [first, secondRole, secondTeam],
    [second, firstRole, firstTeam],
  ] as Array<[Player, RoleId, "good" | "evil" | null]>) {
    player.changedFrom = player.roleId;
    player.roleId = roleId;
    player.shownRoleId = roleId;
    if (options.alignments) player.team = team;
    if (player.used) {
      if (roleId !== "philosopher") delete player.used.philosopherAbility;
      else delete player.used.philosopher;
    }
  }
  requeueForCharacter(state, first, options.order || 0, options.currentKey ?? null);
  requeueForCharacter(state, second, options.order || 0, options.currentKey ?? null);
  reconcileNoDashiiPoison(state);
  reconcilePhilosopherDrunk(state);
}

// A Philosopher keeps using the borrowed ability on later nights, including a
// death-triggered ability after their own death. The step belongs to the
// Philosopher, not to the character they borrowed.
function philosopherAbilityStep(state: GameState, player: Player): NightStep | null {
  if (player.roleId !== "philosopher") return null;
  const ability = player.used ? player.used.philosopherAbility : null;
  if (typeof ability !== "string") return null;
  const roleId = ability as RoleId;
  const night = nightAt(state).number;
  const spec = stepSpec(roleId, night);
  const index = nightSequence(night, "snv").indexOf(roleId);
  if (!spec || index === -1 || !stepAllowed(state, roleId, player, night)) return null;
  return makeStep(state, index, roleId, player, spec);
}

export function buildSvNightQueue(state: GameState): NightStep[] {
  const night = nightAt(state).number;
  const sequence = nightSequence(night, "snv");
  const steps: NightStep[] = [];
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
  for (const player of orderedPlayers(state)) {
    const step = philosopherAbilityStep(state, player);
    if (step && !steps.some((candidate) => candidate.key === step.key)) {
      insertStepInto(steps, step);
    }
  }
  reconcileNoDashiiPoison(state);
  return steps;
}

// The No Dashii poisons the nearest Townsfolk on each side by role, not by
// living status: a dead Townsfolk is still the nearest Townsfolk. Recompute and
// reconcile the active effects after role changes, deaths and source loss.
export function reconcileNoDashiiPoison(state: GameState) {
  const sources = orderedPlayers(state).filter(
    (player) =>
      player.roleId === "nodashii" &&
      player.alive &&
      !isImpaired(state, player.id, currentAt(state)),
  );
  const targets = new Map();
  for (const source of sources) {
    const ids = state.order.map(String);
    const seat = ids.indexOf(source.id);
    if (seat === -1) {
      targets.set(source.id, new Set());
      continue;
    }
    const nearestTownsfolk = (direction: number): string | null => {
      for (let step = 1; step < ids.length; step += 1) {
        const id = ids[(seat + direction * step + ids.length * step) % ids.length]!;
        const player = playerById(state, id);
        if (player && roleTeam(player.roleId || "") === "townsfolk") return id;
      }
      return null;
    };
    targets.set(source.id, new Set([nearestTownsfolk(-1), nearestTownsfolk(1)].filter(Boolean)));
  }
  for (const effect of state.effects) {
    // A permanent poison (the Snake Charmer's) is not a No Dashii poison, even
    // when its source later becomes the No Dashii.
    if (effect.kind !== "poison" || effect.permanent === true) continue;
    const source = effect.sourceId == null ? null : playerById(state, effect.sourceId);
    const isNoDashii = effect.nodashii === true || (source && source.roleId === "nodashii");
    if (!isNoDashii) continue;
    const allowed = targets.get(effect.sourceId);
    if (!allowed || effect.targetId == null || !allowed.has(effect.targetId)) effect.active = false;
  }
  for (const [sourceId, wanted] of targets) {
    for (const targetId of wanted) {
      const exists = state.effects.some(
        (effect) =>
          effect.kind === "poison" &&
          effect.nodashii === true &&
          effect.sourceId === sourceId &&
          effect.targetId === targetId &&
          effect.active,
      );
      if (exists) continue;
      state.effects.push({
        id: "eff-nodashii-" + sourceId + "-" + targetId,
        kind: "poison",
        nodashii: true,
        sourceId,
        targetId,
        start: currentAt(state),
        expires: null,
        active: true,
      });
    }
  }
}

export function svInfoForStep(state: GameState, step: NightStep, options: SvInfoOptions = {}) {
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const role = step.roleId;
  const targetIds = options.targetIds || step.targetIds || [];
  const target = targetIds[0] ? playerById(state, targetIds[0]) : null;

  if (role === "eviltwin") {
    const twin = evilTwinPair(state)?.good ?? null;
    return {
      kind: "note",
      text:
        "Покажите Близнецам друг друга: " +
        (actor ? actor.name : "—") +
        " и " +
        (twin ? twin.name + " (" + roleLabel(twin.roleId) + ")" : "—") +
        ".",
    };
  }
  if (role === "clockmaker") {
    const demon = livingPlayers(state).find((player) => roleTeam(player.roleId || "") === "demon");
    const minions = livingPlayers(state).filter(
      (player) => roleTeam(player.roleId || "") === "minion",
    );
    const ids = state.order;
    let distance = null;
    if (demon && minions.length) {
      const seat = ids.indexOf(demon.id);
      distance = Math.min(
        ...minions.map((minion) => {
          const atSeat = ids.indexOf(minion.id);
          const raw = Math.abs(atSeat - seat);
          return Math.min(raw, ids.length - raw);
        }),
      );
    }
    return {
      kind: "number",
      value: distance == null ? 0 : distance,
      text:
        "Расстояние от Демона до ближайшего Приспешника: " +
        (distance == null ? "—" : distance) +
        ".",
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
        ? "Сон о " +
          target.name +
          ": покажите 1 добрую и 1 злую роль; одна из них — роль " +
          target.name +
          "."
        : "Выберите игрока: покажите 1 добрую и 1 злую роль.",
    };
  }
  if (role === "seamstress") {
    const [a, b] = targetIds.map((id) => playerById(state, id));
    if (!a || !b) return { kind: "note", text: "Выберите двух игроков." };
    const same = realTeamOf(a) === realTeamOf(b);
    return {
      kind: "note",
      text: a.name + " и " + b.name + ": " + (same ? "на одной стороне." : "на разных сторонах."),
    };
  }
  if (role === "sage") {
    return {
      kind: "note",
      text: "Демон убил Мудреца. Покажите 2 игроков, один из которых — Демон.",
    };
  }
  if (role === "sweetheart") {
    return { kind: "note", text: "Выберите игрока: он пьян до конца игры." };
  }
  if (role === "barber") {
    return {
      kind: "note",
      text: "Демон может выбрать двух игроков (не Демона) и поменять их роли.",
    };
  }
  if (role === "philosopher") {
    return {
      kind: "note",
      text: "Выберите добрую роль; Философ получает её способность, а её владелец пьян.",
    };
  }
  if (role === "cerenovus") {
    return {
      kind: "note",
      text: "Выберите игрока и добрую роль: завтра он должен быть «помешан» на этой роли.",
    };
  }
  if (role === "pithag") {
    return {
      kind: "note",
      text: "Выберите игрока и роль: если роли нет в игре, он становится ею. Новый Демон убивает по решению ведущего.",
    };
  }
  if (role === "snakecharmer") {
    return {
      kind: "note",
      text: "Если выбрали Демона, поменяйте роли и стороны; Демон становится отравлен.",
    };
  }
  if (role === "flowergirl" || role === "towncrier") {
    return {
      kind: "note",
      text: "Ведущий проверяет голосование/выдвижение и показывает да или нет.",
    };
  }
  if (role === "juggler") {
    return { kind: "number", value: 0, text: "Ведущий считает верные догадки Жонглёра." };
  }
  if (role === "mathematician") {
    return {
      kind: "note",
      text: "Ведущий считает, у скольких игроков способность сработала некорректно.",
    };
  }
  return { kind: "none" };
}

export function completeSvStep(
  state: GameState,
  step: NightStep,
  options: SvOptions = {},
): SvStepResult {
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  if (!actor) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
  actor.used = actor.used || {};
  const targets = options.targetIds || [];
  const at = currentAt(state);
  const order = Number(step.order) || 0;
  const impaired = isImpaired(state, actor.id, at);

  if (step.roleId === "philosopher") {
    const roleId = options.roleId || null;
    if (!roleId) {
      step.note = "Способность не использована.";
      return { ok: true };
    }
    if (!GOOD_ROLES(state).includes(roleId)) {
      return { ok: false, errorCode: "error.2", error: "Выберите добрую роль из сценария." };
    }
    actor.used.philosopher = true;
    if (impaired) {
      step.note = "Способность не сработала: игрок отравлен или пьян.";
      return { ok: true };
    }
    actor.used.philosopherAbility = roleId;
    const owner = holderOf(state, roleId);
    reconcilePhilosopherDrunk(state);
    step.note = owner
      ? owner.name + " (" + roleLabel(roleId) + ") пьян: способность у Философа."
      : "Философ получает способность: " + roleLabel(roleId) + ".";
    const borrowed = philosopherAbilityStep(state, actor);
    if (borrowed && !state.night.queue.some((candidate) => candidate.key === borrowed.key)) {
      insertStepInto(state.night.queue, borrowed);
    }
    return { ok: true };
  }

  if (step.roleId === "pithag") {
    const target = targets[0] ? playerById(state, targets[0]) : null;
    if (!target) return { ok: false, errorCode: "error.31", error: "Цель не найдена." };
    if (impaired) {
      step.note = "Способность не сработала: игрок отравлен или пьян.";
      return { ok: true };
    }
    const roleId = options.roleId || null;
    if (
      !roleId ||
      !isSupportedRole(roleId) ||
      !(state.script && state.script.roles.includes(roleId))
    ) {
      return { ok: false, errorCode: "error.2", error: "Выберите роль из сценария." };
    }
    if (holderOf(state, roleId)) {
      return { ok: false, errorCode: "error.52", error: "Эта роль уже в игре." };
    }
    replaceCharacter(state, target.id, roleId, { order, currentKey: step.key });
    step.note =
      target.name +
      " становится: " +
      roleLabel(roleId) +
      (roleTeam(roleId) === "demon" ? ". Смерти этой ночью выбирает ведущий." : ".");
    return { ok: true };
  }

  if (step.roleId === "snakecharmer") {
    const target = targets[0] ? playerById(state, targets[0]) : null;
    if (target && !target.alive) {
      return { ok: false, errorCode: "error.55", error: "Нельзя выбрать мёртвого игрока." };
    }
    if (target && !impaired && roleTeam(target.roleId || "") === "demon") {
      swapCharacters(state, actor, target, {
        order,
        currentKey: step.key,
        alignments: true,
      });
      const id = "eff-snakecharmer-" + actor.id + "-" + target.id;
      if (!state.effects.some((effect) => effect.id === id)) {
        state.effects.push({
          id,
          kind: "poison",
          // The poison outlives its source: the new Demon may die or be
          // impaired and the new Snake Charmer stays poisoned.
          permanent: true,
          sourceId: actor.id,
          targetId: target.id,
          start: at,
          expires: null,
          active: true,
        });
      }
      step.note =
        actor.name + " и " + target.name + " меняются персонажами; " + target.name + " отравлен.";
    }
    return { ok: true };
  }

  if (step.roleId === "barber") {
    const [first, second] = targets.map((id) => playerById(state, id));
    if (!first || !second || first.id === second.id) return { ok: true };
    const demon = orderedPlayers(state).find(
      (player) => roleTeam(player.roleId || "") === "demon" && player.alive,
    );
    const differentDemon = [first, second].find(
      (player) => roleTeam(player.roleId || "") === "demon" && (!demon || player.id !== demon.id),
    );
    if (differentDemon) {
      return { ok: false, errorCode: "error.53", error: "Нельзя выбрать другого Демона." };
    }
    swapCharacters(state, first, second, { order, currentKey: step.key });
    step.note = first.name + " и " + second.name + " меняются персонажами.";
    return { ok: true };
  }

  if (step.roleId === "seamstress" && targets.length === 2) actor.used.seamstress = true;
  if (step.roleId === "juggler") actor.used.juggler = true;
  if (step.roleId === "witch" && targets[0] && !impaired && livingPlayers(state).length > 3) {
    state.effects.forEach((effect) => {
      if (effect.kind === "witch" && effect.sourceId === actor.id) effect.active = false;
    });
    state.effects.push({
      id: "eff-witch-" + actor.id + "-" + targets[0],
      kind: "witch",
      sourceId: actor.id,
      targetId: targets[0],
      day: at.number,
      start: at,
      expires: { phase: "night", number: at.number + 1 },
      active: true,
    });
  }
  if (step.roleId === "sweetheart" && targets[0] && !impaired) {
    state.effects.push({
      id: "eff-sweetheart-" + targets[0],
      kind: "drunk",
      sourceId: actor.id,
      targetId: targets[0],
      start: at,
      expires: null,
      active: true,
    });
  }
  return { ok: true };
}

export function recordSvOutcome(state: GameState, stepKey: string, options: SvOptions = {}) {
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
    if (
      oldDemon &&
      target &&
      roleTeam(target.roleId || "") === "outsider" &&
      !isImpaired(state, oldDemon.id, at) &&
      !fangguJumpUsed(state)
    ) {
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
        detail: target.name + " становится злым Фань Гу; прежний Демон умирает.",
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
export function appendSvConditionalSteps(state: GameState) {
  const night = nightAt(state).number;
  const queue = state.night.queue;
  const add = (roleId: RoleId, index: number, spec: StepSpec) => {
    if (queue.some((step) => step.roleId === roleId && !step.done && !step.skipped)) return;
    const actor = orderedPlayers(state).find((player) => player.roleId === roleId);
    if (!actor || !stepAllowed(state, roleId, actor, night)) return;
    const step = makeStep(state, index, roleId, actor, spec);
    if (queue.some((candidate) => candidate.key === step.key)) return;
    queue.push(step);
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
  // A Philosopher who borrowed a death-triggered ability wakes for it after
  // their own death, because their character is still the Philosopher.
  for (const player of orderedPlayers(state)) {
    const step = philosopherAbilityStep(state, player);
    if (!step) continue;
    if (!["barber", "sweetheart", "sage"].includes(step.roleId || "")) continue;
    if (queue.some((candidate) => candidate.key === step.key)) continue;
    insertStepInto(queue, step);
  }
}

export { DEMON_ROLES };
