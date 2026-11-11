// The first native screen. It is read-only: the filter and the language are UI
// preferences, and nothing here dispatches a command or writes the saved game.
import { useEffect, useState } from "react";
import type { Role } from "../../core/model/types.ts";
import { Button } from "../components/button.tsx";
import { RoleToken } from "../components/role-token.tsx";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

type ScenarioKey = "tb" | "bmr" | "snv" | "all";

const TB_IDS = [
  "washerwoman", "librarian", "investigator", "chef", "empath",
  "fortuneteller", "undertaker", "monk", "ravenkeeper", "virgin",
  "slayer", "soldier", "mayor", "butler", "saint", "recluse", "drunk",
  "poisoner", "spy", "baron", "scarletwoman", "imp"
];

const BMR_IDS = [
  "chambermaid", "courtier", "exorcist", "fool", "gambler", "gossip",
  "grandmother", "innkeeper", "minstrel", "pacifist", "professor", "sailor",
  "tealady", "goon", "lunatic", "moonchild", "tinker", "assassin",
  "devilsadvocate", "godfather", "mastermind", "po", "pukka", "shabaloth",
  "zombuul"
];

const SNV_IDS = [
  "artist", "clockmaker", "dreamer", "flowergirl", "juggler", "mathematician",
  "oracle", "philosopher", "sage", "savant", "seamstress", "snakecharmer",
  "towncrier", "barber", "klutz", "mutant", "sweetheart", "cerenovus",
  "eviltwin", "pithag", "witch", "fanggu", "nodashii", "vigormortis", "vortox"
];

const TRAVELLER_IDS = ["scapegoat", "gunslinger", "beggar", "bureaucrat", "thief"];
const STANDARD_IDS = TB_IDS.concat(BMR_IDS, SNV_IDS);
const SHEET_IDS = STANDARD_IDS.concat(TRAVELLER_IDS);

// The sheet filter is a reading preference: it never touches game setup.
const SCENARIOS: Record<ScenarioKey, readonly string[]> = { tb: TB_IDS, bmr: BMR_IDS, snv: SNV_IDS, all: STANDARD_IDS };
const SCENARIO_ORDER: readonly ScenarioKey[] = ["tb", "bmr", "snv", "all"];
const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  tb: "sheetScenarioTb",
  bmr: "sheetScenarioBmr",
  snv: "sheetScenarioSnv",
  all: "sheetScenarioAll"
};
const SCENARIO_KEY = "pg.sheetScenario";
const TRAVELLERS_KEY = "pg.sheetTravellers";

const TEAMS = ["townsfolk", "outsider", "minion", "demon"] as const;
const LANGS = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "az", label: "AZ" }
] as const;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface SheetScreenProps {
  lang: string;
}

