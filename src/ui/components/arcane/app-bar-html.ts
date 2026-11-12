// The top bar for the two string-composed screens. It mirrors the React
// ArcaneAppBar so every route carries the same chrome.
import { esc } from "../../dom.ts";
import { t } from "../../i18n/strings.ts";

const NAV: Array<{ route: string; label: string }> = [
  { route: "table", label: "table" },
  { route: "bag", label: "navBag" },
  { route: "seat", label: "seats" },
  { route: "secrets", label: "secrets" },
  { route: "player", label: "player" },
  { route: "sheet", label: "roleSheet" },
];

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
  const links = NAV.map(
    (item) =>
      `<a class="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-sm border px-3 py-2 text-[9.5px] uppercase tracking-[.14em] no-underline max-sm:text-center ${
        item.route === active
          ? "border-edge-2 bg-crypt-3 text-text"
          : "border-transparent text-muted hover:text-text"
      }" href="${esc(href(item.route))}">${esc(t(item.label))}</a>`,
  ).join("");
  return `<header class="sticky top-0 z-40 flex min-h-14 items-center gap-4 border-b border-edge bg-crypt-2 px-4 max-sm:flex-wrap max-sm:gap-2 max-sm:py-2">
    <a class="setup-brand flex min-h-11 min-w-0 items-center gap-2.5 no-underline" href="${esc(href("table"))}" aria-label="Grimoria">
      <img class="brand-mark" src="${esc(brandUrl)}" alt="">
      <span class="grid min-w-0">
        <b class="font-role text-[13px] uppercase leading-none tracking-[.1em] text-text">Grimoria</b>
        <small class="mt-0.5 truncate text-[8.5px] uppercase tracking-[.18em] text-brass">Arcane Instrument${scriptName ? ` · ${esc(scriptName)}` : ""}</small>
      </span>
    </a>
    <nav aria-label="${esc(t("table"))}" class="ml-auto flex min-w-0 gap-0.5 overflow-x-auto max-sm:order-3 max-sm:grid max-sm:w-full max-sm:grid-cols-3 max-sm:overflow-visible">${links}</nav>
    <div class="flex items-center gap-2 border-l border-edge pl-3 max-sm:border-0 max-sm:pl-0">
      <span class="hidden items-center gap-2 whitespace-nowrap text-[9px] uppercase tracking-[.14em] text-muted sm:flex"><i class="size-1.5 rounded-full bg-amber"></i>${esc(phase)}</span>
      <a class="btn btn--quiet !min-h-11 !px-1.5 !text-[9px] uppercase tracking-[.12em]" href="${esc(href("help"))}">${esc(t("help"))}</a>
    </div>
  </header>`;
}
