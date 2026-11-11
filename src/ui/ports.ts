// The UI layer talks to the application through ports. The composition root
// (`src/entry`) wires the legacy modules here; `src/ui` never imports `js/`.
import { createContext, useContext } from "react";
import type { GameSnapshot } from "../application/store/create-game-store.ts";
import type { DispatchResult } from "../core/commands/result.ts";
import type {
  BagPatch,
  CommandInput,
  InfoRoleId,
  SetupInfoPatch,
} from "../core/commands/contracts.ts";
import type { NightStep, Role } from "../core/model/types.ts";

/** The five guidance blocks the night card shows for the current step. */
export interface Guidance {
  host?: string;
  player: string;
  grimoire: string;
  publicLine: string;
  check: string;
}

export interface GameSource {
  subscribe(listener: () => void): () => void;
  getSnapshot(): GameSnapshot;
  /** The export envelope of the saved game, for the console backup dialog. */
  exportGame(): string;
}

export interface RouterPort {
  current(): string;
  path(name?: string): string;
  go(name?: string): void;
}

export interface LegacyScreen {
  mount(root: HTMLElement, options?: { covered?: boolean }): (() => void) | undefined;
  unmount(): void;
}

/** A concrete bag the presets module produced: no validity flag, no errors. */
export interface PresetBag {
  roles: string[];
  bluffs: string[];
  drunkShownId: string | null;
  lunaticShownId: string | null;
  godfatherOutsider: 1 | -1;
  evilTwinGoodId: string | null;
}

export interface PresetResult extends PresetBag {
  valid?: boolean;
}

export interface BagOptions {
  count: number;
  roles?: string[];
  pool?: string[];
  godfatherOutsider?: 1 | -1;
}

export interface BagHint {
  code: string;
  team?: string;
  missing?: number;
  extra?: number;
}

export interface BagMechanics {
  baron: boolean;
  godfather: boolean;
  fanggu: boolean;
  vigormortis: boolean;
  drunk: boolean;
  lunatic: boolean;
  evilTwin: boolean;
  vortox: boolean;
  poison: boolean;
  protection: string[];
  risk: number;
  information: number;
}

export interface CustomSuggestion extends PresetBag {
  key: string;
  labelKey: string;
  noteKey: string;
}

export interface CustomProblem {
  key: string;
  code: string;
}

export interface LibraryPool {
  id: string;
  name: string;
  roles: string[];
  updatedAt: string;
}

export interface LibraryBag {
  id: string;
  name: string;
  scriptId: string;
  pool: string[];
  roles: string[];
  bluffs: string[];
  drunkShownId: string | null;
  lunaticShownId: string | null;
  godfatherOutsider: 1 | -1;
  evilTwinGoodId: string | null;
  updatedAt: string;
}

export interface BagLibrary {
  pools: LibraryPool[];
  bags: LibraryBag[];
}

export interface BagEntryInput {
  id?: string;
  name: string;
  scriptId: string;
  pool: string[];
  roles: string[];
  bluffs: string[];
  drunkShownId: string | null;
  lunaticShownId: string | null;
  godfatherOutsider: 1 | -1;
  evilTwinGoodId: string | null;
}

export interface PoolEntryInput {
  id?: string;
  name: string;
  roles: string[];
}

export type LibraryRead =
  | { ok: true; library: BagLibrary }
  | { ok: false; library: BagLibrary; error: string };
export type LibraryWrite = { ok: true } | { ok: false; error: string };
export type LibraryParse = { ok: true; library: BagLibrary } | { ok: false; error: string };
export type BagSave =
  | { ok: true; library: BagLibrary; bag: LibraryBag }
  | { ok: false; error: string };
export type PoolSave =
  | { ok: true; library: BagLibrary; pool: LibraryPool }
  | { ok: false; error: string };
export type LibraryUpdate = { ok: true; library: BagLibrary };

export interface ShellPorts {
  readonly router: RouterPort;
  readonly game: GameSource;
  readonly roles: {
    all(): Role[];
    byId(id: string): Role | null;
    image(role: Role | null | undefined): string;
  };
  /** The exclusive writer lock: one tab writes the saved game at a time. */
  readonly writer: { acquire(): Promise<boolean> };
  readonly commands: {
    /** Dispatches any typed command; the console is the only caller today. */
    dispatch(command: CommandInput): DispatchResult;
    claimSeat(playerId: string, name: string): DispatchResult;
    setOrder(order: string[]): DispatchResult;
    startNight(): DispatchResult;
    setHerring(playerId: string | null): DispatchResult;
    setSetupInfo(roleId: InfoRoleId, info: SetupInfoPatch): DispatchResult;
    normalizeSecrets(): DispatchResult;
    bagUpdate(patch: BagPatch): DispatchResult;
    dealGame(): DispatchResult;
  };
  readonly presets: {
    readonly labels: Record<string, string[]>;
    readonly notes: Record<string, string[]>;
    bag(scriptId: string, count: number, variant: number): PresetResult | null;
    repair(options: BagOptions): PresetResult | null;
    resize(options: BagOptions): string[];
    hints(options: BagOptions): BagHint[];
    mechanics(roles: string[]): BagMechanics;
    suggestions(
      count: number,
      pool: string[],
    ): { suggestions: CustomSuggestion[]; problems: Array<string | CustomProblem> };
  };
  readonly library: {
    normalize(value: unknown): BagLibrary;
    read(): LibraryRead;
    write(library: BagLibrary): LibraryWrite;
    saveBag(library: BagLibrary, entry: BagEntryInput): BagSave;
    savePool(library: BagLibrary, entry: PoolEntryInput): PoolSave;
    removeBag(library: BagLibrary, id: string): LibraryUpdate;
    removePool(library: BagLibrary, id: string): LibraryUpdate;
    export(library: BagLibrary): string;
    parse(input: unknown): LibraryParse;
  };
  /** Undo is a store method, not a `CommandInput`. */
  readonly history: {
    canUndo(): boolean;
    undo(): boolean;
  };
  readonly guidance: {
    for(step: NightStep): Guidance;
  };
  readonly strings: {
    t(key: string, vars?: Record<string, string | number>): string;
    /** Translates a fixed screen literal the legacy i18n dict knows. */
    text(value: string): string;
    uiLang(): string;
    teamText(team: string): string;
    roleCount(count: number): string;
  };
  readonly locale: {
    /** Loads the role catalog; rejects when the catalog cannot load. */
    load(code: string): Promise<void>;
    /** Language of the loaded catalog. */
    current(): string;
    /** Applies the language to the document and the shared string table. */
    use(code: string): void;
    /** Legacy DOM translation for bridged screens; returns the stop function. */
    watch(element: Element, onChange: (code: string) => void): () => void;
    /** Switches language for a bridged screen and re-renders it. */
    change(code: string): Promise<void>;
  };
  readonly assets: { url(name: string): string };
  readonly prefs: { read(key: string): string | null; write(key: string, value: string): void };
  readonly legacy: { screens: Record<string, LegacyScreen> };
}

const ShellContext = createContext<ShellPorts | null>(null);

export const ShellProvider = ShellContext.Provider;

export function useShellPorts(): ShellPorts {
  const ports = useContext(ShellContext);
  if (!ports) throw new Error("The UI shell has no ports.");
  return ports;
}
