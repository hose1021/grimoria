import type { Role } from "../../core/model/types.ts";

export interface PlayerSeatProps {
  seat: number;
  name: string;
  role?: Role | null;
  dead?: boolean;
}

export function PlayerSeat({ seat, name, role, dead = false }: PlayerSeatProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-panel p-[var(--pad)]"
      data-seat={seat}
      data-dead={dead ? "true" : "false"}
      aria-label={`Seat ${seat}`}
    >
      <span className="w-6 shrink-0 text-center tabular-nums text-muted">{seat}</span>
      <span className="truncate font-semibold">{name}</span>
      {role ? <span className="ml-auto shrink-0 text-muted">{role.name}</span> : null}
    </div>
  );
}
