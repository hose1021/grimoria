// The UI layer talks to the application through ports. The composition root
// (`src/entry`) wires the legacy modules here; `src/ui` never imports `js/`.
import { createContext, useContext } from "react";
import type { GameSnapshot } from "../application/store/create-game-store.ts";
import type { Role } from "../core/model/types.ts";

export interface GameSource {
  subscribe(listener: () => void): () => void;
  getSnapshot(): GameSnapshot;
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

export interface ShellPorts {
  readonly router: RouterPort;
  readonly game: GameSource;
  readonly roles: {
    all(): Role[];
    image(role: Role | null | undefined): string;
  };
  readonly strings: {
    t(key: string, vars?: Record<string, string | number>): string;
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
  readonly legacy: {
    acquireWriter(): Promise<boolean>;
    screens: Record<string, LegacyScreen>;
  };
}

const ShellContext = createContext<ShellPorts | null>(null);

export const ShellProvider = ShellContext.Provider;

export function useShellPorts(): ShellPorts {
  const ports = useContext(ShellContext);
  if (!ports) throw new Error("The UI shell has no ports.");
  return ports;
}
