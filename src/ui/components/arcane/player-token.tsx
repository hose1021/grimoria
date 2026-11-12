import type { CSSProperties } from "react";
import { cx } from "./classes.ts";

export interface TokenMark {
  label: string;
  tone?: "poison" | "guard" | "herring";
}

export interface GameTablePlayer {
  id: string;
  seat: number;
  name: string;
  roleName: string;
  image: string;
  alive: boolean;
  active?: boolean;
  selected?: boolean;
  targetKey?: string | null;
  disabled?: boolean;
  votes?: number;
  marks?: TokenMark[];
}

/** Every visible string, so the table speaks the current locale. */
export interface GameTableLabels {
  seat: (seat: number, name: string) => string;
  dead: string;
  active: string;
  selected: string;
  votes: (count: number) => string;
}

const MARK_TONE: Record<string, string> = {
  poison: "border-traveller/50 text-traveller",
  guard: "border-outsider/50 text-outsider",
  herring: "border-crimson-dim text-danger",
};

// The token is a container: below 60 px the labels would overflow the hex and
// cover the neighbouring seat, so only the art and the seat number stay.
const LABEL = "@max-[60px]:hidden";

export function PlayerToken({
  player,
  labels,
  onSelect,
  style,
}: {
  player: GameTablePlayer;
  labels: GameTableLabels;
  onSelect?: ((id: string) => void) | undefined;
  style?: CSSProperties;
}) {
  const label = player.alive
    ? labels.seat(player.seat, player.name)
    : `${labels.seat(player.seat, player.name)}, ${labels.dead}`;
  return (
    <button
      type="button"
      className="absolute -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 text-center text-text min-h-11 min-w-11 @container"
      style={style}
      aria-label={label}
      data-seat-open={player.id}
      data-target={player.targetKey ?? undefined}
      data-id={player.targetKey ? player.id : undefined}
      aria-pressed={player.selected ?? false}
      disabled={player.disabled ?? false}
      onClick={() => onSelect?.(player.id)}
    >
      <span
        className={cx(
          "relative mx-auto block w-[71%] aspect-[37/41]",
          player.selected ? "drop-shadow-[0_0_14px_rgba(230,169,76,.42)]" : "",
          player.alive ? "" : "grayscale",
        )}
      >
        <span
          className={cx(
            "absolute inset-0 [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]",
            player.selected ? "bg-amber-2" : player.active ? "bg-amber" : "bg-edge-2",
          )}
          aria-hidden="true"
        />
        <span
          className={cx(
            "absolute inset-[1.5px] [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]",
            player.active || player.selected ? "bg-amber-dim/20" : "bg-crypt-3",
          )}
          aria-hidden="true"
        />
        {player.image ? (
          <img
            className="absolute inset-0 z-10 m-auto w-[50%] object-contain"
            src={player.image}
            alt=""
          />
        ) : (
          <span className="absolute inset-0 z-10 grid place-items-center font-role text-[19cqw] text-brass">
            {player.seat}
          </span>
        )}
        <span
          className={cx(
            "absolute bottom-px left-1/2 z-20 -translate-x-1/2 rounded-[3px] border bg-crypt px-1 text-[7px] tabular-nums",
            player.active || player.selected
              ? "border-amber text-amber"
              : "border-edge-2 text-muted",
          )}
        >
          {player.seat}
        </span>
        {player.alive ? null : (
          <span className="absolute inset-0 z-20 grid place-items-center text-[21cqw] text-crimson">
            ✕
          </span>
        )}
      </span>
      <b
        className={cx(
          "mt-1 block truncate text-[10.5px] font-semibold",
          LABEL,
          player.alive ? "text-text" : "text-muted line-through decoration-crimson",
        )}
      >
        {player.name}
      </b>
      <span className={cx("block truncate text-[8px] uppercase tracking-[.1em] text-muted", LABEL)}>
        {player.roleName}
      </span>
      {player.active ? (
        <span
          className={cx(
            "mt-1 inline-block rounded-[2px] border border-amber-dim px-1 py-px text-[7px] uppercase tracking-[.1em] text-amber",
            LABEL,
          )}
        >
          {labels.active}
        </span>
      ) : null}
      {player.selected ? (
        <span
          className={cx(
            "mt-1 inline-block rounded-[2px] border border-amber px-1 py-px text-[7px] uppercase tracking-[.1em] text-amber",
            LABEL,
          )}
        >
          {labels.selected}
        </span>
      ) : null}
      {(player.votes ?? 0) > 0 ? (
        <span
          className={cx("mt-1 flex justify-center gap-1", LABEL)}
          aria-label={labels.votes(player.votes ?? 0)}
        >
          {Array.from({ length: Math.min(player.votes ?? 0, 5) }, (_, index) => (
            <i key={index} className="size-1 rounded-full bg-amber" />
          ))}
        </span>
      ) : null}
      {player.marks?.length ? (
        <span className={cx("mt-1 flex flex-wrap justify-center gap-0.5", LABEL)}>
          {player.marks.map((mark) => (
            <span
              key={mark.label}
              className={cx(
                "rounded-sm border px-1 py-px text-[7px] uppercase tracking-[.08em]",
                MARK_TONE[mark.tone ?? ""] ?? "border-edge-2 text-muted",
              )}
            >
              {mark.label}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}
