// The shell's top bar. `nav={false}` keeps host routes off a public screen.
import { useShellPorts } from "../../ports.ts";
import { useGame } from "../../store/use-game.ts";
import { LanguageSwitch } from "../language-switch.tsx";
import {
  APP_BAR,
  APP_BAR_BRAND,
  APP_BAR_HELP,
  APP_BAR_LIST,
  APP_BAR_NAME,
  APP_BAR_NAV,
  APP_BAR_PHASE,
  APP_BAR_SUBTITLE,
  APP_BAR_TITLE,
  APP_BAR_TOOLS,
  appBarNavLink,
  type ArcaneScreen,
} from "./app-bar-parts.ts";

export type { ArcaneScreen };

export function ArcaneAppBar({ current, nav = true }: { current: ArcaneScreen; nav?: boolean }) {
  const ports = useShellPorts();
  const state = useGame(ports.game).state;
  const t = ports.strings.t;
  const phase =
    state.phase === "night"
      ? `${t("night")} ${state.night.number}`
      : state.phase === "day"
        ? `${t("day")} ${state.day.number}`
        : "";
  const brand = (
    <>
      <img className="brand-mark" src={ports.assets.url("favicon.svg")} alt="" />
      <span className={APP_BAR_NAME}>
        <b className={APP_BAR_TITLE}>Grimoria</b>
        <small className={APP_BAR_SUBTITLE}>
          Arcane Instrument{state.script ? ` · ${state.script.name}` : ""}
        </small>
      </span>
    </>
  );
  return (
    <header className={APP_BAR}>
      {nav ? (
        <a className={APP_BAR_BRAND} href={ports.router.path("table")} aria-label="Grimoria">
          {brand}
        </a>
      ) : (
        <span className={APP_BAR_BRAND}>{brand}</span>
      )}
      {nav ? (
        <nav aria-label={t("table")} className={APP_BAR_LIST}>
          {APP_BAR_NAV.map((item) => (
            <a
              key={item.id}
              href={ports.router.path(item.route)}
              aria-current={current === item.id ? "page" : undefined}
              className={appBarNavLink(current === item.id)}
            >
              {t(item.label)}
            </a>
          ))}
        </nav>
      ) : null}
      <div className={`${APP_BAR_TOOLS}${nav ? "" : " ml-auto"}`}>
        {phase ? (
          <span className={APP_BAR_PHASE}>
            <i className="size-1.5 rounded-full bg-amber shadow-glow" aria-hidden="true" />
            {phase}
          </span>
        ) : null}
        <a className={APP_BAR_HELP} href={ports.router.path("help")}>
          {t("help")}
        </a>
        <LanguageSwitch />
      </div>
    </header>
  );
}
