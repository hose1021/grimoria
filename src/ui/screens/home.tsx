// The welcome page: the store front. A real first night stands on the shelf as
// rental tapes, the scenarios are the staff picks, and the one yellow action
// opens a game. It never changes the saved game.
import { nightSequence } from "../../core/model/rules.ts";
import { ArcaneAppBar } from "../components/arcane/index.ts";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

const SAMPLE_DEATH = { seat: 7, roleId: "butler" } as const;
const TEAM_SPINE: Record<string, string> = {
  townsfolk: "bg-townsfolk",
  outsider: "bg-outsider",
  minion: "bg-minion",
  demon: "bg-demon",
  traveller: "bg-traveller",
};

export function HomeScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const state = snapshot.state;
  const t = ports.strings.t;
  const live = state.phase !== "setup";
  const go = (route: string) => ports.router.go(route);

  const firstNight = nightSequence(1, "tb")
    .map((id) => ports.roles.byId(id))
    .filter((role) => role !== null)
    .slice(0, 5);
  const deathRole = ports.roles.byId(SAMPLE_DEATH.roleId);
  const all = ports.roles
    .all()
    .filter(
      (role) =>
        role.team !== "traveller" &&
        (role.edition === "tb" || role.edition === "bmr" || role.edition === "snv"),
    );
  const editions = [
    { id: "tb", label: "Trouble Brewing", tone: "bg-tape-yellow" },
    { id: "bmr", label: "Bad Moon Rising", tone: "bg-tape-red" },
    { id: "snv", label: "Sects & Violets", tone: "bg-tape-purple" },
  ].map((edition) => ({
    ...edition,
    count: all.filter((role) => role.edition === edition.id).length,
  }));

  return (
    <>
      <ArcaneAppBar current="home" />
      <main className="mx-auto w-[min(1320px,100%)] px-4 pb-14 pt-5 min-[900px]:px-6 min-[900px]:pt-8">
        <section className="grid items-start gap-8 min-[980px]:grid-cols-[1.02fr_1fr] min-[980px]:gap-10">
          <div className="min-w-0">
            <h1 className="marquee text-[clamp(42px,7.2vw,98px)] text-text">{t("homeTitle")}</h1>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.55] text-muted">
              {t("homeLead")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn--accent min-h-12 px-6 !text-[16px]"
                onClick={() => go("/bag")}
              >
                {t("homeStart")}
              </button>
              {live ? (
                <button
                  type="button"
                  className="btn min-h-12 border-tape-blue px-5 !text-[#9dc0ff] hover:!border-tape-blue hover:!bg-tape-blue/10"
                  onClick={() => go("/table")}
                >
                  {t("homeContinueCase")}
                </button>
              ) : (
                <button type="button" className="btn min-h-12 px-5" onClick={() => go("/demo")}>
                  {t("homeRunDemo")}
                </button>
              )}
            </div>

            <div className="label-mono mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-edge py-3 text-[10px] text-muted">
              <span className="rec-dot shrink-0" aria-hidden="true" />
              <span>{editions.length} сценария</span>
              <span aria-hidden="true" className="max-[520px]:hidden">
                ·
              </span>
              <span>
                {all.length} {ports.strings.roleCount(all.length)}
              </span>
              <span aria-hidden="true" className="max-[520px]:hidden">
                ·
              </span>
              <span>{t("homeOffline")}</span>
              <span aria-hidden="true" className="max-[520px]:hidden">
                ·
              </span>
              <span>RU EN AZ</span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="relative rounded-[3px] border-2 border-edge bg-shelf px-4 pb-0 pt-5">
              <span className="label-mono absolute -top-px left-4 -translate-y-1/2 bg-crypt px-2 text-[9.5px] text-amber">
                {t("homeSampleNight")}
              </span>
              <ol className="m-0 grid list-none grid-cols-3 items-end gap-2.5 p-0">
                {firstNight.map((role, index) => (
                  <li key={role.id} className="rise min-w-0">
                    <article className="tape-box flex h-full flex-col">
                      <span
                        className={`h-1.5 w-full ${TEAM_SPINE[role.team] ?? "bg-edge-2"}`}
                        aria-hidden="true"
                      />
                      <div className="relative flex flex-1 items-center justify-center px-1.5 py-2.5">
                        <span className="label-mono absolute left-1 top-0.5 text-[8px] text-muted/70">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <img
                          className="h-12 w-full object-contain min-[520px]:h-16"
                          src={ports.roles.image(role)}
                          alt=""
                          aria-hidden="true"
                        />
                      </div>
                      <div className="tape-sticker flex items-center justify-center px-1.5 py-1">
                        <b className="line-clamp-2 min-w-0 break-words hyphens-auto text-center text-[9px] leading-[1.1]">
                          {role.name}
                        </b>
                      </div>
                    </article>
                  </li>
                ))}
                <li className="rise min-w-0">
                  <article className="tape-box flex h-full flex-col border-crimson-dim">
                    <span className="h-1.5 w-full bg-tape-red" aria-hidden="true" />
                    <div className="flex flex-1 items-center justify-center px-1.5 py-2.5">
                      {deathRole ? (
                        <img
                          className="h-12 w-full object-contain opacity-40 grayscale min-[520px]:h-16"
                          src={ports.roles.image(deathRole)}
                          alt=""
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                    <div className="tape-sticker flex items-center justify-center gap-1 px-1.5 py-1">
                      <b className="line-clamp-2 min-w-0 break-words hyphens-auto text-center text-[9px] leading-[1.1] line-through decoration-2">
                        {deathRole?.name ?? ""}
                      </b>
                      <span className="shrink-0 text-[9px] opacity-60">✕</span>
                    </div>
                  </article>
                </li>
              </ol>
              <div className="h-2.5 border-t border-edge-2 bg-[#0a0a0c]" aria-hidden="true" />
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <p className="m-0 max-w-[34ch] text-[11.5px] leading-[1.45] text-muted">
                {t("homeSynthetic")}
              </p>
              <span className="tape-sticker inline-block shrink-0 -rotate-2 px-3 py-2 text-[9px] leading-[1.15]">
                <span className="block text-[13px] font-semibold">BE KIND</span>
                REWIND
              </span>
            </div>

            <div className="tape-box mt-4 flex items-stretch gap-3 p-2.5">
              <span className="w-1.5 shrink-0 bg-tape-blue" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="label-mono text-[9px] text-muted">MEMBERSHIP</span>
                <p className="marquee m-0 mt-0.5 text-[17px] text-text">{t("homeMemberTitle")}</p>
                <p className="m-0 mt-0.5 text-[12px] leading-[1.4] text-muted">
                  {t("homeMemberLead")}
                </p>
              </div>
              <span
                className="barcode h-10 w-16 shrink-0 self-center border border-edge-2"
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="home-staff-title">
          <h2
            id="home-staff-title"
            className="marquee m-0 flex items-center gap-3 text-[22px] text-text"
          >
            {t("homeStaffPicks")}
            <span className="h-[2px] flex-1 bg-edge" aria-hidden="true" />
          </h2>
          <ul className="m-0 mt-3 grid list-none gap-3 p-0 min-[720px]:grid-cols-3">
            {editions.map((edition) => (
              <li key={edition.id}>
                <article className="tape-box flex items-stretch gap-3 p-2.5">
                  <span className={`w-1.5 shrink-0 ${edition.tone}`} aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="label-mono text-[9px] text-muted">{edition.id}</span>
                      <h3 className="marquee m-0 mt-0.5 truncate text-[19px] text-text">
                        {edition.label}
                      </h3>
                    </div>
                    <span className="shrink-0 text-right">
                      <b className="marquee block text-[26px] leading-none text-amber">
                        {edition.count}
                      </b>
                      <span className="label-mono text-[8.5px] text-muted">{t("roles")}</span>
                    </span>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-10 grid gap-4 border-t border-edge pt-4 min-[760px]:grid-cols-2"
          aria-labelledby="home-how-title"
        >
          <h2 id="home-how-title" className="sr-only">
            {t("homeHow")}
          </h2>
          <div>
            <h3 className="marquee m-0 text-[17px] text-text">{t("homeHow")}</h3>
            <p className="m-0 mt-1.5 max-w-[56ch] text-[13.5px] leading-[1.55] text-muted">
              {t("homeSupportLead")}
            </p>
          </div>
          <div className="min-[760px]:border-l min-[760px]:border-edge min-[760px]:pl-4">
            <h3 className="marquee m-0 text-[17px] text-text">{t("homeOffline")}</h3>
            <p className="m-0 mt-1.5 max-w-[56ch] text-[13.5px] leading-[1.55] text-muted">
              {t("homeOfflineLead")}
            </p>
          </div>
        </section>

        <section className="mt-8 flex flex-wrap items-center gap-2">
          {[
            ["MODE", "OFFLINE"],
            ["SCRIPTS", String(editions.length)],
            ["ROLES", String(all.length)],
            ["LANGS", "RU EN AZ"],
          ].map(([key, value]) => (
            <span
              key={key}
              className="label-mono inline-flex items-center gap-2 border border-edge px-2.5 py-1.5 text-[10px] text-muted"
            >
              <span className="text-brass">{key}</span>
              {value}
            </span>
          ))}
        </section>

        <section className="mt-8">
          <div className="hazard h-2" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-between gap-4 bg-tape-yellow px-5 py-5">
            <p className="m-0 max-w-[58ch] text-[15px] font-medium leading-[1.5] text-[#101010]">
              {t("homeFormLead")}
            </p>
            <button
              type="button"
              className="btn min-h-12 border-2 border-[#101010] !bg-[#101010] px-6 !text-[15px] !text-tape-yellow"
              onClick={() => go("/bag")}
            >
              {t("homeStart")}
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
