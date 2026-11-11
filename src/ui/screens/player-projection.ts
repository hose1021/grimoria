// The player handoff projection: only public seat data and the shown role.
// No real role, reminder, effect, bluff or note may reach the handoff, so the
// screen renders this projection instead of the saved game.

export interface Seat {
  id: string;
  seat: number;
  name: string;
  claimed: boolean;
  shownRoleId: string | null;
}

export interface SeatSource {
  order: string[];
  players: Record<
    string,
    { name?: string; claimed?: boolean; shownRoleId?: string | null } | undefined
  >;
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
    };
  });
}
