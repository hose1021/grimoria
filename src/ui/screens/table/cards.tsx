// The phase cards: night, day, deal/setup and the over/review card. Each card
// reads the published state and the draft hook; it keeps no state of its own.
import {
  mayorRedirectNeeded,
  madnessReviewProjection,
  poisonChoicesProjection,
  progressProjection,
  secretsProjection,
  seatProjection,
  shownRoleChoices,
  stepProjection,
  tableProjection,
  targetBounds,
} from "../../../application/read-models/table.ts";
import { useEffect, useMemo, useState } from "react";
import { livingPlayers, orderedPlayers, playerById } from "../../../core/model/state.ts";
import { ALL_ROLES, isManualScript } from "../../../core/model/rules.ts";
import { roleSupportEntries } from "../../../core/model/support.ts";
import type { GameState, NightStep } from "../../../core/model/types.ts";
import {
  applyGiven,
  causeText,
  consequencesOf,
  displayName,
  infoPayload,
  infoText,
  previewIdentity,
  rejectionOf,
  roleNameOf,
  stepBlockers,
  stepTitle,
  targetNames,
} from "./helpers.ts";
import type { StepBlocker, StepInfo } from "./helpers.ts";
import { Warn } from "./parts.tsx";
import { writeStepDraft } from "./step-draft.ts";
import type { StepDraft } from "./step-draft.ts";
import type { PreviewOutcome, ShellPorts } from "../../ports.ts";
import type { TableView } from "./view.ts";
import {
  ACTIONS,
  ALERT,
  ALERT_BAD,
  CARD,
  CARD_LINE,
  CARD_TEXT,
  CARD_TITLE,
  CHECK,
  CHIP,
  CHIPS,
  FIELD_BOX,
  INFO_PREVIEW,
  INLINE,
  MUTED,
  NIGHT_CARD,
  DAY_CARD,
  OVER_CARD,
  PRIMARY,
  SECTION,
  TARGET,
  TARGET_GRID,
  TARGET_OFF,
  TARGET_ON,
  WARNING,
} from "./styles.ts";

type PendingOption = { id: string; name: string; roleId: string };

/** Shows the engine preview as the six separated consequence states. */
function ConsequenceList({
  outcome,
  targets,
  state,
  ports,
}: {
  outcome: PreviewOutcome | null;
  targets: string[];
  state: GameState;
  ports: ShellPorts;
}) {
  const t = ports.strings.t;
  const lines = consequencesOf(outcome, targets);
  const rejection = rejectionOf(outcome);
  return (
    <div className={`${SECTION} grid gap-1`} data-preview>
      <span className="label">{t("ui.consequences")}</span>
      {rejection ? (
        <p className={`${ALERT} ${ALERT_BAD} m-0`} data-preview-reason>
          {rejection.code === "error.66"
            ? t("ui.madnessTransitionBlock")
            : rejection.text || t("setupErrors")}
        </p>
      ) : null}
      {lines.length ? (
        <ul className="m-0 grid list-none gap-1 p-0">
          {lines.map((line) => (
            <li key={line.kind} className={MUTED} data-consequence={line.kind}>
              <b>{t("ui.consequence." + line.kind)}</b>
              {line.playerIds.length ? ": " + targetNames(line.playerIds, state, t) : ""}
            </li>
          ))}
        </ul>
      ) : rejection ? null : (
        <p className={MUTED}>{t("ui.previewEmpty")}</p>
      )}
    </div>
  );
}

function stepBlockerText(blocker: StepBlocker, minTargets: number, t: ShellPorts["strings"]["t"]) {
  if (blocker === "targets") return t("ui.blockTargets", { count: minTargets });
  if (blocker === "secrets") return t("ui.blockSecrets");
  if (blocker === "given") return t("ui.blockGiven");
  return t("ui.blockRedirect");
}

function effectName(kind: string, t: ShellPorts["strings"]["t"]): string {
  const key = "ui.effect." + kind;
  const label = t(key);
  return label === key ? kind : label;
}

export function MainCard({ view }: { view: TableView }) {
  const { state } = view;
  if (state.phase === "over") return <OverCard view={view} />;
  if (state.phase === "night") return <NightCard view={view} />;
  // A new day or a new game remounts the card, so its execution drafts start
  // clean instead of carrying a survival choice from the previous one.
  if (state.phase === "day")
    return <DayCard key={`${state.createdAt}:${state.day.number}`} view={view} />;
  if (state.phase === "setup" && !state.setup.roles.length) return <SetupPrompt view={view} />;
  return <DealCard view={view} />;
}

