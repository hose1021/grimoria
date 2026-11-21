// The player handoff projection: only public seat data, the shown role and the
// Goon's revealed alignment. No real role, reminder, effect, bluff or note may
// reach the handoff, so the screen renders this projection instead of the saved
// game. Goon r2977 §How to Run: when the Goon's alignment changes, wake them and
// give a thumbs-up or thumbs-down indicating the new alignment. Only the Goon
// gets that reveal; the Lunatic and every other masked role keep their mask.
export type ShownAlignment = "good" | "evil";

export interface Seat {
  id: string;
  seat: number;
  name: string;
  claimed: boolean;
  shownRoleId: string | null;
  shownAlignment: ShownAlignment | null;
}

export interface SeatSource {
  order: string[];
  players: Record<
    string,
    | {
        name?: string;
        claimed?: boolean;
        roleId?: string | null;
        shownRoleId?: string | null;
        team?: string | null;
      }
    | undefined
  >;
}

function shownAlignmentOf(player: SeatSource["players"][string]): ShownAlignment | null {
  if (player?.roleId !== "goon") return null;
  return player.team === "good" || player.team === "evil" ? player.team : null;
}

export function projectSeats(state: SeatSource): Seat[] {
  return state.order.map((id, index) => {
    const player = state.players[id];
    return {
      id,
      seat: index + 1,
      name: player?.name ?? "",
      claimed: Boolean(player?.claimed),
      shownRoleId: player?.shownRoleId ?? null,
      shownAlignment: shownAlignmentOf(player),
    };
  });
}
