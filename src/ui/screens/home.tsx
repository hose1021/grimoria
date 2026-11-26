// The welcome page: a 1-bit print-out of the three official scripts and the
// Trouble Brewing first night, with one blue action per viewport. It reads the
// catalog and the saved game; it never changes the game.
import type { ReactNode } from "react";
import { nightSequence } from "../../core/model/rules.ts";
import type { Role } from "../../core/model/types.ts";
import { cx } from "../components/arcane/classes.ts";
import { ArcaneAppBar } from "../components/arcane/index.ts";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";
import { APP_VERSION } from "../version.ts";

const TEAMS = ["townsfolk", "outsider", "minion", "demon"] as const;
type TeamKey = (typeof TEAMS)[number];

const TEAM_SWATCH: Record<TeamKey | "traveller", string> = {
  townsfolk: "bg-townsfolk",
  outsider: "bg-outsider",
  minion: "bg-minion",
  demon: "bg-demon",
  traveller: "bg-traveller",
};

const TEAM_INK: Record<TeamKey, string> = {
  townsfolk: "text-townsfolk",
  outsider: "text-outsider",
  minion: "text-minion",
  demon: "text-demon",
};

const SCRIPTS = ["tb", "bmr", "snv"] as const;
const SCRIPT_NAME: Record<(typeof SCRIPTS)[number], string> = {
  tb: "sheetScenarioTb",
  bmr: "sheetScenarioBmr",
  snv: "sheetScenarioSnv",
};
const SAMPLE: Record<(typeof SCRIPTS)[number], string[]> = {
  tb: ["washerwoman", "chef", "empath", "imp"],
  bmr: ["grandmother", "gossip", "assassin", "zombuul"],
  snv: ["clockmaker", "savant", "witch", "vortox"],
};

const HOME_ACTION =
  "inline-flex min-h-11 items-center justify-center gap-2 border-2 px-5 font-case text-[12px] leading-none tracking-[0.14em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2";

function RoleChip({ role, size = 32 }: { role: Role; size?: 24 | 32 }) {
  const ports = useShellPorts();
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center border border-edge bg-label",
        size === 24 ? "size-6" : "size-8",
      )}
      aria-hidden="true"
    >
      <img className="h-[82%] w-[82%] object-contain" src={ports.roles.image(role)} alt="" />
    </span>
  );
}

