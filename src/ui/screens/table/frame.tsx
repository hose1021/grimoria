// Console frame: the sticky header, the seat rail, the side panel and the
// phone dock. Nothing here dispatches on its own; every control calls an
// action from the screen controller.
import { currentStep } from "../../../core/engine/index.ts";
import { LanguageSwitch } from "../../components/language-switch.tsx";
import { livingPlayers, orderedPlayers, playerById } from "../../../core/model/state.ts";
import {
  currentPhaseLabel,
  displayName,
  headerCount,
  logConsequence,
  roleNameOf,
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
  LOG_ITEM,
  LOG_SECRET,
  MUTED,
  NAV,
  NAV_BTN,
  PANEL,
  QUEUE_ITEM,
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
    <a key={name} className={`btn ${NAV_BTN} max-[900px]:hidden!`} href={ports.router.path(name)}>
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
        <button
          className={`btn ${NAV_BTN}`}
          type="button"
          data-act="undo"
          disabled={!ports.history.canUndo()}
          onClick={actions.undo}
        >
          {t("undo")}
        </button>
        <button
          className={`btn ${NAV_BTN} max-[900px]:hidden!`}
          type="button"
          data-act="export"
          onClick={actions.openExport}
        >
          {t("export")}
        </button>
        <button
          className={`btn ${NAV_BTN} max-[900px]:hidden!`}
          type="button"
          data-act="import"
          onClick={actions.openImport}
        >
          {t("import")}
        </button>
        <button
          className={`btn btn--accent ${NAV_BTN}`}
          type="button"
          data-act="hide"
          onClick={() => drafts.setOverlay("hide")}
        >
          {t("hide")}
        </button>
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
        <div className="host-bluffs grid gap-1 border-t border-line pt-2">
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

export function SidePanel({ view, hidden }: { view: TableView; hidden: boolean }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const entries = (state.log || []).slice(-8).reverse();
  return (
    <aside className={`${SIDE_COL}${hidden ? " max-[900px]:hidden" : ""}`}>
      {state.storageError ? (
        <Warn title={t("storageError")} bad>
          <p>{state.storageError}</p>
        </Warn>
      ) : null}
      {state.phase === "night" ? <QueuePanel view={view} /> : null}
      {state.phase === "day" ? <DayPanel view={view} /> : null}
      <section className={PANEL}>
        <PanelHead label={t("log")} />
        {entries.length ? (
          <ol className="grid list-none gap-1 p-0">
            {entries.map((entry, index) => {
              const consequence = logConsequence(entry);
              return (
                <li
                  key={`${entry.title}-${index}`}
                  className={`${LOG_ITEM} ${entry.secret ? LOG_SECRET : ""}`}
                >
                  <b className="block text-[14px] font-[550]">{entry.title}</b>
                  <span className="block text-[13px] leading-[1.4] text-muted">
                    {entry.phase}
                    {entry.detail ? " · " + entry.detail : ""}
                  </span>
                  {consequence ? (
                    <span className={CHIP} data-log-kind={consequence}>
                      {t("ui.consequence." + consequence)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={MUTED}>—</p>
        )}
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

function QueuePanel({ view }: { view: TableView }) {
  const { state, ports } = view;
  const t = ports.strings.t;
  const current = currentStep(state);
  const done = state.night.queue.filter((step) => step.done).length;
  const total = state.night.queue.length;
  return (
    <section className={PANEL}>
      <PanelHead label={t("queue")} note={`${done} / ${total} ${t("finished")}`} />
      {total ? (
        <ol className="grid list-none gap-[3px] p-0">
          {state.night.queue.map((step) => {
            const active = current?.key === step.key && !step.done;
            return (
              <li
                key={step.key}
                className={`${QUEUE_ITEM} ${active ? "bg-[#10221e]" : ""} ${
                  step.done ? "opacity-50" : ""
                } ${step.skipped ? "opacity-35" : ""} ${step.pending ? "bg-[#2a1414]" : ""}`}
              >
                <span
                  className={`mt-[5px] h-1.5 w-1.5 rounded-full ${
                    active
                      ? "bg-accent"
                      : step.done
                        ? "bg-outsider"
                        : step.pending
                          ? "bg-danger"
                          : "bg-muted"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <b className="block text-[14px] font-[550]">
                    {step.roleId
                      ? roleNameOf(step.roleId, ports.roles.byId)
                      : step.system
                        ? t("system." + step.system)
                        : t("step")}
                  </b>
                  <small className="block text-[13px] text-muted">
                    {step.actorName || ""}
                    {step.skipped ? t("ui.skipped") : step.done ? t("ui.done") : ""}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={MUTED}>{t("noWake")}</p>
      )}
    </section>
  );
}

function DayPanel({ view }: { view: TableView }) {
  const { state, ports, drafts, actions } = view;
  const t = ports.strings.t;
  const executed = state.day.execution ? playerById(state, state.day.execution.playerId) : null;
  return (
    <section className={PANEL} data-panel="day-result">
      <PanelHead label={t("ui.dayResult")} />
      {executed ? (
        <p className="my-1 rounded-md border border-[#5a2b2b] px-2 py-1.5 text-[13px] text-danger">
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
