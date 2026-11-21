import type { DeadAt, GameState, NightStep, Player, RoleId } from "../model/types.ts";

import type { AbilityNote } from "../roles/ability.ts";
import type { TargetMode } from "../roles/types.ts";

type StepSpec = {
  target?: TargetMode;
  minTargets?: number;
  maxTargets?: number;
  infoKind?: string;
  optional?: boolean;
  canKill?: boolean;
  canResurrect?: boolean;
  noteKey?: string | null;
  targetIds?: string[];
};
type BmrOptions = {
  targetIds?: string[];
  given?: Record<string, unknown>;
  redirectId?: string | null;
  registrations?: Record<string, string>;
  roleId?: RoleId | null;
  resurrectId?: string | null;
  drunkId?: string | null;
  deathIds?: string[];
  deaths?: Array<{ playerId: string }>;
};
type BmrInfoOptions = { targetIds?: string[]; registrations?: Record<string, string> };

// Bad Moon Rising scenario support. The Storyteller runs the printed
// abilities; the engine owns the official night order, conditional wakes,
// death/resurrection bookkeeping, and the Mastermind win condition.
import { roleTeam, nightSequence, roleLabel } from "../model/rules.ts";

import {
  effectiveRoleId,
  livingPlayers,
  orderedPlayers,
  playerById,
  realTeamOf,
  registersAlive,
} from "../model/state.ts";

import { applyRoleAbility } from "./ability.ts";
import { addLog, nightAt, currentAt, insertStepInto, setStepNote } from "./context.ts";
import { lifecycleGuard } from "./lifecycle.ts";
import { idSuffix } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { systemPorts } from "../model/ports.ts";
import { kill, checkWin } from "./death.ts";
import { isImpaired } from "./effects.ts";
import { pukkaPendings, resolvePukkaDeath } from "./pukka.ts";
import {
  firstNightStepOf,
  nightResolverFor,
  nightStepFor,
  otherNightStepOf,
} from "../roles/night-step.ts";
import { roleModule } from "../roles/registry.ts";
import {
  buildsFirstNightTinker,
  LEGACY_RULESET_VERSION,
  marksAnyDeathOnTinkerStep,
  resurrectsOnAnyStep,
} from "./command-versions.ts";

const DEMON_ROLES = new Set(["po", "pukka", "shabaloth", "zombuul"]);

// A step whose target is a Storyteller or simulated choice, not the actor's
// own working ability. The Lunatic only pretends to be a Demon, the
// Grandmother's grandchild is picked by the host, the Gossip's victim is a
// Storyteller consequence and the Moonchild's player already chose in public,
// so none of them can trigger the Goon (Goon r2977: "choose you with their
// ability"; the Gossip and the Moonchild choose no one at night).
const NO_GOON_CHOICE: Record<string, true> = {
  lunatic: true,
  grandmother: true,
  gossip: true,
  moonchild: true,
};

// Once-per-game and first-death abilities. A regurgitated player regains every
// one of them (Shabaloth r1790: "regains their ability, even a 'once per game'
// ability already used").
const RESTORED_ON_RESURRECTION = [
  "professor",
  "assassin",
  "courtier",
  "fool",
  "zombuul",
  "moonchildTarget",
  "moonchildTargetEvil",
  "moonchildResolved",
];

// A step that is printed as a choice without a wake: the Gossip's victim is a
// Storyteller consequence and the Tinker and the Moonchild do not wake at all,
// so the Chambermaid must not count them (Chambermaid r2966: "how many woke
// tonight due to their ability").
const NOT_A_WAKE: Record<string, true> = { gossip: true, tinker: true, moonchild: true };

// Roles whose deaths are recorded through the outcome panel; their ability must
// work for a death to land (Goon r2977, Godfather r2394, Po r3104).
const IMPAIRABLE_DEATH: Record<string, true> = {
  po: true,
  pukka: true,
  zombuul: true,
  shabaloth: true,
  godfather: true,
  gossip: true,
  assassin: true,
  moonchild: true,
};

// "Alive"/"living" appears in the printed ability of these roles.
const ALIVE_TARGET_ROLES: Record<string, true> = {
  sailor: true,
  devilsadvocate: true,
};

function livingLunatic(state: GameState): Player | null {
  return (
    orderedPlayers(state).find((player) => player.roleId === "lunatic" && player.alive) || null
  );
}

function lunaticBluffIds(state: GameState, ports: CommandExecutionContext): string[] {
  const separate = state.setup.lunaticBluffs;
  const demon = state.bluffs ?? state.setup.bluffs ?? [];
  // Notes and given information are persisted and seed later random commands.
  // Old histories must retain their original empty-list result during replay.
  return (
    ports.rulesetVersion === LEGACY_RULESET_VERSION
      ? (separate ?? demon)
      : separate?.length
        ? separate
        : demon
  ).map(String);
}

function bmrStepKey(
  state: GameState,
  index: number,
  roleId: RoleId | null,
  actorId: string | null,
): string {
  return ["n" + nightAt(state).number, index, roleId || "system", actorId || "all"].join("-");
}