export function SheetScreen({ lang }: SheetScreenProps) {
  const ports = useShellPorts();
  const game = useGame(ports.game);
  const [attempt, setAttempt] = useState(0);
  const [catalog, setCatalog] = useState<Role[] | null>(() => ports.locale.current() === lang ? ports.roles.all() : null);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<ScenarioKey>(() => {
    const saved = ports.prefs.read(SCENARIO_KEY);
    if (saved && Object.hasOwn(SCENARIOS, saved)) return saved as ScenarioKey;
    const scriptId = game.state.script?.id;
    return scriptId === "bmr" || scriptId === "snv" ? scriptId : "tb";
  });
  const [showTravellers, setShowTravellers] = useState(() => ports.prefs.read(TRAVELLERS_KEY) === "true");

  useEffect(() => {
    let alive = true;
    setError(null);
    const apply = () => {
      ports.locale.use(lang);
      setCatalog(ports.roles.all());
    };
    if (ports.locale.current() === lang) {
      apply();
      return () => { alive = false; };
    }
    setCatalog(null);
    ports.locale.load(lang)
      .then(() => { if (alive) apply(); })
      .catch((failure: unknown) => { if (alive) setError(messageOf(failure)); });
    return () => { alive = false; };
  }, [lang, attempt, ports]);

  const chooseScenario = (next: ScenarioKey) => {
    if (next === scenario) return;
    setScenario(next);
    ports.prefs.write(SCENARIO_KEY, next);
  };

  const toggleTravellers = () => {
    const next = !showTravellers;
    setShowTravellers(next);
    ports.prefs.write(TRAVELLERS_KEY, String(next));
  };

  const byId = new Map((catalog ?? []).map((role) => [role.id, role]));
  const standard = SCENARIOS[scenario].map((id) => byId.get(id)).filter((role): role is Role => role !== undefined);
  const missing = catalog ? SHEET_IDS.filter((id) => !byId.has(id)) : [];
  const travellers = TRAVELLER_IDS.map((id) => byId.get(id)).filter((role): role is Role => role !== undefined);
  const summaryCount = SCENARIOS[scenario].length;
  const summary = `${ports.strings.t(SCENARIO_LABELS[scenario])} · ${summaryCount} ${ports.strings.roleCount(summaryCount)}`;

  return (
    <div className="sheet-page" aria-busy={catalog === null}>
      <header className="sheet-head">
        <div className="sheet-brand">
          <img className="brand-lockup" src={ports.assets.url("grimoria-logo.svg")} alt="Grimoria" />
          <div>
            <h1>{ports.strings.t("roleSheet")}</h1>
            <p>{ports.strings.t("roleSheetIntro")}</p>
            <p className="sheet-summary" data-sheet-summary="" aria-live="polite">{summary}</p>
          </div>
        </div>
        <nav className="sheet-nav" aria-label={ports.strings.t("roleSheet")}>
          <a className="btn" href={ports.router.path("table")}>{ports.strings.t("table")}</a>
          <a className="btn" href={ports.router.path("help")}>{ports.strings.t("help")}</a>
          <span className="sheet-langs">
            {LANGS.map((item) => (
              <a
                key={item.code}
                className={lang === item.code ? "btn is-on" : "btn"}
                href={ports.router.path("sheet/" + item.code)}
                aria-current={lang === item.code ? "page" : undefined}
              >{item.label}</a>
            ))}
          </span>
        </nav>
        <div className="sheet-filters" data-sheet-filters="">
          <span className="label" id="sheet-scenario-label">{ports.strings.t("sheetScenario")}</span>
          <div className="sheet-scenario-group" role="group" aria-labelledby="sheet-scenario-label">
            {SCENARIO_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={id === scenario ? "btn sheet-scenario-btn is-on" : "btn sheet-scenario-btn"}
                data-scenario={id}
                aria-pressed={id === scenario}
                onClick={() => chooseScenario(id)}
              >
                {ports.strings.t(SCENARIO_LABELS[id])}
                <span className="sheet-filter-count">{SCENARIOS[id].length}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={showTravellers ? "btn sheet-travellers-btn is-on" : "btn sheet-travellers-btn"}
            data-travellers=""
            aria-pressed={showTravellers}
            onClick={toggleTravellers}
          >
            {ports.strings.t("sheetTravellersToggle")}
            <span className="sheet-filter-count">{TRAVELLER_IDS.length}</span>
          </button>
        </div>
      </header>

      {error ? (
        <div className="host-alert is-bad" role="alert">
          <p>{ports.strings.t("screenFailed")}</p>
          <p>{error}</p>
          <Button onClick={() => setAttempt((value) => value + 1)}>{ports.strings.t("retry")}</Button>
        </div>
      ) : null}

      {missing.length ? <div className="host-alert is-bad">{`Нет данных для ролей: ${missing.join(", ")}.`}</div> : null}

      <main className="sheet-sections" data-sheet-sections="">
        {TEAMS.map((team) => {
          const roles = standard.filter((role) => role.team === team);
          if (!roles.length) return null;
          return (
            <section key={team} className="sheet-team" data-team={team}>
              <div className="sheet-team-head">
                <span className="sheet-team-dot" aria-hidden="true" />
                <h2>{ports.strings.teamText(team)}</h2>
                <span className="sheet-team-count">{roles.length}</span>
              </div>
              <div className="sheet-grid">
                {roles.map((role) => (
                  <RoleToken key={role.id} role={role} image={ports.roles.image(role)} />
                ))}
              </div>
            </section>
          );
        })}
        {showTravellers && travellers.length ? (
          <div className="sheet-travellers" id="sheet-travellers">
            <p className="sheet-travellers-note">{ports.strings.t("sheetTravellersNote")}</p>
            <section className="sheet-team" data-team="traveller">
              <div className="sheet-team-head">
                <span className="sheet-team-dot" aria-hidden="true" />
                <h2>{ports.strings.teamText("traveller")}</h2>
                <span className="sheet-team-count">{travellers.length}</span>
              </div>
              <div className="sheet-grid">
                {travellers.map((role) => (
                  <RoleToken key={role.id} role={role} image={ports.roles.image(role)} />
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </main>

      <footer className="sheet-foot">
        <p>{ports.strings.t("nightExceptFirst")}</p>
        <p>{ports.strings.t("roleSheetHint")}</p>
      </footer>
    </div>
  );
}
