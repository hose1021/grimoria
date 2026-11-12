// The console's shared utility strings. Every value mirrors the deleted
// `css/host.css` rule it replaces. The legacy class names in the markup are
// inert hooks for the browser checks.

export const HOST =
  "mx-auto w-[min(1500px,100%)] min-w-0 px-3.5 pt-2.5 pb-10 max-[640px]:px-2 max-[640px]:pt-2 max-[640px]:pb-[76px] max-[900px]:pb-20";

export const HEAD =
  "host-head sticky top-0 z-30 mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] py-2 backdrop-blur-[10px] max-[900px]:static max-[900px]:grid max-[900px]:grid-cols-[minmax(0,1fr)_auto] max-[900px]:gap-1.5 max-[900px]:pt-[max(8px,env(safe-area-inset-top))]";

export const BRAND = "flex items-center gap-[9px]";

export const NAV =
  "host-nav flex flex-wrap items-center gap-[5px] max-[900px]:col-span-full max-[900px]:justify-end";

export const NAV_BTN = "!min-h-11 !px-[9px] !py-[5px] !text-[13px] max-[900px]:!min-h-11";

export const GRID =
  "grid min-w-0 grid-cols-[270px_minmax(0,1fr)_310px] items-start gap-3 max-[1200px]:grid-cols-[240px_minmax(0,1fr)] max-[900px]:flex max-[900px]:flex-col";

export const MAIN_COL = "grid min-w-0 gap-3 max-[900px]:order-1 max-[900px]:w-full";

export const SEATS_COL = "grid min-w-0 gap-2.5 max-[900px]:order-2 max-[900px]:w-full";

export const SIDE_COL =
  "grid min-w-0 gap-2.5 max-[1200px]:col-span-full max-[1200px]:grid-cols-2 max-[900px]:order-3 max-[900px]:w-full max-[900px]:grid-cols-1";

export const PANEL = "host-panel min-w-0 rounded-[11px] border border-line bg-panel p-[11px]";

export const PANEL_HEAD = "mb-[7px] flex flex-wrap items-baseline justify-between gap-1.5";

export const MUTED = "text-[13px] leading-[1.45] text-muted";

export const WARNING = "text-[13px] leading-[1.45] text-[#e0b36a]";

export const ALERT =
  "my-2 rounded-[9px] border border-line-2 bg-[#1a1710] px-[11px] py-[9px] text-[13px] leading-[1.45]";

export const ALERT_BAD = "border-[#5a2b2b] bg-[#2a1414] text-[#f0b5b5]";

export const CARD = "min-w-0 rounded-[14px] border p-[17px] max-[640px]:p-[13px]";

export const CARD_LINE = "border-line bg-panel";

export const NIGHT_CARD =
  CARD + " border-[#243845] bg-[radial-gradient(80%_80%_at_50%_0%,#101b22,#121619_62%)]";

export const DAY_CARD =
  CARD + " border-[#3a3525] bg-[radial-gradient(90%_60%_at_50%_0%,#1b1a13,#121619_60%)]";

export const OVER_CARD = CARD + " border-[#1f5a4f] bg-[#0f1b18]";

export const CARD_TITLE =
  "m-[4px_0_10px] text-[clamp(22px,3.4vw,32px)] leading-[1.12] tracking-[-.03em]";

export const CARD_TEXT = "my-1.5 text-[16px] leading-[1.5]";

export const SECTION = "mt-2.5 border-t border-line pt-2.5";

export const TARGET_GRID =
  "mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-[5px] max-[640px]:grid-cols-2";

export const TARGET =
  "host-target min-h-[46px] rounded-lg border border-line bg-[#0d1215] p-[7px] text-left text-text hover:border-line-2";

export const TARGET_ON = "border-accent bg-[#10221e]";

export const TARGET_OFF = "cursor-not-allowed opacity-35";

export const FIELD_BOX = "my-[7px] grid gap-1";

export const CHECK = "my-[5px] flex items-start gap-[7px] text-[13px] text-muted";

export const INLINE = "flex flex-wrap items-center gap-1.5";

export const ACTIONS = "mt-3 flex flex-wrap gap-[7px]";

export const PRIMARY = "min-h-11 flex-[1_1_220px]";

export const INFO_PREVIEW =
  "my-[5px] mb-2 rounded-[9px] border border-[#1f5a4f] bg-[#0c1a16] p-2.5 text-[14px] leading-[1.45]";

