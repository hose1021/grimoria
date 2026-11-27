// The Storyteller reference: a discovery list at /reference and one reading
// surface per character at /reference/:roleId. The layout follows the supplied
// visual reference: one graphite card, hairlines between sections, no nested
// cards and no decorative chrome.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { RoleFacts, ReferenceTarget } from "../../../application/reference/role-facts.ts";
import type { Role } from "../../../core/model/types.ts";
import { useShellPorts } from "../../ports.ts";
import { APP_VERSION } from "../../version.ts";
import { inline } from "./inline.tsx";
import {
  loadReference,
  type ReferenceDataset,
  type ReferenceEntry,
  type ReferenceRule,
} from "./data.ts";

const EDITIONS = ["tb", "bmr", "snv"] as const;
const SCENARIO_KEYS: Record<string, string> = {
  tb: "sheetScenarioTb",
  bmr: "sheetScenarioBmr",
  snv: "sheetScenarioSnv",
};
const TEAM_TEXT: Record<string, string> = {
  townsfolk: "text-townsfolk",
  outsider: "text-outsider",
  minion: "text-minion",
  demon: "text-demon",
};
const TEAM_DOT: Record<string, string> = {
  townsfolk: "bg-townsfolk",
  outsider: "bg-outsider",
  minion: "bg-minion",
  demon: "bg-demon",
};
const TARGET_KEYS: Record<ReferenceTarget, string> = {
  none: "referenceNoTarget",
  "one-any": "referenceAnyPlayer",
  "one-other": "referenceOneOther",
  two: "referenceTwoPlayers",
  po: "referenceOneOrNobody",
};

function usesKey(ability: string): string {
  if (/once per game/i.test(ability)) return "referenceOncePerGame";
  if (/you start knowing/i.test(ability)) return "referenceAtStart";
  if (/each day/i.test(ability)) return "referenceEachDay";
  if (/each night/i.test(ability)) return "referenceEachNight";
  if (/the first time/i.test(ability)) return "referenceFirstTime";
  return "referencePassive";
}

function tokenText(tokens: readonly string[]): string {
  if (tokens.length === 0) return "—";
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts].map(([token, count]) => (count > 1 ? `${token} ×${count}` : token)).join(", ");
}

export interface ReferenceScreenProps {
  roleId: string | null;
}

export function ReferenceScreen({ roleId }: ReferenceScreenProps) {
  const ports = useShellPorts();
  const lang = ports.locale.current();
  const [query, setQuery] = useState("");
  const t = ports.strings.t;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [roleId]);

  const role = roleId ? ports.roles.byId(roleId) : null;

  if (!roleId)
    return (
      <ReferenceIndex lang={lang} onLang={ports.locale.change} query={query} onQuery={setQuery} />
    );
  if (!role)
    return (
      <div className={PAGE}>
        <div className="mx-auto w-full max-w-[792px] px-3 py-3 max-[480px]:px-2 max-[480px]:py-2">
          <div className={CARD}>
            <a className="text-[13px] text-ref-muted" href={ports.router.path("reference")}>
              ← {t("referenceBack")}
            </a>
            <p className="mt-6 text-[16px] text-ref-muted">{t("referenceNotFound")}</p>
          </div>
        </div>
      </div>
    );

  return <ReferenceDetail key={lang} role={role} lang={lang} onLang={ports.locale.change} />;
}

