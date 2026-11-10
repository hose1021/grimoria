// @ts-check
import { esc, modalFocus } from "./ui.js";
import { state as storeState, dispatch } from "./store.js";
import { roleById as catalogRoleById, imageFor, allRoles } from "./roles.js";
import {
  COMPOSITION, TEAMS, bagCounts, compositionFor,
  isBmrScript, isMixedEdition, isSnvScript, randomBag, requiredBluffs,
  roleLabel, roleTeam, teamLabel
} from "./rules.js";
import {
  CUSTOM_LABELS, CUSTOM_NOTES, PRESET_LABELS, PRESET_NOTES, bagFixHints,
  bagMechanics, customSuggestions, deriveBagExtras, presetBag, repairBag,
  resizeBag
} from "./presets.js";
import {
  exportLibrary, normalizeLibrary, parseLibrary, readLibrary, removeBag,
  removePool, upsertBag, upsertPool, writeLibrary
} from "./library.js";
import { OFFICIAL_SCRIPTS, badMoonRisingScript, parseScript, sectsAndVioletsScript, troubleBrewingScript } from "./scripts.js";
import { setupErrors } from "./engine.js";
import { go, path } from "./router.js";
import { t, roleCount } from "./strings.js";

/** @typedef {import("./types.js").Command} Command */
/** @typedef {import("./types.js").GameState} GameState */
/** @typedef {import("./types.js").Role} Role */
/** @typedef {import("./types.js").RoleId} RoleId */
/** @typedef {import("./types.js").Script} Script */
/** @typedef {import("./types.js").Player} Player */
/** @typedef {{ roles: RoleId[], bluffs?: RoleId[], drunkShownId?: RoleId | null, lunaticShownId?: RoleId | null, godfatherOutsider?: 1 | -1, evilTwinGoodId?: RoleId | null, valid?: boolean }} Bag */
/** @typedef {Bag & { key: string, labelKey: string, noteKey: string, label?: string }} BagEntry */
/** @typedef {{ script: Script, travellers?: string[] }} ScriptPreview */
/** @typedef {{ code?: string }} BagHint */

/** @type {GameState} */
const state = storeState;

// The store fills in a command id when the caller omits it.
/** @type {(command: Omit<Command, "id">) => any} */
const send = /** @type {any} */ (dispatch);

const MIN = 5;
const MAX = 15;
const SCRIPT_IDS = ["tb", "bmr", "snv"];
/** @type {AbortController | null} */
let abort = null;
let armed = false;
let bagError = "";

let tab = "recommended";
let search = "";
let editionFilter = "";
let teamFilter = "all";
let poolMode = false;
/** @type {BagEntry | null} */
let preview = null;

// Local (not persisted) state of the scenario picker.
let pickerOpen = false;
let pickerChoice = "tb";
let pickerSection = "";
let pickerError = "";
/** @type {ScriptPreview | null} */
let pickerPreview = null;
let pickerUrl = "";
let pickerText = "";

// Named pools/bags, loaded on mount.
let library = normalizeLibrary(null);
let libraryOpen = false;
let libraryError = "";
let libraryName = "";
/** @type {string | null} */
let activePoolId = null;
/** @type {string | null} */
let activeBagId = null;

// Manual edits are not store actions; keep a short local undo stack.
/** @type {string[]} */
let undoStack = [];

/** @returns {1 | -1} */
function godfatherShift() {
  return state.setup && state.setup.godfatherOutsider === -1 ? -1 : 1;
}

/** @returns {RoleId[]} */
function scriptRoles() {
  return (state.script && Array.isArray(state.script.roles)) ? state.script.roles : [];
}

function isOfficial() {
  return Boolean(state.script && SCRIPT_IDS.includes(state.script.id));
}

function isCustom() {
  return !isOfficial();
}

/** @param {RoleId | null | undefined} id @returns {Role} */
function roleOf(id) {
  const roleId = id ?? "";
  return /** @type {Role} */ (/** @type {unknown} */ (catalogRoleById(roleId) || {
    id: roleId,
    name: roleLabel(roleId),
    team: roleTeam(roleId),
    edition: null,
    ability: "",
    image: null
  }));
}

function hasGame() {
  return state.phase !== "setup" && Object.values(state.players).some((p) => p.roleId);
}

/** @returns {Role[]} */
function catalog() {
  return allRoles().filter((role) => (
    SCRIPT_IDS.includes(role.edition) && role.team !== "traveller"
  ));
}

/** @param {RoleId} id @returns {boolean} */
function inPool(id) {
  return scriptRoles().includes(id);
}

/** @returns {string} */
function snapshot() {
  return JSON.stringify({
    count: state.setup.count,
    roles: state.setup.roles,
    bluffs: state.setup.bluffs,
    drunkShownId: state.setup.drunkShownId,
    lunaticShownId: state.setup.lunaticShownId,
    godfatherOutsider: state.setup.godfatherOutsider,
    evilTwinGoodId: state.setup.evilTwinGoodId,
    scriptId: state.scriptId,
    script: state.script ? { ...state.script, roles: state.script.roles.slice() } : null
  });
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 30) undoStack.shift();
}

/** @param {() => void} refresh */
function undoBag(refresh) {
  const last = undoStack.pop();
  if (!last) return;
  const parsed = JSON.parse(last);
  send({
    type: "bagUpdate",
    payload: {
      patch: {
        script: parsed.script || undefined,
        count: parsed.count,
        resetRoster: true,
        phase: "setup",
        roles: parsed.roles,
        bluffs: parsed.bluffs,
        drunkShownId: parsed.drunkShownId,
        lunaticShownId: parsed.lunaticShownId,
        godfatherOutsider: parsed.godfatherOutsider,
        evilTwinGoodId: parsed.evilTwinGoodId
      }
    }
  });
  armed = false;
  bagError = "";
  refresh();
}

