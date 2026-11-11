// The shell owns every route. `/sheet` is native; every other route renders
// through the legacy bridge; an unknown path still falls back to the table.
import { useEffect, useRef, useState } from "react";
import { HandbackCover } from "./components/handback-cover.tsx";
import { LegacyBridge } from "./legacy-bridge.tsx";
import type { ShellPorts } from "./ports.ts";
import { useRoute } from "./router.ts";
import type { RouteStore } from "./router.ts";
import { PlayerScreen } from "./screens/player.tsx";
import { PublicScreen } from "./screens/public.tsx";
import { SeatScreen } from "./screens/seat.tsx";
import { SecretsScreen } from "./screens/secrets.tsx";
import { BagScreen } from "./screens/bag.tsx";
import { SheetScreen } from "./screens/sheet.tsx";

// The legacy router's writer policy: only the host-side setup and the table
// write the saved game.
const WRITER_EXEMPT: Record<string, true> = {
  "/public": true,
  "/help": true,
  "/sheet": true,
  "/demo": true,
};
const PRIVATE: Record<string, true> = { "/player": true, "/public": true };
const SETUP: Record<string, true> = { "/bag": true, "/seat": true, "/secrets": true };
// Native screens do not pass through the bridge, so the shell gates them.
const NATIVE: Record<string, true> = {
  "/sheet": true,
  "/player": true,
  "/seat": true,
  "/secrets": true,
  "/bag": true,
  "/public": true,
};

function resolveKey(path: string, ports: ShellPorts): string {
  if (path === "/player") return "/player";
  if (path === "/seat") return "/seat";
  if (path === "/secrets") return "/secrets";
  if (path === "/bag") return "/bag";
  if (path === "/public") return "/public";
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
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  useEffect(() => {
    setAcknowledged(null);
  }, [key]);

  // The browser harness and the legacy screens read the route from here.
  useEffect(() => {
    document.body.dataset.route = key.slice(1);
  }, [key, snapshot.version]);

  if (handback && Object.hasOwn(NATIVE, key) && acknowledged !== key) {
    return <HandbackCover onReturn={() => setAcknowledged(key)} />;
  }

  if (key === "/sheet")
    return <SheetScreen key={`sheet:${snapshot.version}`} lang={sheetLang(snapshot.path, ports)} />;
  if (key === "/player") return <PlayerScreen key={`player:${snapshot.version}`} />;
  if (key === "/seat") return <SeatScreen key={`seat:${snapshot.version}`} />;
  if (key === "/secrets") return <SecretsScreen key={`secrets:${snapshot.version}`} />;
  if (key === "/bag") return <BagScreen key={`bag:${snapshot.version}`} />;
  if (key === "/public") return <PublicScreen key={`public:${snapshot.version}`} />;
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
