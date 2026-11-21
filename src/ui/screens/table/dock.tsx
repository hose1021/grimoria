// The fixed action dock. It is the only animated-free, always-visible surface
// for the current step, the engine preview, the rejection reason and the two
// action rows; the table above it stays a reading surface.
import { useMemo } from "react";
import type { ReactNode } from "react";
import { livingPlayers, orderedPlayers, playerById } from "../../../core/model/state.ts";
import { isManualScript } from "../../../core/model/rules.ts";
import { survivalProjection, tableProjection } from "../../../application/read-models/table.ts";
import {
  blockerActionText,
  blockerText,
  consequencesOf,
  dayHelpFormCount,
  displayName,
  guideForStep,
  previewIdentity,
  rejectionOf,
  roleNameOf,
  stepTitle,
  timerText,
} from "./helpers.ts";
import { HeirChoice } from "./cards.tsx";
import { ConsequenceList } from "./parts.tsx";
import { stepContext } from "./step-context.ts";
import type { TableView } from "./view.ts";
import {
  ACTION_DANGER,
  ACTION_OUTLINE,
  ACTION_PRIMARY,
  ACTION_QUIET,
  ACTION_SECONDARY,
  ICON_BUTTON,
} from "./styles.ts";

export function TableDock({ view }: { view: TableView }) {
  const { state, ports, drafts, actions, viewVersion } = view;
  const t = ports.strings.t;
  const projection = tableProjection(state);
  // A heir the host owes is the night's prompt: Imp r3116 has the Storyteller
  // choose the Minion before the night goes on, so the next step waits.
  const heir = state.phase === "night" ? projection.pendingDemonChange : null;
  const step = state.phase === "night" && !heir ? projection.step : null;
  const context = step ? stepContext(state, drafts, step) : null;
  // The Po's step is mandatory and its "no one" is a recorded decision; the
  // dock offers it as its own action instead of a generic skip (Po r3104).
  const poNoOne = Boolean(step && step.targetMode === "po" && (step.minTargets ?? 0) === 0);
  const stepPreview = useMemo(
    () =>
      step && context
        ? actions.preview({ type: "completeNightStep", payload: context.payload })
        : null,
    // The payload content and the store publication decide the preview.
    [actions.preview, step?.key, context ? JSON.stringify(context.payload) : "", viewVersion],
  );
  const nightEndPreview = useMemo(
    () =>
      state.phase === "night" && !step && !heir
        ? actions.preview({ type: "endNight", payload: {} })
        : null,
    [actions.preview, state.phase, step?.key, heir?.key, viewVersion],
  );
  const dayEndPreview = useMemo(
    () => (state.phase === "day" ? actions.preview({ type: "endDay", payload: {} }) : null),
    [actions.preview, state.phase, viewVersion],
  );
  const target = state.phase === "day" ? playerById(state, drafts.executeTarget) : null;
  const canExecute =
    state.phase === "day" &&
    Boolean(target) &&
    !state.day.execution &&
    !state.day.ended &&
    !state.winner;
  const executePreview = useMemo(
    () =>
      canExecute && drafts.executeTarget
        ? actions.preview({
            type: "executeByDecision",
            payload: {
              playerId: drafts.executeTarget,
              options: { survives: drafts.executeSurvives },
            },
          })
        : null,
    [actions.preview, canExecute, drafts.executeTarget, drafts.executeSurvives, viewVersion],
  );
  const executed = state.day.execution ? playerById(state, state.day.execution.playerId) : null;
  const saintWarning =
    state.phase === "day" && !state.day.execution && !state.day.ended && target?.roleId === "saint";
  const registeredDead = orderedPlayers(state).filter(
    (player) => player.alive && player.registeredDead,
  );
  const guide = step ? guideForStep(t, ports.guidance.for, state, step) : null;
  const helpCount = state.phase === "day" ? dayHelpFormCount(state) : 0;
  const outcome = state.phase === "night" ? (step ? stepPreview : nightEndPreview) : dayEndPreview;
  const nextWake =
    state.phase === "night" && step
      ? state.night.queue
          .filter((entry) => !entry.done && !entry.skipped && entry.key !== step.key)
          .map((entry) => {
            if (entry.roleId) return roleNameOf(entry.roleId, ports.roles.byId);
            if (entry.system) return t("system." + entry.system);
            return t("step");
          })[0]
      : null;
  const dockStep =
    state.phase === "night"
      ? heir
        ? t("pendingHeir")
        : step
          ? stepTitle(step, ports.roles.byId, t)
          : t("ui.allDone")
      : state.phase === "day"
        ? target
          ? displayName(target, t)
          : `${t("day")} ${state.day.number}`
        : state.phase === "over"
          ? t("gameOver")
          : t("setup");
  const hint =
    state.phase === "night" && heir
      ? t("pendingHeirText")
      : state.phase === "night" && step
        ? guide?.check || guide?.host || ""
        : state.phase === "day" && target
          ? t("ui.executionTargetHint")
          : "";

  const outcomeRejection = rejectionOf(outcome);
  const quietSelection = Boolean(
    context?.targetsIncomplete &&
    outcomeRejection &&
    ["error.39", "error.41", "error.42"].includes(outcomeRejection.code ?? ""),
  );
  const singlePreview = state.phase === "day" && executePreview ? executePreview : outcome;
  const previewTargets =
    state.phase === "day" && executePreview && drafts.executeTarget
      ? [drafts.executeTarget]
      : context
        ? context.selected
        : [];
  const previewLines = singlePreview ? consequencesOf(singlePreview, previewTargets) : [];
  const hasPreview = Boolean(
    singlePreview &&
    !quietSelection &&
    (previewLines.some((line) => line.kind !== "applied") || rejectionOf(singlePreview)),
  );
  const effects = context?.derived.effects ?? [];
  // A target or an unfinished secret list is answered on another surface than
  // the step sheet, so this action cannot open a confirmable sheet. The other
  // blockers (info, role, drunk, redirect) are answered inside the sheet and
  // must keep it reachable.
  const ringBlocker =
    context?.blockers.find((blocker) => blocker === "targets" || blocker === "secrets") ?? null;
  const blocked = ringBlocker !== null;

  return (
    <footer
      className="relative z-20 w-full border-t border-edge bg-crypt-2 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgba(0,0,0,.35)]"
      data-table-dock
      data-phase={state.phase}
      aria-label={t("table")}
    >
      <div className="mx-auto grid w-full max-w-[900px] gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-b border-edge/70 pb-1.5">
          <div
            data-dock-phase
            className="flex items-center gap-1 whitespace-nowrap rounded-sm border border-table-rim bg-table-chip px-2 py-1 text-[12px] uppercase tracking-[.1em]"
          >
            <span className={state.phase === "day" ? "text-table-secondary" : "text-table-muted"}>
              {t("day")} {state.day.number}
            </span>
            <span aria-hidden="true">·</span>
            <span className={state.phase === "night" ? "text-table-secondary" : "text-table-muted"}>
              {t("night")} {state.night.number}
            </span>
          </div>
          <span className="min-w-0 flex-1 whitespace-nowrap text-[12px] uppercase tracking-[.08em] text-table-muted max-[460px]:order-last max-[460px]:w-full max-[460px]:flex-none">
            {t("ui.aliveCount")} {livingPlayers(state).length} · {t("ui.deadCount")}{" "}
            {orderedPlayers(state).length - livingPlayers(state).length}
          </span>
          {drafts.timerEnd ? (
            <span
              className="shrink-0 text-[11px] tabular-nums tracking-[.04em] text-text"
              data-timer
            >
              {timerText(drafts.timerEnd, actions.now)}
            </span>
          ) : null}
          <button
            className={`${ICON_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
            type="button"
            data-act="undo"
            aria-label={t("undo")}
            title={t("undo")}
            disabled={!ports.history.canUndo()}
            onClick={actions.undo}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
              className="size-5"
            >
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>
          <button
            className={`${ICON_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
            type="button"
            data-act="redo"
            aria-label={t("redo")}
            title={t("redo")}
            disabled={!ports.history.canRedo()}
            onClick={actions.redo}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
              className="size-5"
            >
              <path d="m15 14 5-5-5-5" />
              <path d="M20 9H10a6 6 0 0 0 0 12h3" />
            </svg>
          </button>
          <button
            className={ICON_BUTTON}
            type="button"
            data-act="roster"
            aria-label={t("roster")}
            onClick={() => drafts.setOverlay("roster")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
              className="size-5"
            >
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M18 19a5.4 5.4 0 0 0-2.4-4.5" />
            </svg>
          </button>
          <button
            className={ICON_BUTTON}
            type="button"
            data-act="menu"
            aria-label={t("tableMenu")}
            onClick={() => drafts.setOverlay("menu")}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-5">
              <circle cx="5" cy="12" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="19" cy="12" r="1.7" />
            </svg>
          </button>
        </div>

        <p
          className="m-0 flex items-start gap-1.5 text-[13px] leading-[1.4] text-table-muted"
          data-dock-hint
        >
          <span
            aria-hidden="true"
            className="mt-[6px] size-1.5 shrink-0 rounded-full bg-table-primary"
          />
          <span className="min-w-0">
            <b className="text-text" data-dock-step>
              {dockStep}
            </b>
            {state.phase === "night" && step ? (
              <span className="text-muted">
                {" "}
                · {projection.progress.done + 1} / {projection.progress.total}
              </span>
            ) : null}
            {hint && hint !== dockStep ? <> — {hint}</> : null}
            {nextWake ? (
              <span className="text-muted"> · {t("ui.nextWake", { name: nextWake })}</span>
            ) : null}
          </span>
        </p>

        {isManualScript(state.script) && (state.phase === "night" || state.phase === "day") ? (
          <p className="manual-warning m-0 text-[12px] leading-tight text-table-secondary">
            {t("manualOnlyWarning")}
          </p>
        ) : null}

        {context && effects.length ? (
          <div className="grid gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-table-muted">
              {t("ui.activeEffects")}
            </span>
            <span className="flex flex-wrap gap-1">
              {effects.slice(0, 4).map((effect) => {
                const key = "ui.effect." + effect.kind;
                const label = t(key);
                return (
                  <span
                    key={effect.id}
                    data-effect={effect.kind}
                    className="rounded-sm border border-table-rim px-1.5 py-px text-[12px] text-table-muted"
                  >
                    {label === key ? effect.kind : label}
                  </span>
                );
              })}
            </span>
          </div>
        ) : null}

        {context?.blockers.length ? (
          <ul className="m-0 grid list-none gap-1 p-0 text-[12px] leading-tight text-table-secondary">
            {context.blockers.map((blocker) => (
              <li key={blocker} data-blocker-reason={blocker}>
                {blockerText(blocker, context.minTargets, t)}
              </li>
            ))}
          </ul>
        ) : null}

        {hasPreview && singlePreview ? (
          <ConsequenceList
            outcome={singlePreview}
            targets={previewTargets}
            state={state}
            ports={ports}
            suppressRejection={quietSelection}
            rejectionCopy={
              state.phase === "day" && rejectionOf(singlePreview)?.code === "error.66"
                ? t("ui.madnessTransitionBlock")
                : undefined
            }
          />
        ) : null}

        {!effects.length &&
        !hasPreview &&
        !blocked &&
        (state.phase === "night" || state.phase === "day") ? (
          <p className="m-0 text-[12px] leading-tight text-table-muted" data-dock-quiet>
            {t("ui.quietStep")}
          </p>
        ) : null}

        {rejectionOf(outcome)?.code === "error.77" ? (
          <button
            className="btn btn--accent min-h-11"
            type="button"
            data-act="choose-twin-partner"
            onClick={() => {
              if (projection.twinHolderId) {
                actions.openCorrection(projection.twinHolderId, "twin");
              }
            }}
          >
            {t("ui.chooseTwinPartner")}
          </button>
        ) : null}

        {stepPreview?.result?.noDeath ? (
          <p
            className="m-0 text-[12px] leading-tight text-table-secondary"
            data-warning="prevented"
          >
            {stepPreview.result.reason || t("ui.consequence.prevented")}
          </p>
        ) : null}
        {state.mastermind?.active && state.mastermind.extraDay ? (
          <p
            className="m-0 text-[12px] leading-tight text-table-secondary"
            data-warning="mastermind"
          >
            {t("ui.mastermindExtraDay")}
          </p>
        ) : null}
        {saintWarning ? (
          <p className="m-0 text-[12px] leading-tight text-table-secondary" data-warning="saint">
            {t("ui.saintExecution")}
          </p>
        ) : null}
        {state.phase === "day" &&
        !state.day.execution &&
        !state.day.ended &&
        registeredDead.length ? (
          <p className="m-0 text-[12px] leading-tight text-table-secondary" data-warning="zombuul">
            {t("ui.zombuulExecution", {
              names: registeredDead.map((player) => displayName(player, t)).join(", "),
            })}
          </p>
        ) : null}
        {step?.previousTarget ? (
          <p
            className="m-0 text-[12px] leading-tight text-table-secondary"
            data-dock-previous-target
          >
            {t("ui.previousTargetBlocked", {
              name: displayName(playerById(state, step.previousTarget), t),
            })}
          </p>
        ) : null}

        <div className="grid gap-1.5 border-t border-edge pt-2">
          {heir ? (
            <div data-dock-heir>
              <HeirChoice view={view} pending={heir} />
            </div>
          ) : state.phase === "night" && step ? (
            <>
              <div
                className={
                  projection.skippable || poNoOne ? "grid grid-cols-2 gap-1.5" : "grid gap-1.5"
                }
              >
                {ringBlocker === "secrets" ? (
                  <a
                    className={`${ACTION_PRIMARY} inline-flex`}
                    data-act="open-secrets"
                    href={ports.router.path("secrets")}
                  >
                    {t("ui.needSecrets")}
                  </a>
                ) : (
                  <DockButton
                    className={ACTION_PRIMARY}
                    act="complete"
                    disabled={blocked}
                    title={
                      ringBlocker && context
                        ? blockerText(ringBlocker, context.minTargets, t)
                        : undefined
                    }
                    onClick={() => drafts.setOverlay("step")}
                  >
                    {ringBlocker ? blockerActionText(ringBlocker, t) : t("ui.action")}
                  </DockButton>
                )}
                {projection.skippable ? (
                  <DockButton
                    className={ACTION_SECONDARY}
                    act="skip"
                    onClick={() => actions.run({ type: "skipStep", payload: { key: step.key } })}
                  >
                    {t("skipWake")}
                  </DockButton>
                ) : poNoOne ? (
                  <DockButton
                    className={ACTION_SECONDARY}
                    act="no-one"
                    onClick={() => {
                      const payload = { key: step.key, targetIds: [] };
                      actions.run({
                        type: "completeNightStep",
                        payload,
                        ...previewIdentity(actions.preview({ type: "completeNightStep", payload })),
                      });
                    }}
                  >
                    {t("ui.noOne")}
                  </DockButton>
                ) : null}
              </div>
              <DockButton
                className={ACTION_QUIET}
                act="reset-step"
                disabled={!context?.selected.length && !context?.redirect && !context?.given}
                onClick={() => {
                  if (!context) return;
                  drafts.dropTargets(context.draftKey);
                  drafts.dropRedirect(context.draftKey);
                  drafts.dropGiven(context.draftKey);
                  drafts.dropRegistrations(context.draftKey);
                  drafts.clearStep(context.draftKey);
                }}
              >
                {t("ui.resetStep")}
              </DockButton>
            </>
          ) : state.phase === "night" ? (
            <DockButton
              className={ACTION_PRIMARY}
              act="end-night"
              onClick={() =>
                actions.run({
                  type: "endNight",
                  payload: {},
                  ...previewIdentity(nightEndPreview),
                })
              }
            >
              {t("finishNight")}
            </DockButton>
          ) : state.phase === "day" ? (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <DockButton
                  className={ACTION_DANGER}
                  act="execute"
                  disabled={!canExecute}
                  title={canExecute ? undefined : t("ui.executeNeedsTarget")}
                  onClick={() => {
                    if (!canExecute) return;
                    drafts.setOverlay("execute");
                  }}
                >
                  {t("execute")}
                </DockButton>
                <DockButton
                  className={ACTION_PRIMARY}
                  act="end-day"
                  onClick={() => {
                    drafts.setExecuteTarget("");
                    actions.run({
                      type: "endDay",
                      payload: {},
                      ...previewIdentity(dayEndPreview),
                    });
                  }}
                >
                  {executed || state.day.ended || state.day.execution
                    ? t("endDay")
                    : t("noExecution")}
                </DockButton>
              </div>
              {survivalProjection(state, drafts.executeTarget) ? (
                <label className="flex min-h-11 items-center gap-1.5 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    data-exec-survives
                    checked={drafts.executeSurvives}
                    onChange={(event) => drafts.setExecuteSurvives(event.target.checked)}
                  />
                  <span>{t("ui.pacifistSurvives")}</span>
                </label>
              ) : null}
              <DockButton
                className={ACTION_OUTLINE}
                act="day-help"
                onClick={() => drafts.setOverlay("day")}
              >
                {t("ui.dayHelp")} · {helpCount}
              </DockButton>
            </>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

function DockButton({
  className,
  act,
  disabled = false,
  title,
  onClick,
  children,
}: {
  className: string;
  act: string;
  disabled?: boolean;
  title?: string | undefined;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button
      className={className}
      type="button"
      data-act={act}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