function HomePrimary({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      data-act="home-start"
      className={cx(HOME_ACTION, "border-amber-2 bg-amber text-white hover:bg-amber-2")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function HomeSecondary({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      data-act="home-secondary"
      className={cx(HOME_ACTION, "border-edge-2 text-text hover:border-muted hover:bg-crypt-2")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function HomeScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const state = snapshot.state;
  const t = ports.strings.t;
  const live = state.phase !== "setup";
  const go = (route: string) => ports.router.go(route);

  const all = ports.roles
    .all()
    .filter(
      (role) =>
        role.team !== "traveller" &&
        (role.edition === "tb" || role.edition === "bmr" || role.edition === "snv"),
    );

  const editions = SCRIPTS.map((id) => {
    const roles = all.filter((role) => role.edition === id);
    const teams: Record<TeamKey, number> = {
      townsfolk: roles.filter((role) => role.team === "townsfolk").length,
      outsider: roles.filter((role) => role.team === "outsider").length,
      minion: roles.filter((role) => role.team === "minion").length,
      demon: roles.filter((role) => role.team === "demon").length,
    };
    return {
      id,
      name: t(SCRIPT_NAME[id]),
      count: roles.length,
      teams,
      sample: SAMPLE[id]
        .map((roleId) => ports.roles.byId(roleId))
        .filter((role): role is Role => role !== null),
    };
  });

  const order = nightSequence(1, "tb")
    .map((id) => ports.roles.byId(id))
    .filter((role): role is Role => role !== null);

  return (
    <>
      <ArcaneAppBar current="home" />
      <main className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-crypt pb-16 text-text">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="px-dots absolute inset-0 text-amber opacity-50 [mask-image:radial-gradient(95%_80%_at_50%_38%,transparent_36%,#000_100%)]" />
          <div className="px-stars absolute inset-0 text-text opacity-25 [mask-image:linear-gradient(180deg,#000_0%,#000_380px,transparent_700px)]" />
        </div>
        <div className="relative mx-auto w-full max-w-[1240px] px-4 pt-14 min-[900px]:px-8 min-[900px]:pt-20">
          <header className="text-center">
            <h1 className="mx-auto max-w-[16ch] font-pixel text-[clamp(44px,7.2vw,96px)] leading-[0.88] font-bold tracking-[0.005em] text-balance uppercase">
              {t("homeTitle")}
            </h1>
            <p className="mx-auto mt-6 max-w-[54ch] text-[15px] leading-[24px] text-muted">
              {t("homeLead")}
            </p>
            <div className="mx-auto mt-8 flex w-full max-w-[360px] flex-col gap-2 min-[440px]:max-w-none min-[440px]:flex-row min-[440px]:justify-center">
              <HomePrimary onClick={() => go("/bag")}>{t("homeStart")}</HomePrimary>
              {live ? (
                <HomeSecondary onClick={() => go("/table")}>{t("homeContinueCase")}</HomeSecondary>
              ) : (
                <HomeSecondary onClick={() => go("/demo")}>{t("homeRunDemo")}</HomeSecondary>
              )}
            </div>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 label-mono text-[10px] text-muted">
              <span>
                <b className="font-normal text-text tabular-nums">{all.length}</b> {t("roles")}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">5–15 {t("players")}</span>
            </p>
          </header>

          <div className="relative mt-12">
            <div
              aria-hidden="true"
              className="px-dots pointer-events-none absolute -inset-x-6 -inset-y-10 text-amber opacity-60 [mask-image:radial-gradient(72%_72%_at_50%_50%,#000_0%,transparent_78%)]"
            />
            <section className="relative overflow-hidden border border-edge bg-crypt-2">
              <div className="flex items-center justify-between gap-3 border-b border-edge bg-crypt px-4 py-2.5">
                <h2 className="font-pixel text-[16px] leading-none font-bold uppercase">
                  {t("firstNightList")}
                </h2>
                <span className="label-mono truncate text-[10px] text-muted">
                  {t("sheetScenarioTb")} · {t("night")} 1
                </span>
              </div>
              <div aria-hidden="true" className="px-dither h-1.5 text-edge" />
              <ol className="m-0 grid list-none grid-cols-3 gap-px bg-edge p-0 min-[1100px]:grid-cols-9">
                {order.map((role, index) => (
                  <li
                    key={role.id}
                    className="px-print flex min-w-0 flex-col items-center gap-2 bg-crypt-2 px-2 py-4"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <span className="font-pixel text-[16px] leading-none tabular-nums text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <RoleChip role={role} />
                    <span className="w-full truncate text-center text-[11px] leading-[15px]">
                      {role.name}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section className="mt-14">
            <h2 className="text-center font-pixel text-[26px] leading-none font-bold uppercase">
              {t("scriptOfficial")}
            </h2>
            <div className="mt-6 grid gap-3 min-[760px]:grid-cols-3">
              {editions.map((edition) => {
                const scale = edition.count || 1;
                return (
                  <article key={edition.id} className="px-frame flex flex-col p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="label-mono text-[10px] text-muted">{edition.id}</span>
                      <span className="label-mono text-[10px] tabular-nums text-muted">
                        {edition.count} {t("roles")}
                      </span>
                    </div>
                    <h3 className="mt-3 font-pixel text-[26px] leading-[1.02] font-bold">
                      {edition.name}
                    </h3>

                    <div className="mt-5">
                      <div className="flex h-2.5 overflow-hidden bg-crypt" aria-hidden="true">
                        {TEAMS.map((team) => (
                          <span
                            key={team}
                            className={cx("px-stripe h-full", TEAM_INK[team])}
                            style={{ width: `${(edition.teams[team] / scale) * 100}%` }}
                          />
                        ))}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5">
                        {TEAMS.map((team) => (
                          <div key={team} className="flex items-center justify-between gap-2">
                            <dt className="flex min-w-0 items-center gap-2 text-[11px] text-muted">
                              <span
                                className={cx("size-2 shrink-0", TEAM_SWATCH[team])}
                                aria-hidden="true"
                              />
                              <span className="truncate">{t(team)}</span>
                            </dt>
                            <dd className="m-0 font-pixel text-[14px] leading-none tabular-nums">
                              {edition.teams[team]}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      {edition.sample.map((role) => (
                        <RoleChip key={role.id} role={role} />
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-end border-t border-edge pt-3">
                      <a
                        className="label-mono text-[10px] text-muted transition-colors hover:text-text"
                        href={ports.router.path("sheet")}
                      >
                        {t("roleList")} →
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-10 grid gap-7 border-t-2 border-edge pt-6 min-[760px]:grid-cols-[1fr_1fr_auto] min-[760px]:items-start">
            <div className="min-w-0">
              <h2 className="font-pixel text-[20px] leading-none font-bold uppercase">
                {t("homeHow")}
              </h2>
              <p className="mt-2 max-w-[44ch] text-[13px] leading-[20px] text-muted">
                {t("homeSupportLead")}
              </p>
            </div>
            <div className="min-w-0">
              <h2 className="font-pixel text-[20px] leading-none font-bold uppercase">
                {t("homeOffline")}
              </h2>
              <p className="mt-2 max-w-[44ch] text-[13px] leading-[20px] text-muted">
                {t("homeOfflineLead")}
              </p>
            </div>
            <div className="min-w-0 min-[760px]:self-center">
              <HomePrimary onClick={() => go("/bag")}>{t("homeStart")}</HomePrimary>
            </div>
          </section>

          <p className="mt-8 flex flex-wrap items-center gap-2 label-mono text-[10px] text-muted">
            <span className="tabular-nums">Grimoria v{APP_VERSION}</span>
            <span aria-hidden="true">·</span>
            <a className="transition-colors hover:text-text" href={ports.router.path("changelog")}>
              {t("changelog")}
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
