// Seat order: a local draft that the host commits with one command. A publish
// refreshes names and roles, but it never replaces an order being edited.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { GameSnapshot } from "../../application/store/create-game-store.ts";
import { buttonClass } from "../components/button.tsx";
import { LanguageSwitch } from "../components/language-switch.tsx";
import { labelClass } from "../components/label.tsx";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

// The `.seat-*` class names stay as inert hooks for the browser checks; every
// declaration now comes from the utilities below.
const EMPTY_NOTE = "Нажмите место, затем другое, чтобы поменять.";

const ACTIONS_BTN =
  "flex-[1_1_110px] min-w-0 [overflow-wrap:anywhere] max-[640px]:flex-none " +
  "max-[640px]:px-1 max-[640px]:py-0 max-[640px]:text-[12px] max-[640px]:leading-[1.15]";

const RING =
  "seat-ring relative aspect-square w-[min(64vh,560px)] max-w-[92vw] rounded-full border border-line " +
  "bg-[radial-gradient(circle_at_50%_45%,var(--color-panel-2)_0%,var(--color-panel)_62%,var(--color-bg)_100%)] " +
  "shadow-[inset_0_0_80px_rgba(0,0,0,.5)] max-[640px]:w-[min(94vw,430px,64vh)] max-[640px]:max-w-[94vw] " +
  "max-[420px]:w-[94vw]";

const RING_DENSE =
  "max-[640px]:grid max-[640px]:w-full max-[640px]:aspect-auto max-[640px]:content-start " +
  "max-[640px]:grid-cols-3 max-[640px]:gap-1.5 max-[640px]:border-0 max-[640px]:bg-none " +
  "max-[640px]:shadow-none";

const ITEM_BASE =
  "seat-item group absolute grid cursor-grab touch-none select-none justify-items-center gap-[5px] " +
  "border-0 bg-none p-0 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] " +
  "left-[var(--x)] top-[var(--y)] -translate-x-1/2 -translate-y-1/2 active:cursor-grabbing";

const ITEM_DENSE_SMALL =
  "max-[640px]:relative max-[640px]:left-auto max-[640px]:top-auto max-[640px]:w-full " +
  "max-[640px]:translate-x-0 max-[640px]:translate-y-0 max-[640px]:flex max-[640px]:items-center " +
  "max-[640px]:gap-[7px] max-[640px]:rounded-[10px] max-[640px]:border max-[640px]:border-line " +
  "max-[640px]:bg-panel-2 max-[640px]:p-1.5 max-[640px]:text-left";

function orderOf(state: GameSnapshot["state"]): string[] {
  return state.order.filter((id) => state.players[id]);
}

interface Drag {
  pointerId: number;
  index: number;
  startX: number;
  startY: number;
  active: boolean;
  width: number;
}

