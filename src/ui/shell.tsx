// The shell owns every route. `/sheet` is native; every other route renders
// through the legacy bridge; an unknown path still falls back to the table.
import { useEffect, useRef } from "react";
import { LegacyBridge } from "./legacy-bridge.tsx";
import type { ShellPorts } from "./ports.ts";
import { useRoute } from "./router.ts";
import type { RouteStore } from "./router.ts";
import { SheetScreen } from "./screens/sheet.tsx";

// The legacy router's writer policy: only the host-side setup and the table
// write the saved game.
const WRITER_EXEMPT: Record<string, true> = { "/public": true, "/help": true, "/sheet": true, "/demo": true };
const PRIVATE: Record<string, true> = { "/player": true, "/public": true };
const SETUP: Record<string, true> = { "/bag": true, "/seat": true, "/secrets": true };

function resolveKey(path: string, ports: ShellPorts): string {
  if (Object.hasOwn(ports.legacy.screens, path)) return path;
  if (path.startsWith("/sheet")) return "/sheet";
  return "/table";
}

function sheetLang(path: string, ports: ShellPorts): string {
  return /^\/sheet\/(ru|en|az)$/.exec(path)?.[1] ?? ports.locale.current();
}

export interface ShellProps {
  ports: ShellPorts;
  route: RouteStore;
}

export function Shell({ ports, route }: ShellProps) {
  const snapshot = useRoute(route);
  const key = resolveKey(snapshot.path, ports);
  const previous = useRef(key);
  const handback = Object.hasOwn(PRIVATE, previous.current) && Object.hasOwn(SETUP, key);
  const covered = key === "/table" && Object.hasOwn(PRIVATE, previous.current);
  previous.current = key;

  // The browser harness and the legacy screens read the route from here.
  useEffect(() => {
    document.body.dataset.route = key.slice(1);
  }, [key, snapshot.version]);

  if (key === "/sheet") return <SheetScreen key={`sheet:${snapshot.version}`} lang={sheetLang(snapshot.path, ports)} />;
  const screen = ports.legacy.screens[key];
  if (!screen) return null;
  return (
    <LegacyBridge
      key={`${key}:${snapshot.version}`}
      screen={screen}
      writer={!Object.hasOwn(WRITER_EXEMPT, key)}
      covered={covered}
      handback={handback}
    />
  );
}
