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
  deadVote?: boolean;
  votes?: number;
  marks?: TokenMark[];
}

const MARK_TONE: Record<string, string> = {
  poison: "border-traveller/50 text-traveller",
  guard: "border-outsider/50 text-outsider",
  herring: "border-crimson-dim text-danger",
};

export function PlayerToken({
  player,
  onSelect,
  style,
  dense = false,
}: {
  player: GameTablePlayer;
  onSelect?: ((id: string) => void) | undefined;
  style?: CSSProperties;
  dense?: boolean;
}) {
  const label = player.alive
    ? `Место ${player.seat}, ${player.name}`
    : `Место ${player.seat}, ${player.name}, мёртв`;
  return (
    <button
      type="button"
      className={cx(
        "absolute -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 text-center text-text",
        dense ? "w-[84px] max-sm:w-[58px]" : "w-[104px] max-sm:w-[68px]",
      )}
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
          "relative mx-auto block",
          dense ? "h-[70px] w-[62px] max-sm:size-10" : "h-[82px] w-[74px] max-sm:size-[46px]",
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
            className={cx(
              "absolute inset-0 z-10 m-auto object-contain",
              dense ? "h-[42px] w-[42px] max-sm:size-6" : "h-[52px] w-[52px] max-sm:size-7",
            )}
            src={player.image}
            alt=""
          />
        ) : (
          <span
            className={cx(
              "absolute inset-0 z-10 grid place-items-center font-role text-brass",
              dense ? "text-[16px] max-sm:text-[12px]" : "text-[20px] max-sm:text-[14px]",
            )}
          >
            {player.seat}
          </span>
        )}
        <span
          className={cx(
            "absolute bottom-[1px] left-1/2 z-20 -translate-x-1/2 rounded-[3px] border bg-crypt px-1 text-[7.5px] tabular-nums",
            player.active || player.selected
              ? "border-amber text-amber"
              : "border-edge-2 text-muted",
          )}
        >
          {player.seat}
        </span>
        {player.alive ? null : (
          <span className="absolute inset-0 z-20 grid place-items-center text-[22px] text-crimson">
            ✕
          </span>
        )}
      </span>
      <b
        className={cx(
          "mt-1 block truncate font-semibold",
          dense ? "text-[9px] max-sm:text-[8px]" : "text-[10.5px] max-sm:text-[9px]",
          player.alive ? "text-text" : "text-muted line-through decoration-crimson",
        )}
      >
        {player.name}
      </b>
      <span
        className={cx(
          "block truncate uppercase tracking-[.1em] text-muted",
          dense ? "text-[7px] max-sm:text-[6px]" : "text-[8px] max-sm:text-[7px]",
        )}
      >
        {player.roleName}
      </span>
      {player.active ? (
        <span className="mt-1 inline-block rounded-[2px] border border-amber-dim px-1 py-px text-[7px] uppercase tracking-[.1em] text-amber">
          Действует
        </span>
      ) : null}
      {player.selected ? (
        <span className="mt-1 inline-block rounded-[2px] border border-amber px-1 py-px text-[7px] uppercase tracking-[.1em] text-amber">
          Цель
        </span>
      ) : null}
      {(player.votes ?? 0) > 0 ? (
        <span className="mt-1 flex justify-center gap-1" aria-label={`${player.votes} голосов`}>
          {Array.from({ length: Math.min(player.votes ?? 0, 5) }, (_, index) => (
            <i key={index} className="size-1 rounded-full bg-amber" />
          ))}
        </span>
      ) : null}
      {player.deadVote ? (
        <span className="mt-0.5 block text-[7px] uppercase tracking-[.1em] text-brass">
          голос мёртвого
        </span>
      ) : null}
      {player.marks?.length ? (
        <span className="mt-1 flex flex-wrap justify-center gap-0.5">
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
