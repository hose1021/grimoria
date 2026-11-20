// Shared data and class strings for the two app bars: the React one and the
// markup one that the two string-composed screens use. One list, one look.
//
// The destinations cluster by what the Storyteller is doing: the evening in
// play, the setup pipeline that precedes it, and the reference pages. The panel
// titles the clusters; the desktop row separates them with a hairline. One row
// holds all three groups at 1200 px and above; below that the whole list moves
// into the burger so the bar never wraps.
import { cx } from "./classes.ts";

export type ArcaneScreen =
  | "home"
  | "table"
  | "bag"
  | "seat"
  | "secrets"
  | "player"
  | "sheet"
  | "reference";

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
      { id: "home", route: "", label: "navHome" },
      { id: "table", route: "table", label: "table" },
      { id: "player", route: "player", label: "navPlayer" },
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
    items: [
      { id: "sheet", route: "sheet", label: "roleSheet" },
      { id: "reference", route: "reference", label: "referenceNav" },
    ],
  },
];

export const APP_BAR =
  "sticky top-0 z-40 flex min-h-14 items-center gap-4 border-b border-edge bg-crypt px-4 max-[1199px]:gap-2 max-[1199px]:py-2";

export const APP_BAR_BRAND = "setup-brand flex min-h-11 min-w-0 items-center gap-2.5 no-underline";

export const APP_BAR_NAME = "grid min-w-0";

export const APP_BAR_TITLE = "font-marquee text-[21px] leading-none tracking-[.02em] text-text";

export const APP_BAR_SUBTITLE = "label-mono mt-1 truncate text-[9.5px] text-brass";

export const APP_BAR_TOGGLE =
  "ml-auto inline-flex size-11 shrink-0 cursor-pointer items-center justify-center border-2 border-edge-2 text-text min-[1200px]:hidden";

export const APP_BAR_MENU =
  "absolute top-full right-4 z-50 w-[min(420px,calc(100%-2rem))] max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-x-2 border-b-2 border-edge-2 bg-crypt-2 p-3 shadow-lg max-[1199px]:hidden max-[1199px]:data-[open]:flex max-[1199px]:flex-col max-[1199px]:gap-2 min-[1200px]:static min-[1200px]:right-auto min-[1200px]:ml-auto min-[1200px]:w-auto min-[1200px]:flex min-[1200px]:items-stretch min-[1200px]:overflow-visible min-[1200px]:rounded-none min-[1200px]:border-0 min-[1200px]:bg-transparent min-[1200px]:p-0 min-[1200px]:shadow-none";

export const APP_BAR_LIST =
  "flex min-w-0 flex-col gap-2 min-[1200px]:flex-row min-[1200px]:items-stretch min-[1200px]:gap-0";

export const APP_BAR_GROUP =
  "flex min-w-0 flex-col gap-1 border-t border-edge pt-2 first:border-t-0 first:pt-0 min-[1200px]:ml-2 min-[1200px]:flex-row min-[1200px]:items-stretch min-[1200px]:gap-0.5 min-[1200px]:border-t-0 min-[1200px]:border-l min-[1200px]:border-edge min-[1200px]:pl-2 min-[1200px]:pt-0";

export const APP_BAR_GROUP_LABEL =
  "label-mono mt-1 mb-0.5 text-[10px] text-brass min-[1200px]:hidden";

export const APP_BAR_TOOLS =
  "flex items-center gap-2 border-l border-edge pl-3 max-[1199px]:border-0 max-[1199px]:pl-0";

export const APP_BAR_PHASE =
  "label-mono flex items-center gap-2 whitespace-nowrap text-[10px] text-muted";

export const APP_BAR_PHASE_TOOLS = APP_BAR_PHASE + " max-[1199px]:hidden";

export const APP_BAR_HELP = "btn btn--quiet !min-h-11 !px-1.5 !text-[12px]";

/** The look of one route link: a store tab inline, a full row in the panel. */
export function appBarNavLink(active: boolean): string {
  return cx(
    "inline-flex min-h-14 items-center whitespace-nowrap border-x-0 border-t-0 border-b-[3px] px-2.5 font-marquee text-[14px] font-medium uppercase tracking-[.02em]",
    active
      ? "border-amber text-text max-[1199px]:bg-crypt-3"
      : "border-transparent text-muted hover:border-edge-2 hover:text-text",
    "max-[1199px]:min-h-11 max-[1199px]:w-full max-[1199px]:border-0 max-[1199px]:px-1",
  );
}