export const CHIP =
  "inline-flex items-center rounded-full border border-line-2 px-1.5 py-0.5 text-[12px] leading-[1.4] text-muted";

export const TOKEN =
  "inline-flex min-w-[72px] flex-col items-center gap-[3px] rounded-[10px] border border-line bg-[#0d1215] p-[6px] text-text max-[900px]:w-[76px] max-[900px]:flex-[0_0_76px]";

export const TOKEN_BUTTON = "cursor-pointer hover:border-accent";

export const TOKEN_IMG = "h-[42px] w-[42px] object-contain";

export const TOKEN_NAME =
  "max-w-full text-center text-[13px] leading-[1.2] font-semibold break-words";

export const TOKEN_MINI = "w-[48px] min-w-0 gap-px border-0 bg-transparent p-0.5";

export const TOKEN_MINI_IMG = "h-[28px] w-[28px] object-contain";

export const TOKEN_MINI_NAME = "text-[8px] font-normal text-muted";

export const SEAT = "min-w-0 rounded-[9px] border border-line bg-[#0d1215]";

export const SEAT_DEAD = "border-dashed bg-[#0a0d0f]";

export const SEAT_SELECTED = "border-accent";

export const SEAT_MAIN =
  "host-seat-main grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-[7px] border-0 bg-transparent p-[7px] text-left text-inherit hover:rounded-[9px] hover:bg-[#11181c]";

export const SEAT_NUM =
  "host-seat-num grid h-[22px] w-[22px] place-items-center rounded-full border border-line-2 text-[10px] text-muted tabular-nums";

export const SEAT_BODY = "grid min-w-0 gap-0.5";

export const SEAT_TOKEN =
  "grid h-[46px] w-[46px] flex-none place-items-center overflow-hidden rounded-full border border-line-2 bg-[#0a0f12]";

export const SEAT_TOKEN_DEAD = "opacity-50 grayscale";

export const ROLE_LINE = "inline-flex items-center gap-1 text-[13px] text-muted";

export const TEAM_DOT = "h-1.5 w-1.5 rounded-full";

export const SHOWN = "text-[13px] text-accent";

export const CHIPS = "mt-0.5 flex flex-wrap gap-[3px]";

export const DOCK =
  "hidden max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:bottom-0 max-[900px]:z-40 max-[900px]:grid max-[900px]:grid-cols-6 max-[900px]:border-t max-[900px]:border-line max-[900px]:bg-[#0a0e10] max-[900px]:px-1.5 max-[900px]:py-1.5 max-[900px]:pb-[calc(6px+env(safe-area-inset-bottom))]";

export const DOCK_LINK =
  "max-[900px]:grid max-[900px]:min-h-11 max-[900px]:place-items-center max-[900px]:rounded-md max-[900px]:px-0.5 max-[900px]:text-center max-[900px]:text-[11px] max-[900px]:leading-[1.15] max-[900px]:text-muted max-[900px]:no-underline max-[900px]:hover:bg-panel max-[900px]:hover:text-text max-[360px]:px-0 max-[360px]:text-[10px]";

export const VIEW_TABS =
  "hidden gap-1.5 max-[900px]:my-2 max-[900px]:flex max-[900px]:[&>button]:min-w-0 max-[900px]:[&>button]:flex-1 max-[900px]:[&>button]:px-[5px] max-[900px]:[&>button]:py-2";

export const QUEUE_ITEM =
  "grid grid-cols-[10px_minmax(0,1fr)] items-start gap-1.5 rounded-md px-1 py-[5px]";

export const LOG_ITEM = "border-l-2 border-line-2 pl-[7px]";

export const LOG_SECRET = "border-l-[#5a2b2b]";

export const MODAL_BOX =
  "w-[min(640px,100%)] max-h-[88dvh] overflow-auto rounded-[14px] border border-line-2 bg-panel p-4";

export const OVERLAY =
  "fixed inset-0 z-[120] grid place-items-center bg-[rgba(4,7,9,.94)] p-[18px] backdrop-blur-[7px]";

export const COVER = "fixed inset-0 z-[120] grid place-items-center bg-bg p-[18px]";

export const GRIMOIRE = "fixed inset-0 z-[140] overflow-auto bg-bg p-[18px]";
