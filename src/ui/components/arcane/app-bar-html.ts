// The top bar for the two string-composed screens. It shares the list, the
// menu controller and the class strings with the React bar, and the legacy
// translator injects the language select into the panel because these screens
// render no React.
import { esc } from "../../dom.ts";
import { t } from "../../i18n/strings.ts";
import {
  APP_BAR,
  APP_BAR_BRAND,
  APP_BAR_HELP,
  APP_BAR_LIST,
  APP_BAR_MENU,
  APP_BAR_NAME,
  APP_BAR_NAV,
  APP_BAR_PHASE,
  APP_BAR_SUBTITLE,
  APP_BAR_TITLE,
  APP_BAR_TOGGLE,
  APP_BAR_TOOLS,
  appBarNavLink,
} from "./app-bar-parts.ts";

const BURGER =
  '<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M4 7h16M4 12h16M4 17h16"/></svg>';

export function appBarMarkup({
  active,
  scriptName = "",
  phase = "",
  href,
  brandUrl,
}: {
  active: string;
  scriptName?: string;
  phase?: string;
  href: (name: string) => string;
  brandUrl: string;
}): string {
  const links = APP_BAR_NAV.map(
    (item) =>
      `<a class="${appBarNavLink(item.route === active)}" href="${esc(href(item.route))}">${esc(
        t(item.label),
      )}</a>`,
  ).join("");
  return `<header class="${APP_BAR}">
    <a class="${APP_BAR_BRAND}" href="${esc(href("table"))}" aria-label="Grimoria">
      <img class="brand-mark" src="${esc(brandUrl)}" alt="">
      <span class="${APP_BAR_NAME}">
        <b class="${APP_BAR_TITLE}">Grimoria</b>
        <small class="${APP_BAR_SUBTITLE}">Arcane Instrument${
          scriptName ? ` · ${esc(scriptName)}` : ""
        }</small>
      </span>
    </a>
    <button type="button" class="${APP_BAR_TOGGLE}" data-app-bar-toggle aria-expanded="false" aria-controls="app-bar-menu" aria-label="${esc(
      t("menu"),
    )}">${BURGER}</button>
    <div id="app-bar-menu" class="${APP_BAR_MENU}" data-app-bar-menu>
      <nav aria-label="${esc(t("table"))}" class="${APP_BAR_LIST}">${links}</nav>
      <div class="${APP_BAR_TOOLS}">
        ${
          phase
            ? `<span class="${APP_BAR_PHASE}"><i class="size-1.5 rounded-full bg-amber"></i>${esc(phase)}</span>`
            : ""
        }
        <a class="${APP_BAR_HELP}" href="${esc(href("help"))}">${esc(t("help"))}</a>
      </div>
    </div>
  </header>`;
}
