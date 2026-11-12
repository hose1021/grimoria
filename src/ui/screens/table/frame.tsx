// Console frame: the sticky header, the seat rail, the side panel and the
// phone dock. Nothing here dispatches on its own; every control calls an
// action from the screen controller.
import { useState } from "react";
import { seatProjection, tableProjection } from "../../../application/read-models/table.ts";
import {
  ActionButton,
  EventLog,
  GameTable,
  type GameTablePlayer,
} from "../../components/arcane/index.ts";
import { LanguageSwitch } from "../../components/language-switch.tsx";
import { livingPlayers, orderedPlayers, playerById } from "../../../core/model/state.ts";
import {
  currentPhaseLabel,
  displayName,
  headerCount,
  roleNameOf,
  targetNames,
  timerText,
} from "./helpers.ts";
import { EffectBadges, PanelHead, RoleLine, RoleToken, Warn } from "./parts.tsx";
import type { TableView } from "./view.ts";
import {
  BRAND,
  CHIP,
  DOCK,
  DOCK_LINK,
  HEAD,
  HOST,
  INLINE,
  MUTED,
  NAV,
  NAV_BTN,
  PANEL,
  QUEUE_ITEM,
  RING_COL,
  SEAT,
  SEAT_BODY,
  SEAT_DEAD,
  SEAT_MAIN,
  SEAT_NUM,
  SEAT_TOKEN,
  SEAT_TOKEN_DEAD,
  SEATS_COL,
  SHOWN,
  SIDE_COL,
  VIEW_TABS,
} from "./styles.ts";

export function Header({ view }: { view: TableView }) {
  const { state, ports, actions, drafts } = view;
  const t = ports.strings.t;
  const link = (name: string, label: string) => (
    <a
      key={name}
      className={`btn btn--quiet ${NAV_BTN} max-[900px]:hidden!`}
      href={ports.router.path(name)}
    >
      {label}
    </a>
  );
  return (
    <header className={HEAD}>
      <div className={`host-brand ${BRAND}`}>
        <img className="brand-mark" src={ports.assets.url("favicon.svg")} alt="Grimoria" />
        <div>
          <b className="block text-[14px]">{state.script ? state.script.name : ""}</b>
          <small className="block text-[10.5px] text-muted">
            {currentPhaseLabel(state, t)} · {headerCount(state, t)}
          </small>
        </div>
      </div>
      <LanguageSwitch />
      <nav className={NAV} aria-label={t("table")}>
        {link("bag", t("setup"))}
        {link("seat", t("seats"))}
        {link("secrets", t("secrets"))}
        {link("player", t("player"))}
        {link("public", t("publicScreen"))}
        {link("help", t("help"))}
        {link("sheet", t("roleSheet"))}
        <ActionButton
          variant="steel"
          className={NAV_BTN}
          data-act="undo"
          disabled={!ports.history.canUndo()}
          onClick={actions.undo}
        >
          {t("undo")}
        </ActionButton>
        <ActionButton
          variant="forge"
          className={NAV_BTN}
          data-act="hide"
          onClick={() => drafts.setOverlay("hide")}
        >
          {t("hide")}
        </ActionButton>
      </nav>
    </header>
  );
}

export function ViewTabs({ view }: { view: TableView }) {
  const { drafts, ports } = view;
  return (
    <nav className={VIEW_TABS} aria-label={ports.strings.t("view")}>
      {(["play", "roster", "tools"] as const).map((panel) => (
        <button
          key={panel}
          className={`btn ${drafts.panel === panel ? "btn--accent" : ""}`}
          type="button"
          data-panel={panel}
          aria-pressed={drafts.panel === panel}
          onClick={() => drafts.setPanel(panel)}
        >
          {ports.strings.t(panel)}
        </button>
      ))}
    </nav>
  );
}