export function SeatScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const state = snapshot.state;
  const t = ports.strings.t;

  const [draft, setDraft] = useState<string[]>(() => orderOf(state));
  const [history, setHistory] = useState<string[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState(EMPTY_NOTE);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; width: number } | null>(null);
  const drag = useRef<Drag | null>(null);
  // The drop target is read on pointerup, which runs from the closure that
  // existed at pointerdown. State would be stale there; a ref is not.
  const dragTargetRef = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const listeners = useRef<AbortController | null>(null);

  // A publish never replaces a draft, but it fills an empty one: another tab can
  // deal the bag while this screen still shows the empty state.
  useEffect(() => {
    if (draft.length) return;
    const published = orderOf(snapshot.state);
    if (published.length) setDraft(published);
  }, [snapshot, draft.length]);

  useEffect(() => {
    return () => listeners.current?.abort();
  }, []);

  const nameOf = (id: string) => {
    const player = state.players[id];
    if (!player) return "";
    return player.name || "Игрок " + (draft.indexOf(id) + 1);
  };

  const announce = (text: string) => setStatus(text);

  const swap = (from: number, to: number) => {
    if (from === to) {
      setSelected(null);
      announce("Selection cancelled.");
      return;
    }
    const held = draft[from];
    const other = draft[to];
    if (held === undefined || other === undefined) return;
    const next = draft.slice();
    setHistory((past) => [...past, draft.slice()]);
    next[from] = other;
    next[to] = held;
    setSelected(null);
    setDraft(next);
    const arriving = state.players[held];
    const arrivingName = arriving && (arriving.name || "Игрок " + (to + 1));
    announce(`${arrivingName || ""} now sits at seat ${to + 1}.`);
  };

  const activate = (index: number) => {
    if (selected === null) {
      setSelected(index);
      announce(`Seat ${index + 1} picked. Activate another seat to swap.`);
      return;
    }
    if (selected === index) {
      setSelected(null);
      announce("Selection cancelled.");
      return;
    }
    swap(selected, index);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((past) => past.slice(0, -1));
    setDraft(last);
    setSelected(null);
    announce("Undone.");
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
    setSelected(null);
    announce("Seats shuffled.");
  };

  const useOrder = () => {
    const result = ports.commands.setOrder(draft.slice());
    if (result.status !== "allowed") {
      window.alert(result.reason || "Не удалось изменить порядок мест.");
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
      setGhost({ x: event.clientX, y: event.clientY, width: current.width });
    }
    event.preventDefault();
    setGhost((previous) => ({
      x: event.clientX,
      y: event.clientY,
      width: previous?.width ?? 0,
    }));
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
      setSelected(null);
      setStatus("Selection cancelled.");
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
      width: item.getBoundingClientRect().width,
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
        setSelected(null);
        setStatus("Selection cancelled.");
      },
      { signal: controller.signal },
    );
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || selected === null) return;
      setSelected(null);
      announce("Selection cancelled.");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  if (!draft.length) {
    return (
      <div className="seat-empty mx-auto max-w-[460px] px-5 py-20 text-center">
        <p className={labelClass}>{ports.strings.text("Seat order")}</p>
        <h1 className="mt-1.5 mb-2 text-[20px]">{ports.strings.text("No one is seated yet.")}</h1>
        <p className="text-[13px] text-muted">
          {ports.strings.text("Build the bag first, then deal it to seats.")}
        </p>
        <a className={buttonClass("accent", "mt-2.5")} href={ports.router.path("bag")}>
          {ports.strings.text("Build the bag")}
        </a>
      </div>
    );
  }

  const dense = draft.length > 10;
  const radius = dense ? 42 : 40;
  const ghostPlayer = dragIndex === null ? null : draft[dragIndex];
  const ghostRole = ghostPlayer ? ports.roles.byId(state.players[ghostPlayer]?.roleId ?? "") : null;

  const discClass = (state: "selected" | "target" | null) =>
    [
      "seat-disc relative grid place-items-center rounded-full border border-line-2",
      "bg-[linear-gradient(180deg,var(--color-panel-2),var(--color-panel))]",
      "shadow-[0_6px_18px_rgba(0,0,0,.3)]",
      "[transition:border-color_.15s,box-shadow_.15s,opacity_.15s,transform_.1s]",
      dense ? "size-[54px]" : "size-[66px]",
      dense
        ? "max-[640px]:size-10 max-[420px]:size-9"
        : "max-[640px]:size-14 max-[420px]:size-[52px]",
      state === "target"
        ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-panel))] shadow-[0_0_0_4px_rgba(95,208,180,.12)]"
        : state === "selected"
          ? "border-accent shadow-[0_0_0_3px_rgba(95,208,180,.16)]"
          : "group-hover:border-muted",
      "group-active:scale-[.96]",
    ].join(" ");

  return (
    <>
      <header
        className={
          "seat-top flex flex-wrap items-center gap-3 border-b border-b-line bg-[rgba(12,15,17,.88)] " +
          "px-[18px] py-3 max-[640px]:grid max-[640px]:grid-cols-[minmax(0,1fr)_auto] " +
          "max-[640px]:gap-1.5 max-[640px]:px-2.5 max-[640px]:pb-2 " +
          "max-[640px]:pt-[max(8px,env(safe-area-inset-top))]"
        }
      >
        <div className="seat-title mr-auto grid leading-[1.2] max-[640px]:mr-0">
          <b className="text-[15px] font-semibold tracking-[-.01em]">
            {ports.strings.text("Seat order")}
          </b>
          <small className="text-[10.5px] text-muted">
            {state.script ? state.script.name : ""} · <span id="seat-total">{draft.length}</span>{" "}
            {ports.strings.text("players")}
          </small>
        </div>
        <div
          className={
            "seat-actions flex flex-wrap gap-[7px] max-[640px]:col-span-full max-[640px]:grid " +
            "max-[640px]:w-full max-[640px]:grid-cols-4 max-[640px]:gap-1.5"
          }
        >
          <a className={buttonClass("default", ACTIONS_BTN)} href={ports.router.path("player")}>
            {t("player")}
          </a>
          <a className={buttonClass("default", ACTIONS_BTN)} href={ports.router.path("secrets")}>
            {t("secrets")}
          </a>
          <button
            className={buttonClass("default", ACTIONS_BTN)}
            type="button"
            data-act="undo"
            disabled={!history.length}
            onClick={undo}
          >
            {ports.strings.text("Undo")}
          </button>
          <button
            className={buttonClass("default", ACTIONS_BTN)}
            type="button"
            data-act="shuffle"
            onClick={shuffleSeats}
          >
            {ports.strings.text("Shuffle")}
          </button>
          <button
            className={buttonClass(
              "accent",
              `${ACTIONS_BTN} max-[640px]:col-span-full max-[640px]:min-h-[46px] max-[640px]:text-[14px] max-[640px]:font-semibold`,
            )}
            type="button"
            data-act="use"
            onClick={useOrder}
          >
            {ports.strings.text("Use this order")}
          </button>
        </div>
        <LanguageSwitch className="max-[640px]:col-start-2 max-[640px]:row-start-1 max-[640px]:ml-0 max-[640px]:justify-self-end" />
      </header>
      <main
        className={
          "seat-stage flex min-h-[calc(100dvh-60px)] flex-col items-center justify-center gap-2 " +
          "px-3 pb-[30px] pt-[18px] max-[640px]:min-h-[calc(100dvh-190px)] max-[640px]:px-2 " +
          "max-[640px]:pb-[max(18px,env(safe-area-inset-bottom))] max-[640px]:pt-2"
        }
      >
        <div
          className={dense ? `${RING} is-dense ${RING_DENSE}` : RING}
          id="seat-ring"
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
          <span
            aria-hidden="true"
            className={
              "pointer-events-none absolute inset-[15%] rounded-full border border-dashed border-line-2" +
              (dense ? " max-[640px]:hidden" : "")
            }
          />
          {draft.map((id, index) => {
            const player = state.players[id];
            const role = player ? ports.roles.byId(player.roleId ?? "") : null;
            const name = nameOf(id);
            const angle = -Math.PI / 2 + (index * 2 * Math.PI) / draft.length;
            const style = {
              "--x": (50 + radius * Math.cos(angle)).toFixed(2) + "%",
              "--y": (50 + radius * Math.sin(angle)).toFixed(2) + "%",
            } as CSSProperties;
            const selectedHere = selected === index;
            const targetHere = dragTarget === index;
            const discState = targetHere ? "target" : selectedHere ? "selected" : null;
            return (
              <button
                key={id + ":" + index}
                type="button"
                className={[
                  ITEM_BASE,
                  selectedHere ? "is-selected" : "",
                  index === 0 ? "is-start" : "",
                  targetHere ? "is-target" : "",
                  dense ? "w-[88px]" : "w-[104px]",
                  dense ? "" : "max-[640px]:w-[92px] max-[420px]:w-[84px]",
                  dense ? ITEM_DENSE_SMALL : "",
                  dense && (targetHere || selectedHere)
                    ? "max-[640px]:border-accent max-[640px]:shadow-[0_0_0_1px_rgba(95,208,180,.3)]"
                    : "",
                  dragIndex === index ? "is-dragging opacity-[.35]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-index={index}
                style={style}
                aria-label={`Seat ${index + 1}, ${name}. Activate, then activate another seat to swap.`}
                aria-pressed={selectedHere}
              >
                <span className={discClass(discState)}>
                  <span
                    className={[
                      "seat-num absolute -left-[3px] -top-[3px] grid size-[21px] place-items-center",
                      "rounded-full border border-line-2 bg-panel text-[9.5px] tabular-nums",
                      "max-[420px]:size-[19px] max-[420px]:text-[8.5px]",
                      dense
                        ? "max-[640px]:-left-0.5 max-[640px]:-top-0.5 max-[640px]:size-[18px] max-[640px]:text-[8.5px]"
                        : "",
                      index === 0 ? "border-accent-dim text-accent" : "text-muted",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {index + 1}
                  </span>
                  {role ? (
                    <img
                      className="seat-role block size-full rounded-full object-cover"
                      src={ports.roles.image(role)}
                      alt=""
                      draggable={false}
                    />
                  ) : (
                    <span
                      className={[
                        "seat-mono text-text",
                        "font-[Georgia,'Times_New_Roman',serif]",
                        dense
                          ? "text-[19px] max-[640px]:text-[16px]"
                          : "text-[23px] max-[640px]:text-[20px] max-[420px]:text-[18px]",
                      ].join(" ")}
                    >
                      {name.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </span>
                <span
                  className={[
                    "seat-name max-w-full overflow-hidden text-ellipsis whitespace-nowrap",
                    "leading-[1.2] text-center",
                    dense
                      ? "text-[10px] max-[640px]:text-left max-[640px]:text-[11px] max-[420px]:text-[10px]"
                      : "text-[11.5px] max-[640px]:text-[11px] max-[420px]:text-[10.5px]",
                  ].join(" ")}
                >
                  {name}
                </span>
              </button>
            );
          })}
          <div
            className={
              "seat-hub pointer-events-none absolute left-1/2 top-1/2 w-[190px] -translate-x-1/2 -translate-y-1/2 " +
              "text-center text-text max-[640px]:w-40 max-[420px]:w-[132px]" +
              (dense ? " max-[640px]:hidden" : "")
            }
          >
            <div className="seat-hub-count text-[34px] font-semibold tracking-[-.03em] tabular-nums max-[640px]:text-[30px] max-[420px]:text-[26px]">
              <span id="seat-count">{draft.length}</span>{" "}
              <span className="seat-hub-total text-[14px] font-medium tracking-normal text-muted">
                занято
              </span>
            </div>
            <p className="seat-hub-note mb-0 mt-1 text-[10.5px] leading-[1.4] text-muted max-[640px]:text-[10px]">
              {ports.strings.text("Seat 1 is the start.")}
              <br />
              {ports.strings.text("Numbers run clockwise.")}
            </p>
            <svg
              viewBox="0 0 60 60"
              width="40"
              height="40"
              aria-hidden="true"
              className="mt-2.5 text-muted"
            >
              <path
                d="M44 30a14 14 0 1 1-4.1-9.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M40 13v8h-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <p
          className="seat-status m-0 px-3 text-center text-[11px] text-muted max-[640px]:text-[12px]"
          role="status"
        >
          {ports.strings.text(status)}
        </p>
      </main>
      {ghost && ghostPlayer ? (
        <div
          className={
            "seat-ghost pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 " +
            "scale-[1.04] rounded-[10px] opacity-[.96] shadow-[0_18px_40px_rgba(0,0,0,.55)]"
          }
          aria-hidden="true"
          style={{
            left: ghost.x + "px",
            top: ghost.y + "px",
            width: ghost.width ? ghost.width + "px" : undefined,
          }}
        >
          <span
            className={
              "seat-disc relative grid size-[66px] place-items-center rounded-full border border-line-2 " +
              "bg-[linear-gradient(180deg,var(--color-panel-2),var(--color-panel))] shadow-[0_6px_18px_rgba(0,0,0,.3)]"
            }
          >
            <span className="seat-num absolute -left-[3px] -top-[3px] grid size-[21px] place-items-center rounded-full border border-line-2 bg-panel text-[9.5px] tabular-nums text-muted">
              {(dragIndex ?? 0) + 1}
            </span>
            {ghostRole ? (
              <img
                className="seat-role block size-full rounded-full object-cover"
                src={ports.roles.image(ghostRole)}
                alt=""
              />
            ) : (
              <span className="seat-mono font-[Georgia,'Times_New_Roman',serif] text-[23px] text-text">
                {(state.players[ghostPlayer]?.name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <span className="seat-name max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11.5px] leading-[1.2]">
            {state.players[ghostPlayer]?.name ?? ""}
          </span>
        </div>
      ) : null}
    </>
  );
}
