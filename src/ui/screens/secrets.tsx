// Setup secrets: one-of-two pairs, the Drunk mask, the red herring, the reminder
// list and the host-only roster. Every change is a command; the screen renders
// the published snapshot, so an external write is visible without a reload.
import { useEffect, useRef } from "react";
import type { Player, RoleId, Team } from "../../core/model/types.ts";
import type { InfoRoleId, SetupInfoPatch } from "../../core/commands/contracts.ts";
import { secretsProjection } from "../../application/read-models/table.ts";
import {
  ALL_ROLES,
  ROLE_REMINDERS_RU,
  isBmrScript,
  isSnvScript,
  roleLabel,
  roleTeam,
} from "../../core/model/rules.ts";
import { roleSupportEntries, scriptSupport, type SupportLevel } from "../../core/model/support.ts";
import { buttonClass } from "../components/button.tsx";
import { inputClass } from "../components/field.tsx";
import { LanguageSwitch } from "../components/language-switch.tsx";
import { labelClass } from "../components/label.tsx";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

// The `.secrets-*` class names stay as inert hooks for the browser checks; the
// declarations below are the utilities that replace setup.css.
const CARD =
  "secrets-block min-w-0 rounded-[14px] border border-line bg-panel p-4 " +
  "max-[640px]:rounded-[12px] max-[640px]:p-3";
const INFO = "secrets-info mb-2.5 rounded-[10px] border border-line bg-[#0d1215] p-3";
const FIELD = "secrets-field grid min-w-0 gap-1";
const NOTE = "secrets-note mb-0 mt-1.5 text-[11.5px] leading-[1.45] text-muted";
const GRID = "secrets-grid grid grid-cols-3 gap-2 max-[900px]:grid-cols-1";
const TAG =
  "secrets-tag rounded-full border border-[#1f5a4f] px-[7px] py-[3px] " +
  "text-[9.5px] tracking-[.08em] uppercase text-accent";
const DOCK_BTN = "max-[640px]:w-full";

const INFO_ROLES: Array<[RoleId, Team]> = [
  ["washerwoman", "townsfolk"],
  ["librarian", "outsider"],
  ["investigator", "minion"],
];

const INFO_ROLE_IDS: RoleId[] = INFO_ROLES.map(([id]) => id);

function isInfoRole(id: string | null): id is "washerwoman" | "librarian" | "investigator" {
  return id !== null && INFO_ROLE_IDS.includes(id);
}

