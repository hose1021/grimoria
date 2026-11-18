// The console's shared utility strings. Values come from the Arcane token
// layer; the legacy class names in the markup stay as inert hooks for the
// browser checks.

export const HOST = "min-w-0";

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

export const TARGET_ON = "!border-amber !bg-selected";

export const FIELD_BOX = "my-[7px] grid gap-1";

export const CHECK = "my-[5px] flex items-start gap-[7px] text-[13px] text-muted";

export const INLINE = "flex flex-wrap items-center gap-1.5";

// The table's action classes. The dock and the setup board share them so one
// button shape and one disabled state stay in force on every table surface.
export const ACTION_DISABLED =
  "disabled:!border-edge-2 disabled:!bg-transparent disabled:!text-disabled disabled:!opacity-100";
export const ACTION_PRIMARY = `btn min-h-12 !justify-center !border-table-primary !bg-table-primary !bg-none font-semibold !text-table-primary-ink ${ACTION_DISABLED}`;
export const ACTION_SECONDARY = `btn min-h-12 !justify-center !border-table-rim !bg-table-chip !bg-none text-text ${ACTION_DISABLED}`;
export const ACTION_DANGER = `btn min-h-12 !justify-center !border-table-danger !bg-table-danger !bg-none font-semibold !text-table-primary-ink ${ACTION_DISABLED}`;
export const ACTION_QUIET = "btn btn--quiet min-h-12 !justify-center";
export const ACTION_OUTLINE = "btn min-h-12 !justify-center !bg-none";
export const ICON_BUTTON =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-sm border border-table-rim bg-table-chip text-table-muted";

// The setup board: the one pre-night surface, from the empty bag to the first
// night. The rail marks progress, the roster carries the claimed names.
export const BOARD = "min-w-0 rounded-md border border-table-rim bg-crypt-2 p-3 min-[620px]:p-6";
export const BOARD_STEPS =
  "m-0 mt-1 grid list-none grid-cols-2 gap-x-3 gap-y-2 p-0 min-[620px]:grid-cols-4";
export const BOARD_STEP =
  "flex min-w-0 items-center gap-1.5 border-t pt-1.5 text-[10px] uppercase tracking-[.14em]";
export const BOARD_STEP_CURRENT = "border-table-primary text-table-primary";
export const BOARD_STEP_DONE = "border-edge-2 text-text";
export const BOARD_STEP_PENDING = "border-edge text-muted";
export const BOARD_ROSTER =
  "m-0 grid list-none grid-cols-2 gap-1.5 p-0 min-[620px]:grid-cols-4 min-[1100px]:grid-cols-5";
export const BOARD_SEAT =
  "flex min-h-12 min-w-0 items-center gap-2 rounded-sm border border-table-rim bg-table-chip px-2 py-1.5";
export const BOARD_SEAT_NO =
  "grid size-6 shrink-0 place-items-center rounded-sm border border-edge-2 text-[11px] tabular-nums text-brass";
export const BOARD_ACTIONS = "mt-1 flex flex-wrap items-stretch gap-2";
export const BOARD_PRIMARY = "flex-[1_1_260px] min-[620px]:max-w-[460px]";

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

export const CHIPS = "mt-0.5 flex flex-wrap gap-[3px]";

export const QUEUE_ITEM =
  "grid grid-cols-[10px_minmax(0,1fr)] items-start gap-1.5 rounded-sm px-1 py-[5px]";

export const GRIMOIRE = "fixed inset-0 z-[140] overflow-auto bg-crypt p-[18px]";
