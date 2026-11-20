// Pure stadium geometry and seat state for `/table`. One racetrack contour
// gives the rail, the felt surface and every seat centre, so a phone and a
// desktop share the same shape. Nothing here reads the store or renders React.

export type LabelSide = "right" | "left" | "above" | "below";

/** The class placement of one seat label relative to its medallion. */
export const SEAT_LABEL_SIDE: Record<LabelSide, string> = {
  right: "right-[calc(100%+6px)] top-1/2 -translate-y-1/2 items-end text-right",
  left: "left-[calc(100%+6px)] top-1/2 -translate-y-1/2 items-start text-left",
  above: "bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 items-center text-center",
  below: "top-[calc(100%+4px)] left-1/2 -translate-x-1/2 items-center text-center",
};

/** Space kept between the shared table box and the stadium contour. */
const INSET_X = 34;
const INSET_Y = 52;

export interface StadiumBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SeatGeometry {
  index: number;
  /** Seat centre as a percentage of the table box. */
  x: number;
  y: number;
  /** Which side of the medallion carries the name label. */
  side: LabelSide;
  /** Paint order: the first seat paints above every later seat. */
  z: number;
}

export interface TableLayout {
  /** The one stadium contour shared by the rail, the surface and the seats. */
  bounds: StadiumBounds;
  seats: SeatGeometry[];
  /** The long axis: a tall stadium on a phone, a wide one on a desktop. */
  vertical: boolean;
}

interface ContourPoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

const arc = (cx: number, cy: number, radius: number, angle: number): ContourPoint => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
  nx: Math.cos(angle),
  ny: Math.sin(angle),
});

/**
 * One point at `distance` along the stadium contour, clockwise from the top
 * centre. A stadium has two straight sides joined by two semicircular caps;
 * the horizontal orientation is the same contour turned a quarter.
 */
function contourPoint(
  distance: number,
  vertical: boolean,
  radius: number,
  straight: number,
  cx: number,
  cy: number,
): ContourPoint {
  const half = straight / 2;
  const cap = Math.PI * radius;
  if (vertical) {
    const topCap = cy - half;
    const bottomCap = cy + half;
    const quarter = cap / 2;
    if (distance < quarter) return arc(cx, topCap, radius, -Math.PI / 2 + distance / radius);
    let d = distance - quarter;
    if (d < straight) return { x: cx + radius, y: topCap + d, nx: 1, ny: 0 };
    d -= straight;
    if (d < cap) return arc(cx, bottomCap, radius, d / radius);
    d -= cap;
    if (d < straight) return { x: cx - radius, y: bottomCap - d, nx: -1, ny: 0 };
    d -= straight;
    return arc(cx, topCap, radius, Math.PI + d / radius);
  }
  if (distance < half) return { x: cx + distance, y: cy - radius, nx: 0, ny: -1 };
  let d = distance - half;
  if (d < cap) return arc(cx + half, cy, radius, -Math.PI / 2 + d / radius);
  d -= cap;
  if (d < straight) return { x: cx + half - d, y: cy + radius, nx: 0, ny: 1 };
  d -= straight;
  if (d < cap) return arc(cx - half, cy, radius, Math.PI / 2 + d / radius);
  d -= cap;
  return { x: cx - half + d, y: cy - radius, nx: 0, ny: -1 };
}

/**
 * Splits the measured table box into the stadium contour and the seats. Seats
 * sit at equal arc distance, so their spacing follows the perimeter rather
 * than the angles. Even counts start half a step off the top, so no seat owns
 * the bottom centre; odd counts put a seat at the top and none at the bottom.
 */
