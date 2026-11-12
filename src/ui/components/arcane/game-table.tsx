import type { ReactNode } from "react";
import { cx } from "./classes.ts";
import { PlayerToken, type GameTableLabels, type GameTablePlayer } from "./player-token.tsx";

export interface GameTableProps {
  players: GameTablePlayer[];
  center: ReactNode;
  /** Accessible name of the ring. */
  label: string;
  labels: GameTableLabels;
  onSelect?: ((id: string) => void) | undefined;
  className?: string;
}

/**
 * The table is a circle: eight seats use the full radius, denser games pull the
 * tokens closer to the rim so the labels keep their distance from the centre.
 * The token width follows the chord between two neighbours, so two tokens can
 * never cover each other; the ring itself never shrinks below 420 px on a
 * phone, where 66vh would squeeze fifteen seats into an unreadable circle.
 */
export function GameTable({ players, center, label, labels, onSelect, className }: GameTableProps) {
  const dense = players.length > 10;
  const radius = dense ? 41 : 38.5;
  const count = Math.max(players.length, 2);
  const chord = 2 * radius * Math.sin(Math.PI / count);
  const tokenWidth = Math.min(16, chord * 0.92);
  return (
    <div
      className={cx(
        "relative mx-auto aspect-square w-[min(650px,66vh)] max-w-full",
        "max-[900px]:w-[min(92vw,420px)]",
        className,
      )}
      aria-label={label}
      data-game-table=""
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
      <div className="absolute left-1/2 top-1/2 w-[250px] -translate-x-1/2 -translate-y-1/2 text-center max-[900px]:w-[150px]">
        {center}
      </div>
      {players.map((player, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / players.length;
        return (
          <PlayerToken
            key={player.id}
            player={player}
            labels={labels}
            onSelect={onSelect}
            style={{
              left: `${(50 + radius * Math.cos(angle)).toFixed(2)}%`,
              top: `${(50 + radius * Math.sin(angle)).toFixed(2)}%`,
              width: `${tokenWidth.toFixed(2)}%`,
            }}
          />
        );
      })}
    </div>
  );
}
