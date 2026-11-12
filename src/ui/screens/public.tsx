// Public line: read-only, no roles, bluffs, notes, effects or hidden state.
// Styling is Tailwind only; `.public*` rules are gone from `css/host.css`.
import { useEffect } from "react";
import { publicGameView } from "../../core/model/state.ts";
import { ArcaneAppBar } from "../components/arcane/app-bar.tsx";
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
    <>
      <ArcaneAppBar current="public" />
      <div className="public min-h-[calc(100dvh-56px)] bg-crypt mx-auto w-[min(980px,100%)] px-4 pt-4.5 pb-10 max-[640px]:p-[12px_10px_32px]">
        <header className="public-head flex items-start justify-between gap-3 border-b border-edge pb-3 max-[640px]:grid max-[640px]:grid-cols-[1fr_auto] max-[640px]:gap-2">
          <div className="max-[640px]:col-span-2">
            <p className="m-0 text-[9.5px] font-[650] uppercase tracking-[.18em] text-brass">
              {t("publicScreen")}
            </p>
            <h1 className="my-1 font-role text-[clamp(28px,5vw,46px)] leading-[1.05] tracking-[-0.02em] text-text">
              {state.script ? state.script.name : ""}
            </h1>
            <p className="public-phase m-0 text-[13px] text-amber">{phaseText}</p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-sm border border-edge-2 bg-crypt-3 px-3 py-2 text-[12px] text-text no-underline hover:bg-crypt-2 max-[640px]:col-start-1 max-[640px]:row-start-2 max-[640px]:justify-self-start"
            onClick={back}
          >
            {t("table")}
          </button>
          <select
            className="ml-2 min-h-11 cursor-pointer rounded-sm border border-edge-2 bg-crypt-2 px-1.5 py-1 text-[11px] text-muted hover:text-text max-[640px]:col-start-2 max-[640px]:row-start-2 max-[640px]:ml-0 max-[640px]:justify-self-end"
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
          <div className="public-count flex items-baseline gap-3 rounded-md border border-edge bg-crypt-2 p-4 shadow-deep">
            <b className="font-role text-[clamp(44px,8vw,72px)] leading-none tracking-[-0.03em] text-text">
              {view.living}
            </b>
            <span className="text-[14px] text-muted">
              {t("alive")} / {view.total}
            </span>
          </div>
          <section className="public-card rounded-md border border-edge bg-crypt-2 p-4">
            <span className="text-[9.5px] font-[650] uppercase tracking-[.18em] text-brass">
              {t("morning")}
            </span>
            <h2 className="mb-2 mt-1 font-role text-[clamp(20px,3vw,28px)] leading-tight text-text">
              {view.deaths.length ? t("died") : t("noDeaths")}
            </h2>
            {view.deaths.length ? (
              <p className="public-names m-0 text-[16px] text-muted">{view.deaths.join(" · ")}</p>
            ) : null}
            <p className="public-note m-0 mt-2 text-[11px] text-muted">{t("publicHint")}</p>
          </section>
          {view.winner ? (
            <section className="public-card rounded-md border border-amber-dim bg-parchment p-4 text-ink shadow-glow">
              <span className="text-[9.5px] font-[650] uppercase tracking-[.18em] text-ink-2">
                {t("winner")}
              </span>
              <h2 className="mb-2 mt-1 font-role text-[clamp(20px,3vw,28px)] leading-tight text-ink">
                {view.winner.team === "good" ? t("winnerGood") : t("winnerEvil")}
              </h2>
              <p className="public-note m-0 mt-2 text-[11px] text-ink-2">{t("publicHint")}</p>
            </section>
          ) : null}
        </main>
      </div>
    </>
  );
}
