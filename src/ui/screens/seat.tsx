// Seat order: one table surface over a local draft that the host commits with
// one command. A publish refreshes names, but it never replaces an order being
// edited.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { GameSnapshot } from "../../application/store/create-game-store.ts";
import { ArcaneAppBar } from "../components/arcane/index.ts";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";
import { publicSeats, seatOrderDraft } from "./seat-projection.ts";
import { handoffSession } from "./player-projection.ts";
import { commandRejectionText } from "./setup-messages.ts";
import { SEAT_LABEL_SIDE } from "./table/ring.ts";
import { TableFelt, useTableLayout } from "./table/surface.tsx";

function orderOf(state: GameSnapshot["state"]): string[] {
  return state.order.filter((id) => state.players[id]);
}

interface Drag {
  pointerId: number;
  index: number;
  startX: number;
  startY: number;
  active: boolean;
}

export function SeatScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  return <SeatEditor key={handoffSession(snapshot.state)} snapshot={snapshot} />;
}

function SeatEditor({ snapshot }: { snapshot: GameSnapshot }) {
  const ports = useShellPorts();
  const state = snapshot.state;
  const t = ports.strings.t;
  const [edited, setDraft] = useState<string[]>([]);
  const [history, setHistory] = useState<string[][]>([]);
  const { order: draft, conflict } = seatOrderDraft(orderOf(state), edited, history[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const pick = (value: number | null) => {
    const id = value === null ? null : (draft[value] ?? null);
    selectedRef.current = id;
    setSelected(id);
  };
  const [status, setStatus] = useState<{
    key: string;
    vars?: Record<string, string | number> | undefined;
  }>({ key: "ui.seatEmptyNote" });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<Drag | null>(null);
  // The drop target is read on pointerup, which runs from the closure that
  // existed at pointerdown. State would be stale there; a ref is not.
  const dragTargetRef = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const listeners = useRef<AbortController | null>(null);
  const { ref: ringRef, layout } = useTableLayout(draft.length);

  useEffect(() => {
    return () => listeners.current?.abort();
  }, []);

  // The route is readable by anyone at the table, so it renders names and seat
  // numbers only (`SPEC.md` `/seat` "names only"). Roles never enter this view.
  const seats = publicSeats(draft, state.players);
  const nameOf = (id: string) => seats.find((seat) => seat.id === id)?.name ?? "";

  const announce = (key: string, vars?: Record<string, string | number>) =>
    setStatus({ key, vars });

  const swap = (from: number, to: number) => {
    if (from === to) {
      pick(null);
      announce("ui.seatCancelled");
      return;
    }
    const held = draft[from];
    const other = draft[to];
    if (held === undefined || other === undefined) return;
    const next = draft.slice();
    setHistory((past) => [...past, draft.slice()]);
    next[from] = other;
    next[to] = held;
    pick(null);
    setDraft(next);
    const arriving = nameOf(held);
    if (arriving) announce("ui.seatMoved", { name: arriving, seat: to + 1 });
    else announce("ui.seatSwapped", { from: from + 1, to: to + 1 });
  };

  const activate = (index: number) => {
    const current = selectedRef.current === null ? -1 : draft.indexOf(selectedRef.current);
    if (current < 0) {
      pick(index);
      announce("ui.seatPicked", { seat: index + 1 });
      return;
    }
    if (current === index) {
      pick(null);
      announce("ui.seatCancelled");
      return;
    }
    swap(current, index);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((past) => past.slice(0, -1));
    setDraft(last);
    pick(null);
    announce("ui.seatUndone");
  };

  const shuffleSeats = () => {
    const next = draft.slice();
    setHistory((past) => [...past, draft.slice()]);
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const held = next[i];
      const other = next[j];
      if (held === undefined || other === undefined) continue;
      next[i] = other;
      next[j] = held;
    }
    setDraft(next);
    pick(null);
    announce("ui.seatShuffled");
  };

  const useOrder = () => {
    const current = seatOrderDraft(orderOf(ports.game.getSnapshot().state), edited, history[0]);
    if (current.conflict) return;
    const result = ports.commands.setOrder(current.order.slice());
    if (result.status !== "allowed") {
      window.alert(commandRejectionText(result) || t("ui.seatReorderFailed"));
      return;
    }
    const dealt = draft.some((id) => state.players[id]?.roleId);
    const needsSecrets = state.phase === "seat";
    ports.router.go(dealt && needsSecrets ? "/secrets" : "/table");
  };

  const seatIndexAt = (clientX: number, clientY: number): number | null => {
    const under = document.elementFromPoint(clientX, clientY);
    const item = under instanceof Element ? under.closest("[data-index]") : null;
    if (!(item instanceof HTMLElement)) return null;
    return Number(item.dataset.index);
  };

  const finishDrag = () => {
    listeners.current?.abort();
    listeners.current = new AbortController();
    drag.current = null;
    dragTargetRef.current = null;
    setGhost(null);
    setDragIndex(null);
    setDragTarget(null);
  };

  const onPointerMove = (event: PointerEvent) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (!current.active) {
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;
      current.active = true;
      setDragIndex(current.index);
      setGhost({ x: event.clientX, y: event.clientY });
    }
    event.preventDefault();
    setGhost({ x: event.clientX, y: event.clientY });
    const next = seatIndexAt(event.clientX, event.clientY);
    dragTargetRef.current = next;
    setDragTarget(next);
  };

  const onPointerUp = (event: PointerEvent) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const target = dragTargetRef.current;
    const wasActive = current.active;
    const from = current.index;
    finishDrag();
    if (!wasActive) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    if (target !== null && target !== from) swap(from, target);
    else {
      pick(null);
      announce("ui.seatCancelled");
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest("[data-index]");
    if (!(item instanceof HTMLElement)) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      index: Number(item.dataset.index),
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    const controller = listeners.current ?? new AbortController();
    listeners.current = controller;
    window.addEventListener("pointermove", onPointerMove, {
      passive: false,
      signal: controller.signal,
    });
    window.addEventListener("pointerup", onPointerUp, { signal: controller.signal });
    window.addEventListener(
      "pointercancel",
      () => {
        finishDrag();
        pick(null);
        announce("ui.seatCancelled");
      },
      { signal: controller.signal },
    );
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || selected === null) return;
      pick(null);
      announce("ui.seatCancelled");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  // Official play fixes the physical circle before the first night: neighbour
  // abilities depend on it, so a reorder is a setup action only.
  if (state.phase === "night" || state.phase === "day" || state.phase === "over") {
    return (
      <div className="flex h-dvh min-h-0 flex-col" data-seat-locked>
        <ArcaneAppBar current="seat" />
        <main className="grid flex-1 place-items-center overflow-y-auto px-5 py-10 text-center">
          <div className="seat-empty mx-auto grid max-w-[460px] place-items-center gap-2">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-table-secondary">
              {ports.strings.text("Seat order")}
            </p>
            <h1 className="m-0 font-role text-[26px] leading-tight text-parchment">
              {ports.strings.text("Seat order is fixed once the game starts.")}
            </h1>
            <p className="m-0 text-[13px] text-muted">
              {ports.strings.text(
                "Neighbour abilities use the physical circle. Set the seating before the first night.",
              )}
            </p>
            <a className="btn btn--accent mt-2" href={ports.router.path("table")}>
              {ports.strings.text("Back to table")}
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (!draft.length) {
    return (
      <div className="flex h-dvh min-h-0 flex-col">
        <ArcaneAppBar current="seat" />
        <main className="grid flex-1 place-items-center overflow-y-auto px-5 py-10 text-center">
          <div className="seat-empty mx-auto grid max-w-[460px] place-items-center gap-2">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-table-secondary">
              {ports.strings.text("Seat order")}
            </p>
            <h1 className="m-0 font-role text-[26px] leading-tight text-parchment">
              {ports.strings.text("No one is seated yet.")}
            </h1>
            <p className="m-0 text-[13px] text-muted">
              {ports.strings.text("Build the bag first, then deal it to seats.")}
            </p>
            <a className="btn btn--accent mt-2" href={ports.router.path("bag")}>
              {ports.strings.text("Build the bag")}
            </a>
          </div>
        </main>
      </div>
    );
  }

  const deadCount = draft.filter((id) => state.players[id]?.alive === false).length;
  const ghostPlayer = dragIndex === null ? null : draft[dragIndex];

  return (
    <>
      <div className="flex h-dvh min-h-0 flex-col" data-console="seat">
        <ArcaneAppBar current="seat" />
        <main
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-2"
          data-seat-stage
          aria-label={ports.strings.text("Seat order")}
        >
          <div
            ref={ringRef}
            id="seat-ring"
            role="group"
            aria-label={ports.strings.text("Seat order")}
            className="seat-ring relative mx-auto aspect-[100/135] w-full max-w-[560px] min-[620px]:aspect-[1.42] min-[620px]:h-full min-[620px]:min-h-[320px] min-[620px]:w-auto min-[620px]:max-w-none"
            onPointerDown={onPointerDown}
            onDragStart={(event) => event.preventDefault()}
            onClick={(event) => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              if (!(event.target instanceof Element)) return;
              const item = event.target.closest("[data-index]");
              if (item instanceof HTMLElement) activate(Number(item.dataset.index));
            }}
          >
            <TableFelt layout={layout} phase={state.phase} />
            {draft.map((id, index) => {
              const placement = layout.seats[index];
              if (!placement) return null;
              const name = nameOf(id);
              const isSelected = selected === id;
              const isTarget = dragTarget === index;
              return (
                <button
                  key={id + ":" + index}
                  type="button"
                  className={[
                    "seat-item absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 overflow-visible border-0 bg-transparent p-0 text-center text-text select-none [touch-action:none] [-webkit-tap-highlight-color:transparent]",
                    isSelected ? "is-selected" : "",
                    index === 0 ? "is-start" : "",
                    isTarget ? "is-target" : "",
                    dragIndex === index ? "is-dragging opacity-35" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ left: `${placement.x}%`, top: `${placement.y}%`, zIndex: placement.z }}
                  data-index={index}
                  aria-label={t(name ? "ui.seatNamedControl" : "ui.seatControl", {
                    seat: index + 1,
                    name,
                  })}
                  aria-pressed={isSelected}
                >
                  <span
                    data-seat-medallion=""
                    className={`relative mx-auto grid size-11 place-items-center rounded-full bg-table-chip min-[620px]:size-[58px] ${
                      isSelected || isTarget
                        ? "border-2 border-table-primary shadow-[0_0_0_2px_var(--color-table-primary)]"
                        : "border border-table-rim"
                    }`}
                  >
                    <span className="seat-mono font-role text-[18px] leading-none text-player-role-text min-[620px]:text-[22px]">
                      {name.charAt(0).toUpperCase() || "?"}
                    </span>
                    <span
                      data-seat-number=""
                      className="absolute -left-1 -top-1 hidden place-items-center rounded-full border border-table-rim bg-crypt px-1 text-[10px] tabular-nums text-table-muted min-[620px]:grid"
                    >
                      {index + 1}
                    </span>
                    {index === 0 ? (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-amber-dim bg-crypt px-1 py-px text-[9px] uppercase tracking-[.1em] text-accent-text min-[620px]:text-[10px]">
                        {ports.strings.text("Start")}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`pointer-events-none absolute z-30 flex w-max max-w-[110px] flex-col gap-0.5 min-[620px]:max-w-[170px] ${SEAT_LABEL_SIDE[placement.side]}`}
                  >
                    <b className="seat-name block max-w-full truncate text-[12px] font-semibold leading-tight text-text min-[620px]:text-[14px]">
                      {name}
                    </b>
                  </span>
                </button>
              );
            })}
            <div className="seat-hub pointer-events-none absolute left-1/2 top-1/2 z-10 flex w-[min(190px,54%)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center min-[620px]:w-[min(300px,48%)]">
              <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-table-muted min-[620px]:text-[11.5px]">
                {ports.strings.text("Circle")}
              </span>
              <b
                data-seat-count=""
                className="font-role text-[42px] leading-none tracking-[-0.02em] tabular-nums text-table-secondary min-[620px]:text-[52px]"
              >
                {draft.length}
              </b>
              <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-table-muted min-[620px]:text-[12px]">
                {ports.strings.text("players")}
              </span>
              <em
                data-seat-dead={deadCount}
                className="text-[11px] not-italic text-table-muted min-[620px]:text-[12px]"
              >
                {deadCount} {ports.strings.text("Dead")}
              </em>
            </div>
          </div>
        </main>
        <footer
          className="seat-dock relative z-20 w-full border-t border-edge bg-crypt-2 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgba(0,0,0,.35)]"
          data-seat-dock
        >
          <div className="mx-auto grid w-full max-w-[900px] gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-b border-edge/70 pb-1.5">
              <div className="seat-title flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center whitespace-nowrap rounded-sm border border-table-rim bg-table-chip px-2 py-1 text-[12px] uppercase tracking-[.1em] text-table-secondary">
                  {ports.strings.text("Seat order")}
                </span>
                <span className="min-w-0 truncate text-[12px] uppercase tracking-[.08em] text-table-muted">
                  {draft.length} {ports.strings.text("players")} ·{" "}
                  {state.script ? state.script.name : ""}
                </span>
              </div>
              <span
                className="seat-status ml-auto flex min-w-0 items-center gap-1.5 text-[12px] leading-[1.4] text-table-muted"
                role="status"
              >
                <i className="size-1.5 shrink-0 rounded-full bg-table-primary" aria-hidden="true" />
                <span className="truncate">
                  {conflict ? t("ui.seatOrderChanged") : t(status.key, status.vars)}
                </span>
              </span>
            </div>
            <div
              className="seat-actions flex flex-wrap items-center justify-end gap-1.5 max-[900px]:justify-start"
              role="group"
              aria-label={ports.strings.text("Actions")}
            >
              <a className="btn min-h-11 !justify-center" href={ports.router.path("player")}>
                {t("player")}
              </a>
              <button
                className="btn btn--quiet min-h-11 !justify-center"
                type="button"
                data-act="undo"
                disabled={!history.length}
                onClick={undo}
              >
                {ports.strings.text("Undo")}
              </button>
              <button
                className="btn btn--quiet min-h-11 !justify-center"
                type="button"
                data-act="shuffle"
                onClick={shuffleSeats}
              >
                {ports.strings.text("Shuffle")}
              </button>
              {conflict && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setHistory([]);
                    pick(null);
                    announce("ui.seatEmptyNote");
                  }}
                >
                  {t("ui.seatLoadOrder")}
                </button>
              )}
              <button
                className="btn min-h-11 !justify-center !border-table-primary !bg-table-primary !bg-none font-semibold !text-table-primary-ink disabled:!border-edge-2 disabled:!bg-transparent disabled:!text-muted disabled:!opacity-100"
                type="button"
                data-act="use"
                disabled={conflict}
                onClick={useOrder}
              >
                {ports.strings.text("Use this order")}
              </button>
            </div>
          </div>
        </footer>
      </div>
      {ghost && ghostPlayer ? (
        <div
          className="seat-ghost pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 scale-105 flex-col items-center gap-1 opacity-95"
          aria-hidden="true"
          style={{ left: ghost.x + "px", top: ghost.y + "px" }}
        >
          <span className="relative grid size-11 place-items-center rounded-full border-2 border-table-primary bg-table-chip shadow-[0_0_0_2px_var(--color-table-primary)] min-[620px]:size-[58px]">
            <span className="seat-mono font-role text-[18px] leading-none text-player-role-text min-[620px]:text-[22px]">
              {(nameOf(ghostPlayer) || "?").charAt(0).toUpperCase()}
            </span>
          </span>
          <span className="seat-name block w-full max-w-[170px] truncate text-center text-[12px] font-semibold text-text">
            {state.players[ghostPlayer]?.name ?? ""}
          </span>
        </div>
      ) : null}
    </>
  );
}
