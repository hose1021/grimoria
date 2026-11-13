// Shared data and class strings for the two app bars: the React one and the
// markup one that the two string-composed screens use. One list, one look.
import { cx } from "./classes.ts";

export type ArcaneScreen = "table" | "bag" | "seat" | "secrets" | "player" | "public" | "sheet";

export interface AppBarNavItem {
  id: ArcaneScreen;
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
  { id: "public", route: "public", label: "publicScreen" },
];

export const APP_BAR =
  "sticky top-0 z-40 flex min-h-14 items-center gap-4 border-b border-edge bg-crypt-2 px-4 max-[899px]:gap-2 max-[899px]:py-2";

export const APP_BAR_BRAND = "setup-brand flex min-h-11 min-w-0 items-center gap-2.5 no-underline";

export const APP_BAR_NAME = "grid min-w-0";

export const APP_BAR_TITLE =
  "font-role text-[13px] uppercase leading-none tracking-[.1em] text-text";

export const APP_BAR_SUBTITLE =
  "mt-0.5 truncate text-[8.5px] uppercase tracking-[.18em] text-brass";

export const APP_BAR_TOGGLE =
  "ml-auto inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-edge-2 text-text min-[900px]:hidden";

export const APP_BAR_MENU =
  "absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-edge bg-crypt-2 p-3 shadow-lg max-[899px]:hidden max-[899px]:data-[open]:flex max-[899px]:flex-col max-[899px]:gap-1 min-[900px]:static min-[900px]:ml-auto min-[900px]:flex min-[900px]:items-center min-[900px]:gap-0.5 min-[900px]:overflow-visible min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:shadow-none";

export const APP_BAR_LIST =
  "flex min-w-0 flex-col gap-1 min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:items-center min-[900px]:gap-0.5";

export const APP_BAR_TOOLS =
  "flex items-center gap-2 border-l border-edge pl-3 max-[899px]:border-0 max-[899px]:pl-0";

export const APP_BAR_PHASE =
  "flex items-center gap-2 whitespace-nowrap text-[9px] uppercase tracking-[.14em] text-muted";

export const APP_BAR_PHASE_TOOLS = APP_BAR_PHASE + " max-[899px]:hidden";

export const APP_BAR_HELP =
  "btn btn--quiet !min-h-11 !px-1.5 !text-[9px] uppercase tracking-[.12em]";

/** The look of one route link, active or not. */
export function appBarNavLink(active: boolean): string {
  return cx(
    "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-sm border px-3 py-2 text-[9.5px] uppercase tracking-[.14em]",
    active ? "border-edge-2 bg-crypt-3 text-text" : "border-transparent text-muted hover:text-text",
    "max-[899px]:w-full max-[899px]:justify-start",
  );
}
