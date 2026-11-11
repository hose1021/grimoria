// The player handoff: the public seat picker, the timed role card and one claim
// command. The projection carries the shown role only - no real role, reminder,
// effect, bluff or note - and the screen follows the store subscription.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { GameSnapshot } from "../../application/store/create-game-store.ts";
import { Dialog, DialogClose } from "../components/dialog.tsx";
import { WriterBusy } from "../components/writer-busy.tsx";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

const HIDE_SECONDS = 45;
const TICK_MS = 100;

// Styling is Tailwind only; `css/player.css` is gone. `!` marks the properties
// that an unlayered legacy global (`button { font: inherit; color: inherit }`,
// `a { color: inherit }`) would otherwise win against while `css/app.css`
// still exists. The class names stay as inert hooks for the browser checks.
const BAR =
  "player-bar mx-auto flex w-[min(430px,100%)] items-center gap-2.5 px-[18px] pt-3 max-[560px]:flex-wrap max-[560px]:px-3.5";
const TAG =
  "player-tag rounded-[999px] border border-line px-2.5 py-[5px] text-[9.5px] font-[650] uppercase tracking-[0.14em] text-muted";
const LINK =
  "player-link ml-auto inline-flex min-h-11 items-center whitespace-nowrap border-0 bg-transparent px-0.5 py-0 text-[12px]! text-muted! no-underline hover:text-text! hover:underline hover:underline-offset-2";
const VIEW =
  "player-view mx-auto flex min-h-[calc(100dvh-56px)] w-[min(430px,100%)] flex-col justify-center gap-4 px-[18px] pt-2.5 pb-[calc(28px+env(safe-area-inset-bottom))] max-[560px]:px-3.5 short:gap-3";
const VIEW_NUMBERS = `${VIEW} player-view--numbers justify-start pt-[18px]`;
const KICKER = "player-kicker m-0 text-[14px] font-[650] uppercase tracking-[0.13em] text-accent";
const TITLE =
  "player-title m-0 text-[clamp(26px,7vw,34px)] font-[650] leading-[1.1] tracking-[-0.03em]";
const SUB = "player-sub m-0 -mt-1.5 text-[13.5px] text-muted";
const NUMBERS = "player-numbers mt-0.5 grid grid-cols-4 gap-2";
const NUM =
  "player-num relative grid aspect-square min-h-11 place-items-center rounded-[14px] border border-line bg-panel text-[24px]! font-semibold! tabular-nums hover:not-disabled:border-line-2 hover:not-disabled:bg-panel-2 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:opacity-40";
const NUM_SMALL = "absolute inset-x-1 bottom-1.5 truncate text-[8.5px] font-medium text-muted";
const HINT = "player-hint m-0 text-center text-[11px] text-muted";
const NOTE = "player-note mb-0 mt-3 text-[10.5px] text-muted short:mt-[9px]";
const CARD_SEAT =
  "player-card-seat m-0 text-[9.5px] font-[650] uppercase tracking-[0.14em] text-muted";
const ART = "player-art mt-0.5 grid place-items-center";
const ART_IMG = "h-[176px] w-[176px] object-contain short:h-[140px] short:w-[140px]";
const ROLE_NAME =
  "player-role-name mb-0 mt-0.5 font-role text-[clamp(30px,10vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-player-role-text short:text-[30px]";
const TEAM =
  "player-team mb-0 mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-player-team-text";
const DOT = "player-dot inline-block h-1.5 w-1.5 rounded-[50%]";
const DOT_TEAM: Record<string, string> = {
  townsfolk: "bg-townsfolk",
  outsider: "bg-outsider",
  minion: "bg-minion",
  demon: "bg-demon",
};
const ABILITY =
  "player-ability mb-0 mt-3 text-[14px] leading-[1.55] text-player-ability-text short:mt-[9px] short:text-[13px]";
const CLOCK = "player-clock grid gap-1.5";
const TIMER = "player-timer h-[3px] overflow-hidden rounded-[3px] bg-timer-track";
const TIMER_BAR = "block h-full w-full origin-left bg-accent";
const TIMER_TEXT = "player-timer-text m-0 text-right text-[10.5px] text-muted tabular-nums";
const CARD =
  "player-card rounded-[18px] border border-player-card-border bg-[radial-gradient(80%_50%_at_50%_0%,var(--color-player-card-glow),transparent_65%),linear-gradient(180deg,var(--color-panel-2),var(--color-panel))] px-5 pt-4 pb-[18px] text-center animate-[player-reveal_.22s_ease-out_both] motion-reduce:animate-none";
