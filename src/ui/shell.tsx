// The home screen is eager. Other routes load their code on navigation.
import { type FunctionComponent, lazy, useEffect } from "react";
import { LegacyBridge } from "./legacy-bridge.tsx";
import { type ShellPorts, useShellPorts } from "./ports.ts";
import { parseReferenceRoute } from "./reference-route.ts";
import { parseSheetRoute } from "./sheet-route.ts";
import { useRoute } from "./router.ts";
import type { RouteStore } from "./router.ts";
import type { SheetScreenProps } from "./screens/sheet.tsx";
import type { ReferenceScreenProps } from "./screens/reference/index.tsx";
import { HomeScreen } from "./screens/home.tsx";

function UnavailableScreen() {
  const ports = useShellPorts();
  return (
    <section className="mx-auto max-w-160 p-4">
      <h1 role="alert">{ports.strings.t("screenFailed")}</h1>
      <div className="mt-3 flex gap-3">
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          {ports.strings.t("retry")}
        </button>
        <a className="btn" href={ports.router.path("/")}>
          {ports.strings.t("navHome")}
        </a>
      </div>
    </section>
  );
}

function lazyScreen<Props = object>(load: () => Promise<FunctionComponent<Props>>) {
  return lazy<FunctionComponent<Props>>(async () => ({
    default: await load().catch(() => UnavailableScreen),
  }));
}

const PlayerScreen = lazyScreen(() =>
  import("./screens/player.tsx").then((module) => module.PlayerScreen),
);
const SeatScreen = lazyScreen(() =>
  import("./screens/seat.tsx").then((module) => module.SeatScreen),
);
const SecretsScreen = lazyScreen(() =>
  import("./screens/secrets.tsx").then((module) => module.SecretsScreen),
);
const BagScreen = lazyScreen(() => import("./screens/bag.tsx").then((module) => module.BagScreen));
const ChangelogScreen = lazyScreen(() =>
  import("./screens/changelog.tsx").then((module) => module.ChangelogScreen),
);
const PrototypesScreen = lazyScreen(() =>
  import("./screens/prototypes/index.tsx").then((module) => module.PrototypesScreen),
);
const SheetScreen = lazyScreen<SheetScreenProps>(() =>
  import("./screens/sheet.tsx").then((module) => module.SheetScreen),
);
const ReferenceScreen = lazyScreen<ReferenceScreenProps>(() =>
  import("./screens/reference/index.tsx").then((module) => module.ReferenceScreen),
);
const TableScreen = lazyScreen(() =>
  import("./screens/table/index.tsx").then((module) => module.TableScreen),
);

function resolveKey(path: string, ports: ShellPorts): string {
  if (path === "/") return "/";
  if (path === "/player") return "/player";
  if (path === "/seat") return "/seat";
  if (path === "/secrets") return "/secrets";
  if (path === "/bag") return "/bag";
  if (path === "/changelog") return "/changelog";
  if (path === "/prototypes") return "/prototypes";
  if (Object.hasOwn(ports.legacy.screens, path)) return path;
  return "/table";
}

export interface ShellProps {
  ports: ShellPorts;
  route: RouteStore;
}

export function Shell({ ports, route }: ShellProps) {
  const snapshot = useRoute(route);
  const sheet = parseSheetRoute(snapshot.path);
  const reference = parseReferenceRoute(snapshot.path);
  const key = sheet ? "/sheet" : reference ? "/reference" : resolveKey(snapshot.path, ports);

  // The browser harness and the legacy screens read the route from here.
  useEffect(() => {
    document.body.dataset.route = key === "/" ? "home" : key.slice(1);
  }, [key, snapshot.version]);

  if (sheet) {
    return (
      <SheetScreen key={key} lang={sheet.lang ?? ports.locale.current()} edition={sheet.edition} />
    );
  }
  if (key === "/") return <HomeScreen key={key} />;
  if (key === "/player") return <PlayerScreen key={key} />;
  if (key === "/seat") return <SeatScreen key={key} />;
  if (key === "/secrets") return <SecretsScreen key={key} />;
  if (key === "/bag") return <BagScreen key={key} />;
  if (key === "/changelog") return <ChangelogScreen key={key} />;
  if (key === "/prototypes") return <PrototypesScreen key={key} />;
  if (reference) return <ReferenceScreen key={key} roleId={reference.roleId} />;
  if (key === "/table") return <TableScreen key={key} />;
  const screen = ports.legacy.screens[key];
  if (!screen) return null;
  return <LegacyBridge key={`${key}:${snapshot.version}`} screen={screen} />;
}
