import type { CommandPayloads } from "../commands/contracts.ts";
import type { GameState, InfoPair, ScriptEdition } from "../model/types.ts";
import {
  createGame,
  importGame as importState,
  playerById,
  realTeamOf,
  setRoster,
} from "../model/state.ts";
import {
  bluffCandidates,
  isMixedEdition,
  isSupportedRole,
  randomBluffs,
  requiredBluffs,
  roleTeam,
} from "../model/rules.ts";
import { autoSecrets, dealGame } from "./setup.ts";
import { startNight } from "./night.ts";
import { lifecycleGuard } from "./lifecycle.ts";
import { replaceContents } from "./command-state.ts";
import { systemPorts } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";

const INFO_ROLES: Readonly<Record<string, true>> = {
  washerwoman: true,
  librarian: true,
  investigator: true,
};

export function startGame(
  state: GameState,
  options: { assignment?: Record<string, string>; secrets?: boolean } = {},
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "startGame");
  if (guard) return guard;
  if (!state.setup.roles.length) {
    return { ok: false, errorCode: "error.34", error: "Сначала соберите мешок." };
  }
  if (state.phase === "setup") {
    const dealt = dealGame(
      state,
      options.assignment ? { assignment: options.assignment } : {},
      ports,
    );
    if (!dealt.ok) return dealt;
  }
  state.order.forEach((id, index) => {
    const player = state.players[id];
    if (player) player.seat = index + 1;
  });
  if (state.phase === "deal") state.phase = "seat";
  if (options.secrets !== false) autoSecrets(state, { onlyMissing: true });
  return startNight(state, ports);
}

function normalizeScript(script: unknown) {
  if (!script || typeof script !== "object")
    return { ok: false, errorCode: "error.script", error: "Некорректный сценарий." };
  const value = script as Record<string, unknown>;
  if (typeof value.id !== "string" || !value.id)
    return { ok: false, errorCode: "error.script", error: "У сценария нет id." };
  if (typeof value.name !== "string" || !value.name)
    return { ok: false, errorCode: "error.script", error: "У сценария нет названия." };
  if (!Array.isArray(value.roles)) {
    return { ok: false, errorCode: "error.roles", error: "В сценарии нет списка ролей." };
  }
  if (!value.roles.length && value.edition !== "custom") {
    return { ok: false, errorCode: "error.roles", error: "В сценарии нет ролей." };
  }
  const unique: string[] = [];
  for (const id of value.roles) {
    if (
      typeof id !== "string" ||
      !isSupportedRole(id) ||
      (roleTeam(id) as string) === "traveller"
    ) {
      return {
        ok: false,
        errorCode: "error.unknown",
        error: "Неподдерживаемая роль в сценарии: " + id,
      };
    }
    if (!unique.includes(id)) unique.push(id);
  }
  const mixed = isMixedEdition(unique);
  if (value.manualOnly === true && !mixed) {
    return {
      ok: false,
      errorCode: "error.79",
      error: "Ручной режим доступен только смешанному сценарию.",
    };
  }
  return {
    ok: true,
    script: {
      id: value.id.slice(0, 80),
      name: value.name.slice(0, 80),
      edition: (typeof value.edition === "string" ? value.edition : "custom") as ScriptEdition,
      source: typeof value.source === "string" ? value.source : "manual",
      author: String(value.author || "").slice(0, 80),
      roles: unique,
      manualOnly: typeof value.manualOnly === "boolean" ? value.manualOnly : mixed,
    },
  };
}