const FORM = "player-nameform grid gap-[7px]";
const LABEL = "text-[14px] font-[650] uppercase tracking-[0.13em] text-muted";
const FIELD = "field min-h-11! px-3! py-2.5! text-[14px]!";
const BTN_BASE = "inline-flex items-center justify-center rounded-lg border no-underline";
const BTN = `${BTN_BASE} min-h-11 px-3 py-2 border-line-2 bg-panel-2 hover:bg-btn-hover`;
const BTN_ACCENT = `${BTN_BASE} min-h-11 px-3 py-2 border-btn-accent-border bg-accent-dim text-btn-accent-text! hover:bg-btn-accent-hover`;
const BTN_QUIET = `${BTN_BASE} min-h-11 px-3 py-2 border-transparent bg-transparent text-muted! hover:text-text!`;
const SETUP_LINK = `player-setup-link ${BTN_BASE} min-h-11 self-start border-btn-accent-border bg-accent-dim px-[18px] py-0 text-btn-accent-text! hover:bg-btn-accent-hover`;
const SAVE = `player-save ${BTN_BASE} min-h-12 border-btn-accent-border bg-accent-dim px-3 py-2 text-btn-accent-text! hover:bg-btn-accent-hover`;

interface Seat {
  id: string;
  seat: number;
  name: string;
  claimed: boolean;
  shownRoleId: string | null;
}

