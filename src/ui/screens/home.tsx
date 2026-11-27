// A session entry and an index of the three official character sheets.
import { nightSequence } from "../../core/model/rules.ts";
import type { Role } from "../../core/model/types.ts";
import { ArcaneAppBar } from "../components/arcane/index.ts";
import { useShellPorts } from "../ports.ts";
import { sheetPath } from "../sheet-route.ts";
import { useGame } from "../store/use-game.ts";
import { APP_VERSION } from "../version.ts";

const REFERENCE_LINKS = [
  ["reference", "referenceNav"],
  ["sheet", "roleSheet"],
  ["help", "help"],
] as const;

const EDITIONS = [
  { id: "tb", name: "sheetScenarioTb", emblem: "imp", ink: "text-townsfolk" },
  { id: "bmr", name: "sheetScenarioBmr", emblem: "zombuul", ink: "text-demon" },
  { id: "snv", name: "sheetScenarioSnv", emblem: "vortox", ink: "text-minion" },
] as const;

export function HomeScreen() {
  const ports = useShellPorts();
  const { state } = useGame(ports.game);
  const { t, roleCount } = ports.strings;
  const resume = state.phase !== "setup";
  const scenarios = ports.roles.all().filter((role) => role.team !== "traveller");
  const order = nightSequence(1, "tb")
    .map((id) => ports.roles.byId(id))
    .filter((role): role is Role => role !== null);
  const start = (
    <a
      className={resume ? "btn" : "btn btn--accent"}
      data-act="home-start"
      href={ports.router.path("bag")}
    >
      {t("homeStart")}
    </a>
  );
  return (
    <>
      <ArcaneAppBar current="home" />
      <main className="relative isolate min-h-[calc(100dvh-3.5rem)] bg-crypt text-text">
        <div
          aria-hidden="true"
          className="px-dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 text-amber opacity-40 [mask-image:linear-gradient(140deg,#000,transparent_70%)]"
        />
        <div className="mx-auto max-w-[1280px] px-5 pb-10 min-[780px]:px-10">
          <div className="grid items-center gap-8 border-b border-edge py-8 min-[780px]:grid-cols-[1.05fr_1fr] min-[780px]:gap-12 min-[780px]:py-16">
            <header className="min-w-0">
              <h1 className="max-w-[14ch] font-pixel text-[clamp(50px,6.6vw,96px)] leading-[.92] font-bold text-balance uppercase">
                {t("homeTitle")}
              </h1>
              <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-muted">
                {t("homeLead")}
              </p>
              {resume && (
                <p className="mt-5 flex flex-wrap items-center gap-x-2 border-l-2 border-amber pl-3 text-sm">
                  <strong>
                    {state.phase === "night"
                      ? t("night") + " " + state.night.number
                      : state.phase === "day"
                        ? t("day") + " " + state.day.number
                        : state.phase === "over"
                          ? t("gameOver")
                          : t("setup")}
                  </strong>
                  {state.script?.name && (
                    <span className="break-words text-muted">{state.script.name}</span>
                  )}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                {resume ? (
                  <>
                    <a
                      className="btn btn--accent"
                      data-act="home-secondary"
                      href={ports.router.path("table")}
                    >
                      {t(state.phase === "over" ? "review" : "homeContinueCase")}
                    </a>
                    {start}
                  </>
                ) : (
                  <>
                    {start}
                    <a className="btn" data-act="home-secondary" href={ports.router.path("demo")}>
                      {t("homeRunDemo")}
                    </a>
                  </>
                )}
              </div>
            </header>
            <section aria-labelledby="home-scripts" className="min-w-0">
              <h2 id="home-scripts" className="mb-3 font-pixel text-[28px] font-bold leading-tight">
                {t("scriptOfficial")}
              </h2>
              <div className="divide-y divide-edge border-y border-edge">
                {EDITIONS.map((edition) => {
                  const count = scenarios.filter((role) => role.edition === edition.id).length;
                  const role = ports.roles.byId(edition.emblem);
                  return (
                    <article key={edition.id}>
                      <a
                        className="group grid min-h-20 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 bg-crypt-2 px-3 py-2 transition-colors hover:bg-crypt-3 focus-visible:bg-crypt-3 min-[780px]:min-h-24 min-[780px]:px-5"
                        href={ports.router.path(sheetPath(ports.locale.current(), edition.id))}
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-14 place-items-center rounded-full border-2 border-edge-2 bg-label p-1.5"
                        >
                          {role && (
                            <img
                              alt=""
                              className="size-full object-contain"
                              src={ports.roles.image(role)}
                            />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-pixel text-[clamp(23px,2.5vw,34px)] font-bold leading-none">
                            {t(edition.name)}
                          </span>
                          <span className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                            <span className={edition.ink}>{edition.id.toUpperCase()}</span>
                            <span aria-hidden="true">·</span>
                            {count} {roleCount(count)}
                          </span>
                        </span>
                        <span aria-hidden="true" className="text-xl text-accent-text">
                          →
                        </span>
                      </a>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
          <div className="grid items-start gap-6 py-6 min-[780px]:grid-cols-[1.05fr_1fr] min-[780px]:gap-12">
            <section>
              <h2 className="mb-2 font-pixel text-[26px] font-bold">{t("navGroupReference")}</h2>
              <div className="flex flex-wrap gap-x-6">
                {REFERENCE_LINKS.map(([route, label]) => (
                  <a
                    key={route}
                    className="inline-flex min-h-11 items-center gap-2 font-medium text-accent-text underline-offset-4 hover:underline"
                    href={ports.router.path(route)}
                  >
                    {t(label)} <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </section>
            <details className="border-y border-edge">
              <summary className="cursor-pointer py-4 font-medium">
                {t("firstNightList")} · {t("sheetScenarioTb")}
              </summary>
              <ol className="mb-4 grid list-inside list-decimal gap-x-4 gap-y-1 pl-1 text-sm leading-6 text-muted sm:grid-cols-2">
                {order.map((role) => (
                  <li key={role.id}>{role.name}</li>
                ))}
              </ol>
            </details>
          </div>
          <footer className="flex flex-wrap items-center gap-x-4 border-t border-edge text-xs text-muted">
            <span>{t("homeOfflineLead")}</span>
            <a
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
              href={ports.router.path("changelog")}
            >
              Grimoria v{APP_VERSION}
            </a>
          </footer>
        </div>
      </main>
    </>
  );
}