export function NightCard({ view }: { view: TableView }) {
  const { state, ports, actions, viewVersion } = view;
  const t = ports.strings.t;
  const endPreview = useMemo(
    () => actions.preview({ type: "endNight", payload: {} }),
    [actions.preview, viewVersion],
  );
  const { step, progress, pendingDemonChange } = tableProjection(state);
  const pending = pendingDemonChange as {
    key: string;
    pending?: { options?: PendingOption[] };
  } | null;

  if (pending) {
    const options = pending.pending ? pending.pending.options || [] : [];
    return (
      <section className={`host-card is-night ${NIGHT_CARD}`}>
        {bmrWarning(view)}
        <p className="label">{t("pendingHeir")}</p>
        <h1 className={CARD_TITLE}>{t("pendingHeirText")}</h1>
        <div className={TARGET_GRID}>
          {options.map((option) => (
            <button
              key={option.id}
              className={TARGET}
              type="button"
              data-heir={pending.key}
              data-id={option.id}
              onClick={() =>
                actions.run({
                  type: "chooseDemonHeir",
                  payload: { stepKey: pending.key, heirId: option.id },
                })
              }
            >
              {option.name}
              <small className="mt-0.5 block text-[12px] text-muted">
                {roleNameOf(option.roleId, ports.roles.byId)}
              </small>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (!step) {
    return (
      <section className={`host-card is-night ${NIGHT_CARD}`}>
        {manualWarning(view)}
        {bmrWarning(view)}
        <p className="label">
          {t("night")} {state.night.number}
        </p>
        <h1 className={CARD_TITLE}>{state.night.queue.length ? t("ui.allDone") : t("noWake")}</h1>
        <p className={CARD_TEXT}>
          {t("check")}: {progress.done} / {progress.total}.
        </p>
        <ConsequenceList outcome={endPreview} targets={[]} state={state} ports={ports} />
        <button
          className={`btn btn--accent ${PRIMARY}`}
          type="button"
          data-act="end-night"
          onClick={() =>
            actions.run({
              type: "endNight",
              payload: {},
              ...previewIdentity(endPreview),
            })
          }
        >
          {t("finishNight")}
        </button>
      </section>
    );
  }

  return <StepCard view={view} step={step} />;
}

function StepCard({ view, step }: { view: TableView; step: NightStep }) {
  const { state, drafts, ports, actions, viewVersion } = view;
  const t = ports.strings.t;
  const progress = progressProjection(state);
  const guide = ports.guidance.for(step);
  const role = step.roleId ? ports.roles.byId(step.roleId) : null;
  const roleSupport = step.roleId ? roleSupportEntries([step.roleId])[0] : undefined;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const key = step.key;
  // Drafts are namespaced by game and night: a replaced game or the next night
  // must never inherit a target or an answer from the previous one.
  const draftKey = `${state.createdAt}:${state.night.number}:${key}`;
  const registrations = drafts.registrations.get(draftKey) || {};
  const selected = drafts.targets.get(draftKey) || [];
  const derived = stepProjection(state, step, { targetIds: selected, registrations });
  const info = derived.info;
  const given = drafts.givens.get(draftKey);
  const needsSetup = Boolean(info.missing);
  const { min: minTargets, max: maxTargets } = targetBounds(step);
  const targetsIncomplete = selected.length < minTargets || selected.length > maxTargets;
  const selectedPlayer = selected[0] ? playerById(state, selected[0]) : null;
  const deadImpTarget = step.roleId === "imp" && selectedPlayer !== null && !selectedPlayer.alive;
  const targetIsMayor = derived.needsRedirect;
  const redirect = drafts.redirects.get(draftKey);
  const needsRedirect = Boolean(targetIsMayor && !redirect);
  const blockers = stepBlockers({
    needsSetup,
    targetsIncomplete,
    needsGiven: Boolean(info.needsChoice && !given && !targetsIncomplete),
    needsRedirect,
  });
  const stepEffects = derived.effects;
  const poisonChoices =
    step.roleId === "vigormortis"
      ? poisonChoicesProjection(state, drafts.bmrDeaths.get(draftKey) || [])
      : [];
  const payload = {
    key,
    targetIds: selected,
    redirectId: redirect || null,
    registrations,
    given: infoPayload(drafts.givens.get(draftKey) || null),
    resurrectId: drafts.bmrResurrect.get(draftKey) || null,
    roleId: drafts.bmrRoles.get(draftKey) || null,
    drunkId: drafts.bmrDrunk.get(draftKey) || null,
    poisonId: drafts.bmrPoison.get(draftKey) || poisonChoices[0] || null,
    deathIds: drafts.bmrDeaths.get(draftKey) || [],
  };
  const previewKey = JSON.stringify(payload);
  const preview = useMemo(
    () => actions.preview({ type: "completeNightStep", payload }),
    // Payload content and the store publication decide the preview; undo and a
    // mounted correction change the publication, not the draft text.
    [actions.preview, previewKey, viewVersion],
  );

  // Recovery aid: the untouched draft of this step survives a reload. It is
  // not a game mutation, so it never enters the store or the undo history.
  const storedDraft: StepDraft = {
    key: draftKey,
    targets: selected,
    redirect: redirect ?? null,
    registrations,
    given: given ?? null,
    bmrDeaths: drafts.bmrDeaths.get(draftKey) || [],
    bmrResurrect: drafts.bmrResurrect.get(draftKey) || null,
    bmrRoles: drafts.bmrRoles.get(draftKey) || null,
    bmrDrunk: drafts.bmrDrunk.get(draftKey) || null,
    bmrPoison: drafts.bmrPoison.get(draftKey) || poisonChoices[0] || null,
  };
  const storedDraftText = JSON.stringify(storedDraft);
  useEffect(() => {
    writeStepDraft(ports.prefs.write, storedDraft);
  }, [ports.prefs.write, draftKey, storedDraftText]);

  const toggleTarget = (id: string) => {
    const list = selected.slice();
    const before = list[0];
    const at = list.indexOf(id);
    if (at !== -1) list.splice(at, 1);
    else if (step.targetMode === "two") {
      if (list.length >= 2) list.shift();
      list.push(id);
    } else list.splice(0, list.length, id);
    drafts.putTargets(draftKey, list);
    if (before !== list[0]) drafts.dropRedirect(draftKey);
    if (mayorRedirectNeeded(state, step, list[0] || "") && !drafts.redirects.has(draftKey)) {
      drafts.putRedirect(draftKey, "none");
    }
  };

  const complete = () => {
    const result = actions.run({
      type: "completeNightStep",
      payload,
      ...previewIdentity(preview),
    });
    if (result.status === "allowed") {
      drafts.clearStep(draftKey);
      writeStepDraft(ports.prefs.write, null);
    }
  };

  return (
    <section className={`host-card is-night ${NIGHT_CARD}`} data-step={key}>
      {manualWarning(view)}
      {bmrWarning(view)}
      <div className="flex items-center justify-between gap-2">
        <p className="label">
          {t("night")} {state.night.number} · {t("step")} {progress.done + 1} / {progress.total}
        </p>
        {role ? <span className={CHIP}>{ports.strings.teamText(role.team)}</span> : null}
      </div>
      <h1 className={CARD_TITLE}>
        {stepTitle(step, ports.roles.byId, t)}
        {actor ? (
          <small className="text-[.48em] font-medium text-muted"> · {displayName(actor, t)}</small>
        ) : null}
      </h1>
      {step.deadTonight ? <p className={`${ALERT} text-[#f0b5b5]`}>{t("ui.deadWake")}</p> : null}
      {derived.actorImpaired ? (
        <p className={`${ALERT} text-[#f0b5b5]`}>{t("ui.impaired")}</p>
      ) : null}
      {roleSupport ? (
        <p
          className={MUTED}
          data-role-support={roleSupport.roleId}
          data-status={roleSupport.status}
        >
          <b>{t("roleSupport")}:</b> {t("roleSupport." + roleSupport.status)}.{" "}
          {t(roleSupport.detail)}
        </p>
      ) : null}

      <div className="my-2 grid gap-1.5" data-step-summary>
        <p className={MUTED}>
          {t("ui.stepWakes", {
            name: actor ? displayName(actor, t) : stepTitle(step, ports.roles.byId, t),
          })}
        </p>
        <p className={MUTED}>
          <b>{t("ui.stepAllowed")}:</b> {guide.host || guide.check}
        </p>
        <p className={MUTED}>
          {t("ui.chosenTargets", { names: targetNames(selected, state, t) || "—" })}
        </p>
        <div className="grid gap-1">
          <span className="label">{t("ui.activeEffects")}</span>
          {stepEffects.length ? (
            <span className={CHIPS}>
              {stepEffects.map((effect) => (
                <span key={effect.id} className={CHIP} data-effect={effect.kind}>
                  {effectName(effect.kind, t)}
                </span>
              ))}
            </span>
          ) : (
            <p className={MUTED}>{t("ui.noActiveEffects")}</p>
          )}
        </div>
      </div>

      <details
        className="my-2.5 overflow-hidden rounded-[10px] border border-line bg-[#0b1013]"
        open={drafts.guided}
        data-guide
        onToggle={(event) => actions.toggleGuided(event.currentTarget.open)}
      >
        <summary className="min-h-11 cursor-pointer p-2.5 text-[14px]">
          {t("guidedInstructions")}
        </summary>
        {guideRow(t("hostAction"), guide.host)}
        {guideRow(t("playerAction"), guide.player)}
        {guideRow(t("grimoireNote"), guide.grimoire)}
        {guideRow(t("publicLine"), guide.publicLine)}
        {guideRow(t("check"), guide.check)}
      </details>

      {step.targetMode !== "none" ? (
        <div className={SECTION}>
          <span className="label">
            {step.targetMode === "two" ? t("chooseTwo") : t("chooseTarget")}
          </span>
          <div className={TARGET_GRID}>
            {orderedPlayers(state).map((player) => {
              const on = selected.includes(player.id);
              const disabled =
                (step.targetMode === "one-other" && player.id === step.actorId) ||
                (step.sv &&
                  ["dreamer", "seamstress"].includes(String(step.roleId)) &&
                  player.id === step.actorId) ||
                (step.sv && step.roleId === "snakecharmer" && !player.alive) ||
                step.previousTarget === player.id ||
                (step.bmr &&
                  step.targetMode === "one-any" &&
                  step.canResurrect &&
                  !player.alive &&
                  step.roleId !== "moonchild" &&
                  String(step.roleId) !== "professor");
              return (
                <button
                  key={player.id}
                  className={`${TARGET} ${on ? TARGET_ON : ""} ${disabled ? TARGET_OFF : ""}`}
                  type="button"
                  data-target={key}
                  data-id={player.id}
                  disabled={disabled}
                  onClick={() => toggleTarget(player.id)}
                >
                  <span className="block text-[12px]">
                    {player.seat} · {displayName(player, t)}
                  </span>
                  <small className="mt-0.5 block text-[12px] text-muted">
                    {player.alive ? roleNameOf(player.roleId, ports.roles.byId) : t("dead")}
                  </small>
                </button>
              );
            })}
          </div>
          {selected.length ? (
            <p className={MUTED}>
              {t("target")}: {targetNames(selected, state, t)}
            </p>
          ) : null}
          {deadImpTarget ? <p className={WARNING}>{t("ui.deadTarget")}</p> : null}
        </div>
      ) : null}

      {targetIsMayor ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("forced")}</span>
          <select
            className="field"
            data-redirect={key}
            value={redirect || "none"}
            onChange={(event) => drafts.putRedirect(draftKey, event.target.value || "none")}
          >
            <option value="none">{t("ui.mayorDies")}</option>
            {orderedPlayers(state)
              .filter((player) => player.id !== selected[0])
              .map((player) => (
                <option key={player.id} value={player.id}>
                  {!player.alive
                    ? t("mayorRedirectDead", { name: displayName(player, t) })
                    : seatProjection(state, player.id).safeFromAttack
                      ? t("mayorRedirectProtected", { name: displayName(player, t) })
                      : t("mayorRedirectResult", { name: displayName(player, t) })}
                </option>
              ))}
          </select>
        </label>
      ) : null}

      <RegistrationStep view={view} step={step} draftKey={draftKey} />

      {step.infoKind !== "none" ? (
        <div className={SECTION}>
          <span className="label">{t("computed")}</span>
          <div className={INFO_PREVIEW}>
            {needsSetup
              ? t("ui.needsSecrets")
              : targetsIncomplete
                ? t("ui.targetFirst")
                : infoText(state, step, given || info, ports.roles.byId, t)}
          </div>
          {!targetsIncomplete ? (
            <GivenSelect view={view} step={step} info={info} draftKey={draftKey} />
          ) : null}
          {given ? (
            <p className={MUTED}>
              {t("given")}: {infoText(state, step, given, ports.roles.byId, t)}
            </p>
          ) : null}
          {!needsSetup && !targetsIncomplete ? (
            step.roleId === "spy" ? (
              <button
                className="btn"
                type="button"
                data-act="show-grimoire"
                onClick={actions.openGrimoire}
              >
                {t("ui.showGrimoire")}
              </button>
            ) : (
              <button
                className="btn"
                type="button"
                data-act="show-info"
                data-key={key}
                onClick={() => actions.openInfo(key)}
              >
                {t("showCard")}
              </button>
            )
          ) : null}
        </div>
      ) : null}

      {needsSetup ? (
        <Warn title={t("setupErrors")} bad>
          <p>{t("secretsIntro")}</p>
          <a className="btn" href={ports.router.path("secrets")}>
            {t("secrets")}
          </a>
        </Warn>
      ) : null}

      <BmrOutcome view={view} step={step} draftKey={draftKey} />

      <ConsequenceList outcome={preview} targets={selected} state={state} ports={ports} />

      {blockers.length ? (
        <div className={`${ALERT} ${ALERT_BAD}`} data-blocker={key}>
          <b>{t("ui.blockedTitle")}</b>
          <ul className="m-0 mt-1 list-disc pl-4">
            {blockers.map((blocker) => (
              <li key={blocker} data-blocker-reason={blocker}>
                {stepBlockerText(blocker, minTargets, t)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={ACTIONS}>
        <button
          className={`btn btn--accent ${PRIMARY}`}
          type="button"
          data-act="complete"
          data-key={key}
          disabled={blockers.length > 0}
          onClick={complete}
        >
          {t("completeStep")}
        </button>
        <button
          className="btn"
          type="button"
          data-act="skip"
          data-key={key}
          onClick={() => skipStep(view, key)}
        >
          {t("skipStep")}
        </button>
        <button
          className="btn"
          type="button"
          data-act="reset-step"
          data-key={key}
          onClick={() => {
            drafts.dropTargets(draftKey);
            drafts.dropRedirect(draftKey);
            drafts.dropGiven(draftKey);
            drafts.dropRegistrations(draftKey);
            drafts.clearStep(draftKey);
          }}
        >
          {t("ui.resetStep")}
        </button>
      </div>
    </section>
  );
}

function skipStep(view: TableView, key: string) {
  const reason = window.prompt(view.ports.strings.t("ui.skipReason"));
  if (!reason) return;
  view.actions.run({ type: "skipStep", payload: { key, reason } });
}

function guideRow(label: string, text: string | undefined) {
  return (
    <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-2 border-t border-line px-[10px] py-[7px] first:border-t-0 max-[640px]:grid-cols-1 max-[640px]:gap-px">
      <span className="label whitespace-nowrap">{label}</span>
      <p className="m-0 text-[16px] leading-[1.45]">{text || "—"}</p>
    </div>
  );
}

function manualWarning(view: TableView) {
  const { state, ports } = view;
  if (!isManualScript(state.script)) return null;
  return (
    <Warn title={ports.strings.t("manualOnlyTitle")} className="manual-warning">
      <p>{ports.strings.t("manualOnlyWarning")}</p>
    </Warn>
  );
}

function bmrWarning(view: TableView) {
  const { state, ports } = view;
  const edition = state.script ? state.script.edition : "tb";
  if (edition !== "bmr" && edition !== "snv") return null;
  return (
    <Warn title={ports.strings.t("bmrHostWarningTitle")} className="bmr-warning">
      <p>{ports.strings.t(edition === "snv" ? "svHostWarning" : "bmrHostWarning")}</p>
    </Warn>
  );
}

function RegistrationStep({
  view,
  step,
  draftKey,
}: {
  view: TableView;
  step: NightStep;
  draftKey: string;
}) {
  const { state, drafts, ports } = view;
  const t = ports.strings.t;
  const relevant = orderedPlayers(state).filter(
    (player) => player.roleId === "spy" || player.roleId === "recluse",
  );
  if (!relevant.length) return null;
  const regs = drafts.registrations.get(draftKey) || {};
  const setReg = (playerId: string, value: string, checked: boolean) => {
    const next = { ...regs };
    if (checked) next[playerId] = value;
    else delete next[playerId];
    drafts.putRegistrations(draftKey, next);
  };
  if (step.roleId === "chef" || step.roleId === "empath") {
    return (
      <div className="mb-2 grid gap-1">
        <span className="label">{t("registration")}</span>
        {relevant.map((player) => {
          const spy = player.roleId === "spy";
          const value = spy ? "good" : "evil";
          return (
            <label key={player.id} className={CHECK}>
              <input
                type="checkbox"
                className="mt-0.5"
                data-reg={step.key}
                data-reg-player={player.id}
                data-reg-value={value}
                checked={regs[player.id] === value}
                onChange={(event) => setReg(player.id, value, event.target.checked)}
              />
              <span>
                {spy ? t("ui.spyGood") : t("recluseEvil")}: {displayName(player, t)}
              </span>
            </label>
          );
        })}
      </div>
    );
  }
  if (step.roleId === "fortuneteller") {
    return (
      <div className="mb-2 grid gap-1">
        <span className="label">{t("registration")}</span>
        {relevant
          .filter((player) => player.roleId === "recluse")
          .map((player) => (
            <label key={player.id} className={CHECK}>
              <input
                type="checkbox"
                className="mt-0.5"
                data-reg={step.key}
                data-reg-player={player.id}
                data-reg-value="demon"
                checked={regs[player.id] === "demon"}
                onChange={(event) => setReg(player.id, "demon", event.target.checked)}
              />
              <span>
                {t("recluseDemon")}: {displayName(player, t)}
              </span>
            </label>
          ))}
      </div>
    );
  }
  return null;
}

function GivenSelect({
  view,
  step,
  info,
  draftKey,
}: {
  view: TableView;
  step: NightStep;
  info: StepInfo;
  draftKey: string;
}) {
  const { state, drafts, ports } = view;
  const t = ports.strings.t;
  if (!info.needsChoice) return null;
  let options: Array<string | number | boolean> = [];
  let kind = "number";
  if (info.kind === "number") {
    options =
      info.options && info.options.length
        ? (info.options as Array<string | number | boolean>)
        : Array.from({ length: orderedPlayers(state).length + 1 }, (_, index) => index);
  } else if (info.kind === "yes-no") {
    kind = "bool";
    options =
      info.options && info.options.length
        ? (info.options as Array<string | number | boolean>)
        : [true, false];
  } else if (info.kind === "character") {
    kind = "role";
    options =
      info.options && info.options.length
        ? (info.options as Array<string | number | boolean>)
        : info.playerId
          ? shownRoleChoices(state, info.playerId)
          : ALL_ROLES;
  } else if (info.kind === "one-of-two") {
    kind = "role";
    options =
      info.options && info.options.length
        ? (info.options as Array<string | number | boolean>)
        : ALL_ROLES;
  }
  if (!options.length) return null;
  return (
    <label className={FIELD_BOX}>
      <span className="label">{t("falseInfo")}</span>
      <select
        className="field"
        data-given={step.key}
        data-given-kind={kind}
        value=""
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw) {
            drafts.dropGiven(draftKey);
            return;
          }
          const next = applyGiven(info, raw, kind);
          if (next) drafts.putGiven(draftKey, next);
        }}
      >
        <option value="">
          {t("computed")}: {infoText(state, step, info, ports.roles.byId, t)}
        </option>
        {options.map((value) => (
          <option key={String(value)} value={String(value)}>
            {kind === "role"
              ? roleNameOf(String(value), ports.roles.byId)
              : kind === "bool"
                ? value
                  ? t("yes")
                  : t("no")
                : String(value)}
          </option>
        ))}
      </select>
    </label>
  );
}

function BmrOutcome({
  view,
  step,
  draftKey,
}: {
  view: TableView;
  step: NightStep;
  draftKey: string;
}) {
  const { state, drafts, ports } = view;
  const t = ports.strings.t;
  if (!step.bmr && !step.sv) return null;
  const dead = orderedPlayers(state).filter((player) => !player.alive);
  const deaths = drafts.bmrDeaths.get(draftKey) || [];
  const chosenDeath = drafts.bmrResurrect.get(draftKey) || "";
  const poisonChoices = step.roleId === "vigormortis" ? poisonChoicesProjection(state, deaths) : [];
  const key = step.key;
  return (
    <div className={`${SECTION} grid gap-1`}>
      <span className="label">{t("bmrOutcome")}</span>
      <p className={MUTED}>{t(step.roleId === "pukka" ? "bmrPukkaAuto" : "bmrHostRuns")}</p>
      {step.canKill ? (
        <>
          <div className={TARGET_GRID}>
            {orderedPlayers(state)
              .filter((player) => player.alive)
              .map((player) => (
                <button
                  key={player.id}
                  className={`${TARGET} ${deaths.includes(player.id) ? TARGET_ON : ""}`}
                  type="button"
                  data-bmr-death={key}
                  data-id={player.id}
                  onClick={() => {
                    const list = deaths.slice();
                    const at = list.indexOf(player.id);
                    if (at === -1) list.push(player.id);
                    else list.splice(at, 1);
                    drafts.putBmrDeaths(draftKey, list);
                  }}
                >
                  <span className="block text-[12px]">
                    {player.seat} · {displayName(player, t)}
                  </span>
                  <small className="mt-0.5 block text-[12px] text-muted">
                    {roleNameOf(player.roleId, ports.roles.byId)}
                  </small>
                </button>
              ))}
          </div>
          <p className={MUTED}>
            {t("bmrDeaths")}: {targetNames(deaths, state, t) || "—"}
          </p>
        </>
      ) : null}
      {poisonChoices.length ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("bmrPoisonChoice")}</span>
          <select
            className="field"
            data-bmr-poison={key}
            value={drafts.bmrPoison.get(draftKey) || poisonChoices[0] || ""}
            onChange={(event) => drafts.putBmrPoison(draftKey, event.target.value || null)}
          >
            {poisonChoices.map((id) => {
              const player = playerById(state, id);
              return (
                <option key={id} value={id}>
                  {player ? displayName(player, t) : id}
                </option>
              );
            })}
          </select>
        </label>
      ) : null}
      {Array.isArray(step.roleChoices) && step.roleChoices.length ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("bmrRoleChoice")}</span>
          <select
            className="field"
            data-bmr-role={key}
            value={drafts.bmrRoles.get(draftKey) || ""}
            onChange={(event) => drafts.putBmrRole(draftKey, event.target.value || null)}
          >
            <option value="">{t("ui.chooseRole")}</option>
            {(step.roleChoices as unknown[]).map((id) => (
              <option key={String(id)} value={String(id)}>
                {roleNameOf(String(id), ports.roles.byId)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {(step.roleId === "sailor" || step.roleId === "innkeeper") &&
      (drafts.targets.get(draftKey) || []).length ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("bmrDrunkChoice")}</span>
          <select
            className="field"
            data-bmr-drunk={key}
            value={drafts.bmrDrunk.get(draftKey) || ""}
            onChange={(event) => drafts.putBmrDrunk(draftKey, event.target.value || null)}
          >
            <option value="">{t("none")}</option>
            {(drafts.targets.get(draftKey) || []).map((id) => {
              const player = playerById(state, id);
              return (
                <option key={id} value={id}>
                  {player ? displayName(player, t) : id}
                </option>
              );
            })}
          </select>
        </label>
      ) : null}
      {step.canResurrect && dead.length ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("bmrResurrect")}</span>
          <select
            className="field"
            data-bmr-resurrect={key}
            value={chosenDeath}
            onChange={(event) => drafts.putBmrResurrect(draftKey, event.target.value || null)}
          >
            <option value="">{t("none")}</option>
            {dead.map((player) => (
              <option key={player.id} value={player.id}>
                {displayName(player, t)} · {roleNameOf(player.roleId, ports.roles.byId)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function DayCard({ view }: { view: TableView }) {
  const { state, drafts, ports, actions, viewVersion } = view;
  const t = ports.strings.t;
  // Local to the day card: the choice must not survive into the next day.
  const [execSurvives, setExecSurvives] = useState(false);
  const [madnessReasons, setMadnessReasons] = useState<Record<string, string>>({});
  const day = state.day;
  const madnessReviews = madnessReviewProjection(state);
  const executed = day.execution ? playerById(state, day.execution.playerId) : null;
  const living = livingPlayers(state);
  const { threshold, living: livingCount } = tableProjection(state);
  const manual = isManualScript(state.script);
  const pacifistSupport = roleSupportEntries(state.setup.roles || []).find(
    (entry) => entry.roleId === "pacifist",
  );
  const virgin = !manual
    ? orderedPlayers(state).find(
        (player) => player.roleId === "virgin" && player.alive && !player.used.virgin,
      )
    : null;
  const slayer =
    !manual && !day.execution && !day.ended
      ? orderedPlayers(state).find(
          (player) => player.roleId === "slayer" && player.alive && !player.used.slayer,
        )
      : null;
  const canExecute = Boolean(drafts.executeTarget) && !day.execution && !day.ended && !state.winner;
  const endPreview = useMemo(
    () => actions.preview({ type: "endDay", payload: {} }),
    [actions.preview, viewVersion],
  );

  return (
    <section className={`host-card is-day ${DAY_CARD}`} data-step="day">
      {manualWarning(view)}
      {bmrWarning(view)}
      <p className="label">
        {t("day")} {day.number}
      </p>
      <h1 className={CARD_TITLE}>{t("dawn")}</h1>
      <div className="my-2 border-l-2 border-line-2 pl-[9px]">
        <span className="label">{t("morning")}</span>
        <p className={CARD_TEXT}>
          {day.morning.length
            ? `${t("died")}: ${day.morning
                .map((death) => displayName(playerById(state, death.playerId), t))
                .join(", ")}.`
            : t("noDeaths")}
        </p>
        <p className={MUTED}>{t("ui.announceNames")}</p>
      </div>

      {madnessReviews.length ? (
        <div
          className={`${SECTION} grid gap-2 border border-line-2 border-l-2 border-l-accent p-2.5`}
          data-madness-review
        >
          <span className="label">{t("ui.madnessReviewTitle")}</span>
          <p className={`${MUTED} m-0`}>{t("ui.madnessReviewHint")}</p>
          {madnessReviews.map(({ effect, playerId, pending }) => {
            const playerName = displayName(playerById(state, playerId), t);
            const condition =
              effect.madness === "mutant"
                ? t("ui.madnessMutant", { name: playerName })
                : t("ui.madnessCerenovus", {
                    name: playerName,
                    role: roleNameOf(String(effect.roleId || ""), ports.roles.byId),
                  });
            const reason = madnessReasons[effect.id] || "";
            const executed = effect.decidedPenalty === "execute";
            return (
              <div
                key={effect.id}
                className="grid gap-1.5 rounded-[10px] border border-line bg-panel p-2.5"
                data-madness-player={effect.targetId || ""}
                data-madness-status={pending ? "pending" : executed ? "executed" : "reviewed"}
              >
                <b>{condition}</b>
                <p className={`${MUTED} m-0`}>
                  {pending
                    ? t("ui.madnessPending")
                    : executed
                      ? t("ui.madnessReviewedExecute")
                      : t("ui.madnessReviewedNone")}
                </p>
                {!executed ? (
                  <label className="grid gap-1 text-[13px] text-muted">
                    {t("ui.madnessReason")}
                    <input
                      className="field"
                      value={reason}
                      aria-label={t("ui.madnessReason") + ": " + playerName}
                      data-madness-reason={effect.targetId || ""}
                      onChange={(event) =>
                        setMadnessReasons((current) => ({
                          ...current,
                          [effect.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ) : null}
                <div className={INLINE}>
                  {!executed ? (
                    <button
                      className="btn"
                      type="button"
                      data-madness-action="execute"
                      disabled={!reason.trim() || Boolean(day.execution) || day.ended}
                      onClick={() =>
                        actions.run({
                          type: "madnessPenalty",
                          payload: {
                            playerId: String(effect.targetId || ""),
                            effectId: effect.id,
                            penalty: "execute",
                            reason,
                          },
                        })
                      }
                    >
                      {t("ui.madnessExecute")}
                    </button>
                  ) : null}
                  {!executed && effect.decidedPenalty !== "none" ? (
                    <button
                      className="btn"
                      type="button"
                      data-madness-action="none"
                      disabled={!reason.trim()}
                      onClick={() =>
                        actions.run({
                          type: "madnessPenalty",
                          payload: {
                            playerId: String(effect.targetId || ""),
                            effectId: effect.id,
                            penalty: "none",
                            reason,
                          },
                        })
                      }
                    >
                      {t("ui.madnessNone")}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!day.execution && !day.ended ? (
        <div className="my-3 grid gap-1 rounded-[10px] border border-line border-l-2 border-l-accent bg-panel px-3 py-2.5">
          <span className="label">{t("ui.voting")}</span>
          <b className="text-[15px]">
            {t("voteMinimum", { count: threshold, living: livingCount })}
          </b>
          <p className={MUTED}>{t("voteRule")}</p>
        </div>
      ) : null}

      {!day.execution && !day.ended ? (
        <div className="my-2.5 grid gap-1.5 rounded-[10px] border border-line p-2.5">
          <span className="label">{t("ui.executedWho")}</span>
          <div className={INLINE}>
            <select
              className="field min-w-[180px]"
              data-exec-target
              value={drafts.executeTarget}
              onChange={(event) => drafts.setExecuteTarget(event.target.value)}
            >
              <option value="">{t("ui.noExecution")}</option>
              {orderedPlayers(state).map((player) => (
                <option key={player.id} value={player.id}>
                  {displayName(player, t)}
                  {player.alive ? "" : t("ui.alreadyDead")}
                </option>
              ))}
            </select>
            <button
              className="btn btn--accent"
              type="button"
              data-act="execute-direct"
              disabled={!canExecute}
              onClick={() => {
                if (!drafts.executeTarget) return;
                const result = actions.run({
                  type: "executeByDecision",
                  payload: {
                    playerId: drafts.executeTarget,
                    options: { survives: execSurvives },
                  },
                });
                if (result.status === "allowed") {
                  drafts.setExecuteTarget("");
                  setExecSurvives(false);
                }
              }}
            >
              {t("execute")}
            </button>
          </div>
          {state.script &&
          Array.isArray(state.script.roles) &&
          state.script.roles.some((id) =>
            ["pacifist", "sailor", "fool", "devilsadvocate", "zombuul"].includes(id),
          ) ? (
            <label className={CHECK}>
              <input
                type="checkbox"
                data-exec-survives
                checked={execSurvives}
                onChange={(event) => setExecSurvives(event.target.checked)}
              />
              <span>{t("survivesExecution")}</span>
            </label>
          ) : null}
          {pacifistSupport ? (
            <p className={MUTED} data-role-support="pacifist" data-status={pacifistSupport.status}>
              <b>{t("roleSupport")}:</b> {t("roleSupport." + pacifistSupport.status)}.{" "}
              {t(pacifistSupport.detail)}
            </p>
          ) : null}
          <p className={MUTED}>{t("ui.tableVotes")}</p>
        </div>
      ) : null}

      {!manual && virgin && !day.execution && !day.ended ? (
        <form
          className="my-2.5 grid gap-1.5 rounded-[10px] border border-line p-2.5"
          data-virgin-form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            actions.run({
              type: "recordVirginNomination",
              payload: {
                nominatorId: String(data.get("nominator") || ""),
                virginId: virgin.id,
                options: { spyRegistersTownsfolk: data.has("spy") },
              },
            });
          }}
        >
          <h2 className="m-0 text-[18px]">{t("virginNomination")}</h2>
          <p className={CARD_TEXT}>{t("virginHint")}</p>
          <label className="grid gap-1.5">
            {t("nominator")}
            <select className="field" name="nominator" required defaultValue="">
              <option value="">{t("chooseTarget")}</option>
              {living.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.seat} · {displayName(player, t)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="spy" /> {t("spyTownsfolk")}
          </label>
          <button className="btn" type="submit" data-virgin={virgin.id}>
            {t("recordNomination")}
          </button>
        </form>
      ) : null}

      {executed ? (
        <div className="my-2.5 rounded-[10px] border border-[#5a2b2b] bg-[#1a1111] p-2.5">
          <span className="label">{t("execution")}</span>
          <b className="my-0.5 block text-[18px]">{displayName(executed, t)}</b>
          <p className={MUTED}>
            {day.execution?.deathId ? t("ui.executedDied") : t("ui.executedNoDeath")}
          </p>
        </div>
      ) : null}

      {slayer ? <SlayerPanel view={view} slayerId={slayer.id} /> : null}
      {manual ? null : <GossipPanel view={view} />}
      {manual ? null : <JugglerPanel view={view} />}
      {manual ? null : <MoonchildPanel view={view} />}
      {manual ? null : mastermindPanel(view)}

      {manual ? (
        <div className="my-2.5 grid gap-1.5 rounded-[10px] border border-line p-2.5">
          <span className="label">{t("manualWinner")}</span>
          <div className={INLINE}>
            <select
              className="field"
              data-winner-team
              value={drafts.winnerTeam}
              onChange={(event) =>
                drafts.setWinnerTeam(event.target.value === "evil" ? "evil" : "good")
              }
            >
              <option value="good">{t("winnerGood")}</option>
              <option value="evil">{t("winnerEvil")}</option>
            </select>
            <button
              className="btn btn--accent"
              type="button"
              data-act="declare-winner"
              onClick={() =>
                actions.run({
                  type: "setWinner",
                  payload: { team: drafts.winnerTeam, reason: "manual" },
                })
              }
            >
              {t("declareWinner")}
            </button>
          </div>
          <p className={MUTED}>{t("manualWinnerHint")}</p>
        </div>
      ) : null}

      <ConsequenceList outcome={endPreview} targets={[]} state={state} ports={ports} />

      <div className={ACTIONS}>
        <button
          className="btn btn--accent"
          type="button"
          data-act="end-day"
          onClick={() => {
            drafts.setExecuteTarget("");
            actions.run({
              type: "endDay",
              payload: {},
              ...previewIdentity(endPreview),
            });
          }}
        >
          {day.execution || day.ended ? t("endDay") : t("noExecution")}
        </button>
      </div>
    </section>
  );
}

function SlayerPanel({ view, slayerId }: { view: TableView; slayerId: string }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const selected = orderedPlayers(state).find((player) => player.id === drafts.slayerTarget);
  return (
    <div className={SECTION}>
      <span className="label">{t("slayer")}</span>
      <p className={MUTED}>{t("slayerHint")}</p>
      <div className={INLINE}>
        <select
          className="field min-w-[180px]"
          data-slayer-target
          value={drafts.slayerTarget}
          onChange={(event) => drafts.setSlayerTarget(event.target.value)}
        >
          <option value="">{t("chooseTarget")}</option>
          {orderedPlayers(state).map((player) => (
            <option key={player.id} value={player.id}>
              {displayName(player, t)}
              {player.alive ? "" : t("ui.deadSuffix")}
            </option>
          ))}
        </select>
        {selected && selected.roleId === "recluse" ? (
          <label className={CHECK}>
            <input
              type="checkbox"
              data-recluse-slayer
              checked={drafts.recluseSlayer}
              onChange={(event) => drafts.setRecluseSlayer(event.target.checked)}
            />
            <span>{t("recluseDemon")}</span>
          </label>
        ) : null}
        <button
          className="btn"
          type="button"
          data-act="slayer"
          disabled={!drafts.slayerTarget}
          onClick={() =>
            actions.run({
              type: "useSlayer",
              payload: {
                slayerId,
                targetId: drafts.slayerTarget,
                options: { recluseRegistersDemon: drafts.recluseSlayer },
              },
            })
          }
        >
          {t("useSlayer")}
        </button>
      </div>
    </div>
  );
}

function GossipPanel({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const gossip =
    state.script && Array.isArray(state.script.roles) && state.script.roles.includes("gossip")
      ? orderedPlayers(state).find((player) => player.roleId === "gossip" && player.alive)
      : null;
  if (!gossip || state.day.execution || state.day.ended) return null;
  if (state.gossip && state.gossip.day === state.day.number) return null;
  return (
    <div className="my-2.5 grid gap-1.5 rounded-[10px] border border-line p-2.5">
      <span className="label">{t("gossipPanel")}</span>
      <p className={MUTED}>
        {displayName(gossip, t)}: {t("gossipHint")}
      </p>
      <div className={INLINE}>
        <button
          className="btn"
          type="button"
          data-act="gossip-true"
          onClick={() => actions.run({ type: "gossipStatement", payload: { truth: true } })}
        >
          {t("gossipTrue")}
        </button>
        <button
          className="btn"
          type="button"
          data-act="gossip-false"
          onClick={() => actions.run({ type: "gossipStatement", payload: { truth: false } })}
        >
          {t("gossipFalse")}
        </button>
      </div>
    </div>
  );
}

function JugglerPanel({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const juggler =
    state.script && Array.isArray(state.script.roles) && state.script.roles.includes("juggler")
      ? orderedPlayers(state).find((player) => player.roleId === "juggler" && player.alive)
      : null;
  if (!juggler || state.phase !== "day" || state.day.number !== 1 || state.day.ended) {
    return null;
  }
  const guesses = state.juggler && state.juggler.day === 1 ? state.juggler.guesses : {};
  const count = Object.keys(guesses).length;
  const target = drafts.jugglerTarget;
  const full = count >= 5 && !guesses[target];
  return (
    <div className="my-2.5 grid gap-1.5 rounded-[10px] border border-line p-2.5">
      <span className="label">{t("jugglerPanel")}</span>
      <p className={MUTED}>
        {displayName(juggler, t)}: {t("jugglerHint")}
      </p>
      <div className={INLINE}>
        <select
          className="field min-w-[180px]"
          data-juggler-target
          value={target}
          onChange={(event) => drafts.setJugglerTarget(event.target.value)}
        >
          <option value="">{t("chooseTarget")}</option>
          {orderedPlayers(state).map((player) => (
            <option key={player.id} value={player.id}>
              {displayName(player, t)}
              {player.alive ? "" : t("ui.deadSuffix")}
            </option>
          ))}
        </select>
        <select
          className="field min-w-[160px]"
          data-juggler-role
          value={drafts.jugglerRole}
          onChange={(event) => drafts.setJugglerRole(event.target.value)}
        >
          <option value="">{t("ui.chooseRole")}</option>
          {state.script.roles.map((id) => (
            <option key={id} value={id}>
              {roleNameOf(id, ports.roles.byId)}
            </option>
          ))}
        </select>
        <button
          className="btn"
          type="button"
          data-act="juggler-guess"
          disabled={!target || !drafts.jugglerRole || full}
          onClick={() => {
            actions.run({
              type: "jugglerGuess",
              payload: { playerId: target, roleId: drafts.jugglerRole },
            });
            drafts.setJugglerTarget("");
          }}
        >
          {t("jugglerAdd")}
        </button>
      </div>
      {count ? (
        <ul className="m-0 grid gap-1 pl-4">
          {Object.entries(guesses).map(([id, roleId]) => {
            const player = state.players[id];
            return (
              <li key={id} className={MUTED}>
                {player ? displayName(player, t) : id}:{" "}
                {roleNameOf(String(roleId), ports.roles.byId)}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function MoonchildPanel({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const moonchild =
    state.phase === "day"
      ? orderedPlayers(state).find(
          (player) =>
            player.roleId === "moonchild" &&
            !player.alive &&
            !(player.used && player.used.moonchildTarget),
        )
      : null;
  if (!moonchild) return null;
  return (
    <div className="my-2.5 grid gap-1.5 rounded-[10px] border border-line p-2.5">
      <span className="label">{t("moonchildPanel")}</span>
      <p className={MUTED}>
        {displayName(moonchild, t)}: {t("moonchildHint")}
      </p>
      <div className={INLINE}>
        <select
          className="field"
          data-moonchild-target
          value={drafts.moonchildTarget}
          onChange={(event) => drafts.setMoonchildTarget(event.target.value)}
        >
          <option value="">{t("chooseTarget")}</option>
          {livingPlayers(state).map((player) => (
            <option key={player.id} value={player.id}>
              {player.seat} · {displayName(player, t)}
            </option>
          ))}
        </select>
        <button
          className="btn"
          type="button"
          data-act="moonchild-choice"
          onClick={() => {
            if (!drafts.moonchildTarget) return;
            actions.run({ type: "moonchildChoice", payload: { targetId: drafts.moonchildTarget } });
          }}
        >
          {t("recordChoice")}
        </button>
      </div>
    </div>
  );
}

function mastermindPanel(view: TableView) {
  const { state, ports } = view;
  if (!state.mastermind || !state.mastermind.active) return null;
  return (
    <Warn title={ports.strings.t("mastermindActive")}>
      <p>{ports.strings.t("mastermindHint")}</p>
    </Warn>
  );
}

export function SetupPrompt({ view }: { view: TableView }) {
  const { ports } = view;
  const t = ports.strings.t;
  return (
    <section className={`host-card ${CARD} ${CARD_LINE} px-[18px] py-[34px] text-center`}>
      <p className="label">{t("setup")}</p>
      <h1 className={CARD_TITLE}>{t("noRoles")}</h1>
      <p className={CARD_TEXT}>{t("setupIntro")}</p>
      <div className={INLINE}>
        <a className="btn btn--accent" href={ports.router.path("bag")}>
          {t("ui.begin")}
        </a>
        <a className="btn" href={ports.router.path("demo")}>
          {t("demo")}
        </a>
      </div>
    </section>
  );
}

export function DealCard({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const players = orderedPlayers(state);
  const claimed = players.filter((player) => player.claimed).length;
  const everyoneNamed = claimed === players.length;
  const seated = state.phase === "seat";
  const errors = secretsProjection(state).errors;
  const step = !everyoneNamed ? "names" : !seated ? "seats" : "secrets";
  const route = step === "names" ? "player" : step === "seats" ? "seat" : "secrets";
  return (
    <section className={`host-card ${CARD} ${CARD_LINE}`}>
      {manualWarning(view)}
      <p className="label">{t("playerHandoff")}</p>
      <h1 className={CARD_TITLE}>
        {!everyoneNamed ? t("ui.names") : !seated ? t("ui.arrange") : t("ui.checkSecrets")}
      </h1>
      <p className={CARD_TEXT}>{t("discussWarning")}</p>
      <div className="my-2 flex items-center gap-2.5">
        <div className="h-[7px] flex-1 overflow-hidden rounded-full border border-line bg-[#0a0e10]">
          <span
            className="block h-full bg-accent"
            style={{ width: `${players.length ? (claimed / players.length) * 100 : 0}%` }}
          />
        </div>
        <b>
          {claimed} / {players.length}
        </b>
      </div>
      <div className={INLINE}>
        <a className="btn btn--accent" href={ports.router.path(route)}>
          {step === "names" ? t("ui.handoff") : step === "seats" ? t("ui.seats") : t("ui.secrets")}
        </a>
        <a className="btn" href={ports.router.path("seat")}>
          {t("seats")}
        </a>
        <a className="btn" href={ports.router.path("secrets")}>
          {t("secrets")}
        </a>
      </div>
      {seated && errors.length ? (
        <Warn title={t("setupErrors")} bad>
          <ul className="mt-1 list-disc pl-4">
            {errors.map((error) => (
              <li key={error.code + error.message}>{error.message}</li>
            ))}
          </ul>
          <a className="btn" href={ports.router.path("secrets")}>
            {t("secrets")}
          </a>
        </Warn>
      ) : null}
      {seated ? (
        <button
          className={`btn btn--accent mt-3 ${PRIMARY}`}
          type="button"
          data-act="start-night"
          disabled={errors.length > 0}
          onClick={() => actions.run({ type: "startNight", payload: {} })}
        >
          {t("startFirstNight")}
        </button>
      ) : null}
    </section>
  );
}

export function OverCard({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const winner = state.winner;
  return (
    <section className={`host-card is-over ${OVER_CARD}`} data-step="over">
      <p className="label">{t("gameOver")}</p>
      <h1 className={CARD_TITLE}>
        {winner ? t(winner.team === "good" ? "winnerGood" : "winnerEvil") : t("gameOver")}
      </h1>
      <p className={CARD_TEXT}>{winner ? t("winReason." + winner.reason) : ""}</p>
      <div className={INLINE}>
        {!state.reviewOpen ? (
          <button
            className="btn btn--accent"
            type="button"
            data-act="review"
            onClick={() => actions.run({ type: "setReviewOpen", payload: { open: true } })}
          >
            {t("review")}
          </button>
        ) : null}
        <button className="btn" type="button" data-act="new-game" onClick={actions.armNew}>
          {t("newGame")}
        </button>
        <button className="btn" type="button" data-act="export" onClick={actions.openExport}>
          {t("export")}
        </button>
      </div>
      {!state.reviewOpen ? (
        <p className={MUTED}>{t("reviewHidden")}</p>
      ) : (
        <ReviewTable view={view} />
      )}
    </section>
  );
}

function ReviewTable({ view }: { view: TableView }) {
  const { state, ports } = view;
  const t = ports.strings.t;
  return (
    <div className="host-review mt-3 overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-[11px] max-[900px]:min-w-0">
        <thead>
          <tr>
            {["#", t("player"), t("role"), t("shownRole"), t("team"), t("dead"), t("notes")].map(
              (head) => (
                <th
                  key={head}
                  className="border-b border-line px-1.5 py-1.5 text-left text-[9.5px] font-semibold uppercase tracking-[.06em] text-muted"
                >
                  {head}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {orderedPlayers(state).map((player) => {
            const role = player.roleId ? ports.roles.byId(player.roleId) : null;
            const shown = player.shownRoleId ? ports.roles.byId(player.shownRoleId) : null;
            return (
              <tr key={player.id}>
                <td className="border-b border-line px-1.5 py-1.5 text-left">{player.seat}</td>
                <td className="border-b border-line px-1.5 py-1.5 text-left">
                  {displayName(player, t)}
                </td>
                <td className="border-b border-line px-1.5 py-1.5 text-left">
                  {role ? role.name : "—"}
                </td>
                <td className="border-b border-line px-1.5 py-1.5 text-left">
                  {shown ? shown.name : "—"}
                </td>
                <td className="border-b border-line px-1.5 py-1.5 text-left">
                  {role ? ports.strings.teamText(role.team) : "—"}
                </td>
                <td className="border-b border-line px-1.5 py-1.5 text-left">
                  {player.alive
                    ? "—"
                    : player.deadAt
                      ? causeText(player.deadAt.cause || "", t)
                      : "—"}
                </td>
                <td className="border-b border-line px-1.5 py-1.5 text-left">
                  {(player.reminders || []).join(", ")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
