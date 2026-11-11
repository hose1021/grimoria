import { useShellPorts } from "../ports.ts";

export const HOST_ROUTES = [
  ["table", "table"],
  ["bag", "setup"],
  ["seat", "seats"],
  ["secrets", "secrets"],
  ["player", "player"],
  ["public", "publicScreen"],
  ["help", "help"],
  ["sheet", "roleSheet"],
] as const;

function activeRoute(path: string): string {
  const name = path.split("/")[1];
  return name || "table";
}

export function HostNav() {
  const ports = useShellPorts();
  const t = ports.strings.t;
  const active = activeRoute(ports.router.current());
  const links = HOST_ROUTES.map(([name, key]) => (
    <a
      key={name}
      data-route={name}
      className={`btn inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center whitespace-nowrap ${
        active === name ? "btn--accent" : ""
      }`}
      href={ports.router.path(name)}
      aria-current={active === name ? "page" : undefined}
    >
      {t(key)}
    </a>
  ));
  return (
    <nav
      data-host-nav
      aria-label={t("screens")}
      className="host-nav relative flex min-w-0 flex-nowrap items-center gap-1.5 max-[900px]:w-full"
    >
      <details
        className="host-menu relative min-[900px]:hidden max-[900px]:w-full"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.open = false;
        }}
      >
        <summary className="btn inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center max-[900px]:w-full max-[900px]:justify-start max-[900px]:px-3 [&::-webkit-details-marker]:hidden">
          {t("screens")}
        </summary>
        <div className="absolute left-0 top-full z-40 mt-1 grid min-w-52 gap-1 rounded-lg border border-line bg-panel p-1.5">
          {links}
        </div>
      </details>
      <div className="hidden min-w-0 flex-wrap items-center gap-1.5 min-[900px]:flex">{links}</div>
    </nav>
  );
}