function ReferenceDetail({
  role,
  lang,
  onLang,
}: {
  role: Role;
  lang: string;
  onLang: (code: string) => void;
}) {
  const ports = useShellPorts();
  const [dataset, setDataset] = useState<ReferenceDataset | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const t = ports.strings.t;

  useEffect(() => {
    let alive = true;
    const file = lang === "ru" ? "reference.ru.json" : "reference.json";
    loadReference(ports.assets.url("assets/data/" + file))
      .then((next) => {
        if (alive) setDataset(next);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [ports, lang, attempt]);

  const entry = dataset?.roles[role.id];
  const facts = ports.reference.facts(role.id);
  return (
    <div className={PAGE}>
      <div className="mx-auto w-full max-w-[792px] px-3 py-3 max-[480px]:px-2 max-[480px]:py-2">
        <article className={`${CARD} max-[480px]:rounded-[12px]`}>
          <a
            className="mb-3 inline-flex min-h-8 items-center text-[13px] text-ref-dim hover:text-ref-muted"
            href={ports.router.path("reference")}
          >
            ← {t("referenceBack")}
          </a>
          <RoleHeader role={role} entry={entry} lang={lang} onLang={onLang} />
          <Section title={t("referenceAbility")}>
            <p className="m-0 text-[16px] leading-[26px]">{role.ability}</p>
            {role.firstNight == null && role.otherNight != null && (
              <p className="m-0 mt-3 text-[13px] leading-[20px] text-ref-dim">
                * {t("referenceOtherNightsOnly")}
              </p>
            )}
            {role.firstNight != null && role.otherNight == null && (
              <p className="m-0 mt-3 text-[13px] leading-[20px] text-ref-dim">
                * {t("referenceFirstNightOnly")}
              </p>
            )}
          </Section>
          {entry ? (
            <>
              <BasicInformation role={role} entry={entry} facts={facts} />
              <Section title={t("referenceHowToRun")}>
                <HowToRun rules={entry.rules} notes={facts?.noteKeys ?? []} />
              </Section>
              <Section title={t("referenceClarifications")}>
                <EngineBehavior rules={entry.rules} />
              </Section>
              <Section title={t("referenceSpecial")}>
                <SpecialConditions role={role} facts={facts} entry={entry} />
              </Section>
              <Section title={t("referenceInteractions")}>
                <Interactions entry={entry} />
              </Section>
              <Section title={t("referenceExamples")}>
                <Examples rules={entry.rules} />
              </Section>
              <QuickReference role={role} facts={facts} entry={entry} />
              <Sources entry={entry} lang={lang} />
            </>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm" role="status">
              {failed
                ? t("referenceLoadFailed")
                : dataset
                  ? t("referenceNone")
                  : t("screenLoading")}
              {failed && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setFailed(false);
                    setAttempt((value) => value + 1);
                  }}
                >
                  {t("retry")}
                </button>
              )}
            </div>
          )}
        </article>
        <ReferenceFooter />
      </div>
    </div>
  );
}

const PAGE = "min-h-dvh bg-ref-page text-ref-ink";
const CARD =
  "mx-auto w-full max-w-[792px] rounded-[16px] border border-ref-edge bg-ref-surface p-4";

function ReferenceFooter() {
  const ports = useShellPorts();
  const t = ports.strings.t;
  return (
    <p className="m-0 mt-3 text-[11px] leading-[18px] text-ref-dim">
      <span className="tabular-nums">Grimoria v{APP_VERSION}</span>
      {" · "}
      <a
        className="underline underline-offset-2 hover:text-ref-ink"
        href={ports.router.path("changelog")}
      >
        {t("changelog")}
      </a>
    </p>
  );
}

