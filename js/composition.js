// @ts-check
// Composition root for the legacy side. These two adapters are the only place
// where the application ports meet the current engine and model; the change
// that moves them into src/core deletes this file.
import {
  RULESET_VERSION,
  SUPPORTED_RULESET_VERSIONS,
  applyCommand,
  previewCommand,
  validateCommand
} from "./engine/commands.js";
import { createRuntime } from "./engine/runtime.js";
import {
  createGame,
  exportGame,
  importGame as importState,
  migrateV2,
  migrateV3,
  normalizeScriptState,
  validateState
} from "./model.js";
import { validatedFromUnknown } from "../src/core/model/validated.ts";

/** @typedef {import("../src/application/ports/index.ts").CommandExecutor} CommandExecutor */
/** @typedef {import("../src/application/ports/index.ts").StateCodec} StateCodec */
/** @typedef {import("../src/core/commands/contracts.ts").PreparedCommand} PreparedCommand */
/** @typedef {import("../src/core/commands/result.ts").DomainOutcome} DomainOutcome */
/** @typedef {import("../src/core/model/validated.ts").ValidationOutcome} ValidationOutcome */
/** @typedef {import("./types.js").GameState} GameState */

const LEGACY_DEFAULT_NAMES = [
  "Алиса", "Бен", "Кара", "Дев", "Элла", "Финн", "Гвен", "Хьюго",
  "Ирис", "Джек", "Кейт", "Лиам", "Мона", "Нейт", "Оливия",
  "Alice", "Ben", "Cara", "Dev", "Ella", "Finn", "Gwen", "Hugo",
  "Iris", "Jack", "Kate", "Liam", "Mona", "Nate", "Olive"
];

/** @param {GameState} game */
function clearUnclaimedDefaultNames(game) {
  for (const player of Object.values(game.players || {})) {
    const seat = Number(player.seat) - 1;
    const legacy = [LEGACY_DEFAULT_NAMES[seat], LEGACY_DEFAULT_NAMES[seat + 15]];
    if (!player.claimed && player.name && (legacy.includes(player.name) || /^(Player|Игрок) \d+$/.test(player.name))) {
      player.name = "";
      player.claimed = false;
    }
  }
}

/** @returns {CommandExecutor} */
export function createLegacyCommandExecutor() {
  const runtime = createRuntime();
  return {
    rulesetVersion: RULESET_VERSION,
    supportedRulesetVersions: SUPPORTED_RULESET_VERSIONS,
    validate: (/** @type {GameState} */ state, /** @type {PreparedCommand} */ command) =>
      /** @type {DomainOutcome} */ (/** @type {unknown} */ (validateCommand(state, command, runtime))),
    preview: (/** @type {GameState} */ state, /** @type {PreparedCommand} */ command) =>
      /** @type {DomainOutcome} */ (/** @type {unknown} */ (previewCommand(state, command, runtime))),
    apply: (/** @type {GameState} */ state, /** @type {PreparedCommand} */ command) =>
      /** @type {DomainOutcome} */ (/** @type {unknown} */ (applyCommand(state, command, runtime)))
  };
}

/** @type {StateCodec} */
export const legacyStateCodec = {
  create: (count) => createGame(count),

  parse(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, errors: [{ code: "state-missing", message: "Saved game is missing." }] };
    }
    const record = /** @type {Record<string, unknown>} */ (raw);
    const version = record.v;
    /** @type {GameState} */
    let candidate;
    if (version === 4) candidate = /** @type {GameState} */ (/** @type {unknown} */ (record));
    else if (version === 3) candidate = migrateV3(record);
    else if (version === 2) candidate = migrateV2(record);
    else {
      return { ok: false, errors: [{ code: "state-version", message: "Unsupported schema version: " + String(version) }] };
    }
    normalizeScriptState(candidate);
    /** @type {ValidationOutcome} */
    const outcome = validatedFromUnknown(candidate, validateState);
    if (outcome.ok && version === 2) clearUnclaimedDefaultNames(outcome.state);
    return outcome;
  },

  exportGame: (state) => exportGame(state),

  importGame(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: "The file is not JSON: " + message };
    }
    const result = importState(parsed);
    return result.ok
      ? { ok: true, state: result.state }
      : { ok: false, error: result.error, errorCode: result.errorCode };
  }
};

export const legacyCommandExecutor = createLegacyCommandExecutor();
