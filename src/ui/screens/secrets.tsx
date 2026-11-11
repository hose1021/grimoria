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
import { LanguageSwitch } from "../components/language-switch.tsx";
import { useShellPorts } from "../ports.ts";
import { useGame } from "../store/use-game.ts";

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
        <p className="label">{t("secrets")}</p>
        <h1>{t("bmrSecretsTitle")}</h1>
        <p className="host-muted">{t("bmrSecretsHint")}</p>
        <div className="host-alert bmr-warning">
          <b>{t("bmrHostWarningTitle")}</b>
          <p>{t("bmrHostWarning")}</p>
        </div>
        <div className="host-section">
          <span className="label">{t("bmrGodfather")}</span>
          <p>
            {has("godfather")
              ? state.setup.godfatherOutsider === -1
                ? t("godfatherMinus")
                : t("godfatherPlus")
              : t("none")}
          </p>
        </div>
        <div className="host-section">
          <span className="label">{t("lunaticShown")}</span>
          <p>{has("lunatic") ? lunatic || roleLabel("po") : t("none")}</p>
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
          <p className="host-muted">{t("bmrSecretsReady")}</p>
        )}
        <div className="host-actions">
          <a className="btn" href={ports.router.path("bag")}>
            {t("setup")}
          </a>
          <button
            className="btn btn--accent"
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
        <p className="label">{t("secrets")}</p>
        <h1>{t("svSecretsTitle")}</h1>
        <p className="host-muted">{t("svSecretsHint")}</p>
        <div className="host-alert bmr-warning">
          <b>{t("bmrHostWarningTitle")}</b>
          <p>{t("svHostWarning")}</p>
        </div>
        <div className="host-section">
          <span className="label">{t("evilTwinGood")}</span>
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
          <a className="btn" href={ports.router.path("bag")}>
            {t("setup")}
          </a>
          <button
            className="btn btn--accent"
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
      <div className="secrets-empty">
        <p className="label">{t("secrets")}</p>
        <h1>{t("noRoles")}</h1>
        <a className="btn btn--accent" href={ports.router.path("bag")}>
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
      <label className="secrets-field">
        <span className="label">{label}</span>
        <select
          className="field"
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
      <div className="secrets-info" key={roleId}>
        <div className="secrets-info-head">
          <h3>{label}</h3>
          <span className="secrets-tag">{forDrunk ? t("ui.drunk") : t("infoPair")}</span>
        </div>
        {zero ? (
          <p className="secrets-note">{t("zeroOutsiders")}.</p>
        ) : (
          <div className="secrets-grid">
            <label className="secrets-field">
              <span className="label">{t("roleInPlay")}</span>
              <select
                className="field"
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
      <div className="secrets-info">
        <div className="secrets-info-head">
          <h3>{t("herring")}</h3>
          <span className="secrets-tag">{t("forced")}</span>
        </div>
        <div className="secrets-grid">
          <label className="secrets-field">
            <span className="label">{t("herring")}</span>
            <select
              className="field"
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
        <p className="secrets-note">{t("ui.permanentHerring")}</p>
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
    <div className="secrets">
      <header className="secrets-head">
        <div>
          <p className="label">{t("secrets")}</p>
          <h1>{t("secretsTitle")}</h1>
          <p className="secrets-intro">{t("secretsIntro")}</p>
        </div>
        <nav className="secrets-nav">
          <a className="btn" href={ports.router.path("seat")}>
            {t("seats")}
          </a>
          <a className="btn" href={ports.router.path("table")}>
            {t("table")}
          </a>
        </nav>
        <LanguageSwitch />
      </header>

      {errors.length ? (
        <div className="secrets-status is-bad">
          <b>{t("setupErrors")}</b>
          <ul>
            {errors.map((error) => (
              <li key={error.code}>{error.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="secrets-status is-ok">{t("legal")}</p>
      )}

      <main className="secrets-shell">
        <section className="secrets-block">
          <div className="secrets-block-head">
            <h2>{t("infoRoles")}</h2>
            <span className="label">{t("ui.manualPairs")}</span>
          </div>
          {INFO_ROLES.map(([roleId, team]) => infoEditor(roleId, team, roleOf(roleId).name))}
          {drunkInfoEditor()}
          {herringEditor()}
        </section>

        <section className="secrets-block">
          <h2>{t("remindersToPlace")}</h2>
          <ul className="secrets-reminders">
            {reminders.map(([name, tokens]) => (
              <li key={name}>
                <b>{name}</b>
                <span>{tokens.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="secrets-block">
          <h2>{t("rolesReview")}</h2>
          <p className="secrets-note">
            {t("warning")}: {t("discussWarning")}
          </p>
          <div className="secrets-roster">
            {players.map((player) => {
              const role = roleOf(player.roleId);
              const shown =
                player.shownRoleId && player.shownRoleId !== player.roleId
                  ? roleOf(player.shownRoleId)
                  : null;
              const image = ports.roles.image(ports.roles.byId(player.roleId ?? ""));
              return (
                <div className="secrets-player" key={player.id}>
                  <span className="secrets-seat">{player.seat}</span>
                  {image ? <img src={image} alt="" /> : null}
                  <span className="secrets-player-body">
                    <b>{displayName(player)}</b>
                    <span>
                      {role.name} · {ports.strings.teamText(role.team ?? "")}
                    </span>
                    {shown ? (
                      <span className="secrets-shown">
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

      <div className="secrets-dock">
        <a className="btn" href={ports.router.path("seat")}>
          {t("seats")}
        </a>
        {!everyoneNamed ? (
          <a className="btn btn--accent" href={ports.router.path("player")}>
            {t("ui.namesFirst")}
          </a>
        ) : !seated ? (
          <a className="btn btn--accent" href={ports.router.path("seat")}>
            {t("ui.seats")}
          </a>
        ) : (
          <button
            className="btn btn--accent"
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