function projectSeats(state: GameSnapshot["state"]): Seat[] {
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

export function PlayerScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const t = ports.strings.t;
  const seats = useMemo(() => projectSeats(snapshot.state), [snapshot]);

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

  const [seatIndex, setSeatIndex] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(HIDE_SECONDS);
  const [name, setName] = useState("");
  const [warning, setWarning] = useState(false);
  const deadline = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const hide = useCallback(() => {
    deadline.current = null;
    setSeatIndex(null);
  }, []);

  const seat = seatIndex === null ? null : (seats[seatIndex] ?? null);
  const role = seat?.shownRoleId ? ports.roles.byId(seat.shownRoleId) : null;
  const roleImage = ports.roles.image(role);
  const showing = seat !== null && role !== null;

  // The deadline is absolute: a publish re-renders the card, but it must not
  // restart the countdown.
  useEffect(() => {
    if (!showing) return;
    const end = deadline.current ?? Date.now() + HIDE_SECONDS * 1000;
    deadline.current = end;
    const tick = setInterval(() => {
      const left = Math.max(0, (end - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) hide();
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [showing, hide]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (warning) {
        setWarning(false);
        return;
      }
      if (showing) hide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [warning, showing, hide]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) hide();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", hide);
    };
  }, [hide]);

  const reveal = (index: number) => {
    const target = seats[index];
    if (!target || target.claimed || !target.shownRoleId) return;
    deadline.current = Date.now() + HIDE_SECONDS * 1000;
    setRemaining(HIDE_SECONDS);
    setName(target.name);
    setSeatIndex(index);
  };

  const claim = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!seat) {
      hide();
      return;
    }
    const typed = name.trim();
    if (!typed) {
      window.alert(t("enterName"));
      input.current?.focus();
      return;
    }
    const result = ports.commands.claimSeat(seat.id, typed);
    if (result.status === "allowed") {
      hide();
      return;
    }
    window.alert(result.reason || t("notAvailable"));
  };

  if (writer === "pending") return null;
  if (writer === "busy") return <WriterBusy onRetry={() => setAttempt((value) => value + 1)} />;

  const header = (
    <header className={BAR}>
      <span className={TAG}>{t("hostHandoff")}</span>
      <Dialog
        open={warning}
        onOpenChange={setWarning}
        trigger={
          <button className={LINK} type="button" data-act="back">
            {t("playerBack")}
          </button>
        }
        title={t("backToTable")}
        description={t("playerWarning")}
        closeLabel={t("cancel")}
        footer={
          <>
            <button
              className={BTN_ACCENT}
              type="button"
              data-act="back-confirm"
              onClick={() => ports.router.go("/table")}
            >
              {t("playerBack")}
            </button>
            <DialogClose>
              <button className={`${BTN} ml-2`} type="button" data-act="back-cancel">
                {t("cancel")}
              </button>
            </DialogClose>
          </>
        }
      />
    </header>
  );

  const hasRoles = seats.some((entry) => entry.shownRoleId);
  if (!hasRoles) {
    return (
      <>
        {header}
        <section className={VIEW_NUMBERS}>
          <p className={KICKER}>{t("player")}</p>
          <h1 className={TITLE}>{t("noRoles")}</h1>
          <p className={SUB}>{t("setupIntro")}</p>
          <a className={SETUP_LINK} href={ports.router.path("bag")}>
            {t("setup")}
          </a>
        </section>
      </>
    );
  }

  if (seat && role) {
    return (
      <>
        {header}
        <section className={`${VIEW} player-view--role`}>
          <div className={CLOCK}>
            <div className={TIMER} aria-hidden="true">
              <span
                className={TIMER_BAR}
                style={{ transform: `scaleX(${remaining / HIDE_SECONDS})` }}
              />
            </div>
            <p className={TIMER_TEXT}>{t("autoHide", { seconds: Math.ceil(remaining) })}</p>
          </div>
          <article className={CARD}>
            <p className={CARD_SEAT}>{t("seatNumber", { seat: seat.seat })}</p>
            {roleImage ? (
              <div className={ART}>
                <img className={ART_IMG} src={roleImage} alt="" />
              </div>
            ) : null}
            <h1 className={ROLE_NAME}>{role.name}</h1>
            <p className={TEAM}>
              <i className={`${DOT} ${DOT_TEAM[role.team] ?? ""}`} />
              {ports.strings.teamText(role.team)}
            </p>
            <p className={ABILITY}>{role.ability ?? ""}</p>
            <p className={NOTE}>{t("playerWarning")}</p>
          </article>
          <form className={FORM} onSubmit={claim}>
            <label className={LABEL} htmlFor="player-name">
              {t("playerName")}
            </label>
            <input
              ref={input}
              className={FIELD}
              id="player-name"
              name="name"
              maxLength={24}
              autoComplete="off"
              placeholder={t("playerName")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button className={SAVE} type="submit">
              {t("playerSave")}
            </button>
            <button className={BTN_QUIET} type="button" data-act="cancel" onClick={hide}>
              {t("cancel")}
            </button>
          </form>
        </section>
      </>
    );
  }

  const open = seats.filter((entry) => !entry.claimed && entry.shownRoleId).length;
  return (
    <>
      {header}
      <section className={VIEW_NUMBERS}>
        <p className={KICKER}>{t("playerHandoff")}</p>
        <h1 className={TITLE}>{t("playerPick")}</h1>
        <p className={SUB}>
          {t("discussWarning")} {t("openCovered")}
        </p>
        <div className={NUMBERS}>
          {seats.map((entry, index) => {
            if (entry.claimed) {
              return (
                <button
                  key={entry.id}
                  className={NUM}
                  type="button"
                  disabled
                  aria-label={`${t("seatNumber", { seat: entry.seat })}, ${entry.name}`}
                >
                  {entry.seat}
                  <small className={NUM_SMALL}>{entry.name}</small>
                </button>
              );
            }
            if (!entry.shownRoleId) {
              return (
                <button
                  key={entry.id}
                  className={NUM}
                  type="button"
                  disabled
                  aria-label={`${t("seatNumber", { seat: entry.seat })}, ${t("noRoles")}`}
                >
                  {entry.seat}
                  <small className={NUM_SMALL}>{t("noRoles")}</small>
                </button>
              );
            }
            return (
              <button
                key={entry.id}
                className={NUM}
                type="button"
                data-seat={index}
                aria-label={`${t("seatNumber", { seat: entry.seat })}, ${t("playerReveal")}`}
                onClick={() => reveal(index)}
              >
                {entry.seat}
              </button>
            );
          })}
        </div>
        <p className={HINT}>
          {open ? t("availableNumbers", { count: open, total: seats.length }) : t("allClaimed")}
        </p>
        {open === 0 ? (
          <button
            className={BTN_ACCENT}
            type="button"
            data-act="to-seat"
            onClick={() => ports.router.go("/seat")}
          >
            {t("goSeats")}
          </button>
        ) : null}
        <p className={NOTE}>{t("playerWarning")}</p>
        <p className={NOTE}>{t("abandonedClaim")}</p>
      </section>
    </>
  );
}
