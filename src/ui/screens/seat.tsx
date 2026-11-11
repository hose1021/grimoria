// Seat order: a local draft that the host commits with one command. A publish
// refreshes names and roles, but it never replaces an order being edited.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { GameSnapshot } from "../../application/store/create-game-store.ts";
import { LanguageSwitch } from "../components/language-switch.tsx";
import { WriterBusy } from "../components/writer-busy.tsx";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

// The legacy stylesheet still owns the look; the classes are its hooks.
const EMPTY_NOTE = "Нажмите место, затем другое, чтобы поменять.";

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
  const state = snapshot.state;
  const t = ports.strings.t;

  const [writer, setWriter] = useState<"pending" | "ready" | "busy">("pending");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setWriter("pending");
    ports.writer.acquire().then(
      (allowed) => {
        if (alive) setWriter(allowed ? "ready" : "busy");
      },
      () => {
        if (alive) setWriter("busy");
      },
    );
    return () => {
      alive = false;
    };
  }, [ports, attempt]);

  const [draft, setDraft] = useState<string[]>(() => orderOf(state));
  const [history, setHistory] = useState<string[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState(EMPTY_NOTE);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; width: number } | null>(null);
  const drag = useRef<Drag | null>(null);
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
    const controller = new AbortController();
    listeners.current = controller;
    return () => controller.abort();
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
    const moved = state.players[other];
    const movedName = moved && (moved.name || "Игрок " + (to + 1));
    announce(`${movedName || ""} now sits at seat ${to + 1}.`);
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
      setGhost({ x: event.clientX, y: event.clientY, width: 0 });
    }
    event.preventDefault();
    setGhost((previous) => ({
      x: event.clientX,
      y: event.clientY,
      width: previous?.width ?? 0,
    }));
    setDragTarget(seatIndexAt(event.clientX, event.clientY));
  };

  const onPointerUp = (event: PointerEvent) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const target = dragTarget;
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

  if (writer === "pending") return null;
  if (writer === "busy") return <WriterBusy onRetry={() => setAttempt((value) => value + 1)} />;

  if (!draft.length) {
    return (
      <div className="seat-empty">
        <p className="label">{ports.strings.text("Seat order")}</p>
        <h1>{ports.strings.text("No one is seated yet.")}</h1>
        <p>{ports.strings.text("Build the bag first, then deal it to seats.")}</p>
        <a className="btn btn--accent" href={ports.router.path("bag")}>
          {ports.strings.text("Build the bag")}
        </a>
      </div>
    );
  }

  const dense = draft.length > 10;
  const radius = dense ? 42 : 40;
  const ghostPlayer = dragIndex === null ? null : draft[dragIndex];
  const ghostRole = ghostPlayer ? ports.roles.byId(state.players[ghostPlayer]?.roleId ?? "") : null;

  return (
    <>
      <header className="seat-top">
        <div className="seat-title">
          <b>{ports.strings.text("Seat order")}</b>
          <small>
            {state.script ? state.script.name : ""} · <span id="seat-total">{draft.length}</span>{" "}
            {ports.strings.text("players")}
          </small>
        </div>
        <div className="seat-actions">
          <a className="btn" href={ports.router.path("player")}>
            {t("player")}
          </a>
          <a className="btn" href={ports.router.path("secrets")}>
            {t("secrets")}
          </a>
          <button
            className="btn"
            type="button"
            data-act="undo"
            disabled={!history.length}
            onClick={undo}
          >
            {ports.strings.text("Undo")}
          </button>
          <button className="btn" type="button" data-act="shuffle" onClick={shuffleSeats}>
            {ports.strings.text("Shuffle")}
          </button>
          <button className="btn btn--accent" type="button" data-act="use" onClick={useOrder}>
            {ports.strings.text("Use this order")}
          </button>
        </div>
        <LanguageSwitch />
      </header>
      <main className="seat-stage">
        <div
          className={`seat-ring${dense ? " is-dense" : ""}`}
          id="seat-ring"
          onPointerDown={onPointerDown}
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
          {draft.map((id, index) => {
            const player = state.players[id];
            const role = player ? ports.roles.byId(player.roleId ?? "") : null;
            const name = nameOf(id);
            const angle = -Math.PI / 2 + (index * 2 * Math.PI) / draft.length;
            const style = {
              "--x": (50 + radius * Math.cos(angle)).toFixed(2) + "%",
              "--y": (50 + radius * Math.sin(angle)).toFixed(2) + "%",
            } as CSSProperties;
            return (
              <button
                key={id + ":" + index}
                type="button"
                className={`seat-item${selected === index ? " is-selected" : ""}${
                  index === 0 ? " is-start" : ""
                }${dragTarget === index ? " is-target" : ""}${
                  dragIndex === index ? " is-dragging" : ""
                }`}
                data-index={index}
                style={style}
                aria-label={`Seat ${index + 1}, ${name}. Activate, then activate another seat to swap.`}
                aria-pressed={selected === index}
              >
                <span className="seat-disc">
                  <span className="seat-num">{index + 1}</span>
                  {role ? (
                    <img className="seat-role" src={ports.roles.image(role)} alt="" />
                  ) : (
                    <span className="seat-mono">{name.charAt(0).toUpperCase() || "?"}</span>
                  )}
                </span>
                <span className="seat-name">{name}</span>
              </button>
            );
          })}
          <div className="seat-hub">
            <div className="seat-hub-count">
              <span id="seat-count">{draft.length}</span>{" "}
              <span className="seat-hub-total">занято</span>
            </div>
            <p className="seat-hub-note">
              {ports.strings.text("Seat 1 is the start.")}
              <br />
              {ports.strings.text("Numbers run clockwise.")}
            </p>
            <svg viewBox="0 0 60 60" width="40" height="40" aria-hidden="true">
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
        <p className="seat-status" role="status">
          {ports.strings.text(status)}
        </p>
      </main>
      {ghost && ghostPlayer ? (
        <div
          className="seat-ghost"
          aria-hidden="true"
          style={{
            left: ghost.x + "px",
            top: ghost.y + "px",
            width: ghost.width ? ghost.width + "px" : undefined,
          }}
        >
          <span className="seat-disc">
            <span className="seat-num">{(dragIndex ?? 0) + 1}</span>
            {ghostRole ? (
              <img className="seat-role" src={ports.roles.image(ghostRole)} alt="" />
            ) : (
              <span className="seat-mono">
                {(state.players[ghostPlayer]?.name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
        </div>
      ) : null}
    </>
  );
}