function Token({ role, size }: { role: Role; size: "lg" | "sm" }) {
  const ports = useShellPorts();
  const frame = size === "lg" ? "h-16 w-16 rounded-[10px] p-1" : "size-9 rounded-[7px] p-0.5";
  const face = size === "lg" ? "p-1.5" : "p-1";
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-ref-well ${frame}`}
      aria-hidden="true"
    >
      <span
        className={`flex h-full w-full items-center justify-center rounded-full bg-ref-token ${face}`}
      >
        <img className="h-full w-full object-contain" src={ports.roles.image(role)} alt="" />
      </span>
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 border-t border-ref-divider pt-6">
      <h2 className="m-0 mb-3 text-[16px] font-semibold leading-[26px]">{title}</h2>
      {children}
    </section>
  );
}

function RoleHeader({
  role,
  entry,
  lang,
  onLang,
}: {
  role: Role;
  entry: ReferenceEntry | undefined;
  lang: string;
  onLang: (code: string) => void;
}) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  const scenario = SCENARIO_KEYS[role.edition] ?? "sheetScenarioAll";
  return (
    <header>
      <div className="flex items-start gap-5">
        <Token role={role} size="lg" />
        <div className="min-w-0 pt-0.5">
          <h1 className="m-0 text-[20px] font-semibold leading-[26px]">{role.name}</h1>
          <p className="m-0 mt-1 text-[14px] leading-[20px] text-ref-muted">
            {entry?.name ?? role.id} · {t(scenario)}
          </p>
          <p className={`m-0 mt-1 text-[14px] leading-[20px] ${TEAM_TEXT[role.team] ?? ""}`}>
            {ports.strings.teamText(role.team)}
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-1" role="group" aria-label="Language">
        {["ru", "en", "az"].map((code) => (
          <button
            key={code}
            type="button"
            className={`min-h-11 cursor-pointer rounded-[6px] px-3 text-[13px] font-medium uppercase tracking-[.04em] ${
              lang === code ? "text-ref-ink" : "text-ref-dim hover:text-ref-muted"
            }`}
            data-lang={code}
            aria-pressed={lang === code}
            onClick={() => onLang(code)}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}

function InfoRows({
  rows,
  header,
}: {
  rows: ReadonlyArray<readonly [string, string]>;
  header?: readonly [string, string];
}) {
  return (
    <dl className="m-0 text-[15px] leading-[24px]">
      {header && (
        <div className="hidden grid-cols-2 gap-4 border-b border-ref-divider py-2.5 text-[14px] font-semibold text-ref-muted min-[520px]:grid">
          <dt>{header[0]}</dt>
          <dd className="m-0">{header[1]}</dd>
        </div>
      )}
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-2 gap-4 border-b border-ref-rule py-2.5 last:border-0 max-[519px]:grid-cols-1 max-[519px]:gap-0.5 max-[519px]:py-3"
        >
          <dt className="max-[519px]:text-[13px] max-[519px]:text-ref-muted">{label}</dt>
          <dd className="m-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BasicInformation({
  role,
  entry,
  facts,
}: {
  role: Role;
  entry: ReferenceEntry;
  facts: RoleFacts | null;
}) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  const ability = entry.ability;
  const entryUses = usesKey(ability);
  const target = TARGET_KEYS[facts?.target ?? "none"] ?? "referenceNoTarget";
  const tokens = Array.isArray(role.reminders)
    ? role.reminders.filter((token): token is string => typeof token === "string")
    : [];
  const rows: Array<[string, string]> = [
    [t("referenceSetup"), role.setup === true ? t("referenceYes") : t("referenceNo")],
    [t("referenceFirstWake"), role.firstNight != null ? t("referenceYes") : t("referenceNo")],
    [t("referenceOtherWake"), role.otherNight != null ? t("referenceYes") : t("referenceNo")],
    [t("referenceUses"), t(entryUses)],
    [t("referenceTarget"), t(target)],
    [t("referenceTokens"), tokenText(tokens)],
  ];
  return (
    <Section title={t("referenceBasic")}>
      <InfoRows rows={rows} header={[t("referenceParam"), t("referenceValue")]} />
    </Section>
  );
}

function HowToRun({ rules, notes }: { rules: readonly ReferenceRule[]; notes: readonly string[] }) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  if (notes.length === 0 && rules.length === 0)
    return <p className="m-0 text-[15px] text-ref-dim">—</p>;
  return (
    <div className="space-y-4">
      {notes.map((key) => (
        <p
          key={key}
          className="m-0 rounded-[8px] bg-ref-well px-3.5 py-3 text-[15px] leading-[24px]"
        >
          {t(key)}
        </p>
      ))}
      {rules.map((rule) => (
        <div key={rule.id}>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-[.08em] text-ref-dim">
            {rule.when}
          </p>
          <p className="m-0 mt-1 text-[16px] leading-[26px]">{inline(rule.decision)}</p>
        </div>
      ))}
    </div>
  );
}

function EngineBehavior({ rules }: { rules: readonly ReferenceRule[] }) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  if (rules.length === 0) return <p className="m-0 text-[15px] text-ref-dim">—</p>;
  return (
    <ul className="m-0 list-none space-y-4 p-0">
      {rules.map((rule) => (
        <li key={rule.id}>
          <p className="m-0 text-[12px] leading-[18px] text-ref-dim">
            {rule.id} ·{" "}
            {rule.status === "verified" ? t("referenceStatusVerified") : t("referenceStatusHost")}
          </p>
          <p className="m-0 mt-1 text-[15px] leading-[24px]">{inline(rule.behavior)}</p>
        </li>
      ))}
    </ul>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  if (items.length === 0) return <p className="m-0 text-[15px] text-ref-dim">—</p>;
  return (
    <ul className="m-0 list-none space-y-2.5 p-0">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5 text-[16px] leading-[26px]">
          <span className="select-none text-ref-dim">·</span>
          <span>{inline(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function SpecialConditions({
  role,
  facts,
  entry,
}: {
  role: Role;
  facts: RoleFacts | null;
  entry: ReferenceEntry;
}) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  const conditions: string[] = [];
  const ability = entry.ability;
  conditions.push(role.setup === true ? t("referenceSetupEffect") : t("referenceNoSetupEffect"));
  if (role.firstNight != null && role.otherNight == null) conditions.push(t("referenceWakesFirst"));
  else if (role.firstNight == null && role.otherNight != null)
    conditions.push(t("referenceWakesOther"));
  else if (role.firstNight == null && role.otherNight == null)
    conditions.push(t("referenceDoesNotWake"));
  if (usesKey(ability) === "referenceOncePerGame") conditions.push(t("referenceOncePerGameNote"));
  if (facts?.optional) conditions.push(t("referenceOptional"));
  if (facts?.canKill) conditions.push(t("referenceKills"));
  if (facts?.canResurrect) conditions.push(t("referenceResurrects"));
  if (facts?.registersToStoryteller) conditions.push(t("referenceRegistration"));
  const verified = entry.rules.filter((rule) => rule.status === "verified").length;
  const host = entry.rules.filter((rule) => rule.status === "host-choice").length;
  if (verified > 0) conditions.push(t("referenceVerifiedCount", { count: verified }));
  if (host > 0) conditions.push(t("referenceHostCount", { count: host }));
  return <Bullets items={conditions} />;
}

function Interactions({ entry }: { entry: ReferenceEntry }) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  if (entry.interactions.length === 0)
    return <p className="m-0 text-[15px] text-ref-dim">{t("referenceNoInteractions")}</p>;
  return (
    <ul className="m-0 list-none space-y-4 p-0">
      {entry.interactions.map((jinx) => {
        const other = ports.roles.byId(jinx.roleId);
        if (!other) return null;
        return (
          <li key={jinx.roleId} className="flex items-start gap-3">
            <Token role={other} size="sm" />
            <div className="min-w-0">
              <a
                className="text-[15px] font-semibold leading-[22px] hover:underline"
                href={ports.router.path("reference/" + other.id)}
              >
                {other.name}
              </a>
              <p className="m-0 mt-1 text-[15px] leading-[24px] text-ref-muted">
                {inline(jinx.reason)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Examples({ rules }: { rules: readonly ReferenceRule[] }) {
  const items = rules.flatMap((rule) => rule.examples).slice(0, 6);
  if (items.length === 0) return <p className="m-0 text-[15px] text-ref-dim">—</p>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-[10px] border border-ref-rule bg-ref-well px-3.5 py-3 text-[15px] leading-[24px]"
        >
          {inline(item)}
        </div>
      ))}
    </div>
  );
}

function QuickReference({
  role,
  facts,
  entry,
}: {
  role: Role;
  facts: RoleFacts | null;
  entry: ReferenceEntry;
}) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  const ability = entry.ability;
  const tokens = Array.isArray(role.reminders)
    ? role.reminders.filter((token): token is string => typeof token === "string")
    : [];
  const target = TARGET_KEYS[facts?.target ?? "none"] ?? "referenceNoTarget";
  const verified = entry.rules.filter((rule) => rule.status === "verified").length;
  const rows: Array<[string, string]> = [
    [t("referenceFirstNightOrder"), role.firstNight != null ? `#${role.firstNight}` : "—"],
    [t("referenceOtherNightOrder"), role.otherNight != null ? `#${role.otherNight}` : "—"],
    [t("referenceTarget"), t(target)],
    [t("referenceUses"), t(usesKey(ability))],
    [t("referenceTokens"), tokenText(tokens)],
    [t("referenceRulesVerified"), `${verified} / ${entry.rules.length}`],
  ];
  return (
    <Section title={t("referenceQuick")}>
      <InfoRows rows={rows} />
    </Section>
  );
}

