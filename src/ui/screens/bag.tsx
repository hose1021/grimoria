// Setup: the scenario picker, the bag editor, the bluffs and the scenario
// secrets. Editor state is local until a command commits it; the screen reads
// the published snapshot for the bag, the errors and the script.
import { useEffect, useRef, useState } from "react";
import type { BagPatch } from "../../core/commands/contracts.ts";
import { setupProjection } from "../../application/read-models/table.ts";
import {
  TEAMS,
  bagCounts,
  bluffCandidates,
  compositionFor,
  isBmrScript,
  isMixedEdition,
  isSnvScript,
  randomBag,
  requiredBluffs,
  roleLabel,
  roleTeam,
  teamLabel,
} from "../../core/model/rules.ts";
import {
  OFFICIAL_SCRIPTS,
  badMoonRisingScript,
  parseScript,
  sectsAndVioletsScript,
  troubleBrewingScript,
} from "../../core/model/scripts.ts";
import { scriptSupport } from "../../core/model/support.ts";
import type { Role, RoleId, Script } from "../../core/model/types.ts";
import { SetupShell } from "../components/setup-shell.tsx";
import type { BagEntryInput, BagLibrary } from "../ports.ts";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";
import { commandRejectionText, setupProblemText } from "./setup-messages.ts";

const MIN = 5;
const MAX = 15;
const SCRIPT_IDS = ["tb", "bmr", "snv"];
// The host resolves more printed choices in these two editions than in
// Trouble Brewing, so the picker marks them as beta.
const BETA_SCRIPT_IDS: Record<string, true> = { bmr: true, snv: true };
const BETA_BADGE =
  "shrink-0 rounded-sm border border-brass/40 bg-brass/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-brass";
const SUPPORT_LEVEL_KEY = {
  verified: "scriptLevelVerified",
  "requires-storyteller-choice": "scriptLevelStoryteller",
  unsupported: "scriptLevelUnsupported",
};

const TEAM_DOT: Record<string, string> = {
  townsfolk: "bg-townsfolk",
  outsider: "bg-outsider",
  minion: "bg-minion",
  demon: "bg-demon",
  traveller: "bg-traveller",
};

const TEAM_EDGE: Record<string, string> = {
  townsfolk: "!border-l-townsfolk",
  outsider: "!border-l-outsider",
  minion: "!border-l-minion",
  demon: "!border-l-demon",
  traveller: "!border-l-traveller",
};

const CloseMark = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path
      d="M3.5 3.5l9 9M12.5 3.5l-9 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const CheckMark = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
    <path
      d="M3 8.5l3.2 3.2L13 4.8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const NOTE = "bag-note m-0 text-[13px] leading-relaxed text-muted";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.16em] text-brass";
const TEAM_GROUP = "bag-grid mt-2 grid grid-cols-1 gap-2 md:grid-cols-3";
const TEAM_HEAD = "flex items-center gap-2 border-b border-edge pb-1.5";
const TEAM_NAME = "m-0 font-role text-[14px] leading-tight text-parchment";
const TEAM_COUNT =
  "ml-auto rounded-sm border border-edge px-1.5 text-[11px] tabular-nums text-muted";

interface AnyBag {
  roles: string[];
  bluffs?: string[];
  drunkShownId?: string | null;
  lunaticShownId?: string | null;
  lunaticShownExplicit?: boolean;
  lunaticBluffs?: string[];
  godfatherOutsider?: 1 | -1;
  evilTwinGoodId?: string | null;
  valid?: boolean;
}

interface BagEntry extends AnyBag {
  key: string;
  labelKey: string;
  noteKey: string;
  label?: string;
  roles: string[];
}

interface ScriptPreview {
  script: Script;
  travellers?: string[];
}

function shiftOf(state: { setup: { godfatherOutsider?: 1 | -1 | null } }): 1 | -1 {
  return state.setup.godfatherOutsider === -1 ? -1 : 1;
}

function snapshotOf(state: {
  setup: {
    count: number;
    roles: string[];
    bluffs: string[];
    drunkShownId: string | null;
    lunaticShownId: string | null;
    lunaticShownExplicit?: boolean;
    lunaticBluffs?: string[];
    godfatherOutsider: 1 | -1 | null;
    evilTwinGoodId: string | null;
  };
  scriptId?: string;
  script: Script | null;
}): string {
  return JSON.stringify({
    count: state.setup.count,
    roles: state.setup.roles,
    bluffs: state.setup.bluffs,
    drunkShownId: state.setup.drunkShownId,
    lunaticShownId: state.setup.lunaticShownId,
    lunaticShownExplicit: state.setup.lunaticShownExplicit,
    lunaticBluffs: state.setup.lunaticBluffs,
    godfatherOutsider: state.setup.godfatherOutsider,
    evilTwinGoodId: state.setup.evilTwinGoodId,
    scriptId: state.scriptId,
    script: state.script ? { ...state.script, roles: state.script.roles.slice() } : null,
  });
}

