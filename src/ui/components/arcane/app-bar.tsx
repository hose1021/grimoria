import { useShellPorts } from "../../ports.ts";
import { useGame } from "../../store/use-game.ts";
import { LanguageSwitch } from "../language-switch.tsx";
import { cx } from "./classes.ts";

export type ArcaneScreen = "table" | "bag" | "seat" | "secrets" | "player" | "public" | "sheet";

const NAV: Array<{ id: ArcaneScreen; route: string; label: string }> = [
  { id: "table", route: "table", label: "table" },
  { id: "bag", route: "bag", label: "navBag" },
  { id: "seat", route: "seat", label: "seats" },
  { id: "secrets", route: "secrets", label: "secrets" },
  { id: "player", route: "player", label: "navPlayer" },
  { id: "sheet", route: "sheet", label: "roleSheet" },
];

export function ArcaneAppBar({ current }: { current: ArcaneScreen }) {
  const ports = useShellPorts();
  const state = useGame(ports.game).state;
  const t = ports.strings.t;
  const phase =
    state.phase === "night"
      ? `${t("night")} ${state.night.number}`
      : state.phase === "day"
        ? `${t("day")} ${state.day.number}`
        : t("setup");
  return (
    <header className="sticky top-0 z-40 flex min-h-14 items-center gap-4 border-b border-edge bg-crypt-2 px-4 max-sm:flex-wrap max-sm:gap-2 max-sm:py-2">
      <a
        className="setup-brand flex min-h-11 min-w-0 items-center gap-2.5"
        href={ports.router.path("table")}
        aria-label="Grimoria"
      >
        <img className="brand-mark" src={ports.assets.url("favicon.svg")} alt="" />
        <span className="grid min-w-0">
          <b className="font-role text-[13px] uppercase leading-none tracking-[.1em]">Grimoria</b>
          <small className="mt-0.5 truncate text-[8.5px] uppercase tracking-[.18em] text-brass">
            Arcane Instrument{state.script ? ` · ${state.script.name}` : ""}
          </small>
        </span>
      </a>
      <nav
        aria-label={t("table")}
        className="ml-auto flex min-w-0 gap-0.5 overflow-x-auto max-sm:order-3 max-sm:grid max-sm:w-full max-sm:grid-cols-3 max-sm:overflow-visible"
      >
        {NAV.map((item) => (
          <a
            key={item.id}
            href={ports.router.path(item.route)}
            aria-current={current === item.id ? "page" : undefined}
            className={cx(
              "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-sm border px-3 py-2 text-[9.5px] uppercase tracking-[.14em]",
              current === item.id
                ? "border-edge-2 bg-crypt-3 text-text"
                : "border-transparent text-muted hover:text-text",
              "max-sm:text-center",
            )}
          >
            {t(item.label)}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2 border-l border-edge pl-3 max-sm:border-0 max-sm:pl-0">
        <span className="hidden items-center gap-2 whitespace-nowrap text-[9px] uppercase tracking-[.14em] text-muted sm:flex">
          <i className="size-1.5 rounded-full bg-amber shadow-glow" aria-hidden="true" />
          {phase}
        </span>
        <a
          className="btn btn--quiet !min-h-11 !px-1.5 !text-[9px] uppercase tracking-[.12em]"
          href={ports.router.path("help")}
        >
          {t("help")}
        </a>
        <LanguageSwitch />
      </div>
    </header>
  );
}