function normalizeBag(state: GameState) {
  const roles = state.setup.roles || [];
  const scriptRoles = (state.script && state.script.roles) || [];

  if (!roles.includes("godfather")) state.setup.godfatherOutsider = 1;
  else if (
    state.setup.godfatherOutsider == null ||
    ![1, -1].includes(state.setup.godfatherOutsider)
  )
    state.setup.godfatherOutsider = 1;

  if (!roles.includes("eviltwin")) {
    state.setup.evilTwinGoodId = null;
  } else {
    // The opposing twin is the Storyteller's choice (r3101), not a derived
    // default: the bag keeps an existing legal choice and stays without one
    // otherwise, so setup validation asks the host for it.
    const good = roles.filter(
      (id) => id !== "eviltwin" && (roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider"),
    );
    if (state.setup.evilTwinGoodId && !good.includes(state.setup.evilTwinGoodId))
      state.setup.evilTwinGoodId = null;
  }

  if (!roles.includes("lunatic")) {
    state.setup.lunaticShownId = null;
    if (state.setup.lunaticShownExplicit !== undefined) state.setup.lunaticShownExplicit = false;
    if (state.setup.lunaticBluffs !== undefined) state.setup.lunaticBluffs = [];
  } else {
    const demons = scriptRoles.filter((id) => roleTeam(id) === "demon");
    const inPlay = roles.find((id) => roleTeam(id) === "demon");
    // Older histories use a sticky mask and must keep metadata omitted: the
    // canonical state also seeds future random commands during replay.
    if (
      state.setup.lunaticShownExplicit === false ||
      !state.setup.lunaticShownId ||
      !demons.includes(state.setup.lunaticShownId)
    ) {
      state.setup.lunaticShownId = inPlay || demons[0] || null;
      if (state.setup.lunaticShownExplicit !== undefined) state.setup.lunaticShownExplicit = false;
    }
    if (state.setup.lunaticBluffs !== undefined) {
      const eligible = bluffCandidates({ pool: scriptRoles, roles, recipient: "lunatic" });
      state.setup.lunaticBluffs = [...new Set(state.setup.lunaticBluffs)]
        .filter((id) => eligible.includes(id))
        .slice(0, 3);
    }
  }

  if (!roles.includes("drunk")) {
    state.setup.drunkShownId = null;
  } else {
    const current = state.setup.drunkShownId;
    const valid =
      current &&
      scriptRoles.includes(current) &&
      roleTeam(current) === "townsfolk" &&
      !roles.includes(current);
    if (!valid) {
      const unused = scriptRoles.filter(
        (id) => roleTeam(id) === "townsfolk" && !roles.includes(id),
      );
      state.setup.drunkShownId = unused[0] || null;
    }
  }

  const needed = requiredBluffs(state.setup.count);
  if (!needed) {
    state.setup.bluffs = [];
  } else {
    const seen = new Set();
    const eligible = bluffCandidates({
      pool: scriptRoles,
      roles,
      drunkShownId: state.setup.drunkShownId,
      recipient: "demon",
    });
    state.setup.bluffs = (Array.isArray(state.setup.bluffs) ? state.setup.bluffs : [])
      .filter((id) => {
        if (!eligible.includes(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 3);
  }
}

function resetGameForSetup(state: GameState) {
  state.night = { number: 0, queue: [], currentIndex: 0, demonChanged: false };
  state.day = {
    number: 0,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: false,
  };
  state.deaths = [];
  state.executions = [];
  state.effects = [];
  state.corrections = [];
  state.gossip = null;
  state.mastermind = null;
  state.fangguJumped = false;
  state.winner = null;
  state.reviewOpen = false;
  state.publicRevealed = false;
  state.bluffs = [];
  state.herringId = null;
  state.setup.ready = false;
  state.log = [];
}

export function bagUpdate(
  state: GameState,
  payload: CommandPayloads["bagUpdate"],
  ports: CommandExecutionContext = systemPorts,
) {
  const patch = payload.patch || {};
  // A roster reset is the supported route back to setup. Every other bag edit
  // belongs to the setup family and must not reach a running game.
  const resets = patch.resetRoster === true || patch.count != null;
  if (!resets) {
    const guard = lifecycleGuard(state, "bagUpdate");
    if (guard) return guard;
  }
  if (patch.phase != null && (patch.phase !== "setup" || patch.resetRoster !== true)) {
    return { ok: false, errorCode: "error.47", error: "Игра уже началась." };
  }
  const count = patch.count != null ? Number(patch.count) : state.setup.count;
  if (!Number.isInteger(count) || count < 5 || count > 15) {
    return { ok: false, errorCode: "error.bag-count", error: "Игроков должно быть от 5 до 15." };
  }

  if (patch.script) {
    const normalized = normalizeScript(patch.script);
    if (!normalized.ok) return normalized;
    if (!normalized.script)
      return { ok: false, errorCode: "error.script", error: "Некорректный сценарий." };
    state.script = normalized.script;
    state.scriptId = normalized.script.id;
  }

  if (patch.resetRoster) {
    setRoster(state, count);
    resetGameForSetup(state);
    state.phase = "setup";
  } else if (patch.count != null) {
    setRoster(state, count);
    resetGameForSetup(state);
  }

  const scriptRoles = (state.script && state.script.roles) || [];
  if (patch.roles != null) {
    if (!Array.isArray(patch.roles))
      return { ok: false, errorCode: "error.roles", error: "Некорректный список ролей." };
    for (const id of patch.roles) {
      if (!isSupportedRole(id)) {
        return { ok: false, errorCode: "error.unknown", error: "Неизвестная роль: " + id };
      }
      if (!scriptRoles.includes(id)) {
        return {
          ok: false,
          errorCode: "error.outside-script",
          error: "Роль не входит в сценарий: " + id,
        };
      }
    }
    state.setup.roles = patch.roles.slice();
  }
  if (patch.bluffs != null) {
    if (!Array.isArray(patch.bluffs))
      return { ok: false, errorCode: "error.roles", error: "Некорректный список блефов." };
    for (const id of patch.bluffs) {
      if (!isSupportedRole(id)) {
        return { ok: false, errorCode: "error.unknown", error: "Неизвестная роль: " + id };
      }
      if (!scriptRoles.includes(id)) {
        return {
          ok: false,
          errorCode: "error.bluffs-outside-script",
          error: "Блеф не входит в сценарий: " + id,
        };
      }
    }
    state.setup.bluffs = patch.bluffs.slice();
  }
  if (patch.drunkShownId !== undefined) state.setup.drunkShownId = patch.drunkShownId;
  if (patch.lunaticShownId !== undefined) {
    state.setup.lunaticShownId = patch.lunaticShownId;
    if (patch.lunaticShownExplicit === undefined && state.setup.lunaticShownExplicit !== undefined)
      state.setup.lunaticShownExplicit = patch.lunaticShownId != null;
  }
  if (patch.lunaticShownExplicit !== undefined) {
    if (typeof patch.lunaticShownExplicit !== "boolean")
      return {
        ok: false,
        errorCode: "error.lunatic-mode",
        error: "Некорректный режим роли Безумца.",
      };
    state.setup.lunaticShownExplicit = patch.lunaticShownExplicit;
  }
  if (patch.lunaticBluffs !== undefined) {
    const eligible = bluffCandidates({
      pool: scriptRoles,
      roles: state.setup.roles,
      recipient: "lunatic",
    });
    if (
      !Array.isArray(patch.lunaticBluffs) ||
      patch.lunaticBluffs.length > 3 ||
      new Set(patch.lunaticBluffs).size !== patch.lunaticBluffs.length ||
      patch.lunaticBluffs.some((id) => !eligible.includes(id))
    )
      return {
        ok: false,
        errorCode: "error.lunatic-bluffs",
        error: "Выберите до трёх разных добрых ролей из сценария для Безумца.",
      };
    state.setup.lunaticBluffs = patch.lunaticBluffs.slice();
  }
  if (patch.godfatherOutsider !== undefined)
    state.setup.godfatherOutsider = patch.godfatherOutsider;
  if (patch.evilTwinGoodId !== undefined) state.setup.evilTwinGoodId = patch.evilTwinGoodId;

  normalizeBag(state);
  if (patch.shuffleBluffs !== undefined) {
    const recipient = patch.shuffleBluffs;
    if (recipient !== "demon" && recipient !== "lunatic")
      return {
        ok: false,
        errorCode: "error.bluffs-recipient",
        error: "Неизвестный получатель блефов.",
      };
    if (recipient === "demon" && !requiredBluffs(state.setup.count))
      return {
        ok: false,
        errorCode: "error.bluffs-small-game",
        error: "Демон получает блефы только при семи и более игроках.",
      };
    if (recipient === "lunatic" && !state.setup.roles.includes("lunatic"))
      return { ok: false, errorCode: "error.lunatic-missing", error: "В мешке нет Безумца." };
    const selected = randomBluffs(
      {
        pool: scriptRoles,
        roles: state.setup.roles,
        drunkShownId: state.setup.drunkShownId,
        recipient,
      },
      () => ports.rng.next(),
    );
    if (!selected)
      return {
        ok: false,
        errorCode: "error.bluffs-pool",
        error: "В сценарии недостаточно подходящих добрых ролей для трёх блефов.",
      };
    if (recipient === "lunatic") state.setup.lunaticBluffs = selected;
    else state.setup.bluffs = selected;
  }
  return { ok: true };
}

export function setOrder(
  state: GameState,
  payload: CommandPayloads["setOrder"],
  ports: CommandExecutionContext = systemPorts,
) {
  const guard = lifecycleGuard(state, "setOrder", ports.rulesetVersion);
  if (guard) return guard;
  const order = Array.isArray(payload.order) ? payload.order.map(String) : null;
  if (!order) return { ok: false, errorCode: "error.order", error: "Некорректный порядок мест." };
  const ids = Object.keys(state.players);
  if (
    order.length !== ids.length ||
    new Set(order).size !== order.length ||
    order.some((id) => !state.players[id])
  ) {
    return {
      ok: false,
      errorCode: "error.order",
      error: "Порядок мест должен содержать каждого игрока один раз.",
    };
  }
  state.order = order;
  // `seat` mirrors the order: validateState and importGame require it, so an
  // unsynced reorder would save a game that cannot be loaded back.
  order.forEach((id, index) => {
    const player = state.players[id];
    if (player) player.seat = index + 1;
  });
  if (state.phase === "deal") state.phase = "seat";
  return { ok: true };
}

export function setHerring(state: GameState, payload: CommandPayloads["setHerring"]) {
  const guard = lifecycleGuard(state, "setHerring");
  if (guard) return guard;
  if (payload.playerId == null || payload.playerId === "") {
    state.setup.herringId = null;
    return { ok: true };
  }
  const player = playerById(state, payload.playerId);
  if (!player) return { ok: false, errorCode: "error.1", error: "Игрок не найден." };
  if (realTeamOf(player) !== "good")
    return {
      ok: false,
      errorCode: "error.herring-team",
      error: "Красная селёдка должна быть добрым игроком.",
    };
  state.setup.herringId = player.id;
  return { ok: true };
}

export function setupInfo(
  state: GameState,
  payload: {
    roleId: CommandPayloads["setSetupInfo"]["roleId"];
    info?: unknown;
  },
) {
  const guard = lifecycleGuard(state, "setSetupInfo");
  if (guard) return guard;
  const roleId = payload.roleId;
  if (!INFO_ROLES[roleId]) return { ok: false, error: "Неизвестная информационная роль." };
  const patch = (
    payload.info !== null && typeof payload.info === "object" ? payload.info : null
  ) as Record<string, unknown> | null;
  if (!patch) return { ok: false, error: "Некорректная информация." };
  if (patch.zero === true) {
    state.setup.info[roleId] = { zero: true, pair: [] };
    return { ok: true };
  }
  const current = state.setup.info[roleId];
  const basePair: [string, string] = current && "roleId" in current ? current.pair : ["", ""];
  const pair =
    Array.isArray(patch.pair) &&
    patch.pair.length === 2 &&
    typeof patch.pair[0] === "string" &&
    typeof patch.pair[1] === "string"
      ? ([patch.pair[0], patch.pair[1]] as [string, string])
      : basePair;
  // An explicit string is the host's choice: a supported role, or "" to clear
  // it. Anything else keeps the stored role, so a pair edit cannot drop it.
  const chosenRole =
    typeof patch.roleId === "string" && (patch.roleId === "" || isSupportedRole(patch.roleId))
      ? (patch.roleId as InfoPair["roleId"])
      : current && "roleId" in current
        ? current.roleId
        : ("" as InfoPair["roleId"]);
  const next: InfoPair = {
    roleId: chosenRole,
    pair,
    ...(typeof patch.matchIndex === "number" ? { matchIndex: patch.matchIndex } : {}),
    ...(typeof patch.forDrunk === "boolean" ? { forDrunk: patch.forDrunk } : {}),
  };
  state.setup.info[roleId] = next;
  return { ok: true };
}

export function normalizeSecrets(state: GameState) {
  const guard = lifecycleGuard(state, "normalizeSecrets");
  if (guard) return guard;
  const players = Object.values(state.players || {});
  const has = (roleId: string) => players.some((player): boolean => player.roleId === roleId);
  if (has("librarian") && !players.some((player) => roleTeam(player.roleId || "") === "outsider")) {
    state.setup.info.librarian = { zero: true, pair: [] };
  }
  return { ok: true };
}

export function setNotes(state: GameState, payload: CommandPayloads["setNotes"]) {
  state.notes = String(payload.notes || "");
  return { ok: true };
}

export function setReviewOpen(state: GameState, payload: CommandPayloads["setReviewOpen"]) {
  state.reviewOpen = Boolean(payload.open);
  return { ok: true };
}

export function newGame(
  state: GameState,
  payload: CommandPayloads["newGame"],
  ports: CommandExecutionContext = systemPorts,
) {
  const count = payload.count == null ? 8 : Number(payload.count);
  if (!Number.isInteger(count) || count < 5 || count > 15) {
    return { ok: false, error: "Игроков должно быть от 5 до 15." };
  }
  replaceContents(state, createGame(count, ports));
  return { ok: true };
}

export function importGame(state: GameState, payload: CommandPayloads["importGame"]) {
  const imported = importState(String(payload.text == null ? "" : payload.text));
  if (!imported.ok) return { ok: false, error: imported.error };
  replaceContents(state, imported.state);
  return { ok: true };
}
