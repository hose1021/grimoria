// Setup: the scenario picker, the bag editor, the bluffs and the scenario
// secrets. Editor state is local until a command commits it; the screen reads
// the published snapshot for the bag, the errors and the script.
import { useEffect, useRef, useState } from "react";
import type { BagPatch } from "../../core/commands/contracts.ts";
import { setupProjection } from "../../application/read-models/table.ts";
import {
  COMPOSITION,
  TEAMS,
  bagCounts,
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
import { LanguageSwitch } from "../components/language-switch.tsx";
import type { BagEntryInput, BagLibrary } from "../ports.ts";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

const MIN = 5;
const MAX = 15;
const SCRIPT_IDS = ["tb", "bmr", "snv"];
const SIZES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const SUPPORT_LEVEL_KEY = {
  verified: "scriptLevelVerified",
  "requires-storyteller-choice": "scriptLevelStoryteller",
  unsupported: "scriptLevelUnsupported",
};

interface AnyBag {
  roles: string[];
  bluffs?: string[];
  drunkShownId?: string | null;
  lunaticShownId?: string | null;
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
  const [search, setSearch] = useState("");
  const [editionFilter, setEditionFilter] = useState(() =>
    state.script && SCRIPT_IDS.includes(state.script.id) ? state.script.edition : "all",
  );
  const [teamFilter, setTeamFilter] = useState("all");
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
  const unusedGood = () =>
    unused().filter((role) => role.team === "townsfolk" || role.team === "outsider");
  const unusedTownsfolk = () => unused().filter((role) => role.team === "townsfolk");

  const send = (patch: BagPatch) => ports.commands.bagUpdate(patch);

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
    send({
      count: bag.roles.length,
      resetRoster: true,
      phase: "setup",
      roles: bag.roles.slice(),
      bluffs: (bag.bluffs || []).slice(),
      drunkShownId: bag.drunkShownId || null,
      lunaticShownId: bag.lunaticShownId || null,
      godfatherOutsider: bag.godfatherOutsider || 1,
      evilTwinGoodId: bag.evilTwinGoodId || null,
    });
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
      godfatherOutsider: parsed.godfatherOutsider === -1 ? -1 : 1,
      evilTwinGoodId: parsed.evilTwinGoodId,
    });
    setArmed(false);
    setBagError("");
  };

  const setCount = (next: number) => {
    if (next < MIN || next > MAX || next === state.setup.count) return;
    if (hasGame && !window.confirm(t("ui.changeCount"))) return;
    pushUndo();
    const kept = ports.presets.resize({
      count: next,
      roles: state.setup.roles,
      pool: scriptRoles,
      godfatherOutsider: shiftOf(state),
    });
    send({ count: next, roles: kept });
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
    setEditionFilter(SCRIPT_IDS.includes(script.id) ? script.edition : "all");
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
      godfatherOutsider: 1,
      evilTwinGoodId: null,
    });
    if (result.status !== "allowed") setBagError(result.reason || t("illegal"));
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
        setEditionFilter("all");
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
        evilTwinGoodId: null,
      });
      setActivePoolId(null);
      setActiveBagId(null);
      setLibraryName("");
      setTab("manual");
      setPoolMode(true);
      setEditionFilter("all");
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
      setEditionFilter(key);
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
    if (bag.scriptId !== state.script?.id) {
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
    send({
      ...(script ? { script } : {}),
      count: bag.roles.length,
      resetRoster: true,
      phase: "setup",
      roles: bag.roles.slice(),
      bluffs: bag.bluffs.slice(),
      drunkShownId: bag.drunkShownId,
      lunaticShownId: bag.lunaticShownId,
      godfatherOutsider: bag.godfatherOutsider,
      evilTwinGoodId: bag.evilTwinGoodId,
    });
    setLibraryOpen(false);
    setArmed(false);
    setTab("manual");
    setActiveBagId(bag.id);
    setActivePoolId(null);
    setLibraryName(bag.name);
    // The command has committed the new script into the live state.
    setEditionFilter(
      state.script && SCRIPT_IDS.includes(state.script.id) ? state.script.edition : "all",
    );
  };

  const loadPool = (id: string) => {
    const pool = library.pools.find((entry) => entry.id === id);
    if (!pool) return;
    if (hasGame && !window.confirm(t("ui.changeScript"))) return;
    send({
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
      evilTwinGoodId: null,
    });
    setLibraryOpen(false);
    setArmed(false);
    setTab("manual");
    setPoolMode(false);
    setActivePoolId(pool.id);
    setActiveBagId(null);
    setLibraryName(pool.name);
    setEditionFilter("all");
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
  const mixed = isMixedEdition(scriptRoles);
  const manualOnly = Boolean(state.script?.manualOnly);

  const roleCard = (role: Role) => {
    const selected = state.setup.roles.includes(role.id);
    const allowed = inPool(role.id) || isCustom || poolMode;
    const pressed = poolMode ? inPool(role.id) : selected;
    const classes = [
      "bag-role",
      pressed ? "is-on" : "is-off",
      isCustom && inPool(role.id) ? "is-pool" : "",
      allowed ? "" : "is-locked",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <button
        key={role.id}
        className={classes}
        type="button"
        data-role={role.id}
        data-team={role.team}
        aria-pressed={pressed}
        disabled={!allowed}
        title={allowed ? "" : t("bag.roleOutside")}
        onClick={() => (poolMode ? togglePoolRole(role.id) : toggleRole(role.id))}
      >
        <img src={ports.roles.image(role)} alt="" />
        <span className="bag-role-text">
          <b>{role.name}</b>
          <span>{role.ability || ""}</span>
          <em>
            {teamLabel(role.team)} · {editionLabel(role.edition)}
          </em>
        </span>
        {poolMode ? <span className="bag-role-mode">{pressed ? "✓" : "+"}</span> : null}
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
    return TEAMS.map((team) => (
      <span key={team} className={`bag-count-chip ${got[team] === req[team] ? "is-ok" : "is-bad"}`}>
        <i className={`bag-dot bag-dot--${team}`} aria-hidden="true" />
        {teamLabel(team)}
        <b>
          {got[team]}/{req[team]}
        </b>
      </span>
    ));
  };

  const statusMarkup = () =>
    errors.length ? (
      <div className="bag-status is-bad" role="status">
        <b>{t("illegal")}</b>
        <ul>
          {errors.map((error) => (
            <li key={error.message}>{error.message}</li>
          ))}
        </ul>
      </div>
    ) : (
      <p className="bag-status is-ok" role="status">
        {t("legal")} · {t("legalRandom")}
      </p>
    );

  const hintMarkup = () => {
    const hints = ports.presets.hints({
      count,
      roles: state.setup.roles,
      pool: scriptRoles,
      godfatherOutsider: shiftOf(state),
    });
    if (!hints.length) return null;
    return (
      <ul className="bag-hints">
        {hints.map((hint) => {
          if (hint.code === "need-team") {
            return (
              <li key={hint.code + hint.team}>
                {t("bag.needTeam", { n: hint.missing ?? 0, team: teamLabel(hint.team ?? "") })}
              </li>
            );
          }
          if (hint.code === "remove-team") {
            return (
              <li key={hint.code + hint.team}>
                {t("bag.removeTeam", { n: hint.extra ?? 0, team: teamLabel(hint.team ?? "") })}
              </li>
            );
          }
          if (hint.code === "need-demon") return <li key={hint.code}>{t("bag.needDemon")}</li>;
          if (hint.code === "mixed-edition") return <li key={hint.code}>{t("bag.mixWarning")}</li>;
          return null;
        })}
      </ul>
    );
  };

  const bluffsMarkup = () => {
    if (!requiredBluffs(count)) return <p className="bag-note">{t("noBluffs")}</p>;
    const options = unusedGood().filter(
      (role) => role.id !== state.setup.drunkShownId && !state.setup.bluffs.includes(role.id),
    );
    return (
      <>
        <div className="bag-bluff-slots" aria-label={t("bluffs")}>
          {[0, 1, 2].map((index) => {
            const role = state.setup.bluffs[index] ? roleOf(state.setup.bluffs[index]) : null;
            return (
              <button
                key={index}
                className={`bag-bluff-slot${role ? " is-on" : ""}`}
                type="button"
                data-bluff-slot={index}
                aria-label={`${t("bluffs")} ${index + 1}`}
                onClick={() => {
                  if (!beginSetup()) return;
                  pushUndo();
                  const bluffs = state.setup.bluffs.slice();
                  bluffs.splice(index, 1);
                  send({ bluffs });
                }}
              >
                {role ? (
                  <>
                    <img src={ports.roles.image(role)} alt="" />
                    <b>{role.name}</b>
                  </>
                ) : (
                  <span className="bag-bluff-empty">{t("ui.empty")}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="bag-bluff-pool" aria-label={t("ui.availableBluffs")}>
          {options.length ? (
            options.map((role) => (
              <button
                key={role.id}
                className="bag-bluff-token"
                type="button"
                data-bluff-role={role.id}
                aria-label={role.name}
                disabled={state.setup.bluffs.length >= 3}
                onClick={() => {
                  if (!beginSetup()) return;
                  pushUndo();
                  const bluffs = state.setup.bluffs.slice();
                  if (bluffs.includes(role.id)) return;
                  if (bluffs.length >= 3) return;
                  bluffs.push(role.id);
                  send({ bluffs });
                }}
              >
                <img src={ports.roles.image(role)} alt="" />
                <span>{role.name}</span>
              </button>
            ))
          ) : (
            <p className="bag-note">{t("none")}</p>
          )}
        </div>
        <p className="bag-note">
          {t("chooseBluffs")} {t("drunkWarning")}
        </p>
      </>
    );
  };

  const drunkMarkup = () => {
    if (!state.setup.roles.includes("drunk")) return null;
    return (
      <div className="bag-secret-row">
        <span className="label">{t("drunkShown")}</span>
        <div className="bag-drunk-pool">
          {unusedTownsfolk().map((role) => {
            const on = state.setup.drunkShownId === role.id;
            return (
              <button
                key={role.id}
                className={`bag-bluff-token${on ? " is-on" : ""}`}
                type="button"
                data-drunk-role={role.id}
                aria-pressed={on}
                onClick={() => {
                  if (!beginSetup()) return;
                  pushUndo();
                  send({ drunkShownId: role.id });
                }}
              >
                <img src={ports.roles.image(role)} alt="" />
                <span>{role.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const godfatherMarkup = () => {
    if (!state.setup.roles.includes("godfather")) return null;
    return (
      <div className="bag-secret-row">
        <span className="label">{t("godfatherSetup")}</span>
        <div className="bag-drunk-pool">
          {[1, -1].map((value) => {
            const on = state.setup.godfatherOutsider === value;
            return (
              <button
                key={value}
                className={`bag-bluff-token${on ? " is-on" : ""}`}
                type="button"
                data-godfather={value}
                aria-pressed={on}
                onClick={() => {
                  if (!beginSetup()) return;
                  pushUndo();
                  send({ godfatherOutsider: value === -1 ? -1 : 1 });
                }}
              >
                <span>{value === 1 ? t("godfatherPlus") : t("godfatherMinus")}</span>
              </button>
            );
          })}
        </div>
        <p className="bag-note">{t("godfatherHint")}</p>
      </div>
    );
  };

  const evilTwinMarkup = () => {
    if (!state.setup.roles.includes("eviltwin")) return null;
    const good = state.setup.roles.filter(
      (id) => id !== "eviltwin" && (roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider"),
    );
    return (
      <div className="bag-secret-row">
        <span className="label">{t("evilTwinGood")}</span>
        <div className="bag-drunk-pool">
          {good.map((id) => {
            const role = roleOf(id);
            const on = state.setup.evilTwinGoodId === id;
            return (
              <button
                key={id}
                className={`bag-bluff-token${on ? " is-on" : ""}`}
                type="button"
                data-evil-twin={id}
                aria-pressed={on}
                onClick={() => {
                  if (!beginSetup()) return;
                  pushUndo();
                  send({ evilTwinGoodId: id });
                }}
              >
                <img src={ports.roles.image(role)} alt="" />
                <span>{role.name}</span>
              </button>
            );
          })}
        </div>
        <p className="bag-note">{t("evilTwinHint")}</p>
      </div>
    );
  };

  const lunaticMarkup = () => {
    if (!state.setup.roles.includes("lunatic")) return null;
    return (
      <div className="bag-secret-row">
        <span className="label">{t("lunaticShown")}</span>
        <div className="bag-drunk-pool">
          {poolRoles()
            .filter((role) => role.team === "demon")
            .map((role) => {
              const on = state.setup.lunaticShownId === role.id;
              return (
                <button
                  key={role.id}
                  className={`bag-bluff-token${on ? " is-on" : ""}`}
                  type="button"
                  data-lunatic-role={role.id}
                  aria-pressed={on}
                  onClick={() => {
                    if (!beginSetup()) return;
                    pushUndo();
                    send({ lunaticShownId: role.id });
                  }}
                >
                  <img src={ports.roles.image(role)} alt="" />
                  <span>{role.name}</span>
                </button>
              );
            })}
        </div>
        <p className="bag-note">{t("lunaticHint")}</p>
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

  const teamSummary = (roles: string[]) => {
    const counts = bagCounts(roles);
    return TEAMS.map((team) => `${counts[team]} ${teamLabel(team)}`).join(" · ");
  };

  const roleTokens = (roles: string[]) =>
    roles.map((id) => {
      const role = roleOf(id);
      return (
        <span className="bag-token" key={id} data-team={role.team}>
          <img src={ports.roles.image(role)} alt="" />
          <b>{role.name}</b>
        </span>
      );
    });

  const previewMarkup = () => {
    if (!preview) return null;
    const bag = preview;
    const facts = ports.presets.mechanics(bag.roles);
    return (
      <div className="script-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <div className="script-picker bag-preview">
          <div className="script-picker-head">
            <div>
              <p className="label">{t("preview")}</p>
              <h2 id="preview-title">{bag.label || t("bag.previewBag")}</h2>
            </div>
            <button
              className="btn script-close"
              type="button"
              data-act="close-preview"
              aria-label={t("close")}
              onClick={() => setPreview(null)}
            >
              ✕
            </button>
          </div>
          <div className="bag-preview-composition">{teamSummary(bag.roles)}</div>
          {TEAMS.map((team) => {
            const roles = bag.roles.filter((id) => roleTeam(id) === team);
            if (!roles.length) return null;
            return (
              <div className="bag-preview-group" key={team}>
                <h3>{teamLabel(team)}</h3>
                <div className="bag-token-row">{roleTokens(roles)}</div>
              </div>
            );
          })}
          <p className="bag-note">{noteFor(bag, bag.noteKey || "bag.previewBag")}</p>
          {requiredBluffs(bag.roles.length) ? (
            <div className="bag-preview-group">
              <h3>{t("bluffs")}</h3>
              <div className="bag-token-row">{roleTokens(bag.bluffs || [])}</div>
            </div>
          ) : null}
          {facts.drunk ? (
            <p className="bag-note">
              {t("drunkShown")}: {roleOf(bag.drunkShownId).name}
            </p>
          ) : null}
          {facts.lunatic && bag.lunaticShownId ? (
            <p className="bag-note">
              {t("lunaticShown")}: {roleOf(bag.lunaticShownId).name}
            </p>
          ) : null}
          {facts.evilTwin && bag.evilTwinGoodId ? (
            <p className="bag-note">
              {t("evilTwinGood")}: {roleOf(bag.evilTwinGoodId).name}
            </p>
          ) : null}
          <p className="bag-note">{t("legalNotBalanced")}</p>
          <div className="script-actions">
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

  const cardMarkup = (entry: BagEntry) => (
    <article className="bag-preset-card" data-roles={entry.roles.join(" ")} key={entry.key}>
      <header>
        <div>
          <h3>{t(entry.labelKey)}</h3>
          <span className="bag-preset-meta">
            {entry.roles.length} {t("players")} · {teamSummary(entry.roles)}
          </span>
        </div>
        {entry.valid === false ? <b className="bag-status is-bad">{t("illegal")}</b> : null}
      </header>
      <div className="bag-token-row">{roleTokens(entry.roles)}</div>
      {entry.bluffs && entry.bluffs.length ? (
        <p className="bag-preset-bluffs">
          {t("bluffs")}: {entry.bluffs.map((id) => roleOf(id).name).join(", ")}
        </p>
      ) : null}
      <p className="bag-note">{noteFor(entry, entry.noteKey)}</p>
      <div className="bag-preset-actions">
        <button
          className="btn"
          type="button"
          data-preview={entry.key}
          onClick={() => setPreview(entry)}
        >
          {t("preview")}
        </button>
        <button
          className="btn btn--accent"
          type="button"
          data-apply={entry.key}
          onClick={() => applyBag(entry)}
        >
          {t("apply")}
        </button>
      </div>
    </article>
  );

  const recommendedMarkup = () => {
    if (isCustom && scriptRoles.length < 5) {
      return (
        <div className="bag-empty">
          <p>{t("bag.poolEmpty")}</p>
          <button
            className="btn btn--accent"
            type="button"
            data-act="edit-pool"
            onClick={() => {
              setPoolMode(true);
              setTab("manual");
              setEditionFilter("all");
            }}
          >
            {t("bag.editPool")}
          </button>
        </div>
      );
    }
    const { entries, problems } = recommendedEntries();
    return (
      <>
        <div className="bag-preset-grid">{entries.map((entry) => cardMarkup(entry))}</div>
        {problems.length ? (
          <div className="bag-status is-bad">
            <b>{t("illegal")}</b>
            <ul>
              {problems.map((problem, index) => (
                <li key={index}>
                  {t("custom.problem." + (typeof problem === "string" ? problem : problem.code))}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="bag-note">{t("legalNotBalanced")}</p>
      </>
    );
  };

  const filteredCatalog = () => {
    const edition = editionFilter || (isOfficial ? state.script?.edition || "all" : "all");
    const query = search.trim().toLowerCase();
    const order = new Map(catalog().map((role, index) => [role.id, index]));
    const rank = (role: Role) => {
      if (poolMode) return inPool(role.id) ? 0 : 1;
      if (state.setup.roles.includes(role.id)) return 0;
      return inPool(role.id) ? 1 : 2;
    };
    return catalog()
      .filter((role) => {
        if (edition !== "all" && role.edition !== edition) return false;
        if (teamFilter !== "all" && role.team !== teamFilter) return false;
        if (!query) return true;
        return (
          (role.name || "").toLowerCase().includes(query) ||
          (role.ability || "").toLowerCase().includes(query) ||
          role.id.includes(query)
        );
      })
      .sort(
        (left, right) =>
          rank(left) - rank(right) || (order.get(left.id) || 0) - (order.get(right.id) || 0),
      );
  };

  const manualMarkup = () => {
    const left = count - state.setup.roles.length;
    return (
      <>
        <div className="bag-manual-head">
          <p className="bag-remaining">
            <b>{t("bag.remaining", { n: left })}</b> ·{" "}
            {t("bag.selected", { n: state.setup.roles.length })}
          </p>
          <div className="bag-manual-tools">
            <button
              className="btn"
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
              className="btn"
              type="button"
              data-act="undo"
              disabled={!undoStack.length}
              onClick={undoBag}
            >
              {t("undo")}
            </button>
            <button className="btn" type="button" data-act="repair" onClick={applyRepair}>
              {t("bag.fix")}
            </button>
          </div>
        </div>
        <div className="bag-selected">
          {state.setup.roles.length ? (
            state.setup.roles.map((id) => {
              const role = roleOf(id);
              return (
                <button
                  key={id}
                  className="bag-token bag-token--button"
                  type="button"
                  data-role={id}
                  data-team={role.team}
                  title={t("bag.remove")}
                  onClick={() => (poolMode ? togglePoolRole(id) : toggleRole(id))}
                >
                  <img src={ports.roles.image(role)} alt="" />
                  <b>{role.name}</b>
                  <span aria-hidden="true">×</span>
                </button>
              );
            })
          ) : (
            <p className="bag-note">{t("bag.noneSelected")}</p>
          )}
        </div>
        <div className="bag-filters">
          <input
            className="field"
            type="search"
            value={search}
            data-search
            placeholder={t("bag.search")}
            aria-label={t("bag.search")}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="field"
            data-edition
            aria-label={t("bag.edition")}
            value={editionFilter}
            onChange={(event) => setEditionFilter(event.target.value)}
          >
            <option value="">{t("bag.activeEdition")}</option>
            <option value="all">{t("bag.allEditions")}</option>
            {["tb", "bmr", "snv"].map((edition) => (
              <option key={edition} value={edition}>
                {editionLabel(edition)}
              </option>
            ))}
          </select>
          <select
            className="field"
            data-team-filter
            aria-label={t("team")}
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
          >
            <option value="all">{t("bag.allTeams")}</option>
            {TEAMS.map((team) => (
              <option key={team} value={team}>
                {teamLabel(team)}
              </option>
            ))}
          </select>
          {isCustom ? (
            <button
              className={`btn${poolMode ? " btn--accent" : ""}`}
              type="button"
              data-act="edit-pool"
              onClick={() => {
                setPoolMode((value) => !value);
                setEditionFilter("all");
                setTab("manual");
              }}
            >
              {poolMode ? t("bag.poolDone") : t("bag.editPool")}
            </button>
          ) : null}
        </div>
        {poolMode ? <p className="bag-note bag-pool-hint">{t("bag.poolHint")}</p> : null}
        <div className="bag-grid">{filteredCatalog().map((role) => roleCard(role))}</div>
      </>
    );
  };

  const randomMarkup = () => (
    <div className="bag-empty">
      <p>{t("legalRandom")}</p>
      <p className="bag-note">{t("legalNotBalanced")}</p>
      <button
        className="btn btn--accent"
        type="button"
        data-act="random"
        onClick={() => {
          const bag = tryRandomBag(count);
          if (bag) applyBag(bag);
        }}
      >
        {t("randomBag")}
      </button>
      {statusMarkup()}
    </div>
  );

  const currentScenario = isOfficial ? state.script?.id : "custom";

  const supportMarkup = (roles: readonly RoleId[]) => {
    const support = scriptSupport(roles);
    return (
      <div className={`script-support is-${support.level}`} data-script-support={support.level}>
        <b>{t(SUPPORT_LEVEL_KEY[support.level])}</b>
        <span data-support-level="verified" data-support-count={support.counts.verified}>
          {t("scriptSupportVerified", { count: support.counts.verified })}
        </span>
        <span
          data-support-level="requires-storyteller-choice"
          data-support-count={support.counts["requires-storyteller-choice"]}
        >
          {t("scriptSupportStoryteller", {
            count: support.counts["requires-storyteller-choice"],
          })}
        </span>
        <span data-support-level="unsupported" data-support-count={support.counts.unsupported}>
          {t("scriptSupportUnsupported", { count: support.counts.unsupported })}
        </span>
        {support.jinxes.map((pair) => (
          <span className="bag-note" key={pair.source} title={pair.source}>
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
      <div className="script-preview" role="status">
        <b>{script.name}</b>
        <span>
          {script.roles.length} {ports.strings.roleCount(script.roles.length)} · {teamText}
        </span>
        {script.author ? (
          <span>
            {t("scriptAuthor")}: {script.author}
          </span>
        ) : null}
        {pickerPreview.travellers && pickerPreview.travellers.length ? (
          <span className="bag-note">{t("scriptTravellersIgnored")}</span>
        ) : null}
        {supportMarkup(script.roles)}
      </div>
    );
  };

  const pickerMarkup = () =>
    pickerOpen ? (
      <div
        className="script-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="script-picker-title"
      >
        <div className="script-picker">
          <div className="script-picker-head">
            <div>
              <p className="label">Grimoria</p>
              <h2 id="script-picker-title">{t("scriptPicker")}</h2>
            </div>
            <button
              className="btn script-close"
              type="button"
              data-act="close-script"
              aria-label={t("close")}
              onClick={() => {
                setPickerOpen(false);
                setPickerError("");
              }}
            >
              ✕
            </button>
          </div>

          <section className="script-group">
            <h3>{t("scriptOfficial")}</h3>
            <div className="script-choices">
              {OFFICIAL_SCRIPTS.map((entry) => (
                <label
                  key={entry.id}
                  className={`script-choice${entry.supported ? "" : " is-disabled"}`}
                >
                  <input
                    type="radio"
                    name="script-pick"
                    value={entry.id}
                    checked={pickerChoice === entry.id}
                    disabled={!entry.supported}
                    onChange={() => setPickerChoice(entry.id)}
                  />
                  <span>{entry.name}</span>
                  <small>
                    {entry.roleCount} {ports.strings.roleCount(entry.roleCount)}
                    {entry.supported ? "" : " · " + t("scriptSoon")}
                  </small>
                </label>
              ))}
            </div>
            <p className="bag-note">{t("scriptSoonHint")}</p>
          </section>

          <details
            className="script-group"
            data-script-section="file"
            open={pickerSection === "file"}
            onToggle={(event) => {
              if (event.currentTarget.open) setPickerSection("file");
            }}
          >
            <summary>{t("scriptLoadFile")}</summary>
            <input
              className="field"
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
            <p className="bag-note">{t("scriptFormatHint")}</p>
          </details>

          <details
            className="script-group"
            data-script-section="url"
            open={pickerSection === "url"}
            onToggle={(event) => {
              if (event.currentTarget.open) setPickerSection("url");
            }}
          >
            <summary>{t("scriptUrl")}</summary>
            <div className="script-url-row">
              <input
                className="field"
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
            <p className="bag-note">{t("scriptUrlHint")}</p>
          </details>

          <details
            className="script-group"
            data-script-section="clipboard"
            open={pickerSection === "clipboard"}
            onToggle={(event) => {
              if (event.currentTarget.open) setPickerSection("clipboard");
            }}
          >
            <summary>{t("scriptClipboard")}</summary>
            <div className="script-url-row">
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
              className="field script-text"
              data-script-text
              aria-label={t("scriptClipboard")}
              placeholder={t("scriptFormatHint")}
              value={pickerText}
              onChange={(event) => setPickerText(event.target.value)}
            />
          </details>

          <a
            className="script-external"
            href="https://script.bloodontheclocktower.com/"
            target="_blank"
            rel="noopener"
          >
            {t("scriptBotc")} ↗
          </a>

          {scriptPreviewMarkup()}
          {pickerError ? (
            <p className="script-error" role="alert">
              {pickerError}
            </p>
          ) : null}

          <div className="script-actions">
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
        </div>
      </div>
    ) : null;

  const libraryMarkup = () =>
    libraryOpen ? (
      <div className="script-modal" role="dialog" aria-modal="true" aria-labelledby="library-title">
        <div className="script-picker">
          <div className="script-picker-head">
            <div>
              <p className="label">{t("bag.library")}</p>
              <h2 id="library-title">{t("bag.library")}</h2>
            </div>
            <button
              className="btn script-close"
              type="button"
              data-act="close-library"
              aria-label={t("close")}
              onClick={() => {
                setLibraryOpen(false);
                setLibraryError("");
              }}
            >
              ✕
            </button>
          </div>
          <div className="script-url-row">
            <input
              className="field"
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
              <button className="btn" type="button" data-act="save-pool" onClick={saveCurrentPool}>
                {t("bag.savePool")}
              </button>
            ) : null}
          </div>
          {libraryError ? (
            <p className="script-error" role="alert">
              {libraryError}
            </p>
          ) : null}
          <div className="bag-library-grid">
            <section>
              <h3>{t("bag.savedBags")}</h3>
              {library.bags.length ? (
                library.bags.map((bag) => (
                  <div className="bag-library-row" key={bag.id}>
                    <span>
                      <b>{bag.name}</b>
                      <small>
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
                <p className="bag-note">{t("bag.libraryEmpty")}</p>
              )}
            </section>
            <section>
              <h3>{t("bag.savedPools")}</h3>
              {library.pools.length ? (
                library.pools.map((pool) => (
                  <div className="bag-library-row" key={pool.id}>
                    <span>
                      <b>{pool.name}</b>
                      <small>
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
                <p className="bag-note">{t("bag.libraryEmpty")}</p>
              )}
            </section>
          </div>
          <div className="script-actions">
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
        </div>
      </div>
    ) : null;

  const deal = () => {
    if (!legal) return;
    if (!armed && hasGame) {
      setArmed(true);
      return;
    }
    const result = ports.commands.dealGame();
    if (result.status !== "allowed") {
      const message =
        result.status === "rejected"
          ? result.errors?.join("\n") || result.reason || t("illegal")
          : result.reason || t("illegal");
      window.alert(message);
      return;
    }
    ports.router.go("/player");
  };

  return (
    <div className="setup" ref={root}>
      <header className="setup-head">
        <div className="setup-brand">
          <img className="brand-mark" src={ports.assets.url("favicon.svg")} alt="Grimoria" />
          <div>
            <b>{t("setupTitle")}</b>
            <small>
              {state.script ? state.script.name : ""} · {count} {t("players")}
            </small>
          </div>
        </div>
        <nav className="setup-nav" aria-label={t("setup")}>
          <button
            className="btn"
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
            {t("script")}
          </button>
          <button
            className="btn"
            type="button"
            data-act="library"
            onClick={() => {
              setLibraryOpen(true);
              setLibraryError("");
            }}
          >
            {t("bag.library")}
          </button>
          <a className="btn" href={ports.router.path("table")}>
            {t("table")}
          </a>
          <a className="btn" href={ports.router.path("seat")}>
            {t("seats")}
          </a>
          <a className="btn" href={ports.router.path("help")}>
            {t("help")}
          </a>
        </nav>
        <LanguageSwitch />
      </header>

      {hasGame ? (
        <div className="setup-banner">
          <b>{t("warning")}:</b> {t("dealAgain")} — {t("newGame")}. {t("discussWarning")}
        </div>
      ) : null}
      {mixed ? (
        <div className={`setup-banner ${manualOnly ? "is-warning" : "is-error"}`}>
          <b>{t("warning")}:</b> {manualOnly ? t("manualOnlyWarning") : t("bag.mixWarning")}
          <label className="bag-manual-toggle">
            <input
              type="checkbox"
              data-manual-only
              checked={manualOnly}
              onChange={(event) => {
                if (!beginSetup()) return;
                send({ script: { ...(state.script as Script), manualOnly: event.target.checked } });
              }}
            />
            <span>{t("manualOnlyToggle")}</span>
          </label>
        </div>
      ) : null}
      {bagError ? <div className="setup-banner is-error">{bagError}</div> : null}
      {state.storageError ? (
        <div className="setup-banner is-error">
          {t("storageError")}: {state.storageError}
        </div>
      ) : null}

      <main className="setup-shell">
        <section className="setup-block">
          <div className="setup-block-head">
            <div>
              <span className="label">01</span>
              <h1>
                {state.script ? state.script.name : ""}: {t("setupIntro")}
              </h1>
            </div>
            <div className="setup-count">
              <button
                className="setup-step"
                type="button"
                data-count="-1"
                aria-label={t("ui.fewer")}
                onClick={() => setCount(count - 1)}
              >
                −
              </button>
              <b>{count}</b>
              <button
                className="setup-step"
                type="button"
                data-count="1"
                aria-label={t("ui.more")}
                onClick={() => setCount(count + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div className="bag-scenarios" role="tablist" aria-label={t("script")}>
            {["tb", "bmr", "snv", "custom"].map((key) => (
              <button
                key={key}
                className={`bag-scenario${currentScenario === key ? " is-on" : ""}`}
                type="button"
                data-scenario={key}
                aria-pressed={currentScenario === key}
                onClick={() => selectScenario(key)}
              >
                {key === "custom"
                  ? t("scriptCustom")
                  : OFFICIAL_SCRIPTS.find((entry) => entry.id === key)?.name || ""}
              </button>
            ))}
          </div>
          {supportMarkup(scriptRoles)}
          <div className="setup-composition">{compositionMarkup()}</div>
          <div className="setup-table" aria-label={t("composition")}>
            {SIZES.map((size) => {
              const base = COMPOSITION[size] ?? [];
              return (
                <span key={size} className={size === count ? "is-current" : ""}>
                  <b>{size}</b>
                  <span>{base.join(" / ")}</span>
                </span>
              );
            })}
          </div>
          <p className="setup-hint">{t("legalNotBalanced")}</p>
        </section>

        <section className="setup-block">
          <div className="setup-block-head">
            <div>
              <span className="label">02</span>
              <h2>{t("composition")}</h2>
            </div>
            {statusMarkup()}
          </div>
          <div className="bag-tabs" role="tablist">
            {["recommended", "manual", "random"].map((key) => (
              <button
                key={key}
                className={`bag-tab${tab === key ? " is-on" : ""}`}
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
          {tab === "recommended" ? recommendedMarkup() : null}
          {tab === "manual" ? manualMarkup() : null}
          {tab === "random" ? randomMarkup() : null}
          {tab === "manual" ? hintMarkup() : null}
        </section>

        <section className="setup-block">
          <div className="setup-block-head">
            <div>
              <span className="label">03</span>
              <h2>
                {t("bluffs")}
                {state.setup.roles.includes("drunk") ? " · " + t("drunkShown") : ""}
              </h2>
            </div>
          </div>
          <div className="setup-secrets">
            {drunkMarkup()}
            {bluffsMarkup()}
          </div>
        </section>

        <section className="setup-block">
          <div className="setup-block-head">
            <div>
              <span className="label">04</span>
              <h2>{t("scenarioSecrets")}</h2>
            </div>
          </div>
          {godfatherMarkup()}
          {lunaticMarkup()}
          {evilTwinMarkup()}
          {!godfatherMarkup() && !lunaticMarkup() && !evilTwinMarkup() ? (
            <p className="bag-note">{t("none")}</p>
          ) : null}
          {isBmrScript(state.script) ? (
            <p className="bag-note bmr-warning">{t("bmrHostWarning")}</p>
          ) : null}
          {isSnvScript(state.script) ? (
            <p className="bag-note snv-warning">{t("svHostWarning")}</p>
          ) : null}
        </section>

        <section className="setup-block setup-final">
          <div className="setup-block-head">
            <div>
              <span className="label">05</span>
              <h2>{t("ready")}</h2>
            </div>
          </div>
          {statusMarkup()}
          <div className="setup-final-actions">
            <button
              className="btn btn--accent setup-deal"
              type="button"
              data-act="deal"
              disabled={!legal}
              onClick={deal}
            >
              {armed ? t("confirm") : hasGame ? t("dealAgain") : t("deal")}
            </button>
            <a className="btn" href={ports.router.path("table")}>
              {t("table")}
            </a>
          </div>
          <p className="setup-hint">{t("discussWarning")}</p>
        </section>
      </main>

      {pickerMarkup()}
      {previewMarkup()}
      {libraryMarkup()}
    </div>
  );
}
