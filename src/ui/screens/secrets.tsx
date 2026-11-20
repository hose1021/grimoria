// Setup secrets: the Storyteller answers every setup obligation before the first
// night. The screen is one checksheet — an index of obligations and a single
// open obligation — so the host sees what is missing instead of a wall of equal
// editors. Every change is a command; the screen renders the published snapshot.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Player, RoleId, Team } from "../../core/model/types.ts";
import type { InfoRoleId, SetupInfoPatch } from "../../core/commands/contracts.ts";
import { secretsProjection } from "../../application/read-models/table.ts";
import {
  ROLE_REMINDERS_RU,
  isBmrScript,
  isManualScript,
  isSnvScript,
  roleLabel,
  roleTeam,
} from "../../core/model/rules.ts";
import { roleSupportEntries, scriptSupport, type SupportLevel } from "../../core/model/support.ts";
import { SetupShell } from "../components/setup-shell.tsx";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";
import {
  infoRoleChoices,
  librarianZeroLegal,
  obligationDone,
  reminderRows,
  zeroShown,
} from "./secrets-options.ts";
import { commandRejectionText, setupProblemText } from "./setup-messages.ts";

const INFO_ROLES: Array<[RoleId, Team]> = [
  ["washerwoman", "townsfolk"],
  ["librarian", "outsider"],
  ["investigator", "minion"],
];

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.16em] text-brass";
const NOTE = "secrets-note m-0 text-[13px] leading-relaxed text-muted";
const PANEL = "secrets-block min-w-0 rounded-md border border-edge bg-crypt-2 p-4";
const TAG =
  "secrets-tag rounded-sm border border-amber-dim px-1.5 py-0.5 text-[11px] uppercase tracking-[0.1em] text-amber";
const INDEX_ITEM =
  "secrets-index-item flex min-h-11 w-full items-center justify-between gap-2 rounded-sm border px-2.5 py-2 text-left text-[12.5px] max-lg:w-auto";
const SELECT = "field w-full max-w-full sm:w-auto";
const MISSING = "border-amber ring-1 ring-amber/40";

interface SecretsEntry {
  id: string;
  title: string;
  meta?: string;
  done: boolean;
}

