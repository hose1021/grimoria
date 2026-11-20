// The top bar for the two string-composed screens. It shares the list, the
// menu controller and the class strings with the React bar, and the legacy
// translator injects the language select into the panel because these screens
// render no React.
import { esc } from "../../dom.ts";
import { t } from "../../i18n/strings.ts";
import {
  APP_BAR,
  APP_BAR_BRAND,
  APP_BAR_GROUP,
  APP_BAR_GROUP_LABEL,
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
  const groups = APP_BAR_NAV.map(
    (group) =>
      `<div class="${APP_BAR_GROUP}" role="group" aria-label="${esc(
        t(group.label),
      )}"><span class="${APP_BAR_GROUP_LABEL}" aria-hidden="true">${esc(
        t(group.label),
      )}</span>${group.items
        .map(
          (item) =>
            `<a class="${appBarNavLink(item.route === active)}" href="${esc(
              href(item.route),
            )}">${esc(t(item.label))}</a>`,
        )
        .join("")}</div>`,
  ).join("");
  return `<header class="${APP_BAR}">
    <a class="${APP_BAR_BRAND}" href="${esc(href(""))}" aria-label="Grimoria">
      <img class="brand-mark" src="${esc(brandUrl)}" alt="">
      <span class="${APP_BAR_NAME}">
        <b class="${APP_BAR_TITLE}">Grimoria</b>
        <small class="${APP_BAR_SUBTITLE}">${esc(t("caseFile"))}${
          scriptName ? ` · ${esc(scriptName)}` : ""
        }</small>
      </span>
    </a>
    <button type="button" class="${APP_BAR_TOGGLE}" data-app-bar-toggle aria-expanded="false" aria-controls="app-bar-menu" aria-label="${esc(
      t("menu"),
    )}">${BURGER}</button>
    <div id="app-bar-menu" class="${APP_BAR_MENU}" data-app-bar-menu>
      <nav aria-label="${esc(t("table"))}" class="${APP_BAR_LIST}">${groups}</nav>
      <div class="${APP_BAR_TOOLS} max-[1199px]:border-t max-[1199px]:border-edge max-[1199px]:pl-0 max-[1199px]:pt-2" data-app-bar-tools>
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
