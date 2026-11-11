// Public line: read-only, no roles, bluffs, notes, effects or hidden state.
// Styling is Tailwind only; `.public*` rules are gone from `css/host.css`.
import { useEffect } from "react";
import { publicGameView } from "../../core/model/state.ts";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

const LANGS = ["ru", "en", "az"] as const;

const PAGE =
  "public mx-auto w-[min(980px,100%)] px-4 pt-[18px] pb-10 max-[640px]:p-[12px_10px_32px]";
const HEAD =
  "public-head flex items-start justify-between gap-3 max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:gap-2";
const HEAD_BLOCK = "max-[640px]:col-span-2";
const TITLE = "my-[2px] text-[clamp(28px,5vw,46px)] tracking-[-0.04em]";
const LABEL = "text-[14px] font-[650] uppercase tracking-[0.13em] text-muted";
const PHASE = "public-phase text-[13px] text-accent";
const BACK =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line-2 bg-panel-2 px-3 py-2 no-underline hover:bg-btn-hover max-[640px]:col-start-1 max-[640px]:row-start-2 max-[640px]:justify-self-start";
const LANG =
  "ml-2 min-h-11 cursor-pointer rounded-md border border-line-2 bg-panel px-1.5 py-1 text-[11px]! text-muted! hover:text-text! max-[640px]:col-start-2 max-[640px]:row-start-2 max-[640px]:ml-0 max-[640px]:justify-self-end";
const MAIN = "public-main mt-5 grid gap-3.5";
const COUNT =
  "public-count flex items-baseline gap-2 rounded-[14px] border border-line bg-panel p-4";
const COUNT_NUMBER = "text-[clamp(44px,8vw,72px)] leading-none tracking-[-0.05em]";
const COUNT_LABEL = "text-[14px] text-muted";
const CARD_BASE = "public-card rounded-[14px] border bg-panel p-4";
const CARD = `${CARD_BASE} border-line`;
const WINNER_CARD = `${CARD_BASE} border-btn-accent-border bg-public-winner-bg`;
const CARD_TITLE = "mb-2 mt-1 text-[clamp(20px,3vw,28px)]";
const NAMES = "public-names text-[16px] text-muted";
const NOTE = "public-note text-[11px] text-muted";

export function PublicScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const state = snapshot.state;
  const view = publicGameView(state);
  const t = ports.strings.t;

  const phaseText =
    view.phase === "night"
      ? `${t("night")} ${view.night}`
      : view.phase === "day"
        ? `${t("day")} ${view.day}`
        : view.phase === "over"
          ? t("gameOver")
          : t("setup");

  const back = () => {
    if (window.confirm(t("playerWarning"))) ports.router.go("/table");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ports, t]);

  return (
    <div className={PAGE}>
      <header className={HEAD}>
        <div className={HEAD_BLOCK}>
          <p className={LABEL}>{t("publicScreen")}</p>
          <h1 className={TITLE}>{state.script ? state.script.name : ""}</h1>
          <p className={PHASE}>{phaseText}</p>
        </div>
        <button type="button" className={BACK} onClick={back}>
          {t("table")}
        </button>
        <select
          className={LANG}
          aria-label={t("language")}
          value={ports.locale.current()}
          onChange={(event) => {
            void ports.locale.change(event.target.value);
          }}
        >
          {LANGS.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
      </header>
      <main className={MAIN}>
        <div className={COUNT}>
          <b className={COUNT_NUMBER}>{view.living}</b>
          <span className={COUNT_LABEL}>
            {t("alive")} / {view.total}
          </span>
        </div>
        <section className={CARD}>
          <span className={LABEL}>{t("morning")}</span>
          <h2 className={CARD_TITLE}>{view.deaths.length ? t("died") : t("noDeaths")}</h2>
          {view.deaths.length ? <p className={NAMES}>{view.deaths.join(" · ")}</p> : null}
          <p className={NOTE}>{t("publicHint")}</p>
        </section>
        {view.winner ? (
          <section className={WINNER_CARD}>
            <span className={LABEL}>{t("winner")}</span>
            <h2 className={CARD_TITLE}>
              {view.winner.team === "good" ? t("winnerGood") : t("winnerEvil")}
            </h2>
            <p className={NOTE}>{t("publicHint")}</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
