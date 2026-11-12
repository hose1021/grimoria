// Shared data and class strings for the two app bars: the React one and the
// markup one that the two string-composed screens use. One list, one look.
import { cx } from "./classes.ts";

export type ArcaneScreen = "table" | "bag" | "seat" | "secrets" | "player" | "public" | "sheet";

export interface AppBarNavItem {
  id: Exclude<ArcaneScreen, "public">;
  route: string;
  label: string;
}

export const APP_BAR_NAV: readonly AppBarNavItem[] = [
  { id: "table", route: "table", label: "table" },
  { id: "bag", route: "bag", label: "navBag" },
  { id: "seat", route: "seat", label: "seats" },
  { id: "secrets", route: "secrets", label: "secrets" },
  { id: "player", route: "player", label: "navPlayer" },
  { id: "sheet", route: "sheet", label: "roleSheet" },
];

export const APP_BAR =
  "sticky top-0 z-40 flex min-h-14 items-center gap-4 border-b border-edge bg-crypt-2 px-4 max-sm:flex-wrap max-sm:gap-2 max-sm:py-2";

export const APP_BAR_BRAND = "setup-brand flex min-h-11 min-w-0 items-center gap-2.5 no-underline";

export const APP_BAR_NAME = "grid min-w-0";

export const APP_BAR_TITLE =
  "font-role text-[13px] uppercase leading-none tracking-[.1em] text-text";

export const APP_BAR_SUBTITLE =
  "mt-0.5 truncate text-[8.5px] uppercase tracking-[.18em] text-brass";

export const APP_BAR_LIST =
  "ml-auto flex min-w-0 gap-0.5 overflow-x-auto max-sm:order-3 max-sm:grid max-sm:w-full max-sm:grid-cols-3 max-sm:overflow-visible";

export const APP_BAR_TOOLS =
  "flex items-center gap-2 border-l border-edge pl-3 max-sm:border-0 max-sm:pl-0";

export const APP_BAR_PHASE =
  "hidden items-center gap-2 whitespace-nowrap text-[9px] uppercase tracking-[.14em] text-muted sm:flex";

export const APP_BAR_HELP =
  "btn btn--quiet !min-h-11 !px-1.5 !text-[9px] uppercase tracking-[.12em]";

/** The look of one route link, active or not. */
export function appBarNavLink(active: boolean): string {
  return cx(
    "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-sm border px-3 py-2 text-[9.5px] uppercase tracking-[.14em]",
    active ? "border-edge-2 bg-crypt-3 text-text" : "border-transparent text-muted hover:text-text",
    "max-sm:text-center",
  );
}