export function SecretsScreen() {
  const ports = useShellPorts();
  const snapshot = useGame(ports.game);
  const state = snapshot.state;
  const t = ports.strings.t;

  const normalized = useRef(false);

  const players = state.order
    .map((id) => state.players[id])
    .filter((player): player is Player => Boolean(player && player.roleId));

  const roleOf = (id: RoleId | null | undefined) => {
    const known = ports.roles.byId(id ?? "");
    return known ?? { id: id ?? "", name: roleLabel(id), team: roleTeam(id ?? ""), ability: "" };
  };

  const displayName = (player: Player | null | undefined) =>
    player ? player.name || t("ui.player") + " " + player.seat : "—";

  const SUPPORT_LEVEL_KEY: Record<SupportLevel, string> = {
    verified: "scriptLevelVerified",
    "requires-storyteller-choice": "scriptLevelStoryteller",
    unsupported: "scriptLevelUnsupported",
  };

  // The same derived level the bag screen and the rules matrix report. Every
  // non-verified role is listed, so a manual fallback is never hidden.
  const supportSection = (roles: readonly RoleId[], className = "host-section") => {
    if (!roles.length) return null;
    const support = scriptSupport(roles);
    const entries = roleSupportEntries(roles).filter((entry) => entry.status !== "verified");
    return (
      <div className={className} data-script-support={support.level}>
        <span className={labelClass}>{t("roleSupport")}</span>
        <p>
          <b>{t(SUPPORT_LEVEL_KEY[support.level])}</b>
        </p>
        <p className="host-muted">
          {t("scriptSupportVerified", { count: support.counts.verified })} ·{" "}
          {t("scriptSupportStoryteller", {
            count: support.counts["requires-storyteller-choice"],
          })}{" "}
          · {t("scriptSupportUnsupported", { count: support.counts.unsupported })}
        </p>
        {entries.length ? (
          <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px]">
            {entries.map((entry) => (
              <li key={entry.roleId} data-role={entry.roleId} data-status={entry.status}>
                <b>{roleOf(entry.roleId).name}</b> · {t("roleSupport." + entry.status)}
                <span className="block text-[12.5px] text-muted">{t(entry.detail)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  };

  const startNight = () => {
    const result = ports.commands.startNight();
    if (result.status !== "allowed") {
      const message =
        result.status === "rejected"
          ? result.errors?.join("\n") || result.reason || t("setupErrors")
          : result.reason || t("setupErrors");
      window.alert(message);
      return;
    }
    ports.router.go("/table");
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

  if (isBmrScript(state.script)) {
    const has = (roleId: RoleId) => (state.setup.roles || []).includes(roleId);
    const lunatic = state.setup.lunaticShownId ? roleLabel(state.setup.lunaticShownId) : null;
    return (
      <section className="host-card">
        <p className={labelClass}>{t("secrets")}</p>
        <h1>{t("bmrSecretsTitle")}</h1>
        <p className="host-muted">{t("bmrSecretsHint")}</p>
        <div className="host-alert bmr-warning">
          <b>{t("bmrHostWarningTitle")}</b>
          <p>{t("bmrHostWarning")}</p>
        </div>
        <div className="host-section">
          <span className={labelClass}>{t("bmrGodfather")}</span>
          <p>
            {has("godfather")
              ? state.setup.godfatherOutsider === -1
                ? t("godfatherMinus")
                : t("godfatherPlus")
              : t("none")}
          </p>
        </div>
        <div className="host-section">
          <span className={labelClass}>{t("lunaticShown")}</span>
          <p>{has("lunatic") ? lunatic || roleLabel("po") : t("none")}</p>
        </div>
        {supportSection(state.setup.roles || [])}
        {errors.length ? (
          <div className="host-alert is-bad">
            <b>{t("setupErrors")}</b>
            <ul>
              {errors.map((error) => (
                <li key={error.code}>{error.message}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="host-muted">{t("bmrSecretsReady")}</p>
        )}
        <div className="host-actions">
          <a className={buttonClass()} href={ports.router.path("bag")}>
            {t("setup")}
          </a>
          <button
            className={buttonClass("accent")}
            type="button"
            data-act="bmr-start"
            disabled={Boolean(errors.length)}
            onClick={startNight}
          >
            {t("startFirstNight")}
          </button>
        </div>
      </section>
    );
  }

  if (isSnvScript(state.script)) {
    const has = (roleId: RoleId) => (state.setup.roles || []).includes(roleId);
    const twin = state.setup.evilTwinGoodId ? roleLabel(state.setup.evilTwinGoodId) : null;
    return (
      <section className="host-card">
        <p className={labelClass}>{t("secrets")}</p>
        <h1>{t("svSecretsTitle")}</h1>
        <p className="host-muted">{t("svSecretsHint")}</p>
        <div className="host-alert bmr-warning">
          <b>{t("bmrHostWarningTitle")}</b>
          <p>{t("svHostWarning")}</p>
        </div>
        {supportSection(state.setup.roles || [])}
        <div className="host-section">
          <span className={labelClass}>{t("evilTwinGood")}</span>
          <p>{has("eviltwin") ? twin || "—" : t("none")}</p>
        </div>
        {errors.length ? (
          <div className="host-alert is-bad">
            <b>{t("setupErrors")}</b>
            <ul>
              {errors.map((error) => (
                <li key={error.code}>{error.message}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="host-muted">{t("svSecretsReady")}</p>
        )}
        <div className="host-actions">
          <a className={buttonClass()} href={ports.router.path("bag")}>
            {t("setup")}
          </a>
          <button
            className={buttonClass("accent")}
            type="button"
            data-act="sv-start"
            disabled={Boolean(errors.length)}
            onClick={startNight}
          >
            {t("startFirstNight")}
          </button>
        </div>
      </section>
    );
  }

  if (!players.length) {
    return (
      <div className="secrets-empty mx-auto my-[10vh] w-[min(560px,100%)] p-6 text-center">
        <p className={labelClass}>{t("secrets")}</p>
        <h1 className="text-[22px] tracking-[-.02em]">{t("noRoles")}</h1>
        <a className={buttonClass("accent")} href={ports.router.path("bag")}>
          {t("setup")}
        </a>
      </div>
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

  const playerOptions = (roleIds: RoleId[]) =>
    roleIds.map((id) => (
      <option key={id} value={id}>
        {roleOf(id).name}
      </option>
    ));

  const playerSelect = (roleId: RoleId, index: 0 | 1, label: string) => {
    const pair = pairOf(roleId);
    return (
      <label className={FIELD}>
        <span className={labelClass}>{label}</span>
        <select
          className={inputClass}
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
      </label>
    );
  };

  const infoEditor = (roleId: RoleId, team: Team, label: string, forDrunk = false) => {
    if (!forDrunk && !realHas(roleId)) return null;
    const roleOptions = forDrunk
      ? ALL_ROLES.filter((id) => roleTeam(id) === team)
      : players
          .filter((player) => roleTeam(player.roleId ?? "") === team)
          .map((player) => player.roleId ?? "");
    const zero =
      !forDrunk &&
      roleId === "librarian" &&
      !players.some((player) => roleTeam(player.roleId ?? "") === "outsider");
    const infoRoleId = roleOfInfo(roleId);
    return (
      <div className={INFO} key={roleId}>
        <div className="secrets-info-head mb-2 flex items-center justify-between gap-2">
          <h3 className="m-0 text-[13px]">{label}</h3>
          <span className={TAG}>{forDrunk ? t("ui.drunk") : t("infoPair")}</span>
        </div>
        {zero ? (
          <p className={NOTE}>{t("zeroOutsiders")}.</p>
        ) : (
          <div className={GRID}>
            <label className={FIELD}>
              <span className={labelClass}>{t("roleInPlay")}</span>
              <select
                className={inputClass}
                data-info-role={roleId}
                value={infoRoleId}
                onChange={(event) =>
                  updateInfo(roleId as "washerwoman" | "librarian" | "investigator", {
                    roleId: event.target.value,
                    pair: pairOf(roleId),
                  })
                }
              >
                <option value="">{t("ui.chooseRole")}</option>
                {playerOptions(roleOptions)}
              </select>
            </label>
            {playerSelect(roleId, 0, t("ui.player1"))}
            {playerSelect(roleId, 1, t("ui.player2"))}
          </div>
        )}
      </div>
    );
  };

  const drunkInfoEditor = () => {
    if (!isInfoRole(drunkMask)) return null;
    const team: Team =
      drunkMask === "washerwoman" ? "townsfolk" : drunkMask === "librarian" ? "outsider" : "minion";
    return infoEditor(drunkMask, team, t("ui.drunk") + ": " + roleOf(drunkMask).name, true);
  };

  const herringEditor = () => {
    if (!realHas("fortuneteller")) return null;
    const good = players.filter((player) => {
      const team = roleTeam(player.roleId ?? "");
      return team !== "minion" && team !== "demon";
    });
    return (
      <div className={INFO}>
        <div className="secrets-info-head mb-2 flex items-center justify-between gap-2">
          <h3 className="m-0 text-[13px]">{t("herring")}</h3>
          <span className={TAG}>{t("forced")}</span>
        </div>
        <div className={GRID}>
          <label className={FIELD}>
            <span className={labelClass}>{t("herring")}</span>
            <select
              className={inputClass}
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
          </label>
        </div>
        <p className={NOTE}>{t("ui.permanentHerring")}</p>
      </div>
    );
  };

  const claimed = players.filter((player) => player.claimed).length;
  const everyoneNamed = claimed === players.length;
  const seated = state.phase === "seat";
  const reminders: Array<[string, string[]]> = [];
  const seen = new Set<string>();
  for (const roleId of state.setup.roles || []) {
    if (seen.has(roleId)) continue;
    seen.add(roleId);
    const tokens = (ROLE_REMINDERS_RU as Record<string, string[]>)[roleId] || [];
    if (tokens.length) reminders.push([roleOf(roleId).name, tokens]);
  }

  return (
    <div className="secrets mx-auto w-[min(1180px,100%)] min-w-0 px-4 pb-12 pt-3.5 max-[640px]:px-2.5 max-[640px]:pb-10 max-[640px]:pt-2.5">
      <header className="secrets-head flex flex-wrap items-start justify-between gap-3 pb-3.5 pt-1">
        <div>
          <p className={labelClass}>{t("secrets")}</p>
          <h1 className="mb-0 mt-0.5 text-[22px] tracking-[-.02em]">{t("secretsTitle")}</h1>
          <p className="secrets-intro mb-0 mt-1 max-w-[720px] text-[12px] text-muted">
            {t("secretsIntro")}
          </p>
        </div>
        <nav className="secrets-nav flex flex-wrap gap-1.5">
          <a className={buttonClass()} href={ports.router.path("seat")}>
            {t("seats")}
          </a>
          <a className={buttonClass()} href={ports.router.path("table")}>
            {t("table")}
          </a>
        </nav>
        <LanguageSwitch />
      </header>

      {errors.length ? (
        <div className="secrets-status is-bad mb-3 rounded-[10px] border border-[#5a2b2b] px-3 py-2.5 text-[12px] text-danger">
          <b>{t("setupErrors")}</b>
          <ul className="mb-0 mt-1 pl-[18px]">
            {errors.map((error) => (
              <li key={error.code}>{error.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="secrets-status is-ok mb-3 rounded-[10px] border border-[#1f5a4f] px-3 py-2.5 text-[12px] text-accent">
          {t("legal")}
        </p>
      )}

      <main className="secrets-shell grid gap-3.5">
        {supportSection(state.setup.roles || [], CARD)}
        <section className={CARD}>
          <div className="secrets-block-head mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 mb-2.5 text-[15px]">{t("infoRoles")}</h2>
            <span className={labelClass}>{t("ui.manualPairs")}</span>
          </div>
          {INFO_ROLES.map(([roleId, team]) => infoEditor(roleId, team, roleOf(roleId).name))}
          {drunkInfoEditor()}
          {herringEditor()}
        </section>

        <section className={CARD}>
          <h2 className="m-0 mb-2.5 text-[15px]">{t("remindersToPlace")}</h2>
          <ul className="secrets-reminders m-0 grid list-none gap-1 p-0">
            {reminders.map(([name, tokens]) => (
              <li
                key={name}
                className="flex justify-between gap-3 border-b border-b-line py-1.5 text-[12px]"
              >
                <b>{name}</b>
                <span className="text-muted">{tokens.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={CARD}>
          <h2 className="m-0 mb-2.5 text-[15px]">{t("rolesReview")}</h2>
          <p className={NOTE}>
            {t("warning")}: {t("discussWarning")}
          </p>
          <div className="secrets-roster grid grid-cols-2 gap-1.5 max-[900px]:grid-cols-1">
            {players.map((player) => {
              const role = roleOf(player.roleId);
              const shown =
                player.shownRoleId && player.shownRoleId !== player.roleId
                  ? roleOf(player.shownRoleId)
                  : null;
              const image = ports.roles.image(ports.roles.byId(player.roleId ?? ""));
              return (
                <div
                  className="secrets-player grid min-w-0 grid-cols-[24px_30px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-line p-[7px]"
                  key={player.id}
                >
                  <span className="secrets-seat text-[11px] tabular-nums text-muted">
                    {player.seat}
                  </span>
                  {image ? <img src={image} alt="" className="size-[30px] object-contain" /> : null}
                  <span className="secrets-player-body min-w-0">
                    <b className="block text-[12px]">{displayName(player)}</b>
                    <span className="block text-[10.5px] text-muted">
                      {role.name} · {ports.strings.teamText(role.team ?? "")}
                    </span>
                    {shown ? (
                      <span className="secrets-shown block text-[10.5px] text-accent">
                        {t("shownRole")}: {shown.name}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <div className="secrets-dock sticky bottom-0 z-[5] flex justify-between gap-2 bg-[linear-gradient(180deg,transparent,var(--color-bg)_40%)] pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] max-[640px]:flex-col">
        <a className={buttonClass("default", DOCK_BTN)} href={ports.router.path("seat")}>
          {t("seats")}
        </a>
        {!everyoneNamed ? (
          <a className={buttonClass("accent", DOCK_BTN)} href={ports.router.path("player")}>
            {t("ui.namesFirst")}
          </a>
        ) : !seated ? (
          <a className={buttonClass("accent", DOCK_BTN)} href={ports.router.path("seat")}>
            {t("ui.seats")}
          </a>
        ) : (
          <button
            className={buttonClass("accent", DOCK_BTN)}
            type="button"
            data-act="start"
            disabled={Boolean(errors.length)}
            onClick={startNight}
          >
            {t("startFirstNight")}
          </button>
        )}
      </div>
    </div>
  );
}