export function BagScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const state = snapshot.state;
  const t = ports.strings.t;

  const [tab, setTab] = useState("recommended");
  const [bluffEdit, setBluffEdit] = useState(false);
  const [lunaticBluffEdit, setLunaticBluffEdit] = useState(false);
  const [poolMode, setPoolMode] = useState(false);
  const [preview, setPreview] = useState<BagEntry | null>(null);
  const [bagError, setBagError] = useState("");
  const [armed, setArmed] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerChoice, setPickerChoice] = useState(() =>
    state.script && SCRIPT_IDS.includes(state.script.id) ? state.script.id : "custom",
  );
  const [pickerSection, setPickerSection] = useState("");
  const [pickerError, setPickerError] = useState("");
  const [pickerPreview, setPickerPreview] = useState<ScriptPreview | null>(null);
  const [pickerUrl, setPickerUrl] = useState("");
  const [pickerText, setPickerText] = useState("");

  const [library, setLibrary] = useState<BagLibrary>(() => ports.library.normalize(null));
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [libraryName, setLibraryName] = useState("");
  const [activePoolId, setActivePoolId] = useState<string | null>(null);
  const [activeBagId, setActiveBagId] = useState<string | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const scriptRoles = state.script && Array.isArray(state.script.roles) ? state.script.roles : [];
  const isOfficial = Boolean(state.script && SCRIPT_IDS.includes(state.script.id));
  const isCustom = !isOfficial;
  const hasGame = state.phase !== "setup" && Object.values(state.players).some((p) => p.roleId);

  const roleOf = (id: RoleId | null | undefined): Role => {
    const known = ports.roles.byId(id ?? "");
    if (known) return known;
    return {
      id: id ?? "",
      name: roleLabel(id),
      team: roleTeam(id ?? "") ?? "townsfolk",
      edition: "tb",
      ability: "",
    };
  };

  const catalog = (): Role[] =>
    ports.roles
      .all()
      .filter((role) => SCRIPT_IDS.includes(role.edition) && role.team !== "traveller");

  const inPool = (id: RoleId) => scriptRoles.includes(id);
  const poolRoles = (): Role[] => {
    const order = new Map(ports.roles.all().map((role, index) => [role.id, index]));
    return scriptRoles
      .map((id) => roleOf(id))
      .sort(
        (a, b) =>
          (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
  };
  const unused = () => poolRoles().filter((role) => !state.setup.roles.includes(role.id));
  const unusedTownsfolk = () => unused().filter((role) => role.team === "townsfolk");

  const send = (patch: BagPatch) =>
    ports.commands.bagUpdate({
      // Adopt the mode only on a live host edit. A pre-existing legacy mask
      // stays explicit; an empty legacy setup follows the selected Demon.
      ...(state.setup.lunaticShownExplicit === undefined
        ? { lunaticShownExplicit: Boolean(state.setup.lunaticShownId) }
        : {}),
      ...patch,
    });

  const beginSetup = () => {
    if (state.phase === "setup") return true;
    if (!window.confirm(t("ui.changeBag"))) return false;
    send({ count: state.setup.count, resetRoster: true, phase: "setup" });
    return true;
  };

  const pushUndo = () => {
    // The store mutates the live state, so the snapshot must be taken before
    // the command runs, not inside the state updater.
    const snap = snapshotOf(state);
    setUndoStack((past) => {
      const next = [...past, snap];
      return next.length > 30 ? next.slice(1) : next;
    });
  };

  const refreshError = () => {
    if (!setupProjection(state).errors.length) setBagError("");
  };

  const tryRandomBag = (count: number): AnyBag | null => {
    try {
      const bag = randomBag(count, Math.random, scriptRoles, {
        godfatherOutsider: shiftOf(state),
      });
      setBagError("");
      return bag;
    } catch (error) {
      setBagError(error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  const applyBag = (bag: AnyBag | null) => {
    if (!bag || bag.valid === false) {
      setBagError(t("illegal"));
      return;
    }
    if (!beginSetup()) return;
    const result = send({
      count: bag.roles.length,
      resetRoster: true,
      phase: "setup",
      roles: bag.roles.slice(),
      bluffs: (bag.bluffs || []).slice(),
      drunkShownId: bag.drunkShownId || null,
      lunaticShownId: bag.lunaticShownId || null,
      lunaticShownExplicit: false,
      lunaticBluffs: bag.lunaticBluffs ?? [],
      godfatherOutsider: bag.godfatherOutsider ?? 1,
      evilTwinGoodId: bag.evilTwinGoodId || null,
    });
    if (result.status !== "allowed") {
      setBagError(commandRejectionText(result) || t("illegal"));
      return;
    }
    setArmed(false);
    setBagError("");
  };

  const undoBag = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((past) => past.slice(0, -1));
    const parsed = JSON.parse(last) as {
      count: number;
      roles: string[];
      bluffs: string[];
      drunkShownId: string | null;
      lunaticShownId: string | null;
      lunaticShownExplicit?: boolean;
      lunaticBluffs?: string[];
      godfatherOutsider: 1 | -1 | null;
      evilTwinGoodId: string | null;
      script: Script | null;
    };
    send({
      ...(parsed.script ? { script: parsed.script } : {}),
      count: parsed.count,
      resetRoster: true,
      phase: "setup",
      roles: parsed.roles,
      bluffs: parsed.bluffs,
      drunkShownId: parsed.drunkShownId,
      lunaticShownId: parsed.lunaticShownId,
      lunaticShownExplicit: parsed.lunaticShownExplicit ?? Boolean(parsed.lunaticShownId),
      lunaticBluffs: parsed.lunaticBluffs ?? [],
      godfatherOutsider: parsed.godfatherOutsider === -1 ? -1 : 1,
      evilTwinGoodId: parsed.evilTwinGoodId,
    });
    setArmed(false);
    setBagError("");
  };

  const countRef = useRef(state.setup.count);
  useEffect(() => {
    countRef.current = state.setup.count;
  }, [state.setup.count]);
  const setCount = (next: number) => {
    if (next < MIN || next > MAX || next === countRef.current) return;
    // Ask before moving the local counter: a cancelled confirmation must not
    // leave the ref one ahead, and a rejected command must not either.
    if (hasGame && !window.confirm(t("ui.changeCount"))) return;
    countRef.current = next;
    pushUndo();
    const kept = ports.presets.resize({
      count: next,
      roles: state.setup.roles,
      pool: scriptRoles,
      godfatherOutsider: shiftOf(state),
    });
    const result = send({ count: next, roles: kept });
    if (result.status !== "allowed") {
      countRef.current = state.setup.count;
      setUndoStack((past) => past.slice(0, -1));
      setBagError(commandRejectionText(result) || t("illegal"));
      return;
    }
    setArmed(false);
    refreshError();
  };

  const toggleRole = (id: RoleId) => {
    if (!beginSetup()) return;
    let script: Script | null = null;
    if (!inPool(id)) {
      if (!isCustom) {
        setBagError(t("bag.roleOutside"));
        return;
      }
      const pool = scriptRoles.slice();
      pool.push(id);
      script = { ...(state.script as Script), roles: pool, manualOnly: isMixedEdition(pool) };
    }
    pushUndo();
    const roles = state.setup.roles.slice();
    const at = roles.indexOf(id);
    if (at === -1) roles.push(id);
    else roles.splice(at, 1);
    send({ ...(script ? { script } : {}), roles });
    setArmed(false);
    refreshError();
  };

  const togglePoolRole = (id: RoleId) => {
    if (!isCustom || !beginSetup()) return;
    pushUndo();
    const pool = scriptRoles.slice();
    const roles = state.setup.roles.slice();
    const at = pool.indexOf(id);
    if (at === -1) pool.push(id);
    else {
      pool.splice(at, 1);
      const bagAt = roles.indexOf(id);
      if (bagAt !== -1) roles.splice(bagAt, 1);
    }
    send({
      script: { ...(state.script as Script), roles: pool, manualOnly: isMixedEdition(pool) },
      roles,
    });
    setArmed(false);
    refreshError();
  };

  const editionLabel = (edition: string | undefined) =>
    ({ tb: "TB", bmr: "BMR", snv: "S&V" })[edition || ""] || edition || "";

  const applyScript = (script: Script | null) => {
    if (!script || !Array.isArray(script.roles) || !script.roles.length) return;
    if (state.script && script.id === state.script.id) {
      setPickerOpen(false);
      setPickerError("");
      return;
    }
    if (hasGame && !window.confirm(t("ui.changeScript"))) return;
    setActivePoolId(null);
    setActiveBagId(null);
    setLibraryName("");
    setPickerOpen(false);
    setPickerError("");
    setPickerPreview(null);
    setArmed(false);
    let bag: AnyBag | null = null;
    try {
      bag = randomBag(state.setup.count, Math.random, script.roles, {
        godfatherOutsider: shiftOf(state),
      });
      setBagError("");
    } catch (error) {
      setBagError(error instanceof Error ? error.message : String(error));
    }
    const result = send({
      script,
      count: state.setup.count,
      resetRoster: true,
      phase: "setup",
      roles: bag ? bag.roles : [],
      bluffs: bag ? (bag.bluffs ?? []) : [],
      drunkShownId: bag ? bag.drunkShownId || null : null,
      lunaticShownId: null,
      lunaticShownExplicit: false,
      lunaticBluffs: [],
      godfatherOutsider: bag ? (bag.godfatherOutsider ?? 1) : 1,
      evilTwinGoodId: null,
    });
    if (result.status !== "allowed") setBagError(commandRejectionText(result) || t("illegal"));
  };

  const applyPickerChoice = () => {
    if (pickerChoice === "tb") return applyScript(troubleBrewingScript());
    if (pickerChoice === "bmr") return applyScript(badMoonRisingScript());
    if (pickerChoice === "snv") return applyScript(sectsAndVioletsScript());
    if (pickerPreview) return applyScript(pickerPreview.script);
    setPickerError(t("scriptNothingSelected"));
  };

  const selectScenario = (key: string) => {
    if (key === "custom") {
      if (isCustom && scriptRoles.length) {
        setTab("manual");
        setPoolMode(false);
        return;
      }
      if (hasGame && !window.confirm(t("ui.changeScript"))) return;
      send({
        script: {
          id: "custom-draft",
          name: t("scriptCustom"),
          edition: "custom",
          source: "manual",
          author: "",
          roles: [],
          manualOnly: false,
        },
        count: state.setup.count,
        resetRoster: true,
        phase: "setup",
        roles: [],
        bluffs: [],
        drunkShownId: null,
        lunaticShownId: null,
        lunaticShownExplicit: false,
        lunaticBluffs: [],
        evilTwinGoodId: null,
      });
      setActivePoolId(null);
      setActiveBagId(null);
      setLibraryName("");
      setTab("manual");
      setPoolMode(true);
      setArmed(false);
      setBagError("");
      return;
    }
    const factory = {
      tb: troubleBrewingScript,
      bmr: badMoonRisingScript,
      snv: sectsAndVioletsScript,
    }[key];
    if (!factory) return;
    if (isOfficial && state.script?.id === key) {
      return;
    }
    applyScript(factory());
  };

  const recommendedEntries = (): {
    entries: BagEntry[];
    problems: Array<string | { code: string }>;
  } => {
    const count = state.setup.count;
    if (isOfficial && state.script) {
      const entries: BagEntry[] = [];
      for (let variant = 0; variant < 3; variant += 1) {
        const bag = ports.presets.bag(state.script.id, count, variant);
        if (!bag) continue;
        const labels = ports.presets.labels[state.script.id] || [];
        const notes = ports.presets.notes[state.script.id] || [];
        entries.push({
          key: "preset-" + variant,
          labelKey: labels[variant] ?? "",
          noteKey: notes[variant] ?? "",
          ...bag,
        });
      }
      return { entries, problems: [] };
    }
    const result = ports.presets.suggestions(count, scriptRoles);
    return {
      entries: result.suggestions.map((bag) => ({ ...bag, valid: true })),
      problems: result.problems,
    };
  };

  const applyRepair = () => {
    if (!beginSetup()) return;
    const bag = ports.presets.repair({
      count: state.setup.count,
      roles: state.setup.roles,
      pool: scriptRoles,
      godfatherOutsider: shiftOf(state),
    });
    if (!bag) {
      setBagError(t("bag.noRepair"));
      return;
    }
    pushUndo();
    send({
      roles: bag.roles.slice(),
      bluffs: bag.bluffs.slice(),
      drunkShownId: bag.drunkShownId,
      lunaticShownId: bag.lunaticShownId,
      lunaticShownExplicit: false,
      lunaticBluffs: bag.lunaticBluffs ?? [],
      evilTwinGoodId: bag.evilTwinGoodId,
    });
    setArmed(false);
    setBagError("");
  };

  const persistLibrary = (next: BagLibrary) => {
    const result = ports.library.write(next);
    setLibrary(next);
    if (!result.ok) setLibraryError(t("bag.importFail"));
  };

  const saveCurrentBag = () => {
    const name = libraryName.trim();
    if (!name) {
      setLibraryError(t("bag.nameRequired"));
      return;
    }
    const existing = library.bags.find((entry) => entry.id === activeBagId || entry.name === name);
    const entry: BagEntryInput = {
      ...(existing ? { id: existing.id } : {}),
      name,
      scriptId: state.script?.id ?? "",
      pool: isCustom ? scriptRoles : [],
      roles: state.setup.roles,
      bluffs: state.setup.bluffs,
      drunkShownId: state.setup.drunkShownId,
      lunaticShownId: state.setup.lunaticShownId,
      lunaticShownExplicit: state.setup.lunaticShownExplicit ?? Boolean(state.setup.lunaticShownId),
      ...(state.setup.lunaticBluffs ? { lunaticBluffs: state.setup.lunaticBluffs } : {}),
      godfatherOutsider: shiftOf(state),
      evilTwinGoodId: state.setup.evilTwinGoodId,
    };
    const result = ports.library.saveBag(library, entry);
    if (!result.ok) {
      setLibraryError(t("bag.saveFailed"));
      return;
    }
    setLibraryError("");
    setLibraryName("");
    setActiveBagId(result.bag.id);
    persistLibrary(result.library);
  };

  const saveCurrentPool = () => {
    const name = libraryName.trim();
    if (!name) {
      setLibraryError(t("bag.nameRequired"));
      return;
    }
    const existing = library.pools.find(
      (entry) => entry.id === activePoolId || entry.name === name,
    );
    const result = ports.library.savePool(library, {
      ...(existing ? { id: existing.id } : {}),
      name,
      roles: scriptRoles,
    });
    if (!result.ok) {
      setLibraryError(t("bag.saveFailed"));
      return;
    }
    setLibraryError("");
    setLibraryName("");
    setActivePoolId(result.pool.id);
    persistLibrary(result.library);
  };

  const loadBag = (id: string) => {
    const bag = library.bags.find((entry) => entry.id === id);
    if (!bag) return;
    if (hasGame && !window.confirm(t("ui.newBag"))) return;
    let script: Script | null = null;
    if (
      bag.scriptId === state.script?.id &&
      !SCRIPT_IDS.includes(bag.scriptId) &&
      bag.pool.length
    ) {
      // Editing a custom pool keeps its script ID. The saved bag still owns
      // its original pool, even when it belongs to that same script.
      script = {
        ...state.script,
        roles: bag.pool.slice(),
        manualOnly: isMixedEdition(bag.pool),
      };
    } else if (bag.scriptId !== state.script?.id) {
      const factory = {
        tb: troubleBrewingScript,
        bmr: badMoonRisingScript,
        snv: sectsAndVioletsScript,
      }[bag.scriptId];
      if (factory) script = factory();
      else if (Array.isArray(bag.pool) && bag.pool.length) {
        script = {
          id: bag.scriptId,
          name: t("scriptCustom"),
          edition: "custom",
          source: "manual",
          author: "",
          roles: bag.pool.slice(),
          manualOnly: isMixedEdition(bag.pool),
        };
      }
    }
    const result = send({
      ...(script ? { script } : {}),
      count: bag.roles.length,
      resetRoster: true,
      phase: "setup",
      roles: bag.roles.slice(),
      bluffs: bag.bluffs.slice(),
      drunkShownId: bag.drunkShownId,
      lunaticShownId: bag.lunaticShownId,
      lunaticShownExplicit: bag.lunaticShownExplicit ?? Boolean(bag.lunaticShownId),
      lunaticBluffs: bag.lunaticBluffs ?? [],
      godfatherOutsider: bag.godfatherOutsider,
      evilTwinGoodId: bag.evilTwinGoodId,
    });
    if (result.status !== "allowed") {
      // The library stays open and the game stays unchanged; the reason says
      // why this saved bag cannot become the current one.
      setLibraryError(commandRejectionText(result) || t("illegal"));
      return;
    }
    setLibraryOpen(false);
    setArmed(false);
    setTab("manual");
    setActiveBagId(bag.id);
    setActivePoolId(null);
    setLibraryName(bag.name);
  };

  const loadPool = (id: string) => {
    const pool = library.pools.find((entry) => entry.id === id);
    if (!pool) return;
    if (hasGame && !window.confirm(t("ui.changeScript"))) return;
    const result = send({
      script: {
        id: "custom-" + pool.id,
        name: pool.name,
        edition: "custom",
        source: "manual",
        author: "",
        roles: pool.roles.slice(),
        manualOnly: isMixedEdition(pool.roles),
      },
      count: state.setup.count,
      resetRoster: true,
      phase: "setup",
      roles: [],
      bluffs: [],
      drunkShownId: null,
      lunaticShownId: null,
      lunaticShownExplicit: false,
      lunaticBluffs: [],
      evilTwinGoodId: null,
    });
    if (result.status !== "allowed") {
      setLibraryError(commandRejectionText(result) || t("illegal"));
      return;
    }
    setLibraryOpen(false);
    setArmed(false);
    setTab("manual");
    setPoolMode(false);
    setActivePoolId(pool.id);
    setActiveBagId(null);
    setLibraryName(pool.name);
  };

  const exportFile = () => {
    const text = ports.library.export(library);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "grimoria-library.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importFile = async (file: File) => {
    try {
      const parsed = ports.library.parse(await file.text());
      if (!parsed.ok) {
        setLibraryError(t("bag.importFail"));
        return;
      }
      setLibraryError("");
      persistLibrary(parsed.library);
    } catch {
      setLibraryError(t("bag.importFail"));
    }
  };

  const loadScriptText = (text: string, source: string) => {
    const result = parseScript(text, ports.roles.all(), source, t("scriptUntitled"));
    if (!result.ok) {
      setPickerError(result.error);
      setPickerPreview(null);
    } else {
      setPickerError("");
      setPickerPreview(result);
      setPickerChoice("custom");
      setPickerSection(source === "url" ? "url" : source === "file" ? "file" : "clipboard");
    }
  };

  const loadScriptUrl = async () => {
    const url = pickerUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      setPickerError(t("scriptUrlInvalid"));
      setPickerPreview(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json, text/plain" },
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      loadScriptText(await response.text(), "url");
    } catch (error) {
      setPickerError(
        error instanceof Error && error.name === "AbortError"
          ? t("scriptUrlTimeout")
          : t("scriptUrlFailed"),
      );
      setPickerPreview(null);
    } finally {
      clearTimeout(timer);
    }
  };

  const pasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPickerText(text);
      loadScriptText(text, "clipboard");
    } catch {
      setPickerError(t("scriptClipboardFailed"));
      setPickerSection("clipboard");
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const loaded = ports.library.read();
    setLibrary(loaded.ok ? loaded.library : ports.library.normalize(null));
    if (!loaded.ok) setLibraryError(t("bag.importFail"));
    if (!state.setup.roles.length && scriptRoles.length >= 5) {
      const bag = tryRandomBag(state.setup.count);
      if (bag) applyBag(bag);
    }
  }, []);

  useEffect(() => {
    const active = pickerOpen || Boolean(preview) || libraryOpen;
    if (!active) return;
    const host = root.current;
    const modal = host?.querySelector(".script-modal");
    if (!(modal instanceof HTMLElement)) return;
    const selector =
      'button:not(:disabled), input, select, textarea, a[href], summary, [tabindex="0"]';
    const items = () =>
      [...modal.querySelectorAll<HTMLElement>(selector)].filter(
        (element) => element.getClientRects().length > 0,
      );
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const isolated: HTMLElement[] = [];
    let node: HTMLElement | null = modal;
    while (node && node !== host) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== node && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true;
          isolated.push(sibling);
        }
      }
      node = parent;
    }
    (items()[0] ?? modal).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (preview) setPreview(null);
        else if (pickerOpen) {
          setPickerOpen(false);
          setPickerError("");
        } else if (libraryOpen) {
          setLibraryOpen(false);
          setLibraryError("");
        }
        return;
      }
      if (event.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      for (const element of isolated) element.inert = false;
      if (previous?.isConnected) previous.focus();
    };
  }, [pickerOpen, preview, libraryOpen]);

  const errors = setupProjection(state).errors;
  const legal = errors.length === 0;
  const count = state.setup.count;
  const lunaticBluffs = state.setup.lunaticBluffs?.length
    ? state.setup.lunaticBluffs
    : state.setup.bluffs;
  const mixed = isMixedEdition(scriptRoles);
  const manualOnly = Boolean(state.script?.manualOnly);
  const composition = compositionFor(count, state.setup.roles, shiftOf(state));

  const sectionHead = (
    numeral: string,
    title: string,
    lead: string | null,
    aside: React.ReactNode,
    level: "h1" | "h2" = "h2",
    id?: string,
  ) => {
    const Heading = level;
    return (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          {numeral ? (
            <span className="font-role text-[26px] leading-none tabular-nums text-muted/60">
              {numeral}
            </span>
          ) : null}
          <div className="min-w-0">
            <Heading
              id={id}
              className="m-0 font-role text-[22px] leading-tight tracking-[-0.01em] text-parchment md:text-[26px]"
            >
              {title}
            </Heading>
            {lead ? <p className={`mt-1 ${NOTE}`}>{lead}</p> : null}
          </div>
        </div>
        {aside}
      </div>
    );
  };

  const roleCard = (role: Role) => {
    const selected = state.setup.roles.includes(role.id);
    const allowed = inPool(role.id) || isCustom || poolMode;
    const pressed = poolMode ? inPool(role.id) : selected;
    const tone = pressed
      ? "border-amber-dim bg-crypt-3 text-parchment"
      : allowed
        ? "border-edge bg-crypt-3 text-text hover:border-edge-2"
        : "border-edge/60 bg-transparent text-muted opacity-40";
    return (
      <button
        key={role.id}
        className={[
          "bag-role relative grid grid-cols-[40px_minmax(0,1fr)] items-start gap-2.5 rounded-md border border-l-2 p-2.5 text-left transition-colors",
          TEAM_EDGE[role.team] ?? "",
          tone,
          pressed ? "is-on" : "is-off",
          isCustom && inPool(role.id) ? "is-pool ring-1 ring-amber/40" : "",
          allowed ? "" : "is-locked",
        ]
          .filter(Boolean)
          .join(" ")}
        type="button"
        data-role={role.id}
        data-team={role.team}
        aria-pressed={pressed}
        disabled={!allowed}
        title={allowed ? "" : t("bag.roleOutside")}
        onClick={() => (poolMode ? togglePoolRole(role.id) : toggleRole(role.id))}
      >
        <img className="size-10 object-contain" src={ports.roles.image(role)} alt="" />
        <span className="min-w-0">
          <b className="block text-[12.5px] font-medium leading-snug text-inherit">{role.name}</b>
          <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-muted">
            {role.ability || ""}
          </span>
          <em className="mt-1 block text-[9px] not-italic uppercase tracking-[0.12em] text-brass">
            {teamLabel(role.team)} · {editionLabel(role.edition)}
          </em>
        </span>
        {poolMode ? (
          <span className="absolute right-2 top-2 text-[13px] text-amber">
            {pressed ? <CheckMark /> : "+"}
          </span>
        ) : pressed ? (
          <span className="absolute right-2 top-2 text-amber">
            <CheckMark />
          </span>
        ) : null}
      </button>
    );
  };

  const compositionMarkup = () => {
    const req = compositionFor(count, state.setup.roles, shiftOf(state)) || {
      townsfolk: 0,
      outsider: 0,
      minion: 0,
      demon: 0,
    };
    const got = bagCounts(state.setup.roles);
    const icon: Record<string, string> = {
      townsfolk: "chef",
      outsider: "butler",
      minion: "poisoner",
      demon: "imp",
    };
    return (
      <div className="grid grid-cols-2 gap-[5px]">
        {TEAMS.map((team) => {
          const ok = got[team] === req[team];
          const role = roleOf(icon[team] ?? "");
          return (
            <div
              key={team}
              className="flex items-center gap-2 rounded-[5px] border border-edge bg-crypt-2 px-2 py-1.5"
            >
              <img
                className="size-5 shrink-0 object-contain opacity-80"
                src={ports.roles.image(role)}
                alt=""
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[8px] uppercase leading-tight tracking-[0.06em] text-muted">
                  {teamLabel(team)}
                </span>
                <b
                  className={`block font-role text-[16px] font-normal leading-none tabular-nums ${
                    ok ? "text-text" : "text-danger"
                  }`}
                >
                  {got[team]}/{req[team]}
                </b>
              </span>
              {ok ? null : (
                <small className="shrink-0 text-[9px] tabular-nums text-danger">
                  {got[team] < req[team]
                    ? `−${req[team] - got[team]}`
                    : `+${got[team] - req[team]}`}
                </small>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // The engine problem carries only a code and a Russian message. The screen
  // supplies the totals it already computes and the catalog role label.
  const problemContext = (code: string) => {
    const vars: Record<string, unknown> = {};
    if (code === "size") {
      vars.count = state.setup.roles.length;
      vars.required = count;
    } else if (code === "bluffs-count") {
      vars.needed = requiredBluffs(count);
      vars.count = state.setup.bluffs.length;
    } else if (
      code === "godfather-minus" ||
      code === "vigormortis-minus" ||
      code === "composition-impossible"
    ) {
      vars.count = count;
    } else if (code.startsWith("team-")) {
      const team = code.slice("team-".length) as (typeof TEAMS)[number];
      const required = compositionFor(count, state.setup.roles, shiftOf(state));
      const got = bagCounts(state.setup.roles);
      vars.count = got[team];
      vars.required = required ? required[team] : 0;
    }
    return { roleLabel: (id: string) => roleOf(id).name, vars };
  };

  const statusMarkup = () =>
    errors.length ? (
      <div
        className="bag-status is-bad grid gap-0.5 text-[11.5px] leading-snug text-danger"
        role="status"
      >
        <b>
          {t("illegal")}
          {errors.length > 1 ? (
            <span className="min-[900px]:hidden"> · {errors.length}</span>
          ) : null}
        </b>
        <ul className="m-0 max-h-[72px] list-disc overflow-y-auto pl-4 pr-1 min-[900px]:max-h-none min-[900px]:columns-2 min-[900px]:gap-x-6">
          {errors.map((error, index) => (
            <li
              key={error.code + ":" + index}
              className={index ? "max-[900px]:hidden break-inside-avoid" : "break-inside-avoid"}
            >
              {setupProblemText(error, problemContext(error.code))}
            </li>
          ))}
        </ul>
      </div>
    ) : (
      <p className="bag-status is-ok m-0 text-[12px] text-success" role="status">
        {t("legal")}
      </p>
    );

  const bluffsMarkup = (recipient: "demon" | "lunatic" = "demon") => {
    const lunatic = recipient === "lunatic";
    const needed = lunatic ? 3 : requiredBluffs(count);
    if (!needed) return <p className={NOTE}>{t("noBluffs")}</p>;
    const selected = lunatic ? lunaticBluffs : state.setup.bluffs;
    const editing = lunatic ? lunaticBluffEdit : bluffEdit;
    const setEditing = lunatic ? setLunaticBluffEdit : setBluffEdit;
    const label = t(lunatic ? "lunaticBluffs" : "bluffs");
    const candidates = bluffCandidates({
      pool: scriptRoles,
      roles: state.setup.roles,
      drunkShownId: state.setup.drunkShownId,
      recipient,
    });
    const options = candidates.filter((id) => !selected.includes(id)).map(roleOf);
    const update = (bluffs: string[]) => {
      const result = send(lunatic ? { lunaticBluffs: bluffs } : { bluffs });
      setBagError(result.status === "allowed" ? "" : commandRejectionText(result) || t("illegal"));
    };
    return (
      <div className="grid gap-2">
        <div className="bag-bluff-slots grid max-w-[440px] grid-cols-3 gap-2" aria-label={label}>
          {[0, 1, 2].map((index) => {
            const role = selected[index] ? roleOf(selected[index]) : null;
            return (
              <button
                key={index}
                className={`bag-bluff-slot grid min-h-[62px] place-items-center gap-0.5 rounded-[4px] border px-1 py-1.5 ${
                  role
                    ? "border-edge bg-crypt text-text"
                    : "border-dashed border-edge-2 bg-crypt text-muted"
                }`}
                type="button"
                data-bluff-slot={lunatic ? undefined : index}
                data-lunatic-bluff-slot={lunatic ? index : undefined}
                aria-label={`${label} ${index + 1}`}
                onClick={() => {
                  if (!beginSetup()) return;
                  pushUndo();
                  const bluffs = selected.slice();
                  bluffs.splice(index, 1);
                  update(bluffs);
                }}
              >
                {role ? (
                  <>
                    <img className="size-9 object-contain" src={ports.roles.image(role)} alt="" />
                    <b className="line-clamp-2 w-full hyphens-auto break-words text-[9px] font-normal leading-[1.15] text-parchment">
                      {role.name}
                    </b>
                  </>
                ) : (
                  <span className="bag-bluff-empty text-[11px]">{t("ui.empty")}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn min-h-11 justify-center"
            type="button"
            data-shuffle-bluffs={recipient}
            disabled={candidates.length < needed}
            onClick={() => {
              if (!beginSetup()) return;
              pushUndo();
              const result = send({ shuffleBluffs: recipient });
              setBagError(
                result.status === "allowed" ? "" : commandRejectionText(result) || t("illegal"),
              );
            }}
          >
            {t("ui.shuffleBluffs")}
          </button>
          {editing || selected.length < needed ? null : (
            <button
              className="btn min-h-11 justify-center !border-edge"
              type="button"
              data-act={lunatic ? "edit-lunatic-bluffs" : "edit-bluffs"}
              onClick={() => setEditing(true)}
            >
              {t("ui.editBluffs")}
            </button>
          )}
          {editing && selected.length >= needed ? (
            <button
              className="btn btn--quiet min-h-11 justify-center"
              type="button"
              onClick={() => setEditing(false)}
            >
              {t("bag.poolDone")}
            </button>
          ) : null}
        </div>
        {editing || selected.length < needed ? (
          <div
            className="bag-bluff-pool grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1.5"
            aria-label={t(lunatic ? "ui.availableLunaticBluffs" : "ui.availableBluffs")}
          >
            {options.length ? (
              options.map((role) => (
                <button
                  key={role.id}
                  className="bag-bluff-token grid min-w-0 place-items-center gap-1 rounded-md border border-edge bg-crypt-3 p-1.5 text-[11px] text-muted transition-colors hover:border-edge-2 hover:text-text"
                  type="button"
                  data-bluff-role={lunatic ? undefined : role.id}
                  data-lunatic-bluff-role={lunatic ? role.id : undefined}
                  aria-label={role.name}
                  disabled={selected.length >= needed}
                  onClick={() => {
                    if (!beginSetup()) return;
                    pushUndo();
                    const bluffs = selected.slice();
                    if (bluffs.includes(role.id)) return;
                    if (bluffs.length >= needed) return;
                    bluffs.push(role.id);
                    update(bluffs);
                  }}
                >
                  <img className="size-10 object-contain" src={ports.roles.image(role)} alt="" />
                  <span className="line-clamp-2 w-full hyphens-auto break-words text-center text-[11px] leading-[1.15]">
                    {role.name}
                  </span>
                </button>
              ))
            ) : (
              <p className={NOTE}>{t("none")}</p>
            )}
          </div>
        ) : null}
        <p className={NOTE}>
          {lunatic ? t("ui.chooseLunaticBluffs") : `${t("chooseBluffs")} ${t("drunkWarning")}`}
        </p>
      </div>
    );
  };

  const secretToken = (
    on: boolean,
    attributes: Record<string, string | number | boolean>,
    content: React.ReactNode,
    onClick: () => void,
    disabled = false,
  ) => (
    <button
      {...attributes}
      onClick={onClick}
      className={`bag-bluff-token grid min-w-0 place-items-center gap-1 rounded-md border p-1.5 text-[11px] transition-colors ${
        on
          ? "border-amber/60 bg-amber-dim text-text"
          : "border-edge bg-crypt-3 text-muted hover:border-edge-2 hover:text-text"
      }`}
      type="button"
      aria-pressed={on}
      disabled={disabled}
    >
      {content}
    </button>
  );

  const drunkMarkup = () => {
    if (!state.setup.roles.includes("drunk")) return null;
    return (
      <div className="bag-secret-row grid gap-1.5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
          {unusedTownsfolk().map((role) => {
            const on = state.setup.drunkShownId === role.id;
            return secretToken(
              on,
              { key: role.id, "data-drunk-role": role.id },
              <>
                <img className="size-10 object-contain" src={ports.roles.image(role)} alt="" />
                <span className="line-clamp-2 w-full hyphens-auto break-words text-center leading-[1.2]">
                  {role.name}
                </span>
              </>,
              () => {
                if (!beginSetup()) return;
                send({ drunkShownId: role.id });
              },
            );
          })}
        </div>
      </div>
    );
  };

  const godfatherMarkup = () => {
    if (!state.setup.roles.includes("godfather")) return null;
    return (
      <div className="bag-secret-row grid gap-1.5">
        <span className={LABEL}>{t("godfatherSetup")}</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
          {([1, -1] as const).map((value) => {
            const on = state.setup.godfatherOutsider === value;
            return secretToken(
              on,
              { key: value, "data-godfather": value },
              <span>{value === 1 ? t("godfatherPlus") : t("godfatherMinus")}</span>,
              () => {
                if (!beginSetup()) return;
                send({ godfatherOutsider: value });
              },
            );
          })}
        </div>
        <p className={NOTE}>{t("godfatherHint")}</p>
      </div>
    );
  };

  const evilTwinMarkup = () => {
    if (!state.setup.roles.includes("eviltwin")) return null;
    const good = state.setup.roles.filter(
      (id) => id !== "eviltwin" && (roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider"),
    );
    return (
      <div className="bag-secret-row grid gap-1.5">
        <span className={LABEL}>{t("evilTwinGood")}</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
          {good.map((id) => {
            const role = roleOf(id);
            const on = state.setup.evilTwinGoodId === id;
            return secretToken(
              on,
              { key: id, "data-evil-twin": id },
              <>
                <img className="size-10 object-contain" src={ports.roles.image(role)} alt="" />
                <span className="line-clamp-2 w-full hyphens-auto break-words text-center leading-[1.2]">
                  {role.name}
                </span>
              </>,
              () => {
                if (!beginSetup()) return;
                send({ evilTwinGoodId: id });
              },
            );
          })}
        </div>
        <p className={NOTE}>{t("evilTwinHint")}</p>
      </div>
    );
  };

  const lunaticMarkup = () => {
    if (!state.setup.roles.includes("lunatic")) return null;
    return (
      <div className="bag-secret-row grid gap-1.5">
        <span className={LABEL}>{t("lunaticShown")}</span>
        <button
          className={`btn min-h-11 w-full ${state.setup.lunaticShownExplicit === false ? "!border-amber !bg-amber-dim/40 !text-amber" : ""}`}
          type="button"
          data-act="lunatic-follow-demon"
          aria-pressed={state.setup.lunaticShownExplicit === false}
          onClick={() => {
            if (!beginSetup()) return;
            pushUndo();
            send({ lunaticShownExplicit: false });
          }}
        >
          {t("ui.lunaticFollowDemon")}
        </button>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
          {poolRoles()
            .filter((role) => role.team === "demon")
            .map((role) => {
              const on = state.setup.lunaticShownId === role.id;
              return secretToken(
                on,
                { key: role.id, "data-lunatic-role": role.id },
                <>
                  <img className="size-10 object-contain" src={ports.roles.image(role)} alt="" />
                  <span className="line-clamp-2 w-full hyphens-auto break-words text-center leading-[1.2]">
                    {role.name}
                  </span>
                </>,
                () => {
                  if (!beginSetup()) return;
                  pushUndo();
                  send({ lunaticShownId: role.id, lunaticShownExplicit: true });
                },
              );
            })}
        </div>
        <p className={NOTE}>{t("lunaticHint")}</p>
      </div>
    );
  };

  const noteFor = (bag: { roles: string[] } | null, noteKey: string) => {
    const parts = [t(noteKey)];
    if (!bag) return parts.join(" ");
    const facts = ports.presets.mechanics(bag.roles);
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
  };

  const previewMarkup = () => {
    if (!preview) return null;
    const bag = preview;
    const facts = ports.presets.mechanics(bag.roles);
    return (
      <div
        className="script-modal fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-crypt/95 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        <div className="bag-preview w-full max-w-[680px] rounded-md border border-edge-2 bg-crypt-2 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="preview-title"
              className="m-0 font-role text-[24px] leading-tight text-parchment"
            >
              {bag.label || t("bag.previewBag")}
            </h2>
            <button
              className="btn size-11 shrink-0 !px-0"
              type="button"
              data-act="close-preview"
              aria-label={t("close")}
              onClick={() => setPreview(null)}
            >
              <CloseMark />
            </button>
          </div>
          {TEAMS.map((team) => {
            const roles = bag.roles.filter((id) => roleTeam(id) === team);
            if (!roles.length) return null;
            return (
              <div className="mt-4" key={team}>
                <h3 className={LABEL}>{teamLabel(team)}</h3>
                <div className="bag-token-row mt-1.5 flex flex-wrap gap-1.5">
                  {roles.map((id) => {
                    const role = roleOf(id);
                    return (
                      <span
                        key={id}
                        className="bag-token grid w-[72px] place-items-center gap-1 rounded-md border border-edge bg-crypt-3 p-1.5 text-center"
                        data-team={role.team}
                      >
                        <img
                          className="size-8 object-contain"
                          src={ports.roles.image(role)}
                          alt=""
                        />
                        <b className="text-[11px] font-medium leading-tight">{role.name}</b>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className={`mt-3 ${NOTE}`}>{noteFor(bag, bag.noteKey || "bag.previewBag")}</p>
          {requiredBluffs(bag.roles.length) ? (
            <div className="mt-4">
              <h3 className={LABEL}>{t("bluffs")}</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(bag.bluffs || []).map((id) => {
                  const role = roleOf(id);
                  return (
                    <span
                      key={id}
                      className="bag-token grid w-[72px] place-items-center gap-1 rounded-md border border-edge bg-crypt-3 p-1.5 text-center"
                      data-team={role.team}
                    >
                      <img className="size-8 object-contain" src={ports.roles.image(role)} alt="" />
                      <b className="text-[11px] font-medium leading-tight">{role.name}</b>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
          {facts.drunk ? (
            <p className={`mt-2 ${NOTE}`}>
              {t("drunkShown")}: {roleOf(bag.drunkShownId).name}
            </p>
          ) : null}
          {facts.lunatic && bag.lunaticShownId ? (
            <p className={`mt-2 ${NOTE}`}>
              {t("lunaticShown")}: {roleOf(bag.lunaticShownId).name}
            </p>
          ) : null}
          {facts.evilTwin && bag.evilTwinGoodId ? (
            <p className={`mt-2 ${NOTE}`}>
              {t("evilTwinGood")}: {roleOf(bag.evilTwinGoodId).name}
            </p>
          ) : null}
          <p className={NOTE}>{t("legalNotBalanced")}</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              className="btn"
              type="button"
              data-act="close-preview"
              onClick={() => setPreview(null)}
            >
              {t("cancel")}
            </button>
            <button
              className="btn btn--accent"
              type="button"
              data-act="apply-preview"
              disabled={bag.valid === false}
              onClick={() => {
                if (preview) applyBag(preview);
                setPreview(null);
              }}
            >
              {t("apply")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // The three candidates share this row order, so a difference in composition
  // reads as a horizontal gap between columns.
  const cardMarkup = (entry: BagEntry) => {
    const applied =
      entry.roles.length === state.setup.roles.length &&
      entry.roles.every((id) => state.setup.roles.includes(id)) &&
      (entry.bluffs ?? []).length === state.setup.bluffs.length &&
      (entry.bluffs ?? []).every((id) => state.setup.bluffs.includes(id));
    return (
      <article
        className={`bag-preset-card flex min-w-0 flex-col overflow-hidden border-2 bg-crypt-2 ${
          applied ? "border-amber min-[1180px]:col-span-2" : "border-edge"
        }`}
        data-roles={entry.roles.join(" ")}
        data-applied={applied ? "true" : "false"}
        key={entry.key}
      >
        <header className="flex items-baseline gap-2 border-b border-edge px-3 py-2">
          <h3 className="m-0 min-w-0 flex-1 font-role text-[15px] leading-tight text-parchment">
            {t(entry.labelKey)}
          </h3>
          {applied ? (
            <b className="shrink-0 rounded-[3px] border border-amber-dim px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber">
              {t("bag.applied")}
            </b>
          ) : (
            <span className="shrink-0 text-[10px] tabular-nums text-muted">
              {entry.roles.length} {ports.strings.roleCount(entry.roles.length)}
            </span>
          )}
          {entry.valid === false ? (
            <b className="bag-status is-bad text-[10px] text-danger">{t("illegal")}</b>
          ) : null}
        </header>
        <div className="grid flex-1 content-start">
          {TEAMS.map((team) => {
            const ids = entry.roles.filter((id) => roleTeam(id) === team);
            if (!ids.length) return null;
            return (
              <div
                className="grid grid-cols-[86px_minmax(0,1fr)_12px] items-start gap-2 border-t border-edge/60 px-3 py-1.5 first:border-t-0"
                key={team}
                data-team-row={team}
              >
                <span className="flex items-start gap-1.5 pt-1.5 text-[8.5px] uppercase leading-tight tracking-[0.1em] text-muted">
                  <i
                    className={`mt-0.5 inline-block size-1 shrink-0 rounded-full ${TEAM_DOT[team] ?? "bg-muted"}`}
                    aria-hidden="true"
                  />
                  {teamLabel(team)}
                </span>
                <div className="flex min-h-[58px] flex-wrap gap-[3px]">
                  {ids.map((id) => {
                    const role = roleOf(id);
                    return (
                      <figure
                        key={id}
                        className="bag-token m-0 h-[62px] w-[64px] text-center"
                        data-team={role.team}
                      >
                        <img
                          className="mx-auto size-7 object-contain"
                          src={ports.roles.image(role)}
                          alt=""
                        />
                        <figcaption className="mt-0.5 line-clamp-2 hyphens-auto break-words text-[9px] leading-[1.2] text-parchment/85">
                          {role.name}
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
                <span className="pt-1.5 text-right text-[10px] tabular-nums text-muted">
                  {ids.length}
                </span>
              </div>
            );
          })}
        </div>
        {entry.bluffs && entry.bluffs.length ? (
          <p className="m-0 border-t border-edge/60 px-3 py-1.5 text-[10px] leading-snug text-muted">
            <span className="text-brass">{t("bluffs")}: </span>
            {entry.bluffs.map((id) => roleOf(id).name).join(", ")}
          </p>
        ) : null}
        <p className="m-0 border-t border-edge/60 px-3 py-2 text-[10.5px] leading-relaxed text-muted">
          {noteFor(entry, entry.noteKey)}
        </p>
        <footer className="mt-auto flex gap-1.5 px-3 pb-3 pt-1">
          <button
            className="btn btn--quiet min-h-11 flex-1 justify-center text-[11px]"
            type="button"
            data-preview={entry.key}
            onClick={() => setPreview(entry)}
          >
            {t("preview")}
          </button>
          <button
            className="btn min-h-11 flex-1 justify-center text-[11px]"
            type="button"
            data-apply={entry.key}
            onClick={() => applyBag(entry)}
          >
            {t("bag.take")}
          </button>
        </footer>
      </article>
    );
  };

  const recommendedMarkup = () => {
    if (isCustom && scriptRoles.length < 5) {
      return (
        <div className="bag-empty flex flex-col items-start gap-3 rounded-md border border-dashed border-edge p-5">
          <p className={NOTE}>{t("bag.poolEmpty")}</p>
          <button
            className="btn btn--accent"
            type="button"
            data-act="edit-pool"
            onClick={() => {
              setPoolMode(true);
              setTab("manual");
            }}
          >
            {t("bag.editPool")}
          </button>
        </div>
      );
    }
    const { entries, problems } = recommendedEntries();
    return (
      <div className="grid gap-2.5">
        <div className="bag-preset-grid grid gap-2 min-[720px]:grid-cols-2 min-[1180px]:grid-cols-2">
          {entries.map((entry) => cardMarkup(entry))}
        </div>
        {problems.length ? (
          <div className="bag-status is-bad flex flex-col gap-1 text-[12px] text-danger">
            <b>{t("illegal")}</b>
            <ul className="m-0 grid list-disc gap-0.5 pl-4">
              {problems.map((problem, index) => (
                <li key={index}>
                  {t("custom.problem." + (typeof problem === "string" ? problem : problem.code))}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  };

  // The picker shows the current script's pool; a custom pool keeps the full
  // catalog so the host can add roles the draft does not list yet.
  const groupedRoles = (): Array<{ team: (typeof TEAMS)[number]; roles: Role[] }> => {
    const roles = isOfficial ? poolRoles() : catalog();
    return TEAMS.map((team) => ({
      team,
      roles: roles.filter((role) => role.team === team),
    })).filter((group) => group.roles.length > 0);
  };

  const manualMarkup = () => {
    const left = count - state.setup.roles.length;
    const tool = "btn min-h-11 px-2.5 text-[11px]";
    return (
      <div className="grid gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[12px] tabular-nums text-muted">
            <b className="text-text">{t("bag.remaining", { n: left })}</b> ·{" "}
            {t("bag.selected", { n: state.setup.roles.length })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              className={tool}
              type="button"
              data-act="clear"
              onClick={() => {
                if (!beginSetup()) return;
                pushUndo();
                send({
                  roles: [],
                  bluffs: [],
                  drunkShownId: null,
                  lunaticShownId: null,
                  evilTwinGoodId: null,
                });
                setArmed(false);
              }}
            >
              {t("clearBag")}
            </button>
            <button
              className={tool}
              type="button"
              data-act="undo"
              disabled={!undoStack.length}
              onClick={undoBag}
            >
              {t("undo")}
            </button>
            <button className={tool} type="button" data-act="repair" onClick={applyRepair}>
              {t("bag.fix")}
            </button>
            {isCustom ? (
              <button
                className={`${tool}${poolMode ? " !border-amber-dim !bg-amber-dim/40 !text-amber" : ""}`}
                type="button"
                data-act="edit-pool"
                onClick={() => {
                  setPoolMode((value) => !value);
                  setTab("manual");
                }}
              >
                {poolMode ? t("bag.poolDone") : t("bag.editPool")}
              </button>
            ) : null}
          </div>
        </div>
        <div className="bag-selected flex flex-wrap gap-1.5">
          {state.setup.roles.length ? (
            state.setup.roles.map((id) => {
              const role = roleOf(id);
              return (
                <button
                  key={id}
                  className="bag-token bag-token--button inline-flex max-w-full items-center gap-1.5 rounded-[4px] border border-edge-2 bg-crypt px-1.5 py-1 text-[10px] text-text transition-colors hover:border-crimson/60"
                  type="button"
                  data-role={id}
                  data-team={role.team}
                  title={t("bag.remove")}
                  onClick={() => (poolMode ? togglePoolRole(id) : toggleRole(id))}
                >
                  <img
                    className="size-5 shrink-0 object-contain"
                    src={ports.roles.image(role)}
                    alt=""
                  />
                  <span className="line-clamp-2 min-w-0 hyphens-auto break-words leading-[1.2]">
                    {role.name}
                  </span>
                  <span aria-hidden="true" className="ml-0.5 text-[11px] text-muted">
                    ×
                  </span>
                </button>
              );
            })
          ) : (
            <p className={NOTE}>{t("bag.noneSelected")}</p>
          )}
        </div>
        {poolMode ? (
          <p className={`bag-pool-hint ${NOTE} text-amber`}>{t("bag.poolHint")}</p>
        ) : null}
        <div className="grid gap-3">
          {groupedRoles().map((group) => {
            const required = compositionFor(count, state.setup.roles, shiftOf(state));
            const selected = bagCounts(state.setup.roles)[group.team];
            const wanted = required?.[group.team] ?? 0;
            const delta = selected - wanted;
            return (
              <section key={group.team} data-team-group={group.team} className="bag-role-group">
                <div className={TEAM_HEAD}>
                  <i
                    className={`inline-block size-1.5 rounded-full ${TEAM_DOT[group.team] ?? "bg-muted"}`}
                    aria-hidden="true"
                  />
                  <h3 className={TEAM_NAME}>{teamLabel(group.team)}</h3>
                  <span className={TEAM_COUNT} data-team-count={group.roles.length}>
                    <b className={delta === 0 ? "text-text" : "text-danger"}>
                      {selected}/{wanted}
                    </b>
                    {delta === 0 ? null : (
                      <small className="ml-1 text-danger">{delta > 0 ? `+${delta}` : delta}</small>
                    )}
                  </span>
                </div>
                <div className={TEAM_GROUP}>{group.roles.map((role) => roleCard(role))}</div>
              </section>
            );
          })}
        </div>
      </div>
    );
  };

  const randomMarkup = () => (
    <div className="bag-empty grid gap-2.5 rounded-md border border-dashed border-edge p-4">
      <p className={NOTE}>{t("legalRandom")}</p>
      <button
        className="btn w-full justify-center min-[700px]:w-fit"
        type="button"
        data-act="random"
        onClick={() => {
          const bag = tryRandomBag(count);
          if (bag) applyBag(bag);
        }}
      >
        {t("randomBag")}
      </button>
    </div>
  );

  const currentScenario = isOfficial ? state.script?.id : "custom";

  const supportMarkup = (roles: readonly RoleId[]) => {
    const support = scriptSupport(roles);
    return (
      <div
        className={`script-support flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted`}
        data-script-support={support.level}
      >
        <b className="text-text">{t(SUPPORT_LEVEL_KEY[support.level])}</b>
        <span data-support-level="verified" data-support-count={support.counts.verified}>
          {t("scriptSupportVerified", { count: support.counts.verified })}
        </span>
        <span aria-hidden="true" className="text-muted/60">
          ·
        </span>
        <span
          data-support-level="requires-storyteller-choice"
          data-support-count={support.counts["requires-storyteller-choice"]}
        >
          {t("scriptSupportStoryteller", {
            count: support.counts["requires-storyteller-choice"],
          })}
        </span>
        <span aria-hidden="true" className="text-muted/60">
          ·
        </span>
        <span data-support-level="unsupported" data-support-count={support.counts.unsupported}>
          {t("scriptSupportUnsupported", { count: support.counts.unsupported })}
        </span>
        {support.jinxes.map((pair) => (
          <span className="text-muted" key={pair.source} title={pair.source}>
            {t("scriptJinx", { pair: pair.roles.map((id) => roleOf(id).name).join(" + ") })}:{" "}
            {pair.reason}
          </span>
        ))}
      </div>
    );
  };

  const scriptPreviewMarkup = () => {
    if (!pickerPreview || pickerChoice !== "custom") return null;
    const script = pickerPreview.script;
    const counts = bagCounts(script.roles);
    const teamText = TEAMS.map((team) => `${teamLabel(team)} ${counts[team]}`).join(" · ");
    return (
      <div
        className="script-preview mt-3 grid gap-0.5 rounded-md border border-amber/45 bg-amber-dim/40 p-3 text-[12px]"
        role="status"
      >
        <b className="text-[14px]">{script.name}</b>
        <span className="text-muted">
          {script.roles.length} {ports.strings.roleCount(script.roles.length)} · {teamText}
        </span>
        {script.author ? (
          <span className="text-muted">
            {t("scriptAuthor")}: {script.author}
          </span>
        ) : null}
        {pickerPreview.travellers && pickerPreview.travellers.length ? (
          <span className={NOTE}>{t("scriptTravellersIgnored")}</span>
        ) : null}
        {supportMarkup(script.roles)}
      </div>
    );
  };

  const modalShell = (
    titleId: string,
    title: string,
    closeAct: string,
    onClose: () => void,
    body: React.ReactNode,
  ) => (
    <div
      className="script-modal fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-crypt/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-[560px] rounded-md border border-edge-2 bg-crypt-2 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="m-0 font-role text-[24px] leading-tight text-parchment">
            {title}
          </h2>
          <button
            className="btn script-close size-11 shrink-0 !px-0"
            type="button"
            data-act={closeAct}
            aria-label={t("close")}
            onClick={onClose}
          >
            <CloseMark />
          </button>
        </div>
        {body}
      </div>
    </div>
  );

  const pickerMarkup = () =>
    pickerOpen
      ? modalShell(
          "script-picker-title",
          t("scriptPicker"),
          "close-script",
          () => {
            setPickerOpen(false);
            setPickerError("");
          },
          <>
            <section className="mt-4 border-t border-edge pt-4">
              <h3 className={LABEL}>{t("scriptOfficial")}</h3>
              <div className="script-choices mt-2 grid gap-1.5">
                {OFFICIAL_SCRIPTS.map((entry) => {
                  const picked = pickerChoice === entry.id;
                  return (
                    <label
                      key={entry.id}
                      className={`script-choice flex min-h-11 items-center gap-2.5 rounded-md border px-3 py-2 ${
                        entry.supported
                          ? picked
                            ? "border-edge-2 bg-crypt-3"
                            : "border-edge bg-crypt-2"
                          : "cursor-not-allowed border-edge opacity-55"
                      }`}
                    >
                      <input
                        className="size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-edge-2 bg-transparent checked:border-brass checked:bg-brass checked:shadow-[inset_0_0_0_3px_var(--color-crypt-3)] disabled:cursor-not-allowed"
                        type="radio"
                        name="script-pick"
                        value={entry.id}
                        checked={picked}
                        disabled={!entry.supported}
                        onChange={() => setPickerChoice(entry.id)}
                      />
                      <span className="flex-1 text-[14px]">{entry.name}</span>
                      {BETA_SCRIPT_IDS[entry.id] ? (
                        <span className={BETA_BADGE}>{t("scriptBeta")}</span>
                      ) : null}
                      <small className="whitespace-nowrap text-[11px] text-muted">
                        {entry.roleCount} {ports.strings.roleCount(entry.roleCount)}
                        {entry.supported ? "" : " · " + t("scriptSoon")}
                      </small>
                    </label>
                  );
                })}
              </div>
            </section>

            <details
              className="mt-3 border-t border-edge pt-3"
              data-script-section="file"
              open={pickerSection === "file"}
              onToggle={(event) => {
                if (event.currentTarget.open) setPickerSection("file");
              }}
            >
              <summary className="cursor-pointer py-1 text-[14px] font-semibold">
                {t("scriptLoadFile")}
              </summary>
              <input
                className="field mt-2"
                type="file"
                accept=".json,application/json"
                data-script-file
                aria-label={t("scriptLoadFile")}
                onChange={(event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  void file
                    .text()
                    .then((text) => loadScriptText(text, "file"))
                    .catch(() => setPickerError(t("scriptFileFailed")))
                    .finally(() => {
                      input.value = "";
                    });
                }}
              />
              <p className={`mt-2 ${NOTE}`}>{t("scriptFormatHint")}</p>
            </details>

            <details
              className="mt-3 border-t border-edge pt-3"
              data-script-section="url"
              open={pickerSection === "url"}
              onToggle={(event) => {
                if (event.currentTarget.open) setPickerSection("url");
              }}
            >
              <summary className="cursor-pointer py-1 text-[14px] font-semibold">
                {t("scriptUrl")}
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  className="field flex-1 basis-[220px]"
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={pickerUrl}
                  data-script-url
                  aria-label={t("scriptUrl")}
                  onChange={(event) => setPickerUrl(event.target.value)}
                />
                <button
                  className="btn"
                  type="button"
                  data-act="script-url"
                  onClick={() => void loadScriptUrl()}
                >
                  {t("scriptLoad")}
                </button>
              </div>
              <p className={`mt-2 ${NOTE}`}>{t("scriptUrlHint")}</p>
            </details>

            <details
              className="mt-3 border-t border-edge pt-3"
              data-script-section="clipboard"
              open={pickerSection === "clipboard"}
              onToggle={(event) => {
                if (event.currentTarget.open) setPickerSection("clipboard");
              }}
            >
              <summary className="cursor-pointer py-1 text-[14px] font-semibold">
                {t("scriptClipboard")}
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="btn"
                  type="button"
                  data-act="script-clipboard"
                  onClick={() => void pasteClipboard()}
                >
                  {t("scriptPaste")}
                </button>
                <button
                  className="btn"
                  type="button"
                  data-act="script-text"
                  onClick={() => loadScriptText(pickerText, "text")}
                >
                  {t("scriptParse")}
                </button>
              </div>
              <textarea
                className="field mt-2 min-h-24 font-mono text-[11px]"
                data-script-text
                aria-label={t("scriptClipboard")}
                placeholder={t("scriptFormatHint")}
                value={pickerText}
                onChange={(event) => setPickerText(event.target.value)}
              />
            </details>

            <a
              className="mt-3 inline-block text-[12px] text-amber"
              href="https://script.bloodontheclocktower.com/"
              target="_blank"
              rel="noopener"
            >
              {t("scriptBotc")} ↗
            </a>

            {scriptPreviewMarkup()}
            {pickerError ? (
              <p
                className="mt-3 rounded-md border border-crimson-dim bg-crimson-dim/30 p-3 text-[12px] leading-relaxed text-danger"
                role="alert"
              >
                {pickerError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                className="btn"
                type="button"
                data-act="close-script"
                onClick={() => {
                  setPickerOpen(false);
                  setPickerError("");
                }}
              >
                {t("cancel")}
              </button>
              <button
                className="btn btn--accent"
                type="button"
                data-act="apply-script"
                disabled={pickerChoice === "custom" && !pickerPreview}
                onClick={applyPickerChoice}
              >
                {t("scriptApply")}
              </button>
            </div>
          </>,
        )
      : null;

  const libraryMarkup = () =>
    libraryOpen
      ? modalShell(
          "library-title",
          t("bag.library"),
          "close-library",
          () => {
            setLibraryOpen(false);
            setLibraryError("");
          },
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="field flex-1 basis-[180px]"
                type="text"
                value={libraryName}
                data-library-name
                placeholder={t("bag.name")}
                aria-label={t("bag.name")}
                onChange={(event) => setLibraryName(event.target.value)}
              />
              <button className="btn" type="button" data-act="save-bag" onClick={saveCurrentBag}>
                {t("bag.saveBag")}
              </button>
              {isCustom ? (
                <button
                  className="btn"
                  type="button"
                  data-act="save-pool"
                  onClick={saveCurrentPool}
                >
                  {t("bag.savePool")}
                </button>
              ) : null}
            </div>
            {libraryError ? (
              <p
                className="mt-3 rounded-md border border-crimson-dim bg-crimson-dim/30 p-3 text-[12px] text-danger"
                role="alert"
              >
                {libraryError}
              </p>
            ) : null}
            <div className="mt-4 grid gap-4">
              <section>
                <h3 className={LABEL}>{t("bag.savedBags")}</h3>
                {library.bags.length ? (
                  library.bags.map((bag) => (
                    <div
                      className="flex items-center gap-1.5 border-t border-edge py-1.5"
                      key={bag.id}
                    >
                      <span className="grid min-w-0 flex-1">
                        <b className="truncate text-[13px]">{bag.name}</b>
                        <small className="text-[11px] text-muted">
                          {bag.roles.length} {t("players")}
                        </small>
                      </span>
                      <button
                        className="btn"
                        type="button"
                        data-load-bag={bag.id}
                        onClick={() => loadBag(bag.id)}
                      >
                        {t("bag.load")}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        data-delete-bag={bag.id}
                        onClick={() =>
                          persistLibrary(ports.library.removeBag(library, bag.id).library)
                        }
                      >
                        {t("bag.delete")}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={NOTE}>{t("bag.libraryEmpty")}</p>
                )}
              </section>
              <section>
                <h3 className={LABEL}>{t("bag.savedPools")}</h3>
                {library.pools.length ? (
                  library.pools.map((pool) => (
                    <div
                      className="flex items-center gap-1.5 border-t border-edge py-1.5"
                      key={pool.id}
                    >
                      <span className="grid min-w-0 flex-1">
                        <b className="truncate text-[13px]">{pool.name}</b>
                        <small className="text-[11px] text-muted">
                          {pool.roles.length} {ports.strings.roleCount(pool.roles.length)}
                        </small>
                      </span>
                      <button
                        className="btn"
                        type="button"
                        data-load-pool={pool.id}
                        onClick={() => loadPool(pool.id)}
                      >
                        {t("bag.load")}
                      </button>
                      <button
                        className="btn"
                        type="button"
                        data-delete-pool={pool.id}
                        onClick={() =>
                          persistLibrary(ports.library.removePool(library, pool.id).library)
                        }
                      >
                        {t("bag.delete")}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={NOTE}>{t("bag.libraryEmpty")}</p>
                )}
              </section>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button className="btn" type="button" data-act="export-library" onClick={exportFile}>
                {t("export")}
              </button>
              <label className="btn">
                {t("import")}
                <input
                  type="file"
                  accept=".json,application/json"
                  data-library-file
                  hidden
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    void importFile(file).finally(() => {
                      input.value = "";
                    });
                  }}
                />
              </label>
              <button
                className="btn"
                type="button"
                data-act="close-library"
                onClick={() => {
                  setLibraryOpen(false);
                  setLibraryError("");
                }}
              >
                {t("close")}
              </button>
            </div>
          </>,
        )
      : null;

  const deal = () => {
    if (!legal) return;
    if (!armed && hasGame) {
      setArmed(true);
      return;
    }
    const result = ports.commands.dealGame();
    if (result.status !== "allowed") {
      window.alert(commandRejectionText(result) || t("illegal"));
      return;
    }
    ports.router.go("/player");
  };

  const countStepper = (
    <div className="flex items-center gap-1 rounded-sm border border-edge-2 bg-crypt p-1">
      <button
        className="setup-step grid size-11 place-items-center rounded-md border border-edge-2 bg-crypt-3 text-[18px] leading-none transition-colors hover:bg-crypt-3 disabled:opacity-40"
        type="button"
        data-count="-1"
        aria-label={t("ui.fewer")}
        onClick={() => setCount(countRef.current - 1)}
      >
        −
      </button>
      <b className="min-w-8 text-center font-role text-[20px] font-normal tabular-nums">{count}</b>
      <button
        className="setup-step grid size-11 place-items-center rounded-md border border-edge-2 bg-crypt-3 text-[18px] leading-none transition-colors hover:bg-crypt-3 disabled:opacity-40"
        type="button"
        data-count="1"
        aria-label={t("ui.more")}
        onClick={() => setCount(countRef.current + 1)}
      >
        +
      </button>
    </div>
  );

  const scriptTools = (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      <button
        className="btn min-h-11 !justify-center px-2 text-[11px]"
        type="button"
        data-act="script"
        onClick={() => {
          setPickerOpen(true);
          setPickerError("");
          setPickerChoice(isOfficial ? state.script?.id || "custom" : "custom");
          setPickerPreview(
            !isOfficial && state.script
              ? {
                  script: { ...state.script, roles: state.script.roles.slice() },
                  travellers: [],
                }
              : null,
          );
        }}
      >
        {t("scriptPicker")}
      </button>
      <button
        className="btn min-h-11 !justify-center px-2 text-[11px]"
        type="button"
        data-act="library"
        onClick={() => {
          setLibraryOpen(true);
          setLibraryError("");
        }}
      >
        {t("bag.library")}
      </button>
    </div>
  );

  return (
    <div className="setup" ref={root}>
      <SetupShell step="bag">
        <div className="flex min-h-[calc(100dvh-56px)] flex-col">
          {hasGame ? (
            <div className="setup-banner mt-3 rounded-md border border-amber-dim bg-amber-dim/40 px-3 py-2.5 text-[12px] leading-relaxed">
              <b>{t("warning")}:</b> {t("dealAgain")}. {t("newGame")}. {t("discussWarning")}
            </div>
          ) : null}
          {mixed ? (
            <div
              className={`setup-banner mt-3 rounded-md border px-3 py-2.5 text-[12px] leading-relaxed ${
                manualOnly
                  ? "is-warning border-amber-dim bg-amber-dim/40"
                  : "is-error border-crimson-dim bg-crimson-dim/30 text-danger"
              }`}
            >
              <b>{t("warning")}:</b> {manualOnly ? t("manualOnlyWarning") : t("bag.mixWarning")}
              <label className="ml-2 inline-flex items-center gap-2 text-[12px] text-text">
                <input
                  className="size-4 accent-accent"
                  type="checkbox"
                  data-manual-only
                  checked={manualOnly}
                  onChange={(event) => {
                    if (!beginSetup()) return;
                    send({
                      script: { ...(state.script as Script), manualOnly: event.target.checked },
                    });
                  }}
                />
                <span>{t("manualOnlyToggle")}</span>
              </label>
            </div>
          ) : null}
          {bagError ? (
            <div className="setup-banner is-error mt-3 rounded-md border border-crimson-dim bg-crimson-dim/30 px-3 py-2.5 text-[12px] text-danger">
              {bagError}
            </div>
          ) : null}
          {state.storageError ? (
            <div className="setup-banner is-error mt-3 rounded-md border border-crimson-dim bg-crimson-dim/30 px-3 py-2.5 text-[12px] text-danger">
              {t("storageError")}: {state.storageError}
            </div>
          ) : null}

          <main className="mx-auto grid w-full max-w-[1680px] flex-1 grid-cols-[280px_minmax(0,1fr)] items-stretch border-t border-edge pb-[92px] max-[900px]:grid-cols-1">
            <div className="min-w-0 bg-crypt p-[14px_16px_26px] max-[900px]:border-b max-[900px]:border-edge">
              <section aria-labelledby="bag-composition" className="min-w-0">
                <div className="border-b border-edge pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <h1
                      id="bag-composition"
                      className="m-0 min-w-0 font-role text-[27px] font-normal leading-none text-parchment md:text-[30px]"
                    >
                      {state.script ? state.script.name : t("scriptCustom")}
                    </h1>
                    <div className="grid shrink-0 justify-items-end gap-1">
                      <span className={LABEL}>{t("players")}</span>
                      {countStepper}
                    </div>
                  </div>
                  <p className="m-0 mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-muted">
                    {t("setupIntro")}
                  </p>
                </div>
                <div
                  className="bag-tabs mt-3 grid grid-cols-3 overflow-hidden rounded-[5px] border border-edge"
                  role="tablist"
                >
                  {["recommended", "manual", "random"].map((key) => (
                    <button
                      key={key}
                      className={`bag-tab relative min-h-11 cursor-pointer border-l border-edge px-2 text-[12px] uppercase tracking-[0.1em] transition-colors first:border-l-0 ${
                        tab === key
                          ? "bg-selected text-parchment after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-brass"
                          : "bg-crypt-2 text-muted hover:text-text"
                      }`}
                      type="button"
                      data-tab={key}
                      aria-selected={tab === key}
                      role="tab"
                      onClick={() => {
                        setTab(key);
                        setPoolMode(false);
                      }}
                    >
                      {t("tab." + key)}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  {tab === "recommended" ? recommendedMarkup() : null}
                  {tab === "manual" ? manualMarkup() : null}
                  {tab === "random" ? randomMarkup() : null}
                </div>
                <div className="mt-3 grid gap-2.5 min-[820px]:grid-cols-2">
                  <section
                    aria-labelledby="bag-bluffs"
                    className="rounded-md border border-edge bg-crypt-2 p-3"
                  >
                    {sectionHead(
                      "",
                      t("bluffs"),
                      null,
                      <b className="text-[11px] font-semibold uppercase tracking-[.06em] text-text">
                        {state.setup.bluffs.length}/{requiredBluffs(count)}
                      </b>,
                      "h2",
                      "bag-bluffs",
                    )}
                    <div className="mt-2 grid gap-4">{bluffsMarkup()}</div>
                  </section>

                  {state.setup.roles.includes("lunatic") ? (
                    <section
                      aria-labelledby="bag-lunatic-bluffs"
                      className="rounded-md border border-edge bg-crypt-2 p-3"
                    >
                      {sectionHead(
                        "",
                        t("lunaticBluffs"),
                        null,
                        <b className="text-[11px] font-semibold uppercase tracking-[.06em] text-text">
                          {lunaticBluffs.length}/3
                        </b>,
                        "h2",
                        "bag-lunatic-bluffs",
                      )}
                      <div className="mt-2 grid gap-4">{bluffsMarkup("lunatic")}</div>
                    </section>
                  ) : null}

                  {state.setup.roles.includes("drunk") ? (
                    <section
                      aria-labelledby="bag-drunk-mask"
                      className="rounded-md border border-edge bg-crypt-2 p-3"
                    >
                      {sectionHead(
                        "",
                        t("drunkShown"),
                        t("ui.drunkMaskHint"),
                        null,
                        "h2",
                        "bag-drunk-mask",
                      )}
                      <div className="mt-2 grid gap-4">{drunkMarkup()}</div>
                    </section>
                  ) : null}
                </div>
              </section>
            </div>
            <aside className="grid min-w-0 content-start gap-2.5 border-r border-edge bg-gradient-to-b from-crypt-2 to-crypt p-3.5 min-[901px]:order-first max-[900px]:border-r-0 max-[900px]:border-t">
              <section
                aria-labelledby="bag-script"
                className="rounded-md border border-edge bg-crypt-2 p-3"
              >
                {sectionHead("", t("script"), null, null, "h2", "bag-script")}
                <div
                  className="bag-scenarios mt-2 grid gap-1"
                  role="tablist"
                  aria-label={t("script")}
                >
                  {(["tb", "bmr", "snv", "custom"] as const).map((key) => {
                    const official = OFFICIAL_SCRIPTS.find((entry) => entry.id === key);
                    return (
                      <button
                        key={key}
                        className={`bag-scenario flex min-h-11 w-full items-center justify-between gap-2 rounded-[4px] border px-2.5 text-left text-[12.5px] transition-colors ${
                          currentScenario === key
                            ? "border-edge-2 border-l-2 border-l-brass bg-crypt-3 text-parchment"
                            : "border-transparent text-muted hover:bg-crypt-3 hover:text-text"
                        }`}
                        type="button"
                        data-scenario={key}
                        aria-pressed={currentScenario === key}
                        onClick={() => selectScenario(key)}
                      >
                        <span className="truncate">
                          {key === "custom" ? t("scriptCustom") : official?.name || ""}
                        </span>
                        {BETA_SCRIPT_IDS[key] ? (
                          <span className={BETA_BADGE}>{t("scriptBeta")}</span>
                        ) : null}
                        {official ? (
                          <kbd className="shrink-0 rounded-sm border border-edge px-1 py-0.5 font-sans text-[9px] tabular-nums text-muted">
                            {official.roleCount}
                          </kbd>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {scriptTools}
              </section>

              <section
                aria-labelledby="bag-composition-left"
                className="rounded-md border border-edge bg-crypt-2 p-3"
              >
                {sectionHead(
                  "",
                  t("composition"),
                  null,
                  <b className="text-[11px] font-semibold uppercase tracking-[.06em] text-text">
                    {count} {t("players")}
                  </b>,
                  "h2",
                  "bag-composition-left",
                )}
                <div className="setup-composition mt-3">{compositionMarkup()}</div>
                <p className={`mt-2 ${NOTE}`}>{t("legalNotBalanced")}</p>
                <div className="mt-2">{supportMarkup(scriptRoles)}</div>
              </section>

              {state.setup.roles.some(
                (id) => id === "godfather" || id === "lunatic" || id === "eviltwin",
              ) ||
              isBmrScript(state.script) ||
              isSnvScript(state.script) ? (
                <section
                  aria-labelledby="bag-secrets"
                  className="rounded-md border border-edge bg-crypt-2 p-3"
                >
                  {sectionHead("", t("scenarioSecrets"), null, null, "h2", "bag-secrets")}
                  <div className="mt-3 grid gap-3">
                    {godfatherMarkup()}
                    {lunaticMarkup()}
                    {evilTwinMarkup()}
                    {isBmrScript(state.script) ? (
                      <p className={`${NOTE} bmr-warning border-t border-edge pt-3`}>
                        {t("bmrHostWarning")}
                      </p>
                    ) : null}
                    {isSnvScript(state.script) ? (
                      <p className={`${NOTE} snv-warning border-t border-edge pt-3`}>
                        {t("svHostWarning")}
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </aside>
          </main>

          <section
            aria-labelledby="bag-deal"
            className="sticky bottom-0 z-30 border-t border-edge-2 bg-crypt-2"
          >
            <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center gap-x-5 gap-y-2 px-3.5 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))]">
              <h2 id="bag-deal" className="sr-only">
                {t("ready")}
              </h2>
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px]">
                  <b className="font-role text-[15px] font-normal tabular-nums text-parchment">
                    {count} {t("players")}
                  </b>
                  {TEAMS.map((team) => {
                    const got = bagCounts(state.setup.roles)[team];
                    const wanted = composition?.[team] ?? 0;
                    return (
                      <span key={team} className="inline-flex items-center gap-1 tabular-nums">
                        <i
                          className={`inline-block size-1.5 rounded-full ${TEAM_DOT[team] ?? "bg-muted"}`}
                          aria-hidden="true"
                        />
                        <span className={got === wanted ? "text-text" : "text-danger"}>
                          {got}/{wanted}
                        </span>
                      </span>
                    );
                  })}
                  <span className="inline-flex items-center gap-1 text-muted">
                    {t("bluffs")}
                    <b
                      className={
                        state.setup.bluffs.length === requiredBluffs(count)
                          ? "text-text"
                          : "text-danger"
                      }
                    >
                      {state.setup.bluffs.length}/{requiredBluffs(count)}
                    </b>
                  </span>
                </div>
                {statusMarkup()}
              </div>
              <button
                className="btn btn--accent min-h-11 w-full justify-center min-[620px]:w-auto min-[620px]:min-w-[210px]"
                type="button"
                data-act="deal"
                disabled={!legal}
                onClick={deal}
              >
                {armed ? t("confirm") : hasGame ? t("dealAgain") : t("deal")}
              </button>
            </div>
          </section>
        </div>
      </SetupShell>

      {pickerMarkup()}
      {previewMarkup()}
      {libraryMarkup()}
    </div>
  );
}