export function SecretsScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const state = snapshot.state;
  const t = ports.strings.t;
  const [openId, setOpenId] = useState<string | null>(null);

  const normalized = useRef(false);

  const players = state.order
    .map((id) => state.players[id])
    .filter((player): player is Player => Boolean(player && player.roleId));

  const roleOf = (id: RoleId | null | undefined) => {
    const known = ports.roles.byId(id ?? "");
    return known ?? { id: id ?? "", name: roleLabel(id), team: roleTeam(id ?? ""), ability: "" };
  };

  const displayName = (player: Player | null | undefined) =>
    player ? player.name || t("ui.player") + " " + player.seat : t("none");

  const SUPPORT_LEVEL_KEY: Record<SupportLevel, string> = {
    verified: "scriptLevelVerified",
    "requires-storyteller-choice": "scriptLevelStoryteller",
    unsupported: "scriptLevelUnsupported",
  };

  // A Librarian with no Outsider must hold the zero information; the legacy
  // screen normalized this once on mount, and the command is idempotent.
  useEffect(() => {
    if (normalized.current) return;
    const current = Object.values(state.players);
    if (!current.some((player) => player.roleId === "librarian")) return;
    if (current.some((player) => roleTeam(player.roleId ?? "") === "outsider")) return;
    const info = state.setup.info.librarian;
    if (info && "zero" in info) return;
    normalized.current = true;
    ports.commands.normalizeSecrets();
  }, [state, ports]);

  const errors = secretsProjection(state).errors;

  const startNight = () => {
    const result = ports.commands.startNight();
    if (result.status !== "allowed") {
      window.alert(commandRejectionText(result) || t("setupErrors"));
      return;
    }
    ports.router.go("/table");
  };

  const statusMarkup = () =>
    errors.length ? (
      <div
        className="secrets-status is-bad flex flex-col gap-1 rounded-md border border-crimson-dim bg-crimson-dim/30 p-3 text-[12px] text-danger"
        role="status"
      >
        <b>{t("setupErrors")}</b>
        <ul className="m-0 grid list-disc gap-0.5 pl-4">
          {errors.map((error, index) => (
            <li key={error.code + ":" + index}>
              {setupProblemText(error, { roleLabel: (id) => roleOf(id).name })}
            </li>
          ))}
        </ul>
      </div>
    ) : (
      <p className="secrets-status is-ok m-0 rounded-md border border-amber-dim bg-crypt-3 px-3 py-2.5 text-[12px] text-amber">
        {t("secretsReady")}
      </p>
    );

  const pageHead = (title: string, lead: string, meta: string | null) => (
    <header className="secrets-head flex flex-wrap items-start justify-between gap-3 border-b border-edge px-4 pb-4 pt-5">
      <div className="min-w-0">
        <h1 className="m-0 mt-1 font-role text-[26px] leading-tight text-parchment md:text-[30px]">
          {title}
        </h1>
        <p className={`secrets-intro mt-1 max-w-[720px] ${NOTE}`}>{lead}</p>
      </div>
      {meta ? (
        <p className="m-0 shrink-0 self-end rounded-sm border border-edge px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-muted">
          {meta}
        </p>
      ) : null}
    </header>
  );

  const supportSection = (roles: readonly RoleId[]) => {
    if (!roles.length) return null;
    const support = scriptSupport(roles);
    const entries = roleSupportEntries(roles).filter((entry) => entry.status !== "verified");
    return (
      <section
        className={`${PANEL} flex flex-col gap-1.5 text-[11.5px] text-muted`}
        data-script-support={support.level}
      >
        <span className={LABEL}>{t("roleSupport")}</span>
        <p className="m-0">
          <b className="text-parchment">{t(SUPPORT_LEVEL_KEY[support.level])}</b>
        </p>
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          {t("scriptSupportVerified", { count: support.counts.verified })} ·{" "}
          {t("scriptSupportStoryteller", {
            count: support.counts["requires-storyteller-choice"],
          })}{" "}
          · {t("scriptSupportUnsupported", { count: support.counts.unsupported })}
        </p>
        {entries.length ? (
          <ul className="m-0 grid list-none gap-1.5 p-0 text-[12.5px]">
            {entries.map((entry) => (
              <li key={entry.roleId} data-role={entry.roleId} data-status={entry.status}>
                <b className="text-parchment">{roleOf(entry.roleId).name}</b> ·{" "}
                {t("roleSupport." + entry.status)}
                <span className="block text-[12px] text-muted">{t(entry.detail)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  };

  const reminders = reminderRows(
    state.setup.roles || [],
    ROLE_REMINDERS_RU,
    (id) => roleOf(id).name,
  );

  const remindersList = (
    <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2" data-reminders>
      {reminders.map((row) => (
        <li
          className="flex min-w-0 items-center gap-2 rounded-sm border border-edge bg-crypt-3 p-2"
          key={row.roleId}
        >
          <img
            className="size-7 shrink-0 object-contain"
            src={ports.roles.image(ports.roles.byId(row.roleId))}
            alt=""
          />
          <span className="min-w-0">
            <b className="block truncate text-[13px] font-medium text-parchment">{row.name}</b>
            <span className="block text-[12px] leading-tight text-muted">
              {row.tokens.join(" · ")}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );

  const actionFooter = (
    primary: ReactNode,
    summary: string,
    label = t("ready"),
    danger = false,
  ) => (
    <footer className="secrets-dock sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-edge bg-crypt/95 px-4 py-3 backdrop-blur">
      <div className="grid min-w-0 flex-1 gap-0.5" role="status">
        <span
          className={
            danger ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-danger" : LABEL
          }
        >
          {label}
        </span>
        <b
          className={`text-[13px] font-medium ${
            danger ? "text-danger" : "tabular-nums text-parchment"
          }`}
        >
          {summary}
        </b>
      </div>
      <div className="flex flex-wrap items-center gap-2 max-lg:w-full">{primary}</div>
    </footer>
  );

  // A manual pool is resolved by the host, so it gets the manual screen even
  // when it contains BMR or S&V roles.
  const manual = isManualScript(state.script);

  if (!manual && isBmrScript(state.script)) {
    const has = (roleId: RoleId) => (state.setup.roles || []).includes(roleId);
    const lunatic = state.setup.lunaticShownId ? roleLabel(state.setup.lunaticShownId) : null;
    return (
      <SetupShell step="secrets">
        <div className="secrets mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-[980px] flex-col">
          {pageHead(t("bmrSecretsTitle"), t("bmrSecretsHint"), null)}
          {errors.length ? <div className="px-4 pt-3">{statusMarkup()}</div> : null}
          <main className="grid flex-1 content-start gap-4 p-4">
            <div className="rounded-md border border-amber-dim bg-amber-dim/40 p-3">
              <b className="text-[13px] text-parchment">{t("bmrHostWarningTitle")}</b>
              <p className={`mt-1 ${NOTE}`}>{t("bmrHostWarning")}</p>
            </div>
            <section className={PANEL}>
              <span className={LABEL}>{t("bmrSecretsTitle")}</span>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1">
                  <dt className={LABEL}>{t("bmrGodfather")}</dt>
                  <dd className="m-0 text-[13px]">
                    {has("godfather")
                      ? state.setup.godfatherOutsider === -1
                        ? t("godfatherMinus")
                        : t("godfatherPlus")
                      : t("none")}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className={LABEL}>{t("lunaticShown")}</dt>
                  <dd className="m-0 text-[13px]">
                    {has("lunatic") ? lunatic || t("none") : t("none")}
                  </dd>
                </div>
              </dl>
            </section>
            {supportSection(state.setup.roles || [])}
            {reminders.length ? (
              <section className={PANEL}>
                <span className={LABEL}>{t("remindersToPlace")}</span>
                <div className="mt-2">{remindersList}</div>
              </section>
            ) : null}
          </main>
          {actionFooter(
            <>
              <a className="btn btn--quiet max-lg:w-full" href={ports.router.path("bag")}>
                {t("setup")}
              </a>
              <button
                className="btn btn--accent max-lg:w-full"
                type="button"
                data-act="bmr-start"
                disabled={Boolean(errors.length)}
                onClick={startNight}
              >
                {t("startFirstNight")}
              </button>
            </>,
            t("bmrSecretsReady"),
          )}
        </div>
      </SetupShell>
    );
  }

  if (!manual && isSnvScript(state.script)) {
    const has = (roleId: RoleId) => (state.setup.roles || []).includes(roleId);
    const twin = state.setup.evilTwinGoodId ? roleLabel(state.setup.evilTwinGoodId) : null;
    return (
      <SetupShell step="secrets">
        <div className="secrets mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-[980px] flex-col">
          {pageHead(t("svSecretsTitle"), t("svSecretsHint"), null)}
          {errors.length ? <div className="px-4 pt-3">{statusMarkup()}</div> : null}
          <main className="grid flex-1 content-start gap-4 p-4">
            <div className="rounded-md border border-amber-dim bg-amber-dim/40 p-3">
              <b className="text-[13px] text-parchment">{t("bmrHostWarningTitle")}</b>
              <p className={`mt-1 ${NOTE}`}>{t("svHostWarning")}</p>
            </div>
            <section className={PANEL}>
              <span className={LABEL}>{t("evilTwinGood")}</span>
              <p className="m-0 mt-1 text-[13px]">
                {has("eviltwin") ? twin || t("none") : t("none")}
              </p>
            </section>
            {supportSection(state.setup.roles || [])}
            {reminders.length ? (
              <section className={PANEL}>
                <span className={LABEL}>{t("remindersToPlace")}</span>
                <div className="mt-2">{remindersList}</div>
              </section>
            ) : null}
          </main>
          {actionFooter(
            <>
              <a className="btn btn--quiet max-lg:w-full" href={ports.router.path("bag")}>
                {t("setup")}
              </a>
              <button
                className="btn btn--accent max-lg:w-full"
                type="button"
                data-act="sv-start"
                disabled={Boolean(errors.length)}
                onClick={startNight}
              >
                {t("startFirstNight")}
              </button>
            </>,
            t("svSecretsReady"),
          )}
        </div>
      </SetupShell>
    );
  }

  if (!players.length) {
    return (
      <SetupShell step="secrets">
        <div className="secrets secrets-empty mx-auto grid w-full max-w-[460px] place-items-center gap-2 px-5 py-24 text-center">
          <div className="secrets-head grid place-items-center gap-2">
            <h1 className="m-0 font-role text-[26px] leading-tight text-parchment">
              {t("noRoles")}
            </h1>
          </div>
          <a className="btn btn--accent mt-2" href={ports.router.path("bag")}>
            {t("setup")}
          </a>
        </div>
      </SetupShell>
    );
  }

  const realHas = (roleId: RoleId) => players.some((player) => player.roleId === roleId);
  const drunk = players.find((player) => player.roleId === "drunk");
  const drunkMask = drunk ? drunk.shownRoleId : null;

  const updateInfo = (roleId: InfoRoleId, patch: SetupInfoPatch) => {
    ports.commands.setSetupInfo(roleId, {
      ...patch,
      ...(roleId === drunkMask ? { forDrunk: true } : {}),
    });
  };

  const pairOf = (roleId: RoleId): [string, string] => {
    const info = state.setup.info[roleId as InfoRoleId];
    if (!info || !("pair" in info) || info.pair.length !== 2) return ["", ""];
    return [info.pair[0] ?? "", info.pair[1] ?? ""];
  };

  const roleOfInfo = (roleId: RoleId): string => {
    const info = state.setup.info[roleId as InfoRoleId];
    return info && "roleId" in info ? info.roleId : "";
  };

  const infoDone = (roleId: RoleId): boolean => obligationDone(roleId, errors);

  const infoLabel = (roleId: RoleId) =>
    drunkMask === roleId && !realHas(roleId)
      ? t("ui.drunk") + ": " + roleOf(roleId).name
      : roleOf(roleId).name;

  const obligations: SecretsEntry[] = [
    ...(realHas("fortuneteller")
      ? [
          {
            id: "herring",
            title: t("herring"),
            done: obligationDone("herring", errors),
          },
        ]
      : []),
    ...INFO_ROLES.filter(([roleId]) => realHas(roleId) || drunkMask === roleId).map(
      ([roleId]): SecretsEntry => ({
        id: roleId,
        title: infoLabel(roleId),
        done: infoDone(roleId),
      }),
    ),
  ];

  const checks: SecretsEntry[] = [
    {
      id: "reminders",
      title: t("reminders"),
      meta: `${reminders.length} ${ports.strings.roleCount(reminders.length)}`,
      done: false,
    },
    {
      id: "roster",
      title: t("roster"),
      meta: `${players.length} ${t("players")}`,
      done: false,
    },
  ];

  const entries = [...obligations, ...checks];
  const activeId =
    (openId && entries.some((entry) => entry.id === openId) ? openId : null) ??
    obligations.find((entry) => !entry.done)?.id ??
    entries[0]?.id ??
    "";

  const doneCount = obligations.filter((entry) => entry.done).length;
  const totalCount = obligations.length;

  const indexItem = (entry: SecretsEntry) => {
    const active = activeId === entry.id;
    return (
      <button
        key={entry.id}
        type="button"
        data-obligation={entry.id}
        aria-current={active ? "true" : undefined}
        aria-label={`${entry.title}: ${entry.done ? t("secretsDone") : t("secretsToDo")}`}
        onClick={() => setOpenId(entry.id)}
        className={`${INDEX_ITEM} ${
          active
            ? "border-edge-2 border-l-2 border-l-brass bg-selected text-parchment"
            : "border-edge bg-crypt-3 text-text hover:border-edge-2"
        }`}
      >
        <span className="min-w-0 truncate">{entry.title}</span>
        {entry.id === "reminders" || entry.id === "roster" ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted">{entry.meta}</span>
        ) : (
          <span
            className={`min-w-[72px] shrink-0 text-right text-[11px] uppercase tracking-[0.1em] max-lg:min-w-0 ${
              entry.done ? "text-success" : "text-muted"
            }`}
          >
            {entry.done ? "✓" : "○"}
            <span className="max-lg:sr-only">
              {" "}
              {entry.done ? t("secretsDone") : t("secretsToDo")}
            </span>
          </span>
        )}
      </button>
    );
  };

  const playerOptions = (roleIds: RoleId[]) =>
    roleIds.map((id) => (
      <option key={id} value={id}>
        {roleOf(id).name}
      </option>
    ));

  const playerSelect = (roleId: RoleId, index: 0 | 1) => {
    const pair = pairOf(roleId);
    const ariaLabel = index === 0 ? t("ui.player1") : t("ui.player2");
    return (
      <select
        className={`${SELECT} ${pair[index] ? "" : MISSING}`}
        aria-label={ariaLabel}
        data-player={"pair-" + (index === 0 ? "a" : "b") + "-" + roleId}
        value={pair[index] ?? ""}
        onChange={(event) => {
          const next: [string, string] = [pair[0] ?? "", pair[1] ?? ""];
          next[index] = event.target.value;
          updateInfo(roleId as "washerwoman" | "librarian" | "investigator", { pair: next });
        }}
      >
        <option value="">{t("ui.choosePlayer")}</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {displayName(player)} ({player.seat}) · {roleOf(player.roleId).name}
          </option>
        ))}
      </select>
    );
  };

  const infoEditor = (roleId: RoleId, team: Team, forDrunk = false) => {
    if (!forDrunk && !realHas(roleId)) return null;
    const held = players.map((player) => player.roleId).filter((id): id is RoleId => Boolean(id));
    // A Spy may register as a Townsfolk or an Outsider and a Recluse as a
    // Minion, so their not-in-play characters are legal shown answers. The
    // engine accepts that only when the registering player is one of the two
    // chosen players, so the option list follows the current pair.
    const pairPlayers = pairOf(roleId).map((id) => players.find((player) => player.id === id));
    const roleOptions = infoRoleChoices({
      team,
      forDrunk,
      held,
      scriptRoles: state.script?.roles ?? [],
      pairRoles: pairPlayers.map((player) => player && player.roleId),
    });
    // The zero is a shaped answer only the Librarian gives, and a Drunk shown
    // the Librarian may be told it as false information. A stored zero stays
    // editable even if the game changed, so the host can correct it.
    const stored = state.setup.info[roleId as InfoRoleId];
    const zeroInfo = zeroShown(roleId, stored);
    const zeroAllowed =
      roleId === "librarian" && (forDrunk || zeroInfo || librarianZeroLegal(players));
    return (
      <div className="secrets-info grid min-w-0 gap-3">
        <div className="secrets-info-head flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-role text-[22px] leading-tight text-parchment">
            {infoLabel(roleId)}
          </h2>
          <span className={TAG}>{forDrunk ? t("ui.drunk") : t("pair")}</span>
        </div>
        {zeroAllowed ? (
          <label className="flex min-h-11 items-center gap-2 text-[12px]">
            <input
              className="size-4 accent-accent"
              type="checkbox"
              data-info-zero={roleId}
              checked={zeroInfo}
              onChange={(event) =>
                updateInfo(
                  roleId as "washerwoman" | "librarian" | "investigator",
                  event.target.checked ? { zero: true } : { roleId: "", pair: ["", ""] },
                )
              }
            />
            <span>{t("zeroOutsiders")}</span>
          </label>
        ) : null}
        {zeroInfo ? (
          <p className={NOTE}>{t("zeroOutsiders")}.</p>
        ) : (
          <div className="secrets-sentence flex flex-wrap items-center gap-x-2 gap-y-2 text-[17px] leading-[1.6] text-text">
            <span>{t("secretsOneOf")}</span>
            {playerSelect(roleId, 0)}
            <span>{t("secretsAnd")}</span>
            {playerSelect(roleId, 1)}
            <span>{t("secretsIs")}</span>
            <select
              className={`${SELECT} ${roleOfInfo(roleId) ? "" : MISSING}`}
              aria-label={t("roleInPlay")}
              data-info-role={roleId}
              value={roleOfInfo(roleId)}
              onChange={(event) =>
                updateInfo(roleId as "washerwoman" | "librarian" | "investigator", {
                  roleId: event.target.value,
                  pair: ["", ""],
                })
              }
            >
              <option value="">{t("ui.chooseRole")}</option>
              {playerOptions(roleOptions)}
            </select>
          </div>
        )}
        <p className={NOTE}>{forDrunk ? t("secretsDrunkHint") : t("secretsPairHint")}</p>
      </div>
    );
  };

  const herringPane = () => {
    const good = players.filter((player) => {
      const team = roleTeam(player.roleId ?? "");
      return team !== "minion" && team !== "demon";
    });
    return (
      <div className="secrets-info grid min-w-0 gap-3">
        <div className="secrets-info-head flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-role text-[22px] leading-tight text-parchment">{t("herring")}</h2>
          <span className={TAG}>{t("secretsPermanent")}</span>
        </div>
        <div className="secrets-sentence flex flex-wrap items-center gap-x-2 gap-y-2 text-[17px] leading-[1.6] text-text">
          <span>{t("secretsHerringSentence")}</span>
          <select
            className={`${SELECT} ${state.setup.herringId ? "" : MISSING} sm:min-w-[12rem]`}
            aria-label={t("herring")}
            data-herring
            value={state.setup.herringId ?? ""}
            onChange={(event) => ports.commands.setHerring(event.target.value || null)}
          >
            <option value="">{t("ui.choosePlayer")}</option>
            {good.map((player) => (
              <option key={player.id} value={player.id}>
                {displayName(player)} · {roleOf(player.roleId).name}
              </option>
            ))}
          </select>
        </div>
        <p className={NOTE}>{t("ui.permanentHerring")}</p>
      </div>
    );
  };

  const remindersPane = () => (
    <div className="grid min-w-0 gap-3">
      <h2 className="m-0 font-role text-[22px] leading-tight text-parchment">{t("reminders")}</h2>
      {reminders.length ? remindersList : <p className={NOTE}>{t("noReminders")}</p>}
    </div>
  );

  const rosterPane = () => (
    <div className="grid min-w-0 gap-3">
      <h2 className="m-0 font-role text-[22px] leading-tight text-parchment">{t("roster")}</h2>
      <p className={NOTE}>
        {t("warning")}: {t("discussWarning")}
      </p>
      <div className="secrets-roster grid gap-1.5 sm:grid-cols-2">
        {players.map((player) => {
          const role = roleOf(player.roleId);
          const shown =
            player.shownRoleId && player.shownRoleId !== player.roleId
              ? roleOf(player.shownRoleId)
              : null;
          const image = ports.roles.image(ports.roles.byId(player.roleId ?? ""));
          return (
            <div
              className="secrets-player grid min-w-0 grid-cols-[20px_30px_minmax(0,1fr)] items-center gap-2 rounded-sm border border-edge bg-crypt-3 p-2"
              key={player.id}
            >
              <span className="secrets-seat text-[11px] tabular-nums text-brass">
                {player.seat}
              </span>
              {image ? <img className="size-8 object-contain" src={image} alt="" /> : null}
              <span className="secrets-player-body min-w-0">
                <b className="block truncate text-[12.5px] font-medium text-parchment">
                  {displayName(player)}
                </b>
                <span className="block text-[11px] text-muted">
                  {role.name} · {ports.strings.teamText(role.team ?? "")}
                </span>
                {shown ? (
                  <span className="secrets-shown block text-[11px] text-amber">
                    {t("shownRole")}: {shown.name}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const claimed = players.filter((player) => player.claimed).length;
  const everyoneNamed = claimed === players.length;
  const seated = state.phase === "seat";

  const primary = !everyoneNamed ? (
    <a className="btn btn--accent max-lg:w-full" href={ports.router.path("player")}>
      {t("ui.namesFirst")}
    </a>
  ) : !seated ? (
    <a className="btn btn--accent max-lg:w-full" href={ports.router.path("seat")}>
      {t("ui.seats")}
    </a>
  ) : (
    <button
      className="btn btn--accent max-lg:w-full"
      type="button"
      data-act="start"
      disabled={Boolean(errors.length)}
      onClick={startNight}
    >
      {t("startFirstNight")}
    </button>
  );

  const activePair = INFO_ROLES.find(([roleId]) => roleId === activeId);
  const pane =
    activeId === "herring"
      ? herringPane()
      : activeId === "reminders"
        ? remindersPane()
        : activeId === "roster"
          ? rosterPane()
          : activePair
            ? infoEditor(
                activePair[0],
                activePair[1],
                drunkMask === activePair[0] && !realHas(activePair[0]),
              )
            : null;

  const firstError = errors[0];
  const firstProblem = firstError
    ? setupProblemText(firstError, { roleLabel: (id) => roleOf(id).name })
    : "";
  const footerSummary = firstProblem
    ? firstProblem
    : totalCount
      ? t("secretsProgress", { done: doneCount, total: totalCount })
      : t("secretsReady");

  return (
    <SetupShell step="secrets">
      <div className="secrets mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-[1180px] flex-col">
        {pageHead(
          t("secretsTitle"),
          t("secretsIntro"),
          state.script ? `${state.script.name} · ${players.length} ${t("players")}` : null,
        )}
        <div className="px-4 pt-3 max-lg:hidden">{statusMarkup()}</div>
        <main className="secrets-shell grid flex-1 content-start gap-3 p-4 max-lg:pb-16 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav
            aria-label={t("secretsObligations")}
            className="secrets-index grid content-start gap-1.5 self-start rounded-md border border-edge bg-crypt-2 p-3 max-lg:flex max-lg:flex-wrap max-lg:items-center"
          >
            {obligations.length ? (
              <div className="flex items-baseline justify-between gap-2 px-1 pb-1 max-lg:w-full">
                <span className={LABEL}>{t("secretsObligations")}</span>
                <b className="text-[11px] tabular-nums text-amber">
                  {t("secretsProgress", { done: doneCount, total: totalCount })}
                </b>
              </div>
            ) : null}
            {obligations.map(indexItem)}
            <div
              className={`flex items-baseline justify-between gap-2 px-1 pb-1 max-lg:w-full ${
                obligations.length ? "mt-2 border-t border-edge pt-3" : ""
              }`}
            >
              <span className={LABEL}>{t("secretsChecks")}</span>
            </div>
            {checks.map(indexItem)}
          </nav>
          <section className="secrets-pane min-w-0 self-start rounded-md border border-edge bg-crypt-2 p-4">
            {pane}
          </section>
        </main>
        {actionFooter(
          primary,
          footerSummary,
          errors.length ? t("setupErrors") : t("ready"),
          errors.length > 0,
        )}
      </div>
    </SetupShell>
  );
}
