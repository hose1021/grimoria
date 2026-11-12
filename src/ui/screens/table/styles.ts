// The console's shared utility strings. Values come from the Arcane token
// layer; the legacy class names in the markup stay as inert hooks for the
// browser checks.

export const HOST = "min-w-0";

export const NAV =
  "host-nav flex flex-wrap items-center gap-[5px] max-[900px]:col-span-full max-[900px]:justify-end";

export const GRID =
  "grid min-w-0 grid-cols-[290px_minmax(0,1fr)_330px] items-stretch h-[calc(100dvh-56px)] overflow-hidden max-[1200px]:grid-cols-[290px_minmax(0,1fr)] max-[1200px]:h-auto max-[900px]:flex max-[900px]:h-auto max-[900px]:flex-col";

export const MAIN_COL =
  "grid min-w-0 content-start gap-2.5 overflow-auto border-r border-edge bg-gradient-to-b from-crypt-2 to-crypt p-3.5 max-[1200px]:order-2 max-[900px]:order-2 max-[900px]:w-full max-[900px]:border-r-0 max-[900px]:border-b";

export const RING_COL = "grid min-w-0 place-items-center";

export const SIDE_COL =
  "grid min-w-0 content-start gap-2.5 overflow-auto border-l border-edge bg-gradient-to-b from-crypt-2 to-crypt p-3.5 max-[1200px]:col-span-2 max-[1200px]:grid-cols-2 max-[1200px]:border-l-0 max-[1200px]:border-t max-[900px]:order-3 max-[900px]:w-full max-[900px]:grid-cols-1";

export const PANEL = "host-panel min-w-0 rounded-md border border-edge bg-crypt-2 p-3";

export const PANEL_HEAD = "mb-[7px] flex flex-wrap items-baseline justify-between gap-1.5";

export const MUTED = "text-[13px] leading-[1.45] text-muted";

export const WARNING = "text-[13px] leading-[1.45] text-amber-2";

export const ALERT =
  "my-2 rounded-sm border border-edge-2 bg-accent-dim/40 px-[11px] py-[9px] text-[13px] leading-[1.45]";

export const ALERT_BAD = "border-crimson-dim bg-crimson-dim/30 text-danger";

export const CARD = "min-w-0 rounded-md border p-[17px] max-[640px]:p-[13px]";

export const CARD_LINE = "border-edge bg-crypt-2";

export const NIGHT_CARD = CARD + " border-edge-2 bg-crypt-2";

export const DAY_CARD = CARD + " border-edge-2 bg-crypt-2";

export const OVER_CARD = CARD + " border-amber-dim bg-crypt-2";

export const CARD_TITLE =
  "m-[4px_0_10px] font-role text-[clamp(22px,3vw,30px)] leading-[1.12] tracking-[-.01em] text-player-role-text";

export const CARD_TEXT = "my-1.5 text-[16px] leading-[1.5]";

export const SECTION = "mt-2.5 border-t border-edge pt-2.5";

export const TARGET_GRID =
  "mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-[5px] max-[640px]:grid-cols-2";

export const TARGET =
  "host-target min-h-[46px] rounded-sm border border-edge bg-crypt-3 p-[7px] text-left text-text hover:border-edge-2";

export const TARGET_ON = "!border-amber !bg-accent-dim";

export const FIELD_BOX = "my-[7px] grid gap-1";

export const CHECK = "my-[5px] flex items-start gap-[7px] text-[13px] text-muted";

export const INLINE = "flex flex-wrap items-center gap-1.5";

export const ACTIONS = "mt-3 flex flex-wrap gap-[7px]";

export const PRIMARY = "min-h-11 flex-[1_1_220px]";

export const INFO_PREVIEW =
  "my-[5px] mb-2 rounded-sm border border-amber-dim bg-accent-dim/40 p-2.5 text-[14px] leading-[1.45]";

export const CHIP =
  "inline-flex items-center rounded-sm border border-edge-2 px-1.5 py-0.5 text-[12px] leading-[1.4] text-muted";

export const TOKEN =
  "inline-flex min-w-[72px] flex-col items-center gap-[3px] rounded-sm border border-edge bg-crypt-3 p-[6px] text-text max-[900px]:w-[76px] max-[900px]:flex-[0_0_76px]";

export const TOKEN_BUTTON = "cursor-pointer hover:border-amber";

export const TOKEN_IMG = "h-[42px] w-[42px] object-contain";

export const TOKEN_NAME =
  "max-w-full text-center text-[13px] leading-[1.2] font-semibold break-words";

export const TOKEN_MINI = "w-[48px] min-w-0 gap-px border-0 bg-transparent p-0.5";

export const TOKEN_MINI_IMG = "h-[28px] w-[28px] object-contain";

export const TOKEN_MINI_NAME = "text-[8px] font-normal text-muted";

export const SEAT = "min-w-0 rounded-md border border-edge bg-crypt-3";

export const ROLE_LINE = "inline-flex items-center gap-1 text-[13px] text-muted";

export const TEAM_DOT = "h-1.5 w-1.5 rounded-full";

export const CHIPS = "mt-0.5 flex flex-wrap gap-[3px]";

export const DOCK =
  "hidden max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:bottom-0 max-[900px]:z-40 max-[900px]:grid max-[900px]:grid-cols-6 max-[900px]:border-t max-[900px]:border-edge max-[900px]:bg-crypt max-[900px]:px-1.5 max-[900px]:py-1.5 max-[900px]:pb-[calc(6px+env(safe-area-inset-bottom))]";

export const DOCK_LINK =
  "max-[900px]:grid max-[900px]:min-h-11 max-[900px]:place-items-center max-[900px]:rounded-sm max-[900px]:px-0.5 max-[900px]:text-center max-[900px]:text-[11px] max-[900px]:leading-[1.15] max-[900px]:text-muted max-[900px]:no-underline max-[900px]:hover:bg-crypt-2 max-[900px]:hover:text-text max-[360px]:px-0 max-[360px]:text-[10px]";

export const QUEUE_ITEM =
  "grid grid-cols-[10px_minmax(0,1fr)] items-start gap-1.5 rounded-sm px-1 py-[5px]";

export const OVERLAY =
  "fixed inset-0 z-[120] grid place-items-center bg-crypt/95 p-[18px] backdrop-blur-[7px]";

export const COVER = "fixed inset-0 z-[120] grid place-items-center bg-crypt p-[18px]";

export const GRIMOIRE = "fixed inset-0 z-[140] overflow-auto bg-crypt p-[18px]";
