// Public line: read-only, no roles, bluffs, notes, effects or hidden state.
// Styling is Tailwind only; `.public*` rules are gone from `css/host.css`.
import { useEffect } from "react";
import { publicGameView } from "../../core/model/state.ts";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

const LANGS = ["ru", "en", "az"] as const;

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
    <div className="public mx-auto w-[min(980px,100%)] px-4 pt-4.5 pb-10 max-[640px]:p-[12px_10px_32px]">
      <header className="public-head flex items-start justify-between gap-3 max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:gap-2">
        <div className="max-[640px]:col-span-2">
          <p className="text-[14px] font-[650] uppercase tracking-[0.13em] text-muted">
            {t("publicScreen")}
          </p>
          <h1 className="my-0.5 text-[clamp(28px,5vw,46px)] tracking-[-0.04em]">
            {state.script ? state.script.name : ""}
          </h1>
          <p className="public-phase text-[13px] text-accent">{phaseText}</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line-2 bg-panel-2 px-3 py-2 no-underline hover:bg-btn-hover max-[640px]:col-start-1 max-[640px]:row-start-2 max-[640px]:justify-self-start"
          onClick={back}
        >
          {t("table")}
        </button>
        <select
          className="ml-2 min-h-11 cursor-pointer rounded-md border border-line-2 bg-panel px-1.5 py-1 text-[11px]! text-muted! hover:text-text! max-[640px]:col-start-2 max-[640px]:row-start-2 max-[640px]:ml-0 max-[640px]:justify-self-end"
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
      <main className="public-main mt-5 grid gap-3.5">
        <div className="public-count flex items-baseline gap-2 rounded-[14px] border border-line bg-panel p-4">
          <b className="text-[clamp(44px,8vw,72px)] leading-none tracking-[-0.05em]">
            {view.living}
          </b>
          <span className="text-[14px] text-muted">
            {t("alive")} / {view.total}
          </span>
        </div>
        <section className="public-card rounded-[14px] border bg-panel p-4 border-line">
          <span className="text-[14px] font-[650] uppercase tracking-[0.13em] text-muted">
            {t("morning")}
          </span>
          <h2 className="mb-2 mt-1 text-[clamp(20px,3vw,28px)]">
            {view.deaths.length ? t("died") : t("noDeaths")}
          </h2>
          {view.deaths.length ? (
            <p className="public-names text-[16px] text-muted">{view.deaths.join(" · ")}</p>
          ) : null}
          <p className="public-note text-[11px] text-muted">{t("publicHint")}</p>
        </section>
        {view.winner ? (
          <section className="public-card rounded-[14px] border bg-panel p-4 border-btn-accent-border bg-public-winner-bg">
            <span className="text-[14px] font-[650] uppercase tracking-[0.13em] text-muted">
              {t("winner")}
            </span>
            <h2 className="mb-2 mt-1 text-[clamp(20px,3vw,28px)]">
              {view.winner.team === "good" ? t("winnerGood") : t("winnerEvil")}
            </h2>
            <p className="public-note text-[11px] text-muted">{t("publicHint")}</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
