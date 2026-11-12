import type { ReactNode } from "react";
import { cx } from "./classes.ts";
import { PlayerToken, type GameTablePlayer } from "./player-token.tsx";

export interface GameTableProps {
  players: GameTablePlayer[];
  center: ReactNode;
  onSelect?: ((id: string) => void) | undefined;
  className?: string;
}

/**
 * The table is a circle: eight seats use the full radius, denser games pull the
 * tokens closer to the rim so the labels keep their distance from the centre.
 */
export function GameTable({ players, center, onSelect, className }: GameTableProps) {
  const dense = players.length > 10;
  const radius = dense ? 41 : 38.5;
  return (
    <div
      className={cx(
        "relative mx-auto aspect-square w-[min(650px,66vh)] max-w-full",
        "max-sm:w-[92vw]",
        className,
      )}
      aria-label="Стол"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-edge"
        viewBox="0 0 660 660"
        aria-hidden="true"
      >
        <circle
          cx="330"
          cy="330"
          r="302"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 7"
        />
        <circle
          cx="330"
          cy="330"
          r="252"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 7"
        />
        <circle
          cx="330"
          cy="330"
          r="198"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".55"
        />
        <path d="M330 4v16M330 640v16M4 330h16M640 330h16" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="absolute left-1/2 top-1/2 w-[250px] -translate-x-1/2 -translate-y-1/2 text-center max-sm:w-[150px]">
        {center}
      </div>
      {players.map((player, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / players.length;
        return (
          <PlayerToken
            key={player.id}
            player={player}
            onSelect={onSelect}
            dense={dense}
            style={{
              left: `${(50 + radius * Math.cos(angle)).toFixed(2)}%`,
              top: `${(50 + radius * Math.sin(angle)).toFixed(2)}%`,
            }}
          />
        );
      })}
    </div>
  );
}