function makeBmrStep(
  state: GameState,
  index: number,
  roleId: RoleId,
  actor: Player | null,
  spec: StepSpec,
): NightStep {
  const targetMode = spec.target || "none";
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
  const specExtra: Record<string, unknown> = {};
  if (Array.isArray(spec.targetIds)) specExtra.targetIds = spec.targetIds.slice();
  if (roleId === "courtier" || roleId === "gambler") {
    specExtra.roleChoices = (state.script && state.script.roles ? state.script.roles : []).slice();
  }
  if (roleId === "exorcist" || roleId === "devilsadvocate") {
    // "Different to last night" compares with the immediately previous night,
    // not with the last night the ability happened to be used.
    const used = actor && actor.used;
    const target = used && (used[roleId + "Target"] as string | undefined);
    const targetNight = used && (used[roleId + "TargetNight"] as number | undefined);
    if (target && targetNight === nightAt(state).number - 1) {
      specExtra.previousTarget = target;
    }
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
    note: null,
    noteKey: spec.noteKey || null,
    targetIds: [],
    registrations: {},
    given: null,
    result: null,
    pending: null,
    done: false,
    skipped: false,
    completedAt: null,
    ...specExtra,
  };
}

function minionInfoStep(state: GameState, index: number): NightStep | null {
  const size = orderedPlayers(state).length;
  const night = nightAt(state).number;
  if (night !== 1 || size < 7) return null;
  const living = livingPlayers(state);
  const minions = living.filter((p) => roleTeam(p.roleId || "") === "minion");
  const demon = living.find((p) => roleTeam(p.roleId || "") === "demon");
  if (!minions.length || !demon) return null;
  return {
    key: bmrStepKey(state, index, "minioninfo", null),
    kind: "system",
    system: "minioninfo",
    roleId: null,
    actorId: null,
    actorIds: minions.map((p) => p.id),
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

function demonInfoStep(state: GameState, index: number): NightStep | null {
  const size = orderedPlayers(state).length;
  const night = nightAt(state).number;
  if (night !== 1 || size < 7) return null;
  const demon = livingPlayers(state).find((p) => roleTeam(p.roleId || "") === "demon");
  if (!demon) return null;
  const lunatic = livingLunatic(state);
  return {
    key: bmrStepKey(state, index, "demoninfo", null),
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
    lunaticId: lunatic ? lunatic.id : null,
    given: null,
    result: null,
    note: null,
    pending: null,
    done: false,
    skipped: false,
    completedAt: null,
  };
}

export function buildBmrNightQueue(
  state: GameState,
  ports: CommandExecutionContext = systemPorts,
): NightStep[] {
  const night = nightAt(state).number;
  const sequence = nightSequence(night, "bmr");
  const steps: NightStep[] = [];
  sequence.forEach((roleId, index) => {
    if (roleId === "info") {
      // Official order: Minion info, then the Lunatic, then Demon info. The
      // Demon information is inserted after the Lunatic below.
      if (night !== 1) return;
      const minion = minionInfoStep(state, index);
      if (minion) steps.push(minion);
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
    if (roleId === "grandmother" && night !== 1) return;
    const declaration = nightStepFor(roleModule(roleId), night);
    if (!declaration) return;
    const actor = declaration.actor
      ? declaration.actor(state, night)
      : (livingPlayers(state).find((player) => effectiveRoleId(player) === roleId) ?? null);
    if (!actor) return;
    const spec: StepSpec = { ...declaration };
    if (DEMON_ROLES.has(roleId) && bmrDemonHasLunatic(state)) spec.infoKind = "note";
    if (roleId === "po") {
      const three = Boolean(actor.used && actor.used.poNoOne);
      spec.minTargets = three ? 3 : 0;
      spec.maxTargets = three ? 3 : 1;
    }
    if (roleId === "lunatic" && night !== 1) {
      // The Lunatic attacks as the Demon they were shown (Lunatic r3112).
      const mask = state.setup.lunaticShownId;
      const maskStep = mask ? otherNightStepOf(roleModule(mask)) : null;
      if (maskStep && mask !== "po") {
        if (maskStep.target != null) spec.target = maskStep.target;
        if (maskStep.minTargets != null) spec.minTargets = maskStep.minTargets;
        if (maskStep.maxTargets != null) spec.maxTargets = maskStep.maxTargets;
      }
      if (mask === "po") {
        const three = Boolean(actor.used && actor.used.poNoOne);
        spec.target = "po";
        spec.minTargets = three ? 3 : 0;
        spec.maxTargets = three ? 3 : 1;
      }
    }
    if (roleId === "moonchild") {
      const chosen = actor.used && actor.used.moonchildTarget;
      if (!chosen) return;
      spec.targetIds = [chosen];
    }
    // The first-night Lunatic step is the Minion tips: the Storyteller points
    // at any players (Lunatic r3112), so the picks are the step targets.
    const lunaticMinions =
      roleId === "lunatic" && night === 1
        ? livingPlayers(state).filter((player) => roleTeam(player.roleId || "") === "minion").length
        : 0;
    if (lunaticMinions > 0) {
      spec.target = "one-any";
      spec.minTargets = lunaticMinions;
      spec.maxTargets = lunaticMinions;
    }
    const step = makeBmrStep(state, index, roleId, actor, spec);
    if (roleId === "lunatic" && night === 1) {
      // "Learn three bluffs and the appropriate number of Minions, but this
      // information may be wrong" (Lunatic r3112). The bluffs may be in play.
      const minions = lunaticMinions;
      const bluffIds = lunaticBluffIds(state, ports);
      const bluffs = bluffIds.map((id) => roleLabel(id));
      setStepNote(
        step,
        "note.bmr.lunaticFirst",
        { minions, bluffs: bluffIds.join(", ") },
        "Покажите Безумцу " +
          minions +
          " указаний на Приспешников и 3 добрые роли (они могут быть и в игре): " +
          (bluffs.join(", ") || "—") +
          ".",
      );
    }
    if (roleId === "godfather" && night === 1) {
      const outsiders = outsiderCharacters(state);
      setStepNote(
        step,
        "note.bmr.godfatherOutsiders",
        { outsiders: outsiders.join(", ") || "—" },
        "Изгои в игре: " + (outsiders.map(roleLabel).join(", ") || "—") + ".",
      );
    }
    steps.push(step);
  });
  // Tinker r1782: "You might die at any time." The role never wakes and has no
  // printed slot, so the host's first-night death step is appended with the
  // sequence length; older journals keep their old queue and step keys.
  if (night === 1 && buildsFirstNightTinker(ports.rulesetVersion)) {
    const declaration = nightStepFor(roleModule("tinker"), 1);
    const actor =
      livingPlayers(state).find((player) => effectiveRoleId(player) === "tinker") ?? null;
    if (declaration && actor) {
      steps.push(makeBmrStep(state, sequence.length, "tinker", actor, { ...declaration }));
    }
  }
  if (night === 1) {
    const demon = demonInfoStep(state, sequence.indexOf("lunatic") + 0.5);
    if (demon) insertStepInto(steps, demon);
  }
  return steps;
}

/** The Outsider character tokens in play, without naming their seats. */
function outsiderCharacters(state: GameState): string[] {
  return [
    ...new Set(
      livingPlayers(state)
        .filter((player) => roleTeam(player.roleId || "") === "outsider")
        .map((player) => player.roleId!),
    ),
  ];
}

export function appendBmrConditionalSteps(
  state: GameState,
  ports: CommandExecutionContext = systemPorts,
) {
  const night = nightAt(state).number;
  const grandmother = orderedPlayers(state).find(
    (player) => player.roleId === "grandmother" && player.alive,
  );
  const grandchildId = state.setup && state.setup.grandmotherId;
  if (!grandmother || !grandchildId) return;
  // "If the Demon kills them, you die too": a drunk or poisoned Grandmother has
  // no ability (Grandmother r2978).
  if (isImpaired(state, grandmother.id, currentAt(state))) return;
  const grandchildDeath = state.deaths.find(
    (death) =>
      death.playerId === grandchildId &&
      death.phase === "night" &&
      death.number === night &&
      death.demon === true,
  );
  if (!grandchildDeath) return;
  if (
    state.night.queue.some(
      (step) => step.roleId === "grandmother" && step.noteKey === "note.bmr.grandmotherDeath",
    )
  )
    return;
  // The queue orders by the compressed sequence index, not the printed 0-99
  // sheet number; the Grandmother sits before the Chambermaid on every night.
  const sequence = nightSequence(night, "bmr");
  const slot = sequence.indexOf("grandmother");
  const declaration = otherNightStepOf(roleModule("grandmother"));
  if (!declaration) return;
  const step = makeBmrStep(state, slot < 0 ? sequence.length : slot, "grandmother", grandmother, {
    ...declaration,
  });
  insertStepInto(state.night.queue, step);
  const death = kill(
    state,
    grandmother.id,
    "ability",
    currentAt(state),
    {
      ability: "grandmother",
      bmr: true,
    },
    ports,
  );
  addLog(
    state,
    {
      secret: true,
      kind: "night",
      title: "Бабушка: внук убит Демоном",
      detail: death ? grandmother.name + " умирает." : grandmother.name + " защищена от смерти.",
    },
    ports,
  );
}

/**
 * Keeps the Demon on one seat from waking tonight (Exorcist r2973: "the Demon,
 * if chosen, learns who you are then doesn't wake tonight"). Its other
 * abilities still resolve: the Storyteller may still regurgitate the
 * Shabaloth's last target (Shabaloth r1790), and the Pukka's waiting death
 * happens now and is reported on the blocking step.
 */
export function keepDemonAsleep(
  state: GameState,
  step: NightStep,
  demon: Player,
  note: AbilityNote,
  log: { readonly title: string; readonly detail: string },
  at: DeadAt,
  ports: CommandExecutionContext,
): void {
  const demonStep = state.night.queue.find(
    (candidate) =>
      candidate.kind === "role" && candidate.roleId === demon.roleId && !candidate.done,
  );
  if (demonStep) {
    if (demon.roleId === "shabaloth") {
      demonStep.canKill = false;
      demonStep.canResurrect = true;
      demonStep.blocked = true;
      demonStep.targetMode = "none";
      demonStep.minTargets = 0;
      demonStep.maxTargets = 0;
    } else {
      demonStep.done = true;
      demonStep.skipped = true;
    }
    setStepNote(demonStep, note.key, note.vars || null, note.text);
  }
  addLog(state, { secret: true, kind: "night", title: log.title, detail: log.detail }, ports);
  if (demon.roleId === "pukka") {
    const pending =
      pukkaPendings(state, demon.id).find((candidate) => !candidate.resumeOnHealthy) || null;
    const resolved = resolvePukkaDeath(state, pending, at, {}, ports);
    if (resolved) step.result = { ...step.result, pukkaDeath: resolved };
  }
}

export function completeBmrStep(
  state: GameState,
  step: NightStep,
  options: BmrOptions,
  ports: CommandExecutionContext = systemPorts,
) {
  const role = step.roleId;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const targets = options.targetIds || [];
  const at = currentAt(state);
  if (actor) actor.used = actor.used || {};
  const module = role ? roleModule(role) : null;
  if (module && nightResolverFor(module, at.number)) {
    // A migrated role never falls through to the branches below, so a missing
    // resolution is a visible test failure instead of a silent fallback.
    applyRoleAbility(
      state,
      module,
      step,
      targets,
      at,
      { chosenRoleId: options.roleId ?? null, drunkId: options.drunkId || null },
      ports,
    );
    return;
  }
  if (role === "lunatic" && actor) {
    // The first night is not a night where the pretended Po chose no one
    // (Po r3104), and the Lunatic's own choice is only a report. First-night
    // targets are the Minion tips and are never reported as an attack.
    if (state.setup.lunaticShownId === "po" && at.number > 1)
      actor.used.poNoOne = targets.length === 0;
    if (at.number > 1) reportLunaticChoice(state, step, actor, targets);
    return;
  }
  if (role === "courtier" && actor) {
    const roleId = options.roleId;
    // The once-per-game is spent only after a character is chosen (Courtier
    // r1797). An empty choice costs nothing.
    if (!roleId) return;
    actor.used.courtier = true;
    // Choosing the Goon character triggers the Goon before the Courtier's own
    // effect resolves, so the Courtier is drunk and the three-night drunk does
    // not land (Courtier r2968 example, Goon r2977).
    if (roleId === "goon") {
      const goon = orderedPlayers(state).find((player) => player.roleId === "goon" && player.alive);
      if (goon) applyGoonTrigger(state, goon, actor, at, step, ports);
    }
    if (isImpaired(state, actor.id, at)) {
      setStepNote(
        step,
        "note.abilityFailed",
        null,
        "Способность не сработала: игрок отравлен или пьян.",
      );
      return;
    }
    for (const player of orderedPlayers(state)) {
      if (player.roleId !== roleId) continue;
      state.effects.push({
        id: "eff-" + (state.effects.length + 1) + "-" + idSuffix(ports, 4),
        kind: "drunk",
        sourceId: actor.id,
        targetId: player.id,
        start: at,
        expires: { phase: "night", number: at.number + 3 },
        active: true,
      });
    }
    return;
  }
  if (role === "professor" && actor && targets[0]) {
    actor.used.professor = true;
    const target = playerById(state, targets[0]);
    if (
      !isImpaired(state, actor.id, at) &&
      target &&
      !target.alive &&
      roleTeam(target.roleId || "") === "townsfolk"
    ) {
      resurrectPlayer(state, target.id, { afterOrder: step.order || 0 }, ports);
    }
    return;
  }
  if (role === "assassin" && actor && targets[0]) {
    actor.used.assassin = true;
    // The protection bypass is not an exception to being drunk or poisoned.
    // The one exception is the Goon's granted drunk: r2977 says the Assassin's
    // victim (the Goon) still dies and the Goon still turns evil.
    const goonException = Boolean(step.goonImpaired && step.goonImpairedOnly);
    if (isImpaired(state, actor.id, at) && !goonException) {
      setStepNote(
        step,
        "note.abilityFailed",
        null,
        "Способность не сработала: игрок отравлен или пьян.",
      );
      return;
    }
    const target = playerById(state, targets[0]);
    if (target && target.alive) {
      kill(
        state,
        target.id,
        "ability",
        at,
        {
          demon: false,
          ability: "assassin",
          bmr: true,
          bypassProtection: true,
        },
        ports,
      );
    }
    return;
  }
  if (role === "moonchild" && actor && targets[0]) {
    const target = playerById(state, targets[0]);
    actor.used.moonchildResolved = true;
    // Moonchild r1783: the night resolution uses the Moonchild's state then,
    // not the state when they chose. A legacy save may still carry
    // `used.moonchildImpaired`; it is ignored so it cannot override this.
    const goonException = Boolean(step.goonImpaired && step.goonImpairedOnly);
    if (isImpaired(state, actor.id, at) && !goonException) {
      setStepNote(
        step,
        "note.abilityFailed",
        null,
        "Способность не сработала: игрок отравлен или пьян.",
      );
      return;
    }
    const chosenEvil = actor.used.moonchildTargetEvil;
    const wasGood =
      typeof chosenEvil === "boolean"
        ? !chosenEvil
        : target?.team === "good" || target?.team == null;
    if (target && target.alive && wasGood) {
      kill(state, target.id, "ability", at, { ability: "moonchild", bmr: true }, ports);
    }
    return;
  }
  if (role === "grandmother" && actor && step.noteKey === "note.bmr.grandmotherDeath") {
    addLog(
      state,
      {
        secret: true,
        kind: "night",
        title: "Бабушка умирает",
        detail: "Демон убил её внука.",
      },
      ports,
    );
  }
}

/** Records the Lunatic's choice on its own step and on the real Demon's. */
function reportLunaticChoice(
  state: GameState,
  step: NightStep,
  lunatic: Player,
  targets: string[],
) {
  const demon = orderedPlayers(state).find((player) => roleTeam(player.roleId || "") === "demon");
  if (!demon) return;
  const chosen = targets
    .map((id) => playerById(state, id))
    .filter((player): player is Player => Boolean(player));
  const vars = {
    name: lunatic.name,
    target: chosen.map((player) => player.name).join(", ") || "—",
  };
  const text =
    "Безумец: " +
    lunatic.name +
    (chosen.length ? "; выбрал " + vars.target : "") +
    ". Сообщите это Демону.";
  // The report lives on the Lunatic step too: the Demon may not wake tonight
  // (a Zombuul after a death today, an Exorcist block), so a report attached
  // only to the Demon step would be lost (Lunatic r3112).
  setStepNote(step, "note.bmr.lunaticReport", vars, text);
  const demonStep = state.night.queue.find(
    (candidate) =>
      candidate.kind === "role" &&
      DEMON_ROLES.has(String(candidate.roleId)) &&
      !candidate.done &&
      !candidate.skipped,
  );
  if (!demonStep) return;
  demonStep.noteKey = "note.bmr.lunaticReport";
  demonStep.noteVars = vars;
  demonStep.note = text;
}

// The Goon's trigger resolves before the chooser's ability and is granted as a
// drunk sourced by that same player, so the chooser's own effects (including a
// poison or drunk aimed at the Goon) depend on it and stay inactive. That also
// keeps the effect graph acyclic. "Until dusk" is the next night, and the
// granted effect keeps its lifetime even if the chooser is impaired again.
type GoonTrigger = { goonId: string; actorId: string; alignment: "good" | "evil" | null };

function livingGoon(state: GameState): Player | null {
  return orderedPlayers(state).find((player) => player.roleId === "goon" && player.alive) || null;
}

function goonChosenThisNight(state: GameState, at: DeadAt): boolean {
  return state.effects.some(
    (effect) =>
      effect.bmr === "goon" &&
      effect.start &&
      effect.start.phase === "night" &&
      Number(effect.start.number) === at.number,
  );
}

/**
 * Makes the chooser drunk until dusk and turns the Goon to their alignment. The
 * trigger resolves before the chooser's ability, so an ability that would fire
 * later tonight does not fire at all.
 */
function applyGoonTrigger(
  state: GameState,
  goon: Player,
  actor: Player,
  at: DeadAt,
  step: NightStep,
  ports: CommandExecutionContext,
): boolean {
  // A drunk or poisoned Goon has no ability. A drunk or poisoned chooser still
  // chooses; their ability fails, but the Goon still changes alignment.
  if (isImpaired(state, goon.id, at)) return false;
  if (goonChosenThisNight(state, at)) return false;
  const wasImpaired = isImpaired(state, actor.id, at);
  const alignment = realTeamOf(actor);
  state.effects.push({
    id: "eff-goon-" + at.number + "-" + goon.id,
    kind: "drunk",
    bmr: "goon",
    sourceId: actor.id,
    targetId: actor.id,
    start: at,
    expires: { phase: "night", number: at.number + 1 },
    active: true,
    // The granted drunk keeps its printed lifetime even if its source is
    // impaired again or dies later.
    permanent: true,
  });
  if (alignment) goon.team = alignment;
  step.goonImpaired = true;
  step.goonId = goon.id;
  // True when the Goon's drunk is the only impairment: the Assassin still
  // resolves its printed effect (Goon r2977: the Assassin's victim is the Goon).
  step.goonImpairedOnly = !wasImpaired;
  addLog(
    state,
    {
      secret: true,
      kind: "effect",
      title: "Наёмник выбран: " + actor.name,
      detail:
        actor.name +
        " пьян до заката. Наёмник теперь " +
        (alignment === "evil" ? "злой" : "добрый") +
        ".",
      playerId: goon.id,
    },
    ports,
  );
  return true;
}

function goonTriggerFor(
  state: GameState,
  step: NightStep,
  targets: string[],
  at: DeadAt,
): GoonTrigger | null {
  if (step.kind !== "role" || !step.actorId || !step.roleId) return null;
  if (step.roleId === "goon" || NO_GOON_CHOICE[step.roleId]) return null;
  const actor = playerById(state, step.actorId);
  const goon = livingGoon(state);
  if (!actor || !goon || !targets.map(String).includes(goon.id)) return null;
  if (isImpaired(state, goon.id, at)) return null;
  if (goonChosenThisNight(state, at)) return null;
  return { goonId: goon.id, actorId: actor.id, alignment: realTeamOf(actor) };
}

/** True while the chosen targets would trigger the Goon on this step. */
export function bmrGoonWouldTrigger(state: GameState, step: NightStep, targets: string[]): boolean {
  return Boolean(goonTriggerFor(state, step, targets, nightAt(state)));
}

/**
 * Applies the Goon trigger before the chooser's ability resolves: the chooser
 * is drunk immediately, so their ability does not work tonight or the next day.
 */
export function applyBmrGoonTrigger(
  state: GameState,
  step: NightStep,
  targets: string[],
  ports: CommandExecutionContext = systemPorts,
): boolean {
  const at = currentAt(state);
  const trigger = goonTriggerFor(state, step, targets, at);
  if (!trigger) return false;
  const goon = playerById(state, trigger.goonId);
  const actor = playerById(state, trigger.actorId);
  if (!goon || !actor) return false;
  return applyGoonTrigger(state, goon, actor, at, step, ports);
}

export function bmrInfoForStep(
  state: GameState,
  step: NightStep,
  options: BmrInfoOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const role = step.roleId;
  const at = nightAt(state);
  const targetIds = options.targetIds || step.targetIds || [];
  // The preview runs before completion, so the Goon trigger is still pending.
  // Treat it as impairment now so the false information matches the stored one.
  const impaired = Boolean(
    actor && (isImpaired(state, actor.id, at) || bmrGoonWouldTrigger(state, step, targetIds)),
  );
  if (role === "chambermaid") {
    // Only characters who woke due to their ability count: the Gossip's victim
    // is a Storyteller consequence and the Tinker and the Moonchild do not wake.
    const count = targetIds.filter((id) => {
      const woke = state.night.queue.filter(
        (candidate) =>
          candidate.kind === "role" &&
          candidate.actorId === id &&
          candidate.bmr &&
          !candidate.skipped &&
          !candidate.blocked &&
          (candidate.done || candidate.key === step.key),
      );
      return woke.some(
        (candidate) =>
          !NOT_A_WAKE[String(candidate.roleId)] &&
          candidate.noteKey !== "note.bmr.grandmotherDeath",
      );
    }).length;
    return {
      kind: "number",
      value: count,
      impaired,
      needsChoice: impaired,
      options: impaired ? [0, 1, 2] : [],
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
      options: impaired ? orderedPlayers(state).map((player) => player.roleId) : [],
    };
  }
  if (role === "godfather" && step.kind === "role" && state.night.number === 1) {
    const outsiders = outsiderCharacters(state);
    return {
      kind: "note",
      textKey: "note.bmr.godfatherOutsiders",
      textVars: { outsiders: outsiders.join(", ") || "—" },
      text: "Изгои в игре: " + (outsiders.map(roleLabel).join(", ") || "—") + ".",
    };
  }
  if (role === "lunatic") {
    if (state.night.number === 1) {
      const bluffIds = lunaticBluffIds(state, ports);
      const bluffs = bluffIds.map((id) => roleLabel(id));
      const minions = livingPlayers(state).filter(
        (player) => roleTeam(player.roleId || "") === "minion",
      ).length;
      return {
        kind: "note",
        textKey: "note.bmr.lunaticFirst",
        textVars: { minions, bluffs: bluffIds.join(", ") },
        text:
          "Покажите Безумцу " +
          minions +
          " указаний на Приспешников и 3 добрые роли (они могут быть и в игре): " +
          (bluffs.join(", ") || "—") +
          ".",
      };
    }
    return {
      kind: "note",
      textKey: "note.bmr.lunatic",
      text: "Безумец выбирает как Демон. Смертей нет; покажите выбор настоящему Демону.",
    };
  }
  if (role && DEMON_ROLES.has(role)) {
    const lunatic = livingLunatic(state);
    if (lunatic) {
      const choseTonight =
        Number(lunatic.used && lunatic.used.lunaticTargetNight) === nightAt(state).number;
      const target =
        choseTonight && lunatic.used && lunatic.used.lunaticTarget
          ? playerById(state, lunatic.used.lunaticTarget)
          : null;
      return {
        kind: "note",
        textKey: target ? "note.bmr.lunaticReport" : "note.bmr.lunaticReportNoTarget",
        textVars: target ? { name: lunatic.name, target: target.name } : { name: lunatic.name },
        text:
          "Безумец: " +
          lunatic.name +
          (target ? "; выбрал " + target.name : "") +
          ". Сообщите это Демону.",
      };
    }
  }
  if (role === "exorcist") {
    if (impaired) {
      return {
        kind: "note",
        textKey: "note.abilityFailed",
        text: "Способность не сработала: игрок отравлен или пьян.",
      };
    }
    const target = targetIds[0] ? playerById(state, targetIds[0]) : null;
    if (target && roleTeam(target.roleId || "") === "demon") {
      return {
        kind: "note",
        textKey: "note.exorcistBlocked",
        text: "Демон узнаёт Экзорциста и не просыпается этой ночью.",
      };
    }
    return {
      kind: "note",
      textKey: "note.bmr.exorcistMiss",
      text: "Цель не Демон: способность не сработала.",
    };
  }
  return { kind: "none" };
}

export function recordBmrOutcome(
  state: GameState,
  stepKey: string,
  options: BmrOptions = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "recordBmrOutcome");
  if (guard) return guard;
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
  const resurrectId = options.resurrectId || null;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const chosenTargets = Array.isArray(step.targetIds) ? step.targetIds.map(String) : [];
  // An Exorcist-blocked Demon does not wake: only its regurgitation resolves.
  if (step.blocked && deathIds.length) {
    return {
      ok: false,
      errorCode: "error.52",
      error: "Демон не проснулся этой ночью: смерти невозможны.",
    };
  }
  const goonException = Boolean(
    step.goonImpaired &&
    step.goonImpairedOnly &&
    (step.roleId === "assassin" || step.roleId === "moonchild"),
  );
  if (step.goonImpaired && !goonException) {
    // The chooser was drunk as soon as it chose the Goon, so every target that
    // comes after the Goon does not die. Targets chosen before it still do
    // (Po r3104: "Only the Moonchild dies, because the Po became drunk when
    // they attacked the Goon").
    const goonIndex = chosenTargets.indexOf(String(step.goonId));
    const blocked = deathIds.filter((id) => {
      const index = chosenTargets.indexOf(id);
      return goonIndex < 0 || index < 0 || index >= goonIndex;
    });
    if (blocked.length) {
      return {
        ok: false,
        errorCode: "error.52",
        error: "Способность не сработала: Наёмник сделал игрока пьяным.",
      };
    }
  }
  // A drunk or poisoned ability that records deaths does nothing, so no marked
  // death may land. The Assassin, the Moonchild and the Professor check their
  // own impairment, and the Tinker's step is checked below.
  if (
    actor &&
    IMPAIRABLE_DEATH[String(step.roleId)] &&
    !goonException &&
    !step.goonImpaired &&
    isImpaired(state, actor.id, at)
  ) {
    return {
      ok: false,
      errorCode: "error.52",
      error: "Способность не сработала: игрок отравлен или пьян.",
    };
  }
  // The Moonchild's outcome path must spare an evil target just as the step
  // completion does: r1783 kills only when the chosen player is good.
  if (step.roleId === "moonchild" && deathIds.length) {
    const chosenEvil = actor?.used.moonchildTargetEvil;
    const illegal = deathIds.some((id) => {
      const target = playerById(state, id);
      const wasGood =
        typeof chosenEvil === "boolean"
          ? !chosenEvil
          : target?.team === "good" || target?.team == null;
      return !target || !wasGood;
    });
    if (illegal) {
      return {
        ok: false,
        errorCode: "error.51",
        error: "Лунный ребёнок убивает только добрую цель.",
      };
    }
  }
  // The Tinker chooses no one: the host decides whether the Tinker dies.
  const tinkerStep = step.roleId === "tinker";
  // A death must be one of the step's chosen targets and must not exceed the
  // ability's maximum (Shabaloth 2, Po 1 or 3, the others 1).
  if (deathIds.length && !tinkerStep) {
    if (!step.canKill) {
      return {
        ok: false,
        errorCode: "error.51",
        error: "Движок сам разрешает смерть этого шага.",
      };
    }
    if (!chosenTargets.length || deathIds.some((id) => !chosenTargets.includes(id))) {
      return {
        ok: false,
        errorCode: "error.51",
        error: "Смерть должна совпадать с выбранными целями.",
      };
    }
    const maximum = Number(step.maxTargets || 0);
    if (maximum && deathIds.length > maximum) {
      return {
        ok: false,
        errorCode: "error.51",
        error: "Смертей больше, чем позволяет способность.",
      };
    }
  }
  // Tinker r1782: "At any time, you may decide that the Tinker dies." The step
  // is the Tinker's own ability, so only the Tinker dies on it, and only while
  // the ability works, as by day (States r1039: "A drunk or poisoned player has
  // no ability"). A command recorded before this rule keeps the deaths it
  // marked.
  if (deathIds.length && tinkerStep && !marksAnyDeathOnTinkerStep(ports.rulesetVersion)) {
    if (deathIds.some((id) => id !== String(step.actorId))) {
      return {
        ok: false,
        errorCode: "error.51",
        error: "На шаге Механика может погибнуть только сам Механик.",
      };
    }
    if (actor && isImpaired(state, actor.id, at)) {
      return {
        ok: false,
        errorCode: "error.59",
        error: "Механик отравлен или пьян: способность не работает.",
      };
    }
  }
  if (resurrectId) {
    // Professor r1775 and Shabaloth r1790 are the Bad Moon Rising abilities
    // that bring a player back, so a step whose ability does not resurrect
    // brings no one back. A command recorded before this rule keeps the
    // resurrection it marked.
    if (!step.canResurrect && !resurrectsOnAnyStep(ports.rulesetVersion)) {
      return {
        ok: false,
        errorCode: "error.51",
        error: "Способность этого шага никого не возвращает.",
      };
    }
    const target = playerById(state, resurrectId);
    if (step.roleId === "professor") {
      // The step owns the ability: the outcome may only repeat the chosen
      // target, after the step completed under a working ability. The step
      // already resurrects that target, so a matching call is idempotent and
      // a second, different resurrection is rejected.
      const chosen = Array.isArray(step.targetIds) ? String(step.targetIds[0] ?? "") : "";
      const usable = Boolean(actor && actor.used && actor.used.professor);
      const unimpaired = actor ? !isImpaired(state, actor.id, at) : false;
      const alreadyAlive = Boolean(target && target.alive);
      const allowed = Boolean(
        step.done &&
        usable &&
        unimpaired &&
        chosen !== "" &&
        String(resurrectId) === chosen &&
        target &&
        (alreadyAlive || (!target.alive && roleTeam(target.roleId || "") === "townsfolk")),
      );
      if (!allowed) {
        return {
          ok: false,
          errorCode: "error.51",
          error: "Профессор может вернуть только выбранную цель.",
        };
      }
    }
    if (step.roleId === "shabaloth") {
      // "A dead player you chose last night": only the immediately preceding
      // night's chosen targets. A blocked night records no choices, so the
      // previous slot can be older than the current slot; read whichever
      // record belongs to the immediately preceding night.
      const used = (actor && actor.used) || {};
      const wantedNight = nightAt(state).number - 1;
      const previous = [
        Number(used.shabalothPreviousNight) === wantedNight ? used.shabalothPreviousTargets : null,
        Number(used.shabalothTargetsNight) === wantedNight ? used.shabalothTargets : null,
      ].flatMap((targets) => (Array.isArray(targets) ? targets.map(String) : []));
      if (!previous.includes(String(resurrectId))) {
        return {
          ok: false,
          errorCode: "error.51",
          error: "Шабало может поднять только цель прошлой ночи.",
        };
      }
    }
  }
  const demon = DEMON_ROLES.has(step.roleId || "");
  let resurrected = null;
  // The Shabaloth's regurgitation happens "just before waking the Shabaloth",
  // so the resurrected player's protection is already active for the new kills
  // (Shabaloth r1790).
  if (resurrectId && step.roleId === "shabaloth") {
    resurrected = resurrectPlayer(state, resurrectId, { afterOrder: step.order || 0 }, ports);
  }
  const deaths = [];
  for (const id of deathIds) {
    const death = kill(
      state,
      id,
      "ability",
      at,
      {
        demon,
        ability: step.roleId || "",
        bmr: true,
        bypassProtection: step.roleId === "assassin",
      },
      ports,
    );
    if (death) deaths.push(death);
  }
  if (resurrectId && step.roleId !== "shabaloth") {
    resurrected = resurrectPlayer(state, resurrectId, { afterOrder: step.order || 0 }, ports);
  }
  if (step.roleId === "shabaloth" && chosenTargets.length) {
    if (actor) {
      actor.used = actor.used || {};
      actor.used.shabalothTargets = chosenTargets.slice();
      actor.used.shabalothTargetsNight = nightAt(state).number;
    }
  }
  appendBmrConditionalSteps(state, ports);
  checkWin(state, {}, ports);
  addLog(
    state,
    {
      secret: true,
      kind: "night",
      title: "Итог: " + roleLabel(step.roleId),
      detail: deaths.length
        ? "Погибли: " +
          deaths.map((death) => (playerById(state, death.playerId) || {}).name).join(", ") +
          "."
        : "Смертей нет.",
    },
    ports,
  );
  return { ok: true, deaths, resurrected };
}

/**
 * The printed target restriction for one Bad Moon Rising step. The counts are
 * checked by the night flow; this function owns "alive", "not yourself" and the
 * Grandmother's good Townsfolk/Outsider grandchild (r1768 Sailor, r1784
 * Chambermaid, r3013 Devil's Advocate, r1777 Grandmother).
 */
export function bmrTargetError(
  state: GameState,
  step: NightStep,
  targets: string[],
): string | null {
  const ids = targets.map(String);
  const role = step.roleId || "";
  if (ids.some((id) => !playerById(state, id))) return "Цель не найдена.";
  const deadId = ids.find((id) => !registersAlive(playerById(state, id)!));
  if (deadId && ALIVE_TARGET_ROLES[role]) return "Цель должна быть жива.";
  if (role === "chambermaid") {
    if (ids.length === 2 && ids[0] === ids[1]) return "Нужны два разных игрока.";
    if (step.actorId && ids.includes(step.actorId)) return "Нельзя выбрать себя.";
    if (deadId) return "Обе цели должны быть живы.";
  }
  if (role === "grandmother" && ids.length === 1) {
    const team = roleTeam(playerById(state, ids[0]!)!.roleId || "");
    if (team !== "townsfolk" && team !== "outsider")
      return "Внук должен быть добрым Горожанином или Изгоем.";
  }
  return null;
}

/**
 * Brings a dead player back. The resurrected player regains every ability,
 * including a used once-per-game one, and wakes later tonight if their step is
 * still to come (Shabaloth r1790: "The regurgitated player regains their
 * ability, even a 'once per game' ability already used ... They wake later
 * tonight if they normally would").
 */
export function resurrectPlayer(
  state: GameState,
  playerId: string,
  { afterOrder = Infinity }: { afterOrder?: number } = {},
  ports: CommandExecutionContext = systemPorts,
): Player | null {
  const player = playerById(state, playerId);
  if (!player || player.alive) return null;
  player.alive = true;
  player.deadAt = null;
  player.registeredDead = false;
  player.voteToken = true;
  if (player.used) {
    for (const flag of RESTORED_ON_RESURRECTION) delete player.used[flag];
  }
  restoreResurrectedSteps(state, player, afterOrder);
  addLog(
    state,
    {
      secret: true,
      kind: "death",
      title: player.name + " возвращается",
      detail: "Роль: " + roleLabel(player.roleId) + ".",
      playerId: player.id,
      consequence: "revived",
    },
    ports,
  );
  return player;
}

/**
 * Re-opens the resurrected player's wake when it is still to come tonight. A
 * "first night only" or "start knowing" ability (the Grandmother) wakes at once
 * to use the ability again; a step that already passed does not.
 */
function restoreResurrectedSteps(state: GameState, player: Player, afterOrder: number) {
  const roleId = player.roleId;
  if (!roleId) return;
  const night = nightAt(state).number;
  const sequence = nightSequence(night, "bmr");
  const slot = sequence.indexOf(roleId);
  if (slot < 0 || slot <= afterOrder) return;
  const queue = state.night.queue;
  const pruned = queue.find(
    (step) =>
      step.kind === "role" &&
      step.actorId === player.id &&
      (step.done || step.skipped) &&
      step.noteKey !== "note.bmr.grandmotherDeath",
  );
  if (pruned) {
    pruned.done = false;
    pruned.skipped = false;
    pruned.completedAt = null;
    pruned.note = null;
    pruned.noteKey = null;
    pruned.noteVars = null;
    return;
  }
  if (queue.some((step) => step.kind === "role" && step.actorId === player.id)) return;
  const declared = roleModule(roleId);
  const declaration =
    night === 1 || roleId === "grandmother"
      ? firstNightStepOf(declared)
      : otherNightStepOf(declared);
  if (!declaration) return;
  if (declaration.actor) {
    const holder = declaration.actor(state, night);
    if (holder?.id !== player.id) return;
  } else if (!player.alive) {
    return;
  }
  insertStepInto(queue, makeBmrStep(state, slot, roleId, player, { ...declaration }));
}

export function bmrDemonHasLunatic(state: GameState): boolean {
  return Boolean(livingLunatic(state));
}