/** @param {HTMLElement} root */
export function mount(root) {
  if (abort) abort.abort();
  abort = new AbortController();
  const { signal } = abort;

  pickerOpen = false;
  pickerError = "";
  pickerPreview = null;
  preview = null;
  poolMode = false;
  libraryError = "";
  libraryName = "";
  activePoolId = null;
  activeBagId = null;
  undoStack = [];
  tab = "recommended";
  search = "";
  editionFilter = state.script && SCRIPT_IDS.includes(state.script.id) ? state.script.edition : "all";
  teamFilter = "all";
  pickerChoice = isOfficial() ? state.script.id : "custom";
  const loaded = readLibrary();
  library = loaded.ok ? loaded.library : normalizeLibrary(null);
  if (!loaded.ok) libraryError = t("bag.importFail");

  // The pool is derived from the active script. Cache it per script object:
  // applyScript() replaces state.script, which invalidates the cache without a
  // reload.
  /** @type {Role[] | null} */
  let rolePool = null;
  /** @type {Script | null} */
  let rolePoolScript = null;
  /** @returns {Role[]} */
  function poolRoles() {
    if (rolePool && rolePoolScript === state.script) return rolePool;
    const catalogOrder = new Map(allRoles().map((role, index) => [role.id, index]));
    rolePool = scriptRoles().map((id) => roleOf(id)).filter(Boolean)
      .sort((a, b) => (catalogOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER)
        - (catalogOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    rolePoolScript = state.script;
    return rolePool;
  }
  /** @param {import("./types.js").Team} team @returns {Role[]} */
  const byTeam = (team) => poolRoles().filter((role) => role.team === team);
  /** @param {RoleId} id @returns {Role | null} */
  const roleById = (id) => poolRoles().find((role) => role.id === id) || null;
  /** @returns {Role[]} */
  const unused = () => poolRoles().filter((role) => !state.setup.roles.includes(role.id));
  /** @returns {Role[]} */
  const unusedGood = () => unused().filter((role) => role.team === "townsfolk" || role.team === "outsider");
  /** @returns {Role[]} */
  const unusedTownsfolk = () => unused().filter((role) => role.team === "townsfolk");

  function beginSetup() {
    if (state.phase === "setup") return true;
    if (!window.confirm(t("ui.changeBag"))) return false;
    send({
      type: "bagUpdate",
      payload: {
        patch: { count: state.setup.count, resetRoster: true, phase: "setup" }
      }
    });
    return true;
  }

  function refresh() {
    if (!setupErrors(state).length) bagError = "";
    render();
  }

  /** @param {number} count @returns {{ roles: RoleId[], bluffs: RoleId[], drunkShownId: RoleId | null } | null} */
  function tryRandomBag(count) {
    try {
      const bag = randomBag(count, Math.random, scriptRoles(), {
        godfatherOutsider: godfatherShift()
      });
      bagError = "";
      return bag;
    } catch (error) {
      bagError = /** @type {Error} */ (error).message;
      return null;
    }
  }

  /** @param {Bag} bag */
  function applyBag(bag) {
    if (!bag || bag.valid === false) {
      bagError = t("illegal");
      render();
      return;
    }
    if (!beginSetup()) return;
    send({
      type: "bagUpdate",
      payload: {
        patch: {
          count: bag.roles.length,
          resetRoster: true,
          phase: "setup",
          roles: bag.roles.slice(),
          bluffs: (bag.bluffs || []).slice(),
          drunkShownId: bag.drunkShownId || null,
          lunaticShownId: bag.lunaticShownId || null,
          godfatherOutsider: bag.godfatherOutsider || 1,
          evilTwinGoodId: bag.evilTwinGoodId || null
        }
      }
    });
    armed = false;
    bagError = "";
    refresh();
  }

  /** @param {number} next */
  function setCount(next) {
    if (next < MIN || next > MAX) return;
    if (next === state.setup.count) return;
    if (hasGame() && !window.confirm(t("ui.changeCount"))) return;
    pushUndo();
    const kept = resizeBag({
      count: next,
      roles: state.setup.roles,
      pool: scriptRoles(),
      godfatherOutsider: godfatherShift()
    });
    send({ type: "bagUpdate", payload: { patch: { count: next, roles: kept } } });
    armed = false;
    refresh();
  }

  /** @param {RoleId} id */
  function toggleRole(id) {
    if (!beginSetup()) return;
    let script = null;
    if (!inPool(id)) {
      if (!isCustom()) {
        bagError = t("bag.roleOutside");
        render();
        return;
      }
      const pool = scriptRoles().slice();
      pool.push(id);
      script = { ...state.script, roles: pool, manualOnly: isMixedEdition(pool) };
    }
    pushUndo();
    const roles = state.setup.roles.slice();
    const at = roles.indexOf(id);
    if (at === -1) roles.push(id);
    else roles.splice(at, 1);
    send({
      type: "bagUpdate",
      payload: { patch: { ...(script ? { script } : {}), roles } }
    });
    armed = false;
    refresh();
  }

  /** @param {RoleId} id */
  function togglePoolRole(id) {
    if (!isCustom()) return;
    if (!beginSetup()) return;
    pushUndo();
    const pool = scriptRoles().slice();
    const roles = state.setup.roles.slice();
    const at = pool.indexOf(id);
    if (at === -1) pool.push(id);
    else {
      pool.splice(at, 1);
      const bagAt = roles.indexOf(id);
      if (bagAt !== -1) roles.splice(bagAt, 1);
    }
    send({
      type: "bagUpdate",
      payload: { patch: { script: { ...state.script, roles: pool, manualOnly: isMixedEdition(pool) }, roles } }
    });
    armed = false;
    refresh();
  }

  /** @param {Role} role @returns {string} */
  function roleCard(role) {
    const selected = state.setup.roles.includes(role.id);
    const allowed = inPool(role.id) || isCustom() || poolMode;
    const mode = poolMode ? "pool" : "bag";
    const pressed = poolMode ? inPool(role.id) : selected;
    return `
      <button class="bag-role ${pressed ? "is-on" : "is-off"}${isCustom() && inPool(role.id) ? " is-pool" : ""}${allowed ? "" : " is-locked"}"
        type="button" data-role="${esc(role.id)}" data-team="${esc(role.team)}"
        aria-pressed="${pressed}" ${allowed ? "" : "disabled"}
        title="${allowed ? "" : esc(t("bag.roleOutside"))}">
        <img src="${esc(imageFor(role))}" alt="">
        <span class="bag-role-text">
          <b>${esc(role.name)}</b>
          <span>${esc(role.ability || "")}</span>
          <em>${esc(teamLabel(role.team))} · ${esc(editionLabel(role.edition))}</em>
        </span>
        ${mode === "pool" ? `<span class="bag-role-mode">${pressed ? "✓" : "+"}</span>` : ""}
      </button>`;
  }

  /** @param {string | null | undefined} edition @returns {string} */
  function editionLabel(edition) {
    return /** @type {Record<string, string>} */ ({ tb: "TB", bmr: "BMR", snv: "S&V" })[edition || ""] || (edition || "");
  }

  function compositionMarkup() {
    const req = compositionFor(state.setup.count, state.setup.roles, godfatherShift()) || {
      townsfolk: 0, outsider: 0, minion: 0, demon: 0
    };
    const got = bagCounts(state.setup.roles);
    return TEAMS.map((team) => {
      const ok = got[team] === req[team];
      return `<span class="bag-count-chip ${ok ? "is-ok" : "is-bad"}">
        <i class="bag-dot bag-dot--${team}" aria-hidden="true"></i>
        ${esc(teamLabel(team))}
        <b>${got[team]}/${req[team]}</b>
      </span>`;
    }).join("");
  }

  function statusMarkup() {
    const errors = setupErrors(state);
    if (!errors.length) {
      return `<p class="bag-status is-ok" role="status">${esc(t("legal"))} · ${esc(t("legalRandom"))}</p>`;
    }
    return `<div class="bag-status is-bad" role="status">
      <b>${esc(t("illegal"))}</b>
      <ul>${errors.map((error) => `<li>${esc(error.message)}</li>`).join("")}</ul>
    </div>`;
  }

  function hintMarkup() {
    const hints = bagFixHints({
      count: state.setup.count,
      roles: state.setup.roles,
      pool: scriptRoles(),
      godfatherOutsider: godfatherShift()
    });
    if (!hints.length) return "";
    return `<ul class="bag-hints">${hints.map((hint) => {
      if (hint.code === "need-team") {
        return `<li>${esc(t("bag.needTeam", { n: hint.missing, team: teamLabel(hint.team) }))}</li>`;
      }
      if (hint.code === "remove-team") {
        return `<li>${esc(t("bag.removeTeam", { n: hint.extra, team: teamLabel(hint.team) }))}</li>`;
      }
      if (hint.code === "need-demon") return `<li>${esc(t("bag.needDemon"))}</li>`;
      if (hint.code === "mixed-edition") return `<li>${esc(t("bag.mixWarning"))}</li>`;
      return "";
    }).join("")}</ul>`;
  }

  function bluffsMarkup() {
    if (!requiredBluffs(state.setup.count)) {
      return `<p class="bag-note">${esc(t("noBluffs"))}</p>`;
    }
    const options = unusedGood().filter((role) => (
      role.id !== state.setup.drunkShownId && !state.setup.bluffs.includes(role.id)
    ));
    return `
      <div class="bag-bluff-slots" aria-label="${esc(t("bluffs"))}">
        ${[0, 1, 2].map((index) => {
          const role = roleById(state.setup.bluffs[index]);
          return `<button class="bag-bluff-slot${role ? " is-on" : ""}" type="button"
            data-bluff-slot="${index}" aria-label="${esc(t("bluffs"))} ${index + 1}">
            ${role
              ? `<img src="${esc(imageFor(role))}" alt=""><b>${esc(role.name)}</b>`
              : `<span class="bag-bluff-empty">${esc(t("ui.empty"))}</span>`}
          </button>`;
        }).join("")}
      </div>
      <div class="bag-bluff-pool" aria-label="${esc(t("ui.availableBluffs"))}">
        ${options.map((role) => `
          <button class="bag-bluff-token" type="button" data-bluff-role="${esc(role.id)}"
            aria-label="${esc(role.name)}" ${state.setup.bluffs.length >= 3 ? "disabled" : ""}>
            <img src="${esc(imageFor(role))}" alt="">
            <span>${esc(role.name)}</span>
          </button>`).join("") || `<p class="bag-note">${esc(t("none"))}</p>`}
      </div>
      <p class="bag-note">${esc(t("chooseBluffs"))} ${esc(t("drunkWarning"))}</p>`;
  }

  function drunkMarkup() {
    if (!state.setup.roles.includes("drunk")) return "";
    const options = unusedTownsfolk();
    return `
      <div class="bag-secret-row">
        <span class="label">${esc(t("drunkShown"))}</span>
        <div class="bag-drunk-pool">
          ${options.map((role) => `
            <button class="bag-bluff-token ${state.setup.drunkShownId === role.id ? "is-on" : ""}"
              type="button" data-drunk-role="${esc(role.id)}" aria-pressed="${state.setup.drunkShownId === role.id}">
              <img src="${esc(imageFor(role))}" alt="">
              <span>${esc(role.name)}</span>
            </button>`).join("")}
        </div>
      </div>`;
  }

  function godfatherMarkup() {
    if (!state.setup.roles.includes("godfather")) return "";
    return `<div class="bag-secret-row">
      <span class="label">${esc(t("godfatherSetup"))}</span>
      <div class="bag-drunk-pool">
        ${[1, -1].map((value) => `
          <button class="bag-bluff-token ${state.setup.godfatherOutsider === value ? "is-on" : ""}"
            type="button" data-godfather="${value}" aria-pressed="${state.setup.godfatherOutsider === value}">
            <span>${esc(value === 1 ? t("godfatherPlus") : t("godfatherMinus"))}</span>
          </button>`).join("")}
      </div>
      <p class="bag-note">${esc(t("godfatherHint"))}</p>
    </div>`;
  }

  function evilTwinMarkup() {
    if (!state.setup.roles.includes("eviltwin")) return "";
    const good = state.setup.roles
      .filter((id) => id !== "eviltwin" && (roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider"));
    return `<div class="bag-secret-row">
      <span class="label">${esc(t("evilTwinGood"))}</span>
      <div class="bag-drunk-pool">
        ${good.map((id) => {
          const role = roleOf(id);
          return `<button class="bag-bluff-token ${state.setup.evilTwinGoodId === id ? "is-on" : ""}"
            type="button" data-evil-twin="${esc(id)}" aria-pressed="${state.setup.evilTwinGoodId === id}">
            <img src="${esc(imageFor(role))}" alt="">
            <span>${esc(role.name)}</span>
          </button>`;
        }).join("")}
      </div>
      <p class="bag-note">${esc(t("evilTwinHint"))}</p>
    </div>`;
  }

  function lunaticMarkup() {
    if (!state.setup.roles.includes("lunatic")) return "";
    const demons = poolRoles().filter((role) => role.team === "demon");
    return `<div class="bag-secret-row">
      <span class="label">${esc(t("lunaticShown"))}</span>
      <div class="bag-drunk-pool">
        ${demons.map((role) => `
          <button class="bag-bluff-token ${state.setup.lunaticShownId === role.id ? "is-on" : ""}"
            type="button" data-lunatic-role="${esc(role.id)}" aria-pressed="${state.setup.lunaticShownId === role.id}">
            <img src="${esc(imageFor(role))}" alt="">
            <span>${esc(role.name)}</span>
          </button>`).join("")}
      </div>
      <p class="bag-note">${esc(t("lunaticHint"))}</p>
    </div>`;
  }

  /** @param {Bag | null | undefined} bag @param {string} noteKey @returns {string} */
  function noteFor(bag, noteKey) {
    const parts = [t(noteKey)];
    if (!bag) return parts.join(" ");
    const facts = bagMechanics(bag.roles);
    if (facts.information) parts.push(t("bag.fact.info", { n: facts.information }));
    if (facts.protection.length) parts.push(t("bag.fact.protection"));
    if (facts.poison) parts.push(t("bag.fact.poison"));
    if (facts.risk) parts.push(t("bag.fact.risk", { n: facts.risk }));
    if (facts.baron) parts.push(t("bag.fact.baron"));
    if (facts.godfather) parts.push(t("bag.fact.godfather"));
    if (facts.fanggu) parts.push(t("bag.fact.fanggu"));
    if (facts.vigormortis) parts.push(t("bag.fact.vigormortis"));
    if (facts.drunk) parts.push(t("bag.fact.drunk"));
    if (facts.lunatic) parts.push(t("bag.fact.lunatic"));
    if (facts.evilTwin) parts.push(t("bag.fact.evilTwin"));
    if (facts.vortox) parts.push(t("bag.fact.vortox"));
    if (facts.risk >= 2 || facts.poison || facts.lunatic || facts.evilTwin) {
      parts.push(t("bag.fact.complex"));
    }
    return parts.join(" ");
  }

  /** @param {RoleId[]} roles @returns {string} */
  function teamSummary(roles) {
    const counts = bagCounts(roles);
    return TEAMS.map((team) => `${counts[team]} ${teamLabel(team)}`).join(" · ");
  }

  /** @param {RoleId[]} roles @returns {string} */
  function roleTokens(roles) {
    return roles.map((id) => {
      const role = roleOf(id);
      return `<span class="bag-token" data-team="${esc(role.team)}">
        <img src="${esc(imageFor(role))}" alt="">
        <b>${esc(role.name)}</b>
      </span>`;
    }).join("");
  }

  function previewMarkup() {
    if (!preview) return "";
    const bag = preview;
    const facts = bagMechanics(bag.roles);
    return `<div class="script-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <div class="script-picker bag-preview">
        <div class="script-picker-head">
          <div>
            <p class="label">${esc(t("preview"))}</p>
            <h2 id="preview-title">${esc(preview.label || t("bag.previewBag"))}</h2>
          </div>
          <button class="btn script-close" type="button" data-act="close-preview" aria-label="${esc(t("close"))}">✕</button>
        </div>
        <div class="bag-preview-composition">${esc(teamSummary(bag.roles))}</div>
        ${TEAMS.map((team) => {
          const roles = bag.roles.filter((id) => roleTeam(id) === team);
          if (!roles.length) return "";
          return `<div class="bag-preview-group">
            <h3>${esc(teamLabel(team))}</h3>
            <div class="bag-token-row">${roleTokens(roles)}</div>
          </div>`;
        }).join("")}
        <p class="bag-note">${esc(noteFor(bag, preview.noteKey || "bag.previewBag"))}</p>
        ${requiredBluffs(bag.roles.length) ? `<div class="bag-preview-group">
          <h3>${esc(t("bluffs"))}</h3>
          <div class="bag-token-row">${roleTokens(bag.bluffs || [])}</div>
        </div>` : ""}
        ${facts.drunk ? `<p class="bag-note">${esc(t("drunkShown"))}: ${esc(roleOf(bag.drunkShownId).name)}</p>` : ""}
        ${facts.lunatic && bag.lunaticShownId ? `<p class="bag-note">${esc(t("lunaticShown"))}: ${esc(roleOf(bag.lunaticShownId).name)}</p>` : ""}
        ${facts.evilTwin && bag.evilTwinGoodId ? `<p class="bag-note">${esc(t("evilTwinGood"))}: ${esc(roleOf(bag.evilTwinGoodId).name)}</p>` : ""}
        <p class="bag-note">${esc(t("legalNotBalanced"))}</p>
        <div class="script-actions">
          <button class="btn" type="button" data-act="close-preview">${esc(t("cancel"))}</button>
          <button class="btn btn--accent" type="button" data-act="apply-preview"
            ${bag.valid === false ? "disabled" : ""}>${esc(t("apply"))}</button>
        </div>
      </div>
    </div>`;
  }

  /** @param {BagEntry} entry @returns {string} */
  function cardMarkup(entry) {
    const count = entry.roles.length;
    return `<article class="bag-preset-card" data-roles="${esc(entry.roles.join(" "))}">
      <header>
        <div>
          <h3>${esc(t(entry.labelKey))}</h3>
          <span class="bag-preset-meta">${count} ${esc(t("players"))} · ${esc(teamSummary(entry.roles))}</span>
        </div>
        ${entry.valid === false ? `<b class="bag-status is-bad">${esc(t("illegal"))}</b>` : ""}
      </header>
      <div class="bag-token-row">${roleTokens(entry.roles)}</div>
      ${entry.bluffs && entry.bluffs.length ? `<p class="bag-preset-bluffs">${esc(t("bluffs"))}: ${esc(entry.bluffs.map((id) => roleOf(id).name).join(", "))}</p>` : ""}
      <p class="bag-note">${esc(noteFor(entry, entry.noteKey))}</p>
      <div class="bag-preset-actions">
        <button class="btn" type="button" data-preview="${esc(entry.key)}">${esc(t("preview"))}</button>
        <button class="btn btn--accent" type="button" data-apply="${esc(entry.key)}">${esc(t("apply"))}</button>
      </div>
    </article>`;
  }

  function recommendedEntries() {
    const count = state.setup.count;
    /** @type {BagEntry[]} */
    const entries = [];
    if (isOfficial()) {
      for (let variant = 0; variant < 3; variant += 1) {
        const bag = presetBag(state.script.id, count, variant);
        if (!bag) continue;
        entries.push({
          key: "preset-" + variant,
          labelKey: PRESET_LABELS[state.script.id][variant],
          noteKey: PRESET_NOTES[state.script.id][variant],
          ...bag
        });
      }
      return { entries, problems: [] };
    }
    const result = customSuggestions(count, scriptRoles());
    return {
      entries: result.suggestions.map((bag) => ({
        ...bag,
        valid: true
      })),
      problems: result.problems
    };
  }

  function recommendedMarkup() {
    if (isCustom() && scriptRoles().length < 5) {
      return `<div class="bag-empty">
        <p>${esc(t("bag.poolEmpty"))}</p>
        <button class="btn btn--accent" type="button" data-act="edit-pool">${esc(t("bag.editPool"))}</button>
      </div>`;
    }
    const { entries, problems } = recommendedEntries();
    return `
      <div class="bag-preset-grid">${entries.map(cardMarkup).join("")}</div>
      ${problems.length ? `<div class="bag-status is-bad">
        <b>${esc(t("illegal"))}</b>
        <ul>${problems.map((problem) => `<li>${esc(t("custom.problem." + (typeof problem === "string" ? problem : problem.code)))}</li>`).join("")}</ul>
      </div>` : ""}
      <p class="bag-note">${esc(t("legalNotBalanced"))}</p>`;
  }

  function filteredCatalog() {
    const edition = editionFilter || (isOfficial() ? state.script.edition : "all");
    const query = search.trim().toLowerCase();
    const order = new Map(catalog().map((role, index) => [role.id, index]));
    return catalog().filter((role) => {
      if (edition !== "all" && role.edition !== edition) return false;
      if (teamFilter !== "all" && role.team !== teamFilter) return false;
      if (!query) return true;
      return (role.name || "").toLowerCase().includes(query)
        || (role.ability || "").toLowerCase().includes(query)
        || role.id.includes(query);
    }).sort((left, right) => {
      const leftRank = poolMode ? (inPool(left.id) ? 0 : 1) : (state.setup.roles.includes(left.id) ? 0 : inPool(left.id) ? 1 : 2);
      const rightRank = poolMode ? (inPool(right.id) ? 0 : 1) : (state.setup.roles.includes(right.id) ? 0 : inPool(right.id) ? 1 : 2);
      return leftRank - rightRank || (order.get(left.id) || 0) - (order.get(right.id) || 0);
    });
  }

  function manualMarkup() {
    const left = state.setup.count - state.setup.roles.length;
    return `
      <div class="bag-manual-head">
        <p class="bag-remaining"><b>${esc(t("bag.remaining", { n: left }))}</b> · ${esc(t("bag.selected", { n: state.setup.roles.length }))}</p>
        <div class="bag-manual-tools">
          <button class="btn" type="button" data-act="clear">${esc(t("clearBag"))}</button>
          <button class="btn" type="button" data-act="undo" ${undoStack.length ? "" : "disabled"}>${esc(t("undo"))}</button>
          <button class="btn" type="button" data-act="repair">${esc(t("bag.fix"))}</button>
        </div>
      </div>
      <div class="bag-selected">
        ${state.setup.roles.length
          ? state.setup.roles.map((id) => {
              const role = roleOf(id);
              return `<button class="bag-token bag-token--button" type="button"
                data-role="${esc(id)}" data-team="${esc(role.team)}" title="${esc(t("bag.remove"))}">
                <img src="${esc(imageFor(role))}" alt="">
                <b>${esc(role.name)}</b><span aria-hidden="true">×</span>
              </button>`;
            }).join("")
          : `<p class="bag-note">${esc(t("bag.noneSelected"))}</p>`}
      </div>
      <div class="bag-filters">
        <input class="field" type="search" value="${esc(search)}" data-search
          placeholder="${esc(t("bag.search"))}" aria-label="${esc(t("bag.search"))}">
        <select class="field" data-edition aria-label="${esc(t("bag.edition"))}">
          <option value="" ${editionFilter === "" ? "selected" : ""}>${esc(t("bag.activeEdition"))}</option>
          <option value="all" ${editionFilter === "all" ? "selected" : ""}>${esc(t("bag.allEditions"))}</option>
          ${["tb", "bmr", "snv"].map((edition) => `<option value="${edition}" ${editionFilter === edition ? "selected" : ""}>${esc(editionLabel(edition))}</option>`).join("")}
        </select>
        <select class="field" data-team-filter aria-label="${esc(t("team"))}">
          <option value="all" ${teamFilter === "all" ? "selected" : ""}>${esc(t("bag.allTeams"))}</option>
          ${TEAMS.map((team) => `<option value="${team}" ${teamFilter === team ? "selected" : ""}>${esc(teamLabel(team))}</option>`).join("")}
        </select>
        ${isCustom() ? `<button class="btn${poolMode ? " btn--accent" : ""}" type="button" data-act="edit-pool">${esc(poolMode ? t("bag.poolDone") : t("bag.editPool"))}</button>` : ""}
      </div>
      ${poolMode ? `<p class="bag-note bag-pool-hint">${esc(t("bag.poolHint"))}</p>` : ""}
      <div class="bag-grid">${filteredCatalog().map(roleCard).join("")}</div>`;
  }

  function randomMarkup() {
    return `<div class="bag-empty">
      <p>${esc(t("legalRandom"))}</p>
      <p class="bag-note">${esc(t("legalNotBalanced"))}</p>
      <button class="btn btn--accent" type="button" data-act="random">${esc(t("randomBag"))}</button>
      ${statusMarkup()}
    </div>`;
  }

  function tabsMarkup() {
    return ["recommended", "manual", "random"].map((key) => `
      <button class="bag-tab${tab === key ? " is-on" : ""}" type="button" data-tab="${key}"
        aria-selected="${tab === key}" role="tab">${esc(t("tab." + key))}</button>`).join("");
  }

  function scenarioMarkup() {
    const current = isOfficial() ? state.script.id : "custom";
    return `<div class="bag-scenarios" role="tablist" aria-label="${esc(t("script"))}">
      ${["tb", "bmr", "snv", "custom"].map((key) => `
        <button class="bag-scenario${current === key ? " is-on" : ""}" type="button"
          data-scenario="${key}" aria-pressed="${current === key}">
          ${esc(key === "custom" ? t("scriptCustom") : OFFICIAL_SCRIPTS.find((entry) => entry.id === key)?.name || "")}
        </button>`).join("")}
    </div>`;
  }

  function scriptPreviewMarkup() {
    if (!pickerPreview || pickerChoice !== "custom") return "";
    const script = pickerPreview.script;
    const counts = bagCounts(script.roles);
    const teamText = TEAMS.map((team) => `${teamLabel(team)} ${counts[team]}`).join(" · ");
    return `<div class="script-preview" role="status">
      <b>${esc(script.name)}</b>
      <span>${script.roles.length} ${esc(roleCount(script.roles.length))} · ${esc(teamText)}</span>
      ${script.author ? `<span>${esc(t("scriptAuthor"))}: ${esc(script.author)}</span>` : ""}
      ${pickerPreview.travellers && pickerPreview.travellers.length
        ? `<span class="bag-note">${esc(t("scriptTravellersIgnored"))}</span>` : ""}
    </div>`;
  }

  function pickerMarkup() {
    return `<div class="script-modal" role="dialog" aria-modal="true" aria-labelledby="script-picker-title">
      <div class="script-picker">
        <div class="script-picker-head">
          <div>
            <p class="label">Pocket Grimoire</p>
            <h2 id="script-picker-title">${esc(t("scriptPicker"))}</h2>
          </div>
          <button class="btn script-close" type="button" data-act="close-script" aria-label="${esc(t("close"))}">✕</button>
        </div>

        <section class="script-group">
          <h3>${esc(t("scriptOfficial"))}</h3>
          <div class="script-choices">
            ${OFFICIAL_SCRIPTS.map((entry) => `
              <label class="script-choice${entry.supported ? "" : " is-disabled"}">
                <input type="radio" name="script-pick" value="${esc(entry.id)}"
                  ${pickerChoice === entry.id ? "checked" : ""} ${entry.supported ? "" : "disabled"}>
                <span>${esc(entry.name)}</span>
                <small>${entry.roleCount} ${esc(roleCount(entry.roleCount))}${entry.supported ? "" : " · " + esc(t("scriptSoon"))}</small>
              </label>`).join("")}
          </div>
          <p class="bag-note">${esc(t("scriptSoonHint"))}</p>
        </section>

        <details class="script-group" data-script-section="file" ${pickerSection === "file" ? "open" : ""}>
          <summary>${esc(t("scriptLoadFile"))}</summary>
          <input class="field" type="file" accept=".json,application/json" data-script-file
            aria-label="${esc(t("scriptLoadFile"))}">
          <p class="bag-note">${esc(t("scriptFormatHint"))}</p>
        </details>

        <details class="script-group" data-script-section="url" ${pickerSection === "url" ? "open" : ""}>
          <summary>${esc(t("scriptUrl"))}</summary>
          <div class="script-url-row">
            <input class="field" type="url" inputmode="url" placeholder="https://…"
              value="${esc(pickerUrl)}" data-script-url aria-label="${esc(t("scriptUrl"))}">
            <button class="btn" type="button" data-act="script-url">${esc(t("scriptLoad"))}</button>
          </div>
          <p class="bag-note">${esc(t("scriptUrlHint"))}</p>
        </details>

        <details class="script-group" data-script-section="clipboard" ${pickerSection === "clipboard" ? "open" : ""}>
          <summary>${esc(t("scriptClipboard"))}</summary>
          <div class="script-url-row">
            <button class="btn" type="button" data-act="script-clipboard">${esc(t("scriptPaste"))}</button>
            <button class="btn" type="button" data-act="script-text">${esc(t("scriptParse"))}</button>
          </div>
          <textarea class="field script-text" data-script-text
            aria-label="${esc(t("scriptClipboard"))}" placeholder="${esc(t("scriptFormatHint"))}">${esc(pickerText)}</textarea>
        </details>

        <a class="script-external" href="https://script.bloodontheclocktower.com/"
          target="_blank" rel="noopener">${esc(t("scriptBotc"))} ↗</a>

        ${scriptPreviewMarkup()}
        ${pickerError ? `<p class="script-error" role="alert">${esc(pickerError)}</p>` : ""}

        <div class="script-actions">
          <button class="btn" type="button" data-act="close-script">${esc(t("cancel"))}</button>
          <button class="btn btn--accent" type="button" data-act="apply-script"
            ${pickerChoice === "custom" && !pickerPreview ? "disabled" : ""}>${esc(t("scriptApply"))}</button>
        </div>
      </div>
    </div>`;
  }

  function libraryMarkup() {
    if (!libraryOpen) return "";
    return `<div class="script-modal" role="dialog" aria-modal="true" aria-labelledby="library-title">
      <div class="script-picker">
        <div class="script-picker-head">
          <div>
            <p class="label">${esc(t("bag.library"))}</p>
            <h2 id="library-title">${esc(t("bag.library"))}</h2>
          </div>
          <button class="btn script-close" type="button" data-act="close-library" aria-label="${esc(t("close"))}">✕</button>
        </div>
        <div class="script-url-row">
          <input class="field" type="text" value="${esc(libraryName)}" data-library-name
            placeholder="${esc(t("bag.name"))}" aria-label="${esc(t("bag.name"))}">
          <button class="btn" type="button" data-act="save-bag">${esc(t("bag.saveBag"))}</button>
          ${isCustom() ? `<button class="btn" type="button" data-act="save-pool">${esc(t("bag.savePool"))}</button>` : ""}
        </div>
        ${libraryError ? `<p class="script-error" role="alert">${esc(libraryError)}</p>` : ""}
        <div class="bag-library-grid">
          <section>
            <h3>${esc(t("bag.savedBags"))}</h3>
            ${library.bags.length ? library.bags.map((bag) => `
              <div class="bag-library-row">
                <span><b>${esc(bag.name)}</b><small>${bag.roles.length} ${esc(t("players"))}</small></span>
                <button class="btn" type="button" data-load-bag="${esc(bag.id)}">${esc(t("bag.load"))}</button>
                <button class="btn" type="button" data-delete-bag="${esc(bag.id)}">${esc(t("bag.delete"))}</button>
              </div>`).join("") : `<p class="bag-note">${esc(t("bag.libraryEmpty"))}</p>`}
          </section>
          <section>
            <h3>${esc(t("bag.savedPools"))}</h3>
            ${library.pools.length ? library.pools.map((pool) => `
              <div class="bag-library-row">
                <span><b>${esc(pool.name)}</b><small>${pool.roles.length} ${esc(roleCount(pool.roles.length))}</small></span>
                <button class="btn" type="button" data-load-pool="${esc(pool.id)}">${esc(t("bag.load"))}</button>
                <button class="btn" type="button" data-delete-pool="${esc(pool.id)}">${esc(t("bag.delete"))}</button>
              </div>`).join("") : `<p class="bag-note">${esc(t("bag.libraryEmpty"))}</p>`}
          </section>
        </div>
        <div class="script-actions">
          <button class="btn" type="button" data-act="export-library">${esc(t("export"))}</button>
          <label class="btn">${esc(t("import"))}
            <input type="file" accept=".json,application/json" data-library-file hidden>
          </label>
          <button class="btn" type="button" data-act="close-library">${esc(t("close"))}</button>
        </div>
      </div>
    </div>`;
  }

  /** @param {string} text @param {string} source */
  async function loadScriptText(text, source) {
    const result = parseScript(text, allRoles(), source, t("scriptUntitled"));
    if (!result.ok) {
      pickerError = result.error;
      pickerPreview = null;
    } else {
      pickerError = "";
      pickerPreview = result;
      pickerChoice = "custom";
      pickerSection = source === "url" ? "url" : source === "clipboard" || source === "text" ? "clipboard" : "file";
    }
    render();
  }

  async function loadScriptUrl() {
    const url = pickerUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      pickerError = t("scriptUrlInvalid");
      pickerPreview = null;
      render();
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json, text/plain" }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      await loadScriptText(await response.text(), "url");
    } catch (error) {
      pickerError = /** @type {Error} */ (error).name === "AbortError" ? t("scriptUrlTimeout") : t("scriptUrlFailed");
      pickerPreview = null;
      render();
    } finally {
      clearTimeout(timer);
    }
  }

  async function pasteClipboard() {
    try {
      pickerText = await navigator.clipboard.readText();
      await loadScriptText(pickerText, "clipboard");
    } catch (error) {
      pickerError = t("scriptClipboardFailed");
      pickerSection = "clipboard";
      render();
    }
  }

  /** @param {Script | null | undefined} script */
  function applyScript(script) {
    if (!script || !Array.isArray(script.roles) || !script.roles.length) return;
    if (state.script && script.id === state.script.id) {
      pickerOpen = false;
      pickerError = "";
      render();
      return;
    }
    if (hasGame() && !window.confirm(t("ui.changeScript"))) return;
    activePoolId = null;
    activeBagId = null;
    libraryName = "";
    pickerOpen = false;
    pickerError = "";
    pickerPreview = null;
    armed = false;
    editionFilter = SCRIPT_IDS.includes(script.id) ? script.id : "all";
    let bag = null;
    try {
      bag = randomBag(state.setup.count, Math.random, script.roles, {
        godfatherOutsider: godfatherShift()
      });
      bagError = "";
    } catch (error) {
      bagError = /** @type {Error} */ (error).message;
    }
    const result = send({
      type: "bagUpdate",
      payload: {
        patch: {
          script,
          count: state.setup.count,
          resetRoster: true,
          phase: "setup",
          roles: bag ? bag.roles : [],
          bluffs: bag ? bag.bluffs : [],
          drunkShownId: bag ? (bag.drunkShownId || null) : null,
          lunaticShownId: null,
          godfatherOutsider: 1,
          evilTwinGoodId: null
        }
      }
    });
    if (result.status !== "allowed") bagError = result.reason || t("illegal");
    refresh();
  }

  function applyPickerChoice() {
    if (pickerChoice === "tb") return applyScript(troubleBrewingScript());
    if (pickerChoice === "bmr") return applyScript(badMoonRisingScript());
    if (pickerChoice === "snv") return applyScript(sectsAndVioletsScript());
    if (pickerPreview && pickerPreview.script) return applyScript(pickerPreview.script);
    pickerError = t("scriptNothingSelected");
    render();
  }

  /** @param {string} key */
  function selectScenario(key) {
    if (key === "custom") {
      if (isCustom() && scriptRoles().length) {
        tab = "manual";
        poolMode = false;
        editionFilter = "all";
        render();
        return;
      }
      if (hasGame() && !window.confirm(t("ui.changeScript"))) return;
      send({
        type: "bagUpdate",
        payload: {
          patch: {
            script: {
              id: "custom-draft",
              name: t("scriptCustom"),
              edition: "custom",
              source: "manual",
              author: "",
              roles: [],
              manualOnly: false
            },
            count: state.setup.count,
            resetRoster: true,
            phase: "setup",
            roles: [],
            bluffs: [],
            drunkShownId: null,
            lunaticShownId: null,
            evilTwinGoodId: null
          }
        }
      });
      activePoolId = null;
      activeBagId = null;
      libraryName = "";
      tab = "manual";
      poolMode = true;
      editionFilter = "all";
      armed = false;
      bagError = "";
      refresh();
      return;
    }
    const factory = /** @type {Record<string, () => Script>} */ ({ tb: troubleBrewingScript, bmr: badMoonRisingScript, snv: sectsAndVioletsScript })[key];
    if (!factory) return;
    const script = factory();
    if (isOfficial() && state.script.id === key) {
      editionFilter = key;
      render();
      return;
    }
    applyScript(script);
  }

  function currentEntries() {
    return recommendedEntries().entries;
  }

  /** @param {string} key @returns {BagEntry | null} */
  function findEntry(key) {
    return currentEntries().find((entry) => entry.key === key) || null;
  }

  function applyRepair() {
    if (!beginSetup()) return;
    const bag = repairBag({
      count: state.setup.count,
      roles: state.setup.roles,
      pool: scriptRoles(),
      godfatherOutsider: godfatherShift()
    });
    if (!bag) {
      bagError = t("bag.noRepair");
      render();
      return;
    }
    pushUndo();
    send({
      type: "bagUpdate",
      payload: {
        patch: {
          roles: bag.roles.slice(),
          bluffs: bag.bluffs.slice(),
          drunkShownId: bag.drunkShownId,
          lunaticShownId: bag.lunaticShownId,
          evilTwinGoodId: bag.evilTwinGoodId
        }
      }
    });
    armed = false;
    bagError = "";
    refresh();
  }

  /** @param {ReturnType<typeof normalizeLibrary>} next */
  function persistLibrary(next) {
    const result = writeLibrary(next);
    library = next;
    if (!result.ok) libraryError = t("bag.importFail");
    render();
  }

  function saveCurrentBag() {
    const name = libraryName.trim();
    if (!name) {
      libraryError = t("bag.nameRequired");
      render();
      return;
    }
    const existingBag = library.bags.find((entry) => entry.id === activeBagId || entry.name === name);
    const result = upsertBag(library, {
      id: existingBag ? existingBag.id : undefined,
      name,
      scriptId: state.script.id,
      pool: isCustom() ? scriptRoles() : [],
      roles: state.setup.roles,
      bluffs: state.setup.bluffs,
      drunkShownId: state.setup.drunkShownId,
      lunaticShownId: state.setup.lunaticShownId,
      godfatherOutsider: state.setup.godfatherOutsider,
      evilTwinGoodId: state.setup.evilTwinGoodId
    });
    if (!result.ok) {
      libraryError = t("bag.saveFailed");
      render();
      return;
    }
    libraryError = "";
    libraryName = "";
    activeBagId = result.bag.id;
    persistLibrary(result.library);
  }

  function saveCurrentPool() {
    const name = libraryName.trim();
    if (!name) {
      libraryError = t("bag.nameRequired");
      render();
      return;
    }
    const existingPool = library.pools.find((entry) => entry.id === activePoolId || entry.name === name);
    const result = upsertPool(library, {
      id: existingPool ? existingPool.id : undefined,
      name,
      roles: scriptRoles()
    });
    if (!result.ok) {
      libraryError = t("bag.saveFailed");
      render();
      return;
    }
    libraryError = "";
    libraryName = "";
    activePoolId = result.pool.id;
    persistLibrary(result.library);
  }

  /** @param {string} id */
  function loadBag(id) {
    const bag = library.bags.find((entry) => entry.id === id);
    if (!bag) return;
    if (hasGame() && !window.confirm(t("ui.newBag"))) return;
    let script = null;
    if (bag.scriptId !== state.script.id) {
      const factory = /** @type {Record<string, () => Script>} */ ({ tb: troubleBrewingScript, bmr: badMoonRisingScript, snv: sectsAndVioletsScript })[bag.scriptId];
      if (factory) {
        script = factory();
      } else if (Array.isArray(bag.pool) && bag.pool.length) {
        script = {
          id: bag.scriptId, name: t("scriptCustom"), edition: "custom",
          source: "manual", author: "", roles: bag.pool.slice(),
          manualOnly: isMixedEdition(bag.pool)
        };
      }
    }
    send({
      type: "bagUpdate",
      payload: {
        patch: {
          script: script || undefined,
          count: bag.roles.length,
          resetRoster: true,
          phase: "setup",
          roles: bag.roles.slice(),
          bluffs: bag.bluffs.slice(),
          drunkShownId: bag.drunkShownId,
          lunaticShownId: bag.lunaticShownId,
          godfatherOutsider: bag.godfatherOutsider,
          evilTwinGoodId: bag.evilTwinGoodId
        }
      }
    });
    libraryOpen = false;
    armed = false;
    tab = "manual";
    activeBagId = bag.id;
    activePoolId = null;
    libraryName = bag.name;
    editionFilter = isCustom() ? "all" : state.script.edition;
    refresh();
  }

  /** @param {string} id */
  function loadPool(id) {
    const pool = library.pools.find((entry) => entry.id === id);
    if (!pool) return;
    if (hasGame() && !window.confirm(t("ui.changeScript"))) return;
    send({
      type: "bagUpdate",
      payload: {
        patch: {
          script: {
            id: "custom-" + pool.id,
            name: pool.name,
            edition: "custom",
            source: "manual",
            author: "",
            roles: pool.roles.slice(),
            manualOnly: isMixedEdition(pool.roles)
          },
          count: state.setup.count,
          resetRoster: true,
          phase: "setup",
          roles: [],
          bluffs: [],
          drunkShownId: null,
          lunaticShownId: null,
          evilTwinGoodId: null
        }
      }
    });
    libraryOpen = false;
    armed = false;
    tab = "manual";
    poolMode = false;
    activePoolId = pool.id;
    activeBagId = null;
    libraryName = pool.name;
    editionFilter = "all";
    refresh();
  }

  function exportFile() {
    const text = exportLibrary(library);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pocket-grimoire-library.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /** @param {File} file */
  async function importFile(file) {
    try {
      const parsed = parseLibrary(await file.text());
      if (!parsed.ok) {
        libraryError = t("bag.importFail");
        render();
        return;
      }
      libraryError = "";
      persistLibrary(parsed.library);
    } catch (error) {
      libraryError = t("bag.importFail");
      render();
    }
  }

  function render() {
    const count = state.setup.count;
    const dealt = hasGame();
    const legal = setupErrors(state).length === 0;
    const mixed = isMixedEdition(scriptRoles());
    const manualOnly = Boolean(state.script && state.script.manualOnly);
    root.innerHTML = `
      <div class="setup">
        <header class="setup-head">
          <div class="setup-brand">
            <span class="setup-mark" aria-hidden="true">PG</span>
            <div>
              <b>${esc(t("setupTitle"))}</b>
              <small>${esc(state.script ? state.script.name : "")} · ${count} ${esc(t("players"))}</small>
            </div>
          </div>
          <nav class="setup-nav" aria-label="${esc(t("setup"))}">
            <button class="btn" type="button" data-act="script">${esc(t("script"))}</button>
            <button class="btn" type="button" data-act="library">${esc(t("bag.library"))}</button>
            <a class="btn" href="${path("table")}">${esc(t("table"))}</a>
            <a class="btn" href="${path("seat")}">${esc(t("seats"))}</a>
            <a class="btn" href="${path("help")}">${esc(t("help"))}</a>
          </nav>
        </header>

        ${dealt ? `<div class="setup-banner">
          <b>${esc(t("warning"))}:</b> ${esc(t("dealAgain"))} — ${esc(t("newGame"))}. ${esc(t("discussWarning"))}
        </div>` : ""}
        ${mixed ? `<div class="setup-banner ${manualOnly ? "is-warning" : "is-error"}">
          <b>${esc(t("warning"))}:</b> ${esc(manualOnly ? t("manualOnlyWarning") : t("bag.mixWarning"))}
          <label class="bag-manual-toggle">
            <input type="checkbox" data-manual-only ${manualOnly ? "checked" : ""}>
            <span>${esc(t("manualOnlyToggle"))}</span>
          </label>
        </div>` : ""}
        ${bagError ? `<div class="setup-banner is-error">${esc(bagError)}</div>` : ""}
        ${state.storageError ? `<div class="setup-banner is-error">${esc(t("storageError"))}: ${esc(state.storageError)}</div>` : ""}

        <main class="setup-shell">
          <section class="setup-block">
            <div class="setup-block-head">
              <div>
                <span class="label">01</span>
                <h1>${esc(state.script ? state.script.name : "")}: ${esc(t("setupIntro"))}</h1>
              </div>
              <div class="setup-count">
                <button class="setup-step" type="button" data-count="-1" aria-label="${esc(t("ui.fewer"))}">−</button>
                <b>${count}</b>
                <button class="setup-step" type="button" data-count="1" aria-label="${esc(t("ui.more"))}">+</button>
              </div>
            </div>
            ${scenarioMarkup()}
            <div class="setup-composition">${compositionMarkup()}</div>
            <div class="setup-table" aria-label="${esc(t("composition"))}">
              ${[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((size) => {
                const base = COMPOSITION[size];
                return `<span class="${size === count ? "is-current" : ""}">
                  <b>${size}</b><span>${base.join(" / ")}</span>
                </span>`;
              }).join("")}
            </div>
            <p class="setup-hint">${esc(t("legalNotBalanced"))}</p>
          </section>

          <section class="setup-block">
            <div class="setup-block-head">
              <div><span class="label">02</span><h2>${esc(t("composition"))}</h2></div>
              ${statusMarkup()}
            </div>
            <div class="bag-tabs" role="tablist">${tabsMarkup()}</div>
            ${tab === "recommended" ? recommendedMarkup() : ""}
            ${tab === "manual" ? manualMarkup() : ""}
            ${tab === "random" ? randomMarkup() : ""}
            ${tab === "manual" ? hintMarkup() : ""}
          </section>

          <section class="setup-block">
            <div class="setup-block-head">
              <div><span class="label">03</span><h2>${esc(t("bluffs"))}${state.setup.roles.includes("drunk") ? " · " + esc(t("drunkShown")) : ""}</h2></div>
            </div>
            <div class="setup-secrets">
              ${drunkMarkup()}
              ${bluffsMarkup()}
            </div>
          </section>

          <section class="setup-block">
            <div class="setup-block-head">
              <div><span class="label">04</span><h2>${esc(t("scenarioSecrets"))}</h2></div>
            </div>
            ${godfatherMarkup()}
            ${lunaticMarkup()}
            ${evilTwinMarkup()}
            ${!godfatherMarkup() && !lunaticMarkup() && !evilTwinMarkup()
              ? `<p class="bag-note">${esc(t("none"))}</p>` : ""}
            ${isBmrScript(state.script)
              ? `<p class="bag-note bmr-warning">${esc(t("bmrHostWarning"))}</p>` : ""}
            ${isSnvScript(state.script)
              ? `<p class="bag-note snv-warning">${esc(t("svHostWarning"))}</p>` : ""}
          </section>

          <section class="setup-block setup-final">
            <div class="setup-block-head">
              <div><span class="label">05</span><h2>${esc(t("ready"))}</h2></div>
            </div>
            ${statusMarkup()}
            <div class="setup-final-actions">
              <button class="btn btn--accent setup-deal" type="button" data-act="deal" ${legal ? "" : "disabled"}>
                ${esc(armed ? t("confirm") : (dealt ? t("dealAgain") : t("deal")))}
              </button>
              <a class="btn" href="${path("table")}">${esc(t("table"))}</a>
            </div>
            <p class="setup-hint">${esc(t("discussWarning"))}</p>
          </section>
        </main>

        ${pickerOpen ? pickerMarkup() : ""}
        ${previewMarkup()}
        ${libraryMarkup()}
      </div>`;
  }

  root.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    // DOM boundary: delegated handlers read the data-* attributes of the match.
    const target = /** @type {any} */ (event.target);

    const scenario = target.closest("[data-scenario]");
    if (scenario) {
      selectScenario(scenario.dataset.scenario);
      return;
    }

    const tabButton = target.closest("[data-tab]");
    if (tabButton) {
      tab = tabButton.dataset.tab;
      poolMode = false;
      render();
      return;
    }

    const roleButton = target.closest("[data-role]");
    if (roleButton) {
      if (poolMode) togglePoolRole(roleButton.dataset.role);
      else toggleRole(roleButton.dataset.role);
      return;
    }

    const countButton = target.closest("[data-count]");
    if (countButton) {
      setCount(state.setup.count + Number(countButton.dataset.count));
      return;
    }

    const bluffRole = target.closest("[data-bluff-role]");
    if (bluffRole) {
      if (!beginSetup()) return;
      pushUndo();
      const id = bluffRole.dataset.bluffRole;
      const bluffs = state.setup.bluffs.slice();
      const at = bluffs.indexOf(id);
      if (at !== -1) bluffs.splice(at, 1);
      else {
        if (bluffs.length >= 3) return;
        bluffs.push(id);
      }
      send({ type: "bagUpdate", payload: { patch: { bluffs } } });
      refresh();
      return;
    }

    const bluffSlot = target.closest("[data-bluff-slot]");
    if (bluffSlot) {
      if (!beginSetup()) return;
      pushUndo();
      const bluffs = state.setup.bluffs.slice();
      bluffs.splice(Number(bluffSlot.dataset.bluffSlot), 1);
      send({ type: "bagUpdate", payload: { patch: { bluffs } } });
      refresh();
      return;
    }

    const godfather = target.closest("[data-godfather]");
    if (godfather) {
      if (!beginSetup()) return;
      pushUndo();
      send({
        type: "bagUpdate",
        payload: { patch: { godfatherOutsider: Number(godfather.dataset.godfather) === -1 ? -1 : 1 } }
      });
      refresh();
      return;
    }

    const evilTwinGood = target.closest("[data-evil-twin]");
    if (evilTwinGood) {
      if (!beginSetup()) return;
      pushUndo();
      send({ type: "bagUpdate", payload: { patch: { evilTwinGoodId: evilTwinGood.dataset.evilTwin } } });
      refresh();
      return;
    }

    const lunaticRole = target.closest("[data-lunatic-role]");
    if (lunaticRole) {
      if (!beginSetup()) return;
      pushUndo();
      send({ type: "bagUpdate", payload: { patch: { lunaticShownId: lunaticRole.dataset.lunaticRole } } });
      refresh();
      return;
    }

    const drunkRole = target.closest("[data-drunk-role]");
    if (drunkRole) {
      if (!beginSetup()) return;
      pushUndo();
      send({ type: "bagUpdate", payload: { patch: { drunkShownId: drunkRole.dataset.drunkRole } } });
      refresh();
      return;
    }

    const previewButton = target.closest("[data-preview]");
    if (previewButton) {
      const entry = findEntry(previewButton.dataset.preview);
      if (entry) {
        preview = entry;
        render();
      }
      return;
    }

    const applyButton = target.closest("[data-apply]");
    if (applyButton) {
      const entry = findEntry(applyButton.dataset.apply);
      if (entry) applyBag(entry);
      return;
    }

    const loadBagButton = target.closest("[data-load-bag]");
    if (loadBagButton) {
      loadBag(loadBagButton.dataset.loadBag);
      return;
    }

    const loadPoolButton = target.closest("[data-load-pool]");
    if (loadPoolButton) {
      loadPool(loadPoolButton.dataset.loadPool);
      return;
    }

    const deleteBagButton = target.closest("[data-delete-bag]");
    if (deleteBagButton) {
      persistLibrary(removeBag(library, deleteBagButton.dataset.deleteBag).library);
      return;
    }

    const deletePoolButton = target.closest("[data-delete-pool]");
    if (deletePoolButton) {
      persistLibrary(removePool(library, deletePoolButton.dataset.deletePool).library);
      return;
    }

    const act = target.closest("[data-act]");
    if (!act) return;
    const name = act.dataset.act;
    if (name === "script") {
      pickerOpen = true;
      pickerError = "";
      pickerChoice = isOfficial() ? state.script.id : "custom";
      pickerPreview = !isOfficial() && state.script
        ? { script: { ...state.script, roles: state.script.roles.slice() }, travellers: [] }
        : null;
      render();
      return;
    }
    if (name === "close-script") {
      pickerOpen = false;
      pickerError = "";
      render();
      return;
    }
    if (name === "apply-script") {
      applyPickerChoice();
      return;
    }
    if (name === "script-url") {
      loadScriptUrl();
      return;
    }
    if (name === "script-clipboard") {
      pasteClipboard();
      return;
    }
    if (name === "script-text") {
      loadScriptText(pickerText, "text");
      return;
    }
    if (name === "random") {
      const bag = tryRandomBag(state.setup.count);
      if (bag) applyBag(bag);
      else refresh();
      return;
    }
    if (name === "clear") {
      if (!beginSetup()) return;
      pushUndo();
      send({
        type: "bagUpdate",
        payload: {
          patch: {
            roles: [],
            bluffs: [],
            drunkShownId: null,
            lunaticShownId: null,
            evilTwinGoodId: null
          }
        }
      });
      armed = false;
      refresh();
      return;
    }
    if (name === "undo") {
      undoBag(refresh);
      return;
    }
    if (name === "repair") {
      applyRepair();
      return;
    }
    if (name === "edit-pool") {
      poolMode = !poolMode;
      if (poolMode) {
        editionFilter = "all";
        tab = "manual";
      }
      render();
      return;
    }
    if (name === "library") {
      libraryOpen = true;
      libraryError = "";
      render();
      return;
    }
    if (name === "close-library") {
      libraryOpen = false;
      libraryError = "";
      render();
      return;
    }
    if (name === "save-bag") {
      saveCurrentBag();
      return;
    }
    if (name === "save-pool") {
      saveCurrentPool();
      return;
    }
    if (name === "export-library") {
      exportFile();
      return;
    }
    if (name === "close-preview") {
      preview = null;
      render();
      return;
    }
    if (name === "apply-preview") {
      if (preview) applyBag(preview);
      preview = null;
      render();
      return;
    }
    if (name === "deal") {
      if (setupErrors(state).length) return;
      if (!armed && hasGame()) {
        armed = true;
        render();
        return;
      }
      const result = send({ type: "dealGame" });
      if (result.status !== "allowed") {
        const errors = (result && result.errors) || [];
        window.alert(errors.map((/** @type {any} */ error) => error.message || error).join("\n")
          || (result && result.reason) || t("illegal"));
        return;
      }
      go("/player");
    }
  }, { signal });

  root.addEventListener("change", (event) => {
    if (!(event.target instanceof Element)) return;
    // DOM boundary: delegated change handlers read value/files/checked.
    const target = /** @type {any} */ (event.target);
    if (target.matches("[data-script-file]")) {
      const file = target.files && target.files[0];
      if (!file) return;
      file.text().then((/** @type {string} */ text) => loadScriptText(text, "file")).catch(() => {
        pickerError = t("scriptFileFailed");
        render();
      });
      return;
    }
    if (target.matches("[data-library-file]")) {
      const file = target.files && target.files[0];
      if (file) importFile(file);
      return;
    }
    if (target.matches("[name='script-pick']")) {
      pickerChoice = target.value;
      render();
      return;
    }
    if (target.matches("[data-edition]")) {
      editionFilter = target.value;
      render();
      return;
    }
    if (target.matches("[data-team-filter]")) {
      teamFilter = target.value;
      render();
      return;
    }
    if (target.matches("[data-manual-only]")) {
      if (!beginSetup()) {
        render();
        return;
      }
      send({
        type: "bagUpdate",
        payload: { patch: { script: { ...state.script, manualOnly: target.checked } } }
      });
      refresh();
    }
  }, { signal });

  root.addEventListener("input", (event) => {
    if (!(event.target instanceof Element)) return;
    // DOM boundary: delegated input handlers read value.
    const target = /** @type {any} */ (event.target);
    if (target.matches("[data-script-url]")) pickerUrl = target.value;
    if (target.matches("[data-script-text]")) pickerText = target.value;
    if (target.matches("[data-search]")) {
      search = target.value;
      render();
      const input = /** @type {HTMLInputElement | null} */ (root.querySelector("[data-search]"));
      if (input) {
        input.focus();
        input.setSelectionRange(search.length, search.length);
      }
    }
    if (target.matches("[data-library-name]")) libraryName = target.value;
  }, { signal });

  root.addEventListener("toggle", (event) => {
    if (!(event.target instanceof Element)) return;
    // DOM boundary: delegated toggle handlers read details.open.
    const target = /** @type {any} */ (event.target);
    if (target.matches("details[data-script-section]") && target.open) {
      pickerSection = target.dataset.scriptSection || "";
    }
  }, { signal, capture: true });

  modalFocus(root, signal);

  if (!state.setup.roles.length && scriptRoles().length >= 5) {
    const bag = tryRandomBag(state.setup.count);
    if (bag) applyBag(bag);
    else render();
  } else {
    render();
  }
  return unmount;
}

export function unmount() {
  if (abort) abort.abort();
  abort = null;
}
