// The top bar for the two string-composed screens. It shares the list and the
// class strings with the React bar, and the legacy translator injects the
// language select into this header because these screens render no React.
import { esc } from "../../dom.ts";
import { t } from "../../i18n/strings.ts";
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
} from "./app-bar-parts.ts";

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
    <nav aria-label="${esc(t("table"))}" class="${APP_BAR_LIST}">${links}</nav>
    <div class="${APP_BAR_TOOLS}">
      ${
        phase
          ? `<span class="${APP_BAR_PHASE}"><i class="size-1.5 rounded-full bg-amber"></i>${esc(phase)}</span>`
          : ""
      }
      <a class="${APP_BAR_HELP}" href="${esc(href("help"))}">${esc(t("help"))}</a>
    </div>
  </header>`;
}
