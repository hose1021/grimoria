// The shell's top bar. `nav={false}` keeps host routes off a public screen.
import { useEffect, useRef } from "react";
import { useShellPorts } from "../../ports.ts";
import { useGame } from "../../store/use-game.ts";
import { LanguageSwitch } from "../language-switch.tsx";
import { initAppBarMenu } from "./app-bar-menu.ts";
import {
  APP_BAR,
  APP_BAR_BRAND,
  APP_BAR_HELP,
  APP_BAR_LIST,
  APP_BAR_MENU,
  APP_BAR_NAME,
  APP_BAR_NAV,
  APP_BAR_PHASE,
  APP_BAR_PHASE_TOOLS,
  APP_BAR_SUBTITLE,
  APP_BAR_TITLE,
  APP_BAR_TOGGLE,
  APP_BAR_TOOLS,
  appBarNavLink,
  type ArcaneScreen,
} from "./app-bar-parts.ts";

export type { ArcaneScreen };

export function ArcaneAppBar({ current, nav = true }: { current: ArcaneScreen; nav?: boolean }) {
  const ports = useShellPorts();
  const state = useGame(ports.game).state;
  const t = ports.strings.t;
  const bar = useRef<HTMLElement>(null);
  const closeMenu = useRef<() => void>(() => {});
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

  useEffect(() => {
    if (!nav || !bar.current) return;
    const controller = new AbortController();
    closeMenu.current = initAppBarMenu(bar.current, controller.signal);
    return () => {
      controller.abort();
      closeMenu.current = () => {};
    };
  }, [nav]);

  useEffect(() => {
    closeMenu.current();
  }, [current]);

  return (
    <header className={APP_BAR} ref={bar}>
      {nav ? (
        <a className={APP_BAR_BRAND} href={ports.router.path("table")} aria-label="Grimoria">
          {brand}
        </a>
      ) : (
        <span className={APP_BAR_BRAND}>{brand}</span>
      )}
      {nav ? (
        // The menu controller owns `aria-expanded`; React must not reset it.
        <button
          type="button"
          className={APP_BAR_TOGGLE}
          data-app-bar-toggle=""
          aria-controls="app-bar-menu"
          aria-label={t("menu")}
        >
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      ) : null}
      {nav ? (
        <div id="app-bar-menu" className={APP_BAR_MENU} data-app-bar-menu="">
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
          <div className={APP_BAR_TOOLS}>
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
        </div>
      ) : (
        <div className={`${APP_BAR_TOOLS} ml-auto`}>
          {phase ? (
            <span className={APP_BAR_PHASE_TOOLS}>
              <i className="size-1.5 rounded-full bg-amber shadow-glow" aria-hidden="true" />
              {phase}
            </span>
          ) : null}
          <LanguageSwitch />
        </div>
      )}
    </header>
  );
}