export function SeatRail({ view, hidden }: { view: TableView; hidden: boolean }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const players = orderedPlayers(state);
  const herring = state.setup.herringId || state.herringId;
  const count =
    state.phase === "setup" || state.phase === "deal" || state.phase === "seat"
      ? `${players.length} ${t("players")}`
      : `${livingPlayers(state).length} ${t("alive")} / ${players.length}`;
  return (
    <aside
      className={`host-seats ${SEATS_COL}${hidden ? " max-[900px]:hidden" : ""}`}
      aria-label={t("seats")}
    >
      <div className="grid gap-2.5">
        <PanelHead label={t("seats")} note={count} />
        <div className="grid max-h-[calc(100dvh-190px)] gap-[5px] overflow-auto pr-0.5 max-[900px]:max-h-none max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
          {players.map((player) => (
            <div key={player.id} className={`${SEAT} ${player.alive ? "" : SEAT_DEAD}`}>
              <button
                className={SEAT_MAIN}
                type="button"
                data-seat-open={player.id}
                onClick={() => actions.openCorrection(player.id)}
              >
                <span className={SEAT_NUM}>{player.seat}</span>
                <span className={SEAT_BODY}>
                  <b className="text-[14px] leading-[1.25]">{player.name || "—"}</b>
                  <span className="min-w-0">
                    <RoleLine player={player} ports={ports} />
                    {player.registeredDead && player.alive ? (
                      <span className={CHIP}>{t("ui.registeredDead")}</span>
                    ) : null}
                    {player.alive ? null : (
                      <em className="ml-1 text-[10px] text-danger not-italic">{t("dead")}</em>
                    )}
                  </span>
                  {player.shownRoleId && player.shownRoleId !== player.roleId ? (
                    <span className={SHOWN}>
                      {t("shownRole")}: {roleNameOf(player.shownRoleId, ports.roles.byId)}
                    </span>
                  ) : null}
                  <EffectBadges state={state} player={player} ports={ports} />
                </span>
                {player.roleId ? (
                  <span className={`${SEAT_TOKEN} ${player.alive ? "" : SEAT_TOKEN_DEAD}`}>
                    <img
                      className="block h-full w-full object-cover"
                      src={ports.roles.image(ports.roles.byId(player.roleId))}
                      alt=""
                    />
                  </span>
                ) : null}
              </button>
            </div>
          ))}
        </div>
        <div className="host-bluffs grid gap-1 border-t border-edge pt-2">
          <span className="label">{t("bluffs")}</span>
          <span className="flex min-h-6 flex-wrap gap-[5px]">
            {(state.bluffs || []).length ? (
              state.bluffs!.map((id) => (
                <RoleToken
                  key={id}
                  id={id}
                  ports={ports}
                  mini
                  onOpen={() => actions.openRole(id)}
                />
              ))
            ) : (
              <span className={MUTED}>{state.setup.count < 7 ? t("noBluffs") : t("none")}</span>
            )}
          </span>
          {herring ? (
            <p className={MUTED}>
              {t("herring")}: {displayName(playerById(state, herring), t)}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

const PHASE_LABEL: Record<string, string> = {
  setup: "Сбор",
  deal: "Раздача",
  seat: "Места",
  night: "Ночь",
  day: "День",
  over: "Финал",
};

export function TableRing({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const players = orderedPlayers(state);
  const projection = tableProjection(state);
  const nomination =
    state.day.nominations.find((entry) => entry.id === state.day.activeNominationId) ??
    state.day.nominations[state.day.nominations.length - 1];
  const voters = new Set(nomination?.votes ?? []);
  const step = projection.step;
  const targetStep = state.phase === "night" && step && step.targetMode !== "none" ? step : null;
  const targetKey = targetStep ? targetStep.key : null;
  const draftKey = targetStep ? `${state.createdAt}:${state.night.number}:${targetStep.key}` : "";
  const selectedTargets = targetStep ? (view.drafts.targets.get(draftKey) ?? []) : [];
  const data: GameTablePlayer[] = players.map((player) => {
    const seat = seatProjection(state, player.id);
    const role = player.roleId ? ports.roles.byId(player.roleId) : null;
    const marks: GameTablePlayer["marks"] = [];
    if (player.roleId === "drunk") marks.push({ label: t("ui.drunk") });
    if (player.roleId !== "drunk" && seat.impaired) {
      marks.push({ label: t("ui.poisoned"), tone: "poison" });
    }
    if (seat.protected) marks.push({ label: t("ui.protected"), tone: "guard" });
    if (state.setup.herringId === player.id || state.herringId === player.id) {
      marks.push({ label: t("ui.herring"), tone: "herring" });
    }
    const nominated = nomination?.nomineeId === player.id;
    const disabled = targetStep
      ? Boolean(
          (targetStep.targetMode === "one-other" && player.id === targetStep.actorId) ||
          (targetStep.sv &&
            ["dreamer", "seamstress"].includes(String(targetStep.roleId)) &&
            player.id === targetStep.actorId) ||
          (targetStep.sv && targetStep.roleId === "snakecharmer" && !player.alive) ||
          targetStep.previousTarget === player.id ||
          (targetStep.bmr &&
            targetStep.targetMode === "one-any" &&
            targetStep.canResurrect &&
            !player.alive &&
            targetStep.roleId !== "moonchild" &&
            String(targetStep.roleId) !== "professor"),
        )
      : false;
    return {
      id: player.id,
      seat: player.seat,
      name: player.name || `${t("ui.player")} ${player.seat}`,
      roleName: role ? role.name : t("ui.unknown"),
      image: role ? ports.roles.image(role) : "",
      alive: player.alive,
      active: projection.step?.actorId === player.id,
      selected: targetStep
        ? selectedTargets.includes(player.id)
        : state.phase === "day" && view.drafts.executeTarget === player.id,
      targetKey,
      disabled,
      votes: nominated ? nomination.count : voters.has(player.id) ? 1 : 0,
      marks,
    };
  });
  const phase = state.phase;
  const title =
    phase === "night"
      ? `${PHASE_LABEL.night} ${state.night.number}`
      : phase === "day"
        ? `${PHASE_LABEL.day} ${state.day.number}`
        : (PHASE_LABEL[phase] ?? "Стол");
  const actor = projection.step;
  const stepName = actor
    ? actor.roleId
      ? roleNameOf(actor.roleId, ports.roles.byId)
      : actor.system
        ? t("system." + actor.system)
        : t("step")
    : "";
  const selectedLabel = selectedTargets.length ? targetNames(selectedTargets, state, t) : "";
  const lead =
    phase === "night" && actor
      ? actor.roleId
        ? roleNameOf(actor.roleId, ports.roles.byId)
        : actor.system
          ? t("system." + actor.system)
          : t("step")
      : phase === "day"
        ? `${projection.living} ${t("alive")} · ${t("threshold")} ${projection.threshold}`
        : phase === "setup" || phase === "deal" || phase === "seat"
          ? `${players.length} ${t("players")}`
          : "";
  const progress =
    phase === "night"
      ? `${projection.progress.done} / ${projection.progress.total}`
      : phase === "day" && nomination
        ? `${nomination.count} / ${nomination.threshold}`
        : undefined;
  return (
    <section className={RING_COL} aria-label={t("table")}>
      <GameTable
        players={data}
        onSelect={actions.selectSeat}
        center={
          <>
            <span className="block text-[8.5px] uppercase tracking-[.24em] text-brass">
              {phase === "night" ? title : phase === "day" ? t("day") : "Стол"}
            </span>
            <b className="mt-1 block font-role text-[34px] leading-none text-player-role-text max-sm:text-[22px]">
              {phase === "night" && stepName ? stepName : title}
            </b>
            {phase === "night" && actor ? (
              <span className="mt-2 block font-role text-[18px] tabular-nums text-amber max-sm:text-[13px]">
                {t("ui.step")} {projection.progress.done + 1} / {projection.progress.total}
              </span>
            ) : progress ? (
              <span className="mt-2 block font-role text-[18px] tabular-nums text-amber max-sm:text-[13px]">
                {progress}
              </span>
            ) : null}
            {phase === "night" && actor?.targetMode !== "none" ? (
              <span className="mt-2 block text-[9px] uppercase tracking-[.16em] text-muted">
                {t("chooseTarget")}
              </span>
            ) : (
              <span className="mt-2 block text-[9px] uppercase tracking-[.16em] text-muted">
                {lead}
              </span>
            )}
            {phase === "night" && actor?.targetMode !== "none" ? (
              <span className="mx-auto mt-3 inline-flex max-w-full items-center gap-1 rounded-[4px] border border-edge-2 px-2 py-1 text-[8.5px] uppercase tracking-[.12em] text-muted">
                {t("target")}:<b className="truncate text-parchment">{selectedLabel || "—"}</b>
              </span>
            ) : null}
          </>
        }
      />
    </section>
  );
}

function stageSteps(state: TableView["state"], t: TableView["ports"]["strings"]["t"]) {
  const phase = state.phase;
  const started = phase !== "setup" && phase !== "deal" && phase !== "seat";
  const steps: Array<{ key: string; label: string; tone: "done" | "now" | "next" }> = [
    { key: "setup", label: t("setup"), tone: started ? "done" : "now" },
  ];
  const last = Math.max(state.night.number, state.day.number);
  for (let n = 1; n <= last; n += 1) {
    steps.push({
      key: `night-${n}`,
      label: `${t("night")} ${n}`,
      tone:
        phase === "night" && state.night.number === n ? "now" : phase === "over" ? "done" : "next",
    });
    if (n <= state.day.number) {
      steps.push({
        key: `day-${n}`,
        label: `${t("day")} ${n}`,
        tone:
          phase === "day" && state.day.number === n ? "now" : phase === "over" ? "done" : "next",
      });
    }
  }
  if (phase === "day") {
    steps.push({
      key: `night-${state.night.number}`,
      label: `${t("night")} ${state.night.number}`,
      tone: "next",
    });
  }
  const now = steps.findIndex((step) => step.tone === "now");
  return steps.map((step, index) => ({
    ...step,
    tone: now >= 0 && index < now ? "done" : step.tone,
  }));
}

export function TableStage({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const players = orderedPlayers(state);
  const living = livingPlayers(state).length;
  const projection = tableProjection(state);
  const steps = stageSteps(state, t);
  const actorId = projection.step?.actorId;
  const dayNomination =
    state.day.nominations.find((entry) => entry.id === state.day.activeNominationId) ??
    state.day.nominations[state.day.nominations.length - 1];
  const deadCount = players.length - living;
  const focusId = state.phase === "day" ? view.drafts.executeTarget : actorId;
  const focusPlayer = focusId ? playerById(state, focusId) : null;
  const canExecute =
    state.phase === "day" &&
    Boolean(view.drafts.executeTarget) &&
    Boolean(focusPlayer?.alive) &&
    !state.day.execution &&
    !state.day.ended;
  const label =
    state.phase === "night"
      ? `${t("night")} ${state.night.number}`
      : state.phase === "day"
        ? `${t("day")} ${state.day.number}`
        : t("setup");
  return (
    <section
      className="flex min-w-0 flex-col overflow-hidden max-[1200px]:col-span-2 max-[900px]:order-1 max-[900px]:w-full"
      aria-label={t("table")}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-edge px-4 py-2.5">
        <div className="grid">
          <b className="font-role text-[14px] font-normal leading-[1.2] tracking-[.05em] text-text">
            {state.script?.name || t("script")}
          </b>
          <small className="mt-0.5 text-[9px] uppercase tracking-[.13em] text-muted">
            {players.length} {t("players")} · {living} {t("alive")} · {players.length - living}{" "}
            {t("dead")}
          </small>
        </div>
        <div className="ml-auto flex gap-1 overflow-auto">
          {steps.map((step) => (
            <span
              key={step.key}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-2 py-[5px] text-[8px] uppercase tracking-[.1em] ${
                step.tone === "now"
                  ? "border-amber-dim bg-amber-dim/20 text-amber"
                  : step.tone === "done"
                    ? "border-brass/30 text-brass"
                    : "border-edge text-muted/70"
              }`}
            >
              <i className="size-1 rounded-full bg-current" aria-hidden="true" />
              {step.label}
            </span>
          ))}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center p-3">
        <TableRing view={view} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-edge bg-gradient-to-b from-crypt-2 to-crypt px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-[9px] uppercase tracking-[.11em] text-muted">
          <i className="size-1.5 rounded-full bg-amber shadow-glow" aria-hidden="true" />
          {state.phase === "day"
            ? `${dayNomination?.count ?? 0} ${t("votes")} · ${t("threshold")} ${projection.threshold}`
            : label}
        </span>
        <span className="text-[9px] uppercase tracking-[.11em] text-muted">
          {state.phase === "day"
            ? `${t("deadCount")}: ${deadCount}`
            : `${living} ${t("alive")} · ${deadCount} ${t("dead")}`}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex items-center gap-1.5" data-table-actions />
          <button
            className="btn min-h-[34px] max-[900px]:min-h-11"
            type="button"
            data-act="undo"
            disabled={!ports.history.canUndo()}
            onClick={actions.undo}
          >
            {t("undo")}
          </button>
          {focusPlayer?.roleId ? (
            <button
              className="btn min-h-[34px] min-w-[110px] !justify-center max-[900px]:min-h-11"
              type="button"
              onClick={() => actions.openRole(focusPlayer.roleId!)}
            >
              {t("roleCard")}
            </button>
          ) : null}
          {state.phase === "day" ? (
            <button
              className={`${view.drafts.executeTarget ? "btn btn--danger" : "btn"} min-h-[34px] min-w-[110px] !justify-center max-[900px]:min-h-11`}
              type="button"
              data-act={view.drafts.executeTarget ? "execute-selected" : "end-day-empty"}
              disabled={
                view.drafts.executeTarget
                  ? !canExecute
                  : Boolean(state.day.execution) || state.day.ended
              }
              onClick={() => {
                if (view.drafts.executeTarget) {
                  actions.run({
                    type: "executeByDecision",
                    payload: {
                      playerId: view.drafts.executeTarget,
                      options: { survives: false },
                    },
                  });
                  return;
                }
                actions.run({ type: "endDay", payload: {} });
              }}
            >
              {view.drafts.executeTarget ? t("execute") : t("dayWithoutExecution")}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function HostPanel({ view }: { view: TableView }) {
  const { ports, actions, drafts } = view;
  const t = ports.strings.t;
  return (
    <section className={`${PANEL} host-host`}>
      <h2 className="m-0 text-[9px] uppercase tracking-[.18em] text-muted">{t("hostHandoff")}</h2>
      <div className="mt-2 grid gap-1.5">
        <ActionButton
          variant="steel"
          data-act="undo"
          disabled={!ports.history.canUndo()}
          onClick={actions.undo}
        >
          {t("undo")}
        </ActionButton>
        <ActionButton variant="steel" data-act="hide" onClick={() => drafts.setOverlay("hide")}>
          {t("hide")}
        </ActionButton>
      </div>
    </section>
  );
}

export function SidePanel({ view, hidden }: { view: TableView; hidden: boolean }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const entries = (state.log || []).slice(-8).reverse();
  return (
    <aside className={`${SIDE_COL}${hidden ? " max-[900px]:hidden" : ""}`}>
      <button
        className="btn btn--quiet justify-self-start"
        type="button"
        data-act="hide"
        onClick={() => view.drafts.setOverlay("hide")}
      >
        {t("hide")}
      </button>
      {state.storageError ? (
        <Warn title={t("storageError")} bad>
          <p>{state.storageError}</p>
        </Warn>
      ) : null}
      <EventLog
        title={t("log")}
        emptyLabel={t("none")}
        filters={[
          { id: "night", label: t("night") },
          { id: "day", label: t("day") },
          { id: "death", label: t("deaths") },
        ]}
        entries={entries.map((entry) => {
          const scope =
            entry.kind === "night"
              ? ("night" as const)
              : entry.kind === "day"
                ? ("day" as const)
                : /death|execut|kill/i.test(entry.kind)
                  ? ("death" as const)
                  : ("other" as const);
          const time = entry.at
            ? new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "";
          return {
            title: entry.title,
            detail: `${entry.phase}${entry.detail ? " · " + entry.detail : ""}`,
            ...(time ? { time } : {}),
            scope,
            ...(scope === "death" ? { tone: "danger" as const } : {}),
          };
        })}
      />
      <section className={`${PANEL} host-bluffs`}>
        <PanelHead label={t("bluffs")} />
        <div className="flex min-h-6 flex-wrap gap-[5px]">
          {(state.bluffs || []).length ? (
            state.bluffs!.map((id) => (
              <RoleToken key={id} id={id} ports={ports} mini onOpen={() => actions.openRole(id)} />
            ))
          ) : (
            <span className={MUTED}>{state.setup.count < 7 ? t("noBluffs") : t("none")}</span>
          )}
        </div>
        {state.setup.herringId || state.herringId ? (
          <p className={MUTED}>
            {t("herring")}:{" "}
            {displayName(playerById(state, state.setup.herringId || state.herringId || ""), t)}
          </p>
        ) : null}
      </section>
      <section className={PANEL}>
        <label className="label" htmlFor="host-notes">
          {t("notes")}
        </label>
        <textarea
          className="host-notes field mt-1 min-h-[84px] resize-y"
          id="host-notes"
          data-notes
          maxLength={4000}
          value={state.notes || ""}
          onChange={(event) =>
            actions.run({ type: "setNotes", payload: { notes: event.target.value } })
          }
        />
        <p className={MUTED}>{t("correctionHint")}</p>
      </section>
      <section className={PANEL}>
        <span className="label">{t("ui.backup")}</span>
        <div className={INLINE}>
          <button className="btn" type="button" data-act="export" onClick={actions.openExport}>
            {t("export")}
          </button>
          <button className="btn" type="button" data-act="import" onClick={actions.openImport}>
            {t("import")}
          </button>
        </div>
        <p className={MUTED}>{t("exportWarning")}</p>
      </section>
    </aside>
  );
}

export function QueuePanel({ view }: { view: TableView }) {
  const { state, ports } = view;
  const t = ports.strings.t;
  const [open, setOpen] = useState(false);
  const { step: current, progress } = tableProjection(state);
  const { done, total } = progress;
  const stepLabel = (step: (typeof state.night.queue)[number]) =>
    step.roleId
      ? roleNameOf(step.roleId, ports.roles.byId)
      : step.system
        ? t("system." + step.system)
        : t("step");
  const next = state.night.queue
    .filter((step) => !step.done && !step.skipped && step.key !== current?.key)
    .slice(0, 3)
    .map(stepLabel)
    .join(", ");
  const segments = 7;
  const filled = total ? Math.round((done / total) * segments) : 0;
  return (
    <section className={`${PANEL} grid gap-2`} data-panel="queue">
      <span className="label">{t("queue")}</span>
      <div className="flex items-baseline gap-2">
        <b className="font-role text-[40px] leading-none tabular-nums text-amber">{done}</b>
        <span className="text-[10px] uppercase tracking-[.14em] text-muted">из {total} ходов</span>
      </div>
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: segments }, (_, index) => (
          <i
            key={index}
            className={`h-1 flex-1 rounded-[1px] ${index < filled ? "bg-amber" : "bg-crypt-3"}`}
          />
        ))}
      </div>
      <p className={`${MUTED} !text-[10px]`}>
        {next ? `Далее: ${next}.` : total ? t("ui.done") : t("noWake")}
      </p>
      <button
        className="btn min-h-[38px] w-full !justify-center max-[900px]:min-h-11"
        type="button"
        data-act="show-order"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Скрыть порядок" : "Показать порядок"}
      </button>
      {open ? (
        <ol className="mt-1 grid list-none gap-[3px] p-0">
          {state.night.queue.map((step) => {
            const active = current?.key === step.key && !step.done;
            return (
              <li
                key={step.key}
                className={`${QUEUE_ITEM} ${active ? "bg-amber-dim/40" : ""} ${
                  step.done ? "opacity-50" : ""
                } ${step.skipped ? "opacity-35" : ""} ${step.pending ? "bg-crimson-dim/30" : ""}`}
              >
                <span
                  className={`mt-[5px] h-1.5 w-1.5 rounded-full ${
                    active
                      ? "bg-amber"
                      : step.done
                        ? "bg-outsider"
                        : step.pending
                          ? "bg-danger"
                          : "bg-muted"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <b className="block text-[14px] font-[550]">{stepLabel(step)}</b>
                  <small className="block text-[13px] text-muted">
                    {step.actorName || ""}
                    {step.skipped ? t("ui.skipped") : step.done ? t("ui.done") : ""}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

export function DayPanel({ view }: { view: TableView }) {
  const { state, ports, drafts, actions } = view;
  const t = ports.strings.t;
  const executed = state.day.execution ? playerById(state, state.day.execution.playerId) : null;
  return (
    <section className={PANEL} data-panel="day-result">
      <PanelHead label={t("ui.dayResult")} />
      {executed ? (
        <p className="my-1 rounded-sm border border-crimson-dim px-2 py-1.5 text-[13px] text-danger">
          {t("execution")}: {displayName(executed, t)}
        </p>
      ) : (
        <p className={MUTED}>{t("noExecutionShort")}</p>
      )}
      <div className="mt-2 grid gap-1">
        <span className="label">{t("timer")}</span>
        <b className="text-[20px] tabular-nums tracking-[.04em]">
          {timerText(drafts.timerEnd, actions.now)}
        </b>
        <div className={INLINE}>
          <button className="btn" type="button" data-act="timer-start" onClick={actions.startTimer}>
            {t("startTimer")}
          </button>
          <button className="btn" type="button" data-act="timer-stop" onClick={actions.stopTimer}>
            {t("resetTimer")}
          </button>
        </div>
      </div>
    </section>
  );
}

export function Dock({ view }: { view: TableView }) {
  const { ports } = view;
  const t = ports.strings.t;
  return (
    <nav className={DOCK} aria-label={t("table")}>
      {(
        [
          ["bag", t("setup")],
          ["seat", t("seats")],
          ["player", t("player")],
          ["public", t("publicScreen")],
          ["sheet", t("roleSheet")],
          ["help", t("help")],
        ] as const
      ).map(([name, label]) => (
        <a key={name} className={DOCK_LINK} href={ports.router.path(name)}>
          {label}
        </a>
      ))}
    </nav>
  );
}

export const HOST_CLASS = HOST;