function Sources({ entry, lang }: { entry: ReferenceEntry; lang: string }) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  return (
    <Section title={t("referenceSources")}>
      <div className="space-y-3 text-[15px] leading-[24px]">
        <p className="m-0 text-ref-muted">{entry.rules.map((rule) => rule.id).join(" · ")}</p>
        <a
          className="underline underline-offset-4"
          href={entry.url}
          target="_blank"
          rel="noreferrer"
        >
          {entry.name} · {t("referencePinned")} r{entry.oldid}
        </a>
      </div>
      {lang === "ru" && (
        <p className="m-0 mt-3 text-[12px] leading-[18px] text-ref-dim">
          {t("referenceTranslationNote")}
        </p>
      )}
    </Section>
  );
}

function ReferenceIndex({
  lang,
  onLang,
  query,
  onQuery,
}: {
  lang: string;
  onLang: (code: string) => void;
  query: string;
  onQuery: (value: string) => void;
}) {
  const ports = useShellPorts();
  const t = ports.strings.t;
  const roles = useMemo(() => {
    const list = ports.roles
      .all()
      .filter(
        (role) =>
          role.team !== "traveller" &&
          (role.edition === "tb" || role.edition === "bmr" || role.edition === "snv"),
      );
    const needle = query.trim().toLocaleLowerCase(lang);
    return needle
      ? list.filter((role) => role.name.toLocaleLowerCase(lang).includes(needle))
      : list;
  }, [ports, query, lang]);
  const grouped = EDITIONS.map((edition) => ({
    edition,
    roles: roles
      .filter((role) => role.edition === edition)
      .sort((left, right) => left.name.localeCompare(right.name, lang)),
  }));

  return (
    <div className={PAGE}>
      <div className="mx-auto w-full max-w-[792px] px-3 py-3 max-[480px]:px-2 max-[480px]:py-2">
        <a
          className="mb-3 inline-flex min-h-8 items-center text-[13px] text-ref-dim hover:text-ref-muted"
          href={ports.router.path("table")}
        >
          ← Grimoria
        </a>
        <article className={`${CARD} max-[480px]:rounded-[12px]`}>
          <header>
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[.14em] text-ref-dim">
              Grimoria
            </p>
            <h1 className="m-0 mt-2 text-[22px] font-semibold leading-[30px]">
              {t("referenceTitle")}
            </h1>
            <p className="m-0 mt-2 max-w-[60ch] text-[14px] leading-[22px] text-ref-muted">
              {t("referenceIntro")}
            </p>
            <div className="mt-5 flex flex-col items-stretch gap-3 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
              <input
                className="min-h-11 w-full rounded-[8px] border border-ref-edge bg-ref-well px-3 text-[14px] text-ref-ink placeholder:text-ref-dim focus:border-ref-muted focus:outline-none min-[560px]:max-w-[320px]"
                type="search"
                value={query}
                placeholder={t("referenceFilter")}
                onChange={(event) => onQuery(event.target.value)}
              />
              <div className="flex items-center gap-1" role="group" aria-label="Language">
                {["ru", "en", "az"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`min-h-11 cursor-pointer rounded-[6px] px-3 text-[13px] font-medium uppercase tracking-[.04em] ${
                      lang === code ? "text-ref-ink" : "text-ref-dim hover:text-ref-muted"
                    }`}
                    data-lang={code}
                    aria-pressed={lang === code}
                    onClick={() => onLang(code)}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </header>
          {grouped.map(({ edition, roles: group }) =>
            group.length ? (
              <section key={edition} className="mt-6 border-t border-ref-divider pt-6">
                <h2 className="m-0 mb-3 text-[16px] font-semibold leading-[26px]">
                  {t(SCENARIO_KEYS[edition] ?? "sheetScenarioAll")}
                </h2>
                <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0 min-[560px]:grid-cols-2">
                  {group.map((role) => (
                    <li key={role.id}>
                      <a
                        className="flex min-h-12 items-center gap-3 rounded-[8px] px-2 py-1.5 hover:bg-ref-well"
                        href={ports.router.path("reference/" + role.id)}
                      >
                        <Token role={role} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-medium leading-[20px]">
                            {role.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ref-muted">
                            <span
                              className={`size-1.5 rounded-full ${TEAM_DOT[role.team] ?? ""}`}
                            />
                            {ports.strings.teamText(role.team)}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
          {roles.length === 0 && (
            <p className="m-0 mt-6 text-[15px] text-ref-dim">{t("referenceNone")}</p>
          )}
        </article>
        <ReferenceFooter />
      </div>
    </div>
  );
}
