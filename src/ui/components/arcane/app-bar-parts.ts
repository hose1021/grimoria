// Shared data and class strings for the two app bars: the React one and the
// markup one that the two string-composed screens use. One list, one look.
//
// The destinations cluster by what the Storyteller is doing: the evening in
// play, the setup pipeline that precedes it, and the reference pages. The panel
// titles the clusters; the desktop row separates them with a hairline. One row
// holds all three groups at 1440 px and above; below that the whole list moves
// into the burger so the bar never wraps.
import { cx } from "./classes.ts";

export type ArcaneScreen = "table" | "bag" | "seat" | "secrets" | "player" | "public" | "sheet";

export interface AppBarNavItem {
  id: ArcaneScreen;
  route: string;
  label: string;
}

export interface AppBarNavGroup {
  id: "play" | "setup" | "reference";
  label: string;
  items: readonly AppBarNavItem[];
}

export const APP_BAR_NAV: readonly AppBarNavGroup[] = [
  {
    id: "play",
    label: "navGroupPlay",
    items: [
      { id: "table", route: "table", label: "table" },
      { id: "player", route: "player", label: "navPlayer" },
      { id: "public", route: "public", label: "publicScreen" },
    ],
  },
  {
    id: "setup",
    label: "setup",
    items: [
      { id: "bag", route: "bag", label: "navBag" },
      { id: "seat", route: "seat", label: "seats" },
      { id: "secrets", route: "secrets", label: "secrets" },
    ],
  },
  {
    id: "reference",
    label: "navGroupReference",
    items: [{ id: "sheet", route: "sheet", label: "roleSheet" }],
  },
];

export const APP_BAR =
  "sticky top-0 z-40 flex min-h-14 items-center gap-4 border-b border-edge bg-crypt-2 px-4 max-[1439px]:gap-2 max-[1439px]:py-2";

export const APP_BAR_BRAND = "setup-brand flex min-h-11 min-w-0 items-center gap-2.5 no-underline";

export const APP_BAR_NAME = "grid min-w-0";

export const APP_BAR_TITLE =
  "font-role text-[14px] uppercase leading-none tracking-[.1em] text-text";

export const APP_BAR_SUBTITLE = "mt-0.5 truncate text-[11px] uppercase tracking-[.18em] text-brass";

export const APP_BAR_TOGGLE =
  "ml-auto inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-edge-2 text-text min-[1440px]:hidden";

export const APP_BAR_MENU =
  "absolute top-full right-4 z-50 w-[min(420px,calc(100%-2rem))] max-h-[calc(100dvh-3.5rem)] overflow-y-auto rounded-b-md border-x border-b border-edge bg-crypt-2 p-3 shadow-lg max-[1439px]:hidden max-[1439px]:data-[open]:flex max-[1439px]:flex-col max-[1439px]:gap-2 min-[1440px]:static min-[1440px]:right-auto min-[1440px]:ml-auto min-[1440px]:w-auto min-[1440px]:flex min-[1440px]:items-stretch min-[1440px]:overflow-visible min-[1440px]:rounded-none min-[1440px]:border-0 min-[1440px]:bg-transparent min-[1440px]:p-0 min-[1440px]:shadow-none";

export const APP_BAR_LIST =
  "flex min-w-0 flex-col gap-2 min-[1440px]:flex-row min-[1440px]:items-stretch min-[1440px]:gap-0";

export const APP_BAR_GROUP =
  "flex min-w-0 flex-col gap-1 border-t border-edge pt-2 first:border-t-0 first:pt-0 min-[1440px]:ml-2 min-[1440px]:flex-row min-[1440px]:items-stretch min-[1440px]:gap-0.5 min-[1440px]:border-t-0 min-[1440px]:border-l min-[1440px]:pl-2 min-[1440px]:pt-0";

export const APP_BAR_GROUP_LABEL = "label mt-1 mb-0.5 min-[1440px]:hidden";

export const APP_BAR_TOOLS =
  "flex items-center gap-2 border-l border-edge pl-3 max-[1439px]:border-0 max-[1439px]:pl-0";

export const APP_BAR_PHASE =
  "flex items-center gap-2 whitespace-nowrap text-[12px] uppercase tracking-[.12em] text-muted";

export const APP_BAR_PHASE_TOOLS = APP_BAR_PHASE + " max-[1439px]:hidden";

export const APP_BAR_HELP =
  "btn btn--quiet !min-h-11 !px-1.5 !text-[12px] uppercase tracking-[.1em]";

/** The look of one route link: a tab underline inline, a full row in the panel. */
export function appBarNavLink(active: boolean): string {
  return cx(
    "inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-2.5 text-[13px] uppercase tracking-[.1em] min-[1440px]:min-h-14",
    active
      ? "border-amber text-text max-[1439px]:bg-crypt-3"
      : "border-transparent text-muted hover:border-edge-2 hover:text-text",
    "max-[1439px]:w-full max-[1439px]:border-0 max-[1439px]:px-1",
  );
}