export function tableLayout(count: number, width: number, height: number): TableLayout {
  const contourWidth = Math.max(0, width - INSET_X * 2);
  const contourHeight = Math.max(0, height - INSET_Y * 2);
  const vertical = contourHeight >= contourWidth;
  const bounds = { left: INSET_X, top: INSET_Y, width: contourWidth, height: contourHeight };
  if (!Number.isFinite(count) || count <= 0 || contourWidth <= 0 || contourHeight <= 0)
    return { bounds, seats: [], vertical };
  const radius = Math.min(contourWidth, contourHeight) / 2;
  const straight = Math.abs(contourWidth - contourHeight);
  const step = (2 * straight + 2 * Math.PI * radius) / count;
  const offset = count % 2 === 0 ? step / 2 : 0;
  const cx = INSET_X + contourWidth / 2;
  const cy = INSET_Y + contourHeight / 2;
  const seats = Array.from({ length: count }, (_, index) => {
    const point = contourPoint(offset + index * step, vertical, radius, straight, cx, cy);
    const side: LabelSide =
      Math.abs(point.nx) >= Math.abs(point.ny)
        ? point.nx >= 0
          ? "right"
          : "left"
        : point.ny >= 0
          ? "below"
          : "above";
    return {
      index,
      x: Number(((point.x / width) * 100).toFixed(2)),
      y: Number(((point.y / height) * 100).toFixed(2)),
      side,
      z: count - index,
    };
  });
  return { bounds, seats, vertical };
}

export type SeatBadge =
  | "acting"
  | "nominated"
  | "scheduled"
  | "dead"
  | "registered-dead"
  | "ghost-vote"
  | "no-ghost-vote"
  | "poison"
  | "drunk"
  | "protection";

export interface SeatState {
  alive: boolean;
  voteToken?: boolean;
  acting?: boolean;
  nominated?: boolean;
  impaired?: boolean;
  drunk?: boolean;
  poisoned?: boolean;
  protected?: boolean;
  scheduledDeath?: boolean;
  registeredDead?: boolean;
}

/** The locale key and the token tone of each table badge. */
export const SEAT_BADGE_KEY: Record<SeatBadge, string> = {
  acting: "ui.activeSeat",
  nominated: "ui.nominatedSeat",
  scheduled: "ui.consequence.scheduled",
  dead: "ui.dead",
  "registered-dead": "ui.registeredDead",
  "ghost-vote": "ui.ghostVote",
  "no-ghost-vote": "ui.noGhostVote",
  poison: "ui.poisoned",
  drunk: "ui.drunk",
  protection: "ui.protected",
};

export const SEAT_BADGE_TONE: Record<SeatBadge, string> = {
  acting: "border-table-primary/60 text-table-primary",
  nominated: "border-crimson text-danger",
  scheduled: "border-crimson/60 text-danger",
  dead: "border-edge-2 text-muted",
  "registered-dead": "border-brass/60 text-brass",
  "ghost-vote": "border-townsfolk/60 text-townsfolk",
  "no-ghost-vote": "border-edge-2 text-muted",
  poison: "border-outsider/60 text-outsider",
  drunk: "border-amber-2/60 text-amber-2",
  protection: "border-amber-2/60 text-amber-2",
};

/**
 * Every true state of one seat, in the order the badge row reads. Role-specific
 * host tokens never reach this list; the table carries only table states.
 */
export function seatBadges(state: SeatState): SeatBadge[] {
  const badges: SeatBadge[] = [];
  if (state.acting) badges.push("acting");
  if (state.nominated) badges.push("nominated");
  if (state.scheduledDeath) badges.push("scheduled");
  if (!state.alive) badges.push("dead");
  if (!state.alive || state.registeredDead) {
    badges.push(state.voteToken === false ? "no-ghost-vote" : "ghost-vote");
  }
  if (state.registeredDead) badges.push("registered-dead");
  if (state.drunk) badges.push("drunk");
  if (state.poisoned || (!state.drunk && state.impaired)) badges.push("poison");
  if (state.protected) badges.push("protection");
  return badges;
}

export interface DawnPlayer {
  id: string;
  name: string;
  roleName: string;
  alive: boolean;
}

export interface DawnReport {
  deaths: Array<{ playerId: string; name: string; roleName: string }>;
  survivors: number;
  total: number;
  none: boolean;
}

/** The night's deaths and the survivor count, read from the finished night. */
export function dawnReport(
  players: DawnPlayer[],
  morning: Array<{ playerId: string }>,
): DawnReport {
  const byId = new Map(players.map((player) => [player.id, player]));
  const deaths = morning.flatMap((entry) => {
    const player = byId.get(entry.playerId);
    return player ? [{ playerId: player.id, name: player.name, roleName: player.roleName }] : [];
  });
  return {
    deaths,
    survivors: players.filter((player) => player.alive).length,
    total: players.length,
    none: deaths.length === 0,
  };
}
