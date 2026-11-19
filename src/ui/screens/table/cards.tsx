// The phase cards: night, day, deal/setup and the over/review card. Each card
// reads the published state and the draft hook; it keeps no state of its own.
import {
  artistProjection,
  madnessReviewProjection,
  poisonChoicesProjection,
  resurrectChoices,
  savantProjection,
  secretsProjection,
  seatProjection,
  shownRoleChoices,
  tableProjection,
} from "../../../application/read-models/table.ts";
import { useEffect, useState } from "react";
import {
  effectiveRoleId,
  livingPlayers,
  orderedPlayers,
  playerById,
} from "../../../core/model/state.ts";
import { ALL_ROLES, isManualScript } from "../../../core/model/rules.ts";
import { roleSupportEntries } from "../../../core/model/support.ts";
import type { ArtistAnswer, NightStep, SavantTruth } from "../../../core/model/types.ts";
import {
  applyGiven,
  causeText,
  dayHelpForms,
  displayName,
  givenLabelKey,
  guideForStep,
  infoText,
  jugglerGuessingDay,
  localizeVars,
  normalizeJugglerGuesses,
  redirectChoiceValue,
  roleNameOf,
  stepTitle,
  targetNames,
  winReasonKey,
} from "./helpers.ts";
import type { StepInfo } from "./helpers.ts";
import { Warn } from "./parts.tsx";
import { stepContext } from "./step-context.ts";
import { writeStepDraft } from "./step-draft.ts";
import type { StepDraft } from "./step-draft.ts";
import type { TableView } from "./view.ts";
import {
  ACTION_PRIMARY,
  ACTION_QUIET,
  ALERT,
  BOARD,
  BOARD_ACTIONS,
  BOARD_PRIMARY,
  BOARD_ROSTER,
  BOARD_SEAT,
  BOARD_SEAT_NO,
  BOARD_STEP,
  BOARD_STEP_CURRENT,
  BOARD_STEP_DONE,
  BOARD_STEP_PENDING,
  BOARD_STEPS,
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
  SECTION,
  TARGET,
  TARGET_GRID,
  TARGET_ON,
} from "./styles.ts";

type PendingOption = { id: string; name: string; roleId: string };

function effectName(kind: string, t: TableView["ports"]["strings"]["t"]): string {
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
  return <SetupBoard view={view} />;
}

/**
 * The Minions the host may name as the new Demon. Imp r3116: "choose an alive
 * Minion"; the table offers them and never picks one.
 */
export function HeirChoice({ view, pending }: { view: TableView; pending: NightStep }) {
  const { ports, actions } = view;
  const options = (pending.pending?.options || []) as PendingOption[];
  return (
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
  );
}

export function NightCard({ view, flat = false }: { view: TableView; flat?: boolean }) {
  const { state, ports } = view;
  const t = ports.strings.t;
  const { step, progress, pendingDemonChange } = tableProjection(state);

  if (pendingDemonChange) {
    return (
      <section className={`host-card is-night ${NIGHT_CARD}`}>
        <p className="label">{t("pendingHeir")}</p>
        <h1 className={CARD_TITLE}>{t("pendingHeirText")}</h1>
        <HeirChoice view={view} pending={pendingDemonChange} />
      </section>
    );
  }

  if (!step) {
    return (
      <section className={`host-card is-night ${NIGHT_CARD}`}>
        {manualWarning(view)}
        <p className="label">
          {t("night")} {state.night.number}
        </p>
        <h1 className={CARD_TITLE}>{state.night.queue.length ? t("ui.allDone") : t("noWake")}</h1>
        <p className={CARD_TEXT}>
          {t("check")}: {progress.done} / {progress.total}.
        </p>
      </section>
    );
  }

  return <StepCard view={view} step={step} flat={flat} />;
}

function StepCard({
  view,
  step,
  flat = false,
}: {
  view: TableView;
  step: NightStep;
  flat?: boolean;
}) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const guide = guideForStep(t, ports.guidance.for, state, step);
  const role = step.roleId ? ports.roles.byId(step.roleId) : null;
  const roleSupport = step.roleId ? roleSupportEntries([step.roleId])[0] : undefined;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const key = step.key;
  const context = stepContext(state, drafts, step);
  const { draftKey, selected, registrations, given, redirect, derived } = context;
  const info = derived.info;
  const { targetsIncomplete, deadImpTarget, poisonChoices } = context;
  const needsSetup = Boolean(info.missing);
  const targetIsMayor = context.targetsMayor;
  const stepEffects = derived.effects;

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

  return (
    <section
      className={`host-card is-night ${flat ? "" : NIGHT_CARD}`}
      data-step={key}
      data-step-sheet
    >
      {manualWarning(view)}
      <div className="flex items-center gap-2.5 rounded-sm border border-edge bg-crypt-3 p-2.5">
        {role ? (
          <img
            className="size-12 shrink-0 rounded-sm border border-edge-2 bg-crypt object-contain p-1"
            src={ports.roles.image(role)}
            alt=""
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[.08em] text-brass">
            {actor ? displayName(actor, t) : t("ui.activeRole")}
          </p>
          <b className="block truncate font-role text-[20px] leading-tight text-parchment">
            {stepTitle(step, ports.roles.byId, t)}
          </b>
          <small className="mt-0.5 block truncate text-[12px] text-muted">
            {role ? ports.strings.teamText(role.team) : ""}
            {step.targetMode !== "none" ? ` · ${t("chooseTarget")}` : ""}
          </small>
        </div>
        {actor ? (
          <span className="shrink-0 rounded-sm border border-success/40 bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.06em] text-success">
            {t("ui.activeSeat")}
          </span>
        ) : null}
      </div>
      {role?.ability ? (
        <p className="m-0 mt-2 text-[13px] leading-relaxed text-muted">{role.ability}</p>
      ) : null}
      {step.deadTonight ? <p className={`${ALERT} text-danger`}>{t("ui.deadWake")}</p> : null}
      {derived.actorImpaired ? <p className={`${ALERT} text-danger`}>{t("ui.impaired")}</p> : null}

      <details
        className="my-2.5 overflow-hidden rounded-sm border border-edge bg-crypt-3"
        open={drafts.guided}
        data-guide
        onToggle={(event) => actions.toggleGuided(event.currentTarget.open)}
      >
        <summary className="min-h-11 cursor-pointer p-2.5 text-[12px]">
          {t("guidedInstructions")}
        </summary>
        {roleSupport ? (
          <p
            className={`${MUTED} px-2.5`}
            data-role-support={roleSupport.roleId}
            data-status={roleSupport.status}
          >
            <b>{t("roleSupport")}:</b> {t("roleSupport." + roleSupport.status)} —{" "}
            {t(roleSupport.detail)}
          </p>
        ) : null}
        <div className="grid gap-1.5 px-2.5 pb-2.5" data-step-summary>
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
          {step.noteKey || step.note ? (
            <p className={MUTED} data-step-note>
              {step.noteKey
                ? t(step.noteKey, localizeVars(step.noteVars, ports.roles.byId))
                : step.note}
            </p>
          ) : null}
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
        {guideRow(t("hostAction"), guide.host)}
        {guideRow(t("playerAction"), guide.player)}
        {guideRow(t("grimoireNote"), guide.grimoire)}
        {guideRow(t("publicLine"), guide.publicLine)}
        {guideRow(t("check"), guide.check)}
      </details>

      {step.targetMode !== "none" && selected.length ? (
        <div className="mt-3 rounded-sm border border-edge bg-crypt-3 p-2.5" data-chosen-target>
          <div className="flex items-center justify-between gap-2">
            <span className="label">{t("ui.target")}</span>
            <span className="rounded-sm border border-edge-2 px-1.5 py-0.5 text-[11px] tabular-nums text-muted">
              {t("ui.targetChosen", { count: selected.length })}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[14px] font-semibold text-text">
            <span className="truncate">{targetNames(selected, state, t)}</span>
            <span className="shrink-0 text-success" aria-hidden="true">
              ✓
            </span>
          </div>
          {deadImpTarget ? (
            <p className="m-0 mt-1 text-[12px] leading-tight text-table-secondary">
              {t("ui.deadTarget")}
            </p>
          ) : null}
        </div>
      ) : null}

      {targetIsMayor ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("forced")}</span>
          <select
            className="field"
            data-redirect={key}
            value={redirectChoiceValue(redirect)}
            onChange={(event) => drafts.putRedirect(draftKey, event.target.value || "none")}
          >
            <option value="" disabled>
              {t("ui.chooseRedirect")}
            </option>
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
              <div className="grid gap-1">
                <button
                  className="btn"
                  type="button"
                  data-act="show-grimoire"
                  onClick={actions.openGrimoire}
                >
                  {t("ui.showGrimoire")}
                </button>
                {derived.actorImpaired ? (
                  <p className={`${ALERT} text-amber-2`} data-warning="spyFalseGrimoire">
                    {t("ui.spyFalseGrimoire")}
                  </p>
                ) : null}
              </div>
            ) : derived.actorImpaired ? (
              <div className="mt-1 grid gap-1.5" data-template>
                <label className={FIELD_BOX}>
                  <span className="label">{t("ui.template")}</span>
                  <textarea
                    className="field min-h-[64px] resize-y"
                    data-info-template
                    value={drafts.infoTemplate}
                    onChange={(event) => drafts.setInfoTemplate(event.target.value)}
                  />
                </label>
                <p className={MUTED}>{t("ui.templateHint")}</p>
                <button
                  className="btn"
                  type="button"
                  data-act="show-template"
                  disabled={!drafts.infoTemplate.trim()}
                  onClick={() => actions.openInfo(key)}
                >
                  {t("ui.showTemplate")}
                </button>
              </div>
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
    </section>
  );
}

function guideRow(label: string, text: string | undefined) {
  return (
    <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-2 border-t border-edge px-[10px] py-[7px] first:border-t-0 max-[640px]:grid-cols-1 max-[640px]:gap-px">
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
                {spy ? t("ui.spyGood") : t("recluseEvil")} — {displayName(player, t)}
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
                {t("recluseDemon")} — {displayName(player, t)}
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
  if (info.kind === "note") {
    // The host decides what a note-style role learns (Dreamer, Sage,
    // Mathematician under a Vortox): the recorded text is the decision.
    const current = drafts.givens.get(draftKey);
    return (
      <label className={FIELD_BOX}>
        <span className="label">{t("falseInfo")}</span>
        <textarea
          className="field min-h-[52px] resize-y"
          data-given={step.key}
          data-given-kind="note"
          defaultValue={current?.text ?? ""}
          placeholder={info.text || t("computed")}
          onChange={(event) => {
            const text = event.target.value.trim();
            if (!text) {
              drafts.dropGiven(draftKey);
              return;
            }
            drafts.putGiven(draftKey, { ...info, text, needsChoice: false });
          }}
        />
      </label>
    );
  }
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
  } else if (info.kind === "role-pair" || info.kind === "player-pair") {
    kind = "pair";
    options = info.options ? (info.options as Array<string | number | boolean>) : [];
  }
  if (!options.length) return null;
  // A shown pair names its characters or seats so the host reads the same
  // answer they gave at the table.
  const pairText = (raw: string): string => {
    const ids = raw.split("|");
    if (info.kind === "player-pair") {
      return ids
        .map((id) => {
          const player = playerById(state, id);
          return player ? `${displayName(player, t)} (${player.seat})` : id;
        })
        .join(" / ");
    }
    return ids.map((id) => roleNameOf(id, ports.roles.byId)).join(" / ");
  };
  // A healthy answer that depends on a registration (the Undertaker's
  // character, the Chef's count) is a registration decision, and a missing
  // data source is a plain host answer; only a false-information decision
  // gets the false-information label.
  const label = t(givenLabelKey(info));
  return (
    <label className={FIELD_BOX}>
      <span className="label">{label}</span>
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
          {kind === "pair"
            ? t("ui.choosePair")
            : `${t("computed")}: ${infoText(state, step, info, ports.roles.byId, t)}`}
        </option>
        {options.map((value) => (
          <option key={String(value)} value={String(value)}>
            {kind === "pair"
              ? pairText(String(value))
              : kind === "role"
                ? String(value) === "zero"
                  ? t("none")
                  : roleNameOf(String(value), ports.roles.byId)
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
      {Array.isArray(step.roleChoices) && step.roleChoices.length ? (
        <div className="grid gap-1 rounded-sm border border-edge p-2" data-bmr-decision="role">
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
        </div>
      ) : null}
      {step.roleId === "tinker" ? (
        <div className="grid gap-1 rounded-sm border border-edge p-2" data-bmr-decision="tinker">
          <span className="label">{t("ui.tinkerDecision")}</span>
          <p className={`${MUTED} m-0`}>{t("ui.tinkerHint")}</p>
          <div className={INLINE}>
            <button
              className={`${TARGET} ${deaths.includes(String(step.actorId)) ? TARGET_ON : ""}`}
              type="button"
              data-tinker-decision="die"
              onClick={() =>
                drafts.putBmrDeaths(draftKey, step.actorId ? [String(step.actorId)] : [])
              }
            >
              {t("ui.tinkerDies")}
            </button>
            <button
              className={`${TARGET} ${deaths.length ? "" : TARGET_ON}`}
              type="button"
              data-tinker-decision="live"
              onClick={() => drafts.putBmrDeaths(draftKey, [])}
            >
              {t("ui.tinkerLives")}
            </button>
          </div>
        </div>
      ) : null}
      {step.canKill && step.roleId !== "tinker" ? (
        <div className="grid gap-1 rounded-sm border border-edge p-2" data-bmr-decision="marking">
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
        </div>
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
            <option value="" disabled>
              {t("ui.choosePlayer")}
            </option>
            {(step.roleId === "sailor"
              ? [step.actorId, ...(drafts.targets.get(draftKey) || [])]
              : drafts.targets.get(draftKey) || []
            )
              .filter((id): id is string => Boolean(id))
              .map((id) => {
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
            {resurrectChoices(state, step, drafts.targets.get(draftKey) || []).map((id) => {
              const player = playerById(state, id);
              return (
                <option key={id} value={id}>
                  {player ? displayName(player, t) : id} ·{" "}
                  {roleNameOf(player ? player.roleId : "", ports.roles.byId)}
                </option>
              );
            })}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function DayCard({
  view,
  roleFormsOnly = false,
}: {
  view: TableView;
  roleFormsOnly?: boolean;
}) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  // The execution choice and its survival flag live in the shared drafts, so
  // the day card and the dock make one decision.
  const day = state.day;
  const executed = day.execution ? playerById(state, day.execution.playerId) : null;
  const living = livingPlayers(state);
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
          (player) => effectiveRoleId(player) === "slayer" && player.alive && !player.used.slayer,
        )
      : null;
  const artist = !manual ? artistProjection(state) : null;
  const savant = !manual ? savantProjection(state) : null;
  const forms = dayHelpForms(state);
  const canExecute =
    Boolean(drafts.executeTarget) &&
    Boolean(playerById(state, drafts.executeTarget)) &&
    !day.execution &&
    !day.ended &&
    !state.winner;

  return (
    <section className={`host-card is-day ${DAY_CARD}`} data-step="day">
      {manualWarning(view)}
      <p className="label">
        {t("day")} {day.number}
      </p>
      <h1 className={CARD_TITLE}>{t("ui.dayResult")}</h1>

      {!roleFormsOnly && !day.execution && !day.ended ? (
        <div className="my-2.5 grid gap-1.5 rounded-sm border border-edge p-2.5">
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
                    options: { survives: drafts.executeSurvives },
                  },
                });
                if (result.status === "allowed") {
                  drafts.setExecuteTarget("");
                  drafts.setExecuteSurvives(false);
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
                checked={drafts.executeSurvives}
                onChange={(event) => drafts.setExecuteSurvives(event.target.checked)}
              />
              <span>{pacifistSupport ? t("ui.pacifistSurvives") : t("survivesExecution")}</span>
            </label>
          ) : null}
          {pacifistSupport ? (
            <p className={MUTED} data-role-support="pacifist" data-status={pacifistSupport.status}>
              <b>{t("roleSupport")}:</b> {t("roleSupport." + pacifistSupport.status)} —{" "}
              {t(pacifistSupport.detail)}
            </p>
          ) : null}
          <p className={MUTED}>{t("ui.tableVotes")}</p>
        </div>
      ) : null}

      {forms.includes("virgin") && virgin ? (
        <form
          className="my-2.5 grid gap-1.5 rounded-sm border border-edge p-2.5"
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

      {!roleFormsOnly && executed ? (
        <div className="my-2.5 rounded-md border border-crimson-dim bg-crimson-dim/20 p-2.5">
          <span className="label">{t("execution")}</span>
          <b className="my-0.5 block text-[18px]">{displayName(executed, t)}</b>
          <p className={MUTED}>
            {day.execution?.deathId ? t("ui.executedDied") : t("ui.executedNoDeath")}
          </p>
        </div>
      ) : null}

      {forms.includes("slayer") && slayer ? <SlayerPanel view={view} slayerId={slayer.id} /> : null}
      {forms.includes("artist") && artist ? (
        <ArtistPanel view={view} artistId={artist.playerId} />
      ) : null}
      {forms.includes("savant") && savant ? <SavantPanel view={view} savant={savant} /> : null}
      {forms.includes("gossip") ? <GossipPanel view={view} /> : null}
      {forms.includes("juggler") ? <JugglerPanel view={view} /> : null}
      {forms.includes("moonchild") ? <MoonchildPanel view={view} /> : null}
      {forms.includes("mastermind") ? mastermindPanel(view) : null}
    </section>
  );
}

/**
 * The day actions that are not role forms: the madness review, the manual
 * winner (manual scripts only) and the Tinker's daytime death. They live in the
 * table menu, not in the day-help sheet, which only resolves role forms.
 */
export function DayActionsPanel({ view }: { view: TableView }) {
  const { state, ports, drafts, actions } = view;
  const t = ports.strings.t;
  const [madnessReasons, setMadnessReasons] = useState<Record<string, string>>({});
  const [abnormalPlayer, setAbnormalPlayer] = useState("");
  const [abnormalReason, setAbnormalReason] = useState("");
  const madnessReviews = madnessReviewProjection(state);
  const night = state.phase === "night";
  const abnormalMarks = state.abnormal || [];
  const canAbnormal = !state.winner && (state.phase === "day" || state.phase === "night");
  const day = state.day;
  const manual = isManualScript(state.script);
  const tinker =
    state.script && Array.isArray(state.script.roles) && state.script.roles.includes("tinker")
      ? orderedPlayers(state).find((player) => player.roleId === "tinker" && player.alive)
      : null;
  if (!madnessReviews.length && !manual && !tinker && !canAbnormal) return null;
  return (
    <>
      {canAbnormal ? (
        <div className="grid gap-1.5 rounded-sm border border-edge p-2.5" data-abnormal-panel>
          <span className="label">{t("ui.abnormalTitle")}</span>
          <p className={`${MUTED} m-0`}>{t("ui.abnormalHint")}</p>
          <select
            className="field"
            data-abnormal-player
            value={abnormalPlayer}
            onChange={(event) => setAbnormalPlayer(event.target.value)}
          >
            <option value="">{t("chooseTarget")}</option>
            {orderedPlayers(state).map((player) => (
              <option key={player.id} value={player.id}>
                {displayName(player, t)}
              </option>
            ))}
          </select>
          <label className="grid gap-1 text-[13px] text-muted">
            {t("ui.abnormalReason")}
            <input
              className="field"
              value={abnormalReason}
              data-abnormal-reason
              onChange={(event) => setAbnormalReason(event.target.value)}
            />
          </label>
          <button
            className="btn"
            type="button"
            data-act="record-abnormal"
            disabled={!abnormalPlayer || !abnormalReason.trim()}
            onClick={() => {
              const result = actions.run({
                type: "recordAbnormal",
                payload: { playerId: abnormalPlayer, reason: abnormalReason },
              });
              if (result.status === "allowed") {
                setAbnormalPlayer("");
                setAbnormalReason("");
              }
            }}
          >
            {t("ui.recordAbnormal")}
          </button>
          <p className={`${MUTED} m-0`}>
            {abnormalMarks.length
              ? t("ui.abnormalMarked", { count: abnormalMarks.length })
              : t("ui.abnormalNone")}
          </p>
          {abnormalMarks.map((mark) => (
            <p key={mark.playerId + mark.at.number} className={`${MUTED} m-0`}>
              {displayName(playerById(state, mark.playerId), t)}: {mark.reason}
            </p>
          ))}
        </div>
      ) : null}
      {tinker && state.phase === "day" && !day.execution && !day.ended && !state.winner ? (
        <div className="grid gap-1.5 rounded-sm border border-edge p-2.5" data-tinker-day>
          <span className="label">{t("ui.tinkerDay")}</span>
          <p className={`${MUTED} m-0`}>{t("ui.tinkerDayHint")}</p>
          <button
            className="btn"
            type="button"
            data-act="tinker-day-death"
            onClick={() => actions.run({ type: "tinkerDeath", payload: { playerId: tinker.id } })}
          >
            {t("ui.tinkerDayDies")}
          </button>
        </div>
      ) : null}
      {madnessReviews.length ? (
        <div
          className={`${SECTION} grid gap-2 border border-edge-2 border-l-2 border-l-accent p-2.5`}
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
                className="grid gap-1.5 rounded-sm border border-edge bg-crypt-2 p-2.5"
                data-madness-player={effect.targetId || ""}
                data-madness-status={pending ? "pending" : executed ? "executed" : "reviewed"}
              >
                <b>{condition}</b>
                <p className={`${MUTED} m-0`}>
                  {night && !executed
                    ? t("ui.madnessNightActive")
                    : pending
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
                      disabled={!reason.trim() || (!night && (Boolean(day.execution) || day.ended))}
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
                  {!executed &&
                  !night &&
                  (effect.decidedPenalty !== "none" || effect.decidedDay !== day.number) ? (
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
      {manual ? (
        <div className="grid gap-1.5 rounded-sm border border-edge p-2.5">
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
    </>
  );
}

export function SlayerPanel({ view, slayerId }: { view: TableView; slayerId: string }) {
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
        {selected &&
        selected.roleId === "recluse" &&
        playerById(state, slayerId)?.roleId === "slayer" ? (
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

const TRUTH_LABEL: Record<SavantTruth, string> = {
  first: "savantTruthFirst",
  second: "savantTruthSecond",
  both: "savantTruthBoth",
  neither: "savantTruthNeither",
};

export function ArtistPanel({ view, artistId }: { view: TableView; artistId: string }) {
  const { ports, actions } = view;
  const t = ports.strings.t;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ArtistAnswer>("yes");
  return (
    <div className="my-2.5 grid gap-1.5 rounded-sm border border-edge p-2.5" data-artist-panel>
      <span className="label">{t("artist")}</span>
      <p className={MUTED}>{t("artistHint")}</p>
      <label className="grid gap-1 text-[13px]">
        {t("artistQuestion")}
        <input
          className="field"
          value={question}
          data-artist-question
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-[13px]">
        {t("artistAnswer")}
        <select
          className="field"
          value={answer}
          data-artist-answer
          onChange={(event) => setAnswer(event.target.value as ArtistAnswer)}
        >
          <option value="yes">{t("answerYes")}</option>
          <option value="no">{t("answerNo")}</option>
          <option value="unknown">{t("answerUnknown")}</option>
        </select>
      </label>
      <button
        className="btn"
        type="button"
        data-act="artist-question"
        disabled={!question.trim()}
        onClick={() => {
          const result = actions.run({
            type: "artistQuestion",
            payload: { playerId: artistId, question, answer },
          });
          if (result.status === "allowed") setQuestion("");
        }}
      >
        {t("recordArtist")}
      </button>
    </div>
  );
}

export function SavantPanel({
  view,
  savant,
}: {
  view: TableView;
  savant: { playerId: string; choices: SavantTruth[] };
}) {
  const { ports, actions } = view;
  const t = ports.strings.t;
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [truth, setTruth] = useState<SavantTruth>(savant.choices[0] ?? "first");
  const chosen = savant.choices.includes(truth) ? truth : (savant.choices[0] ?? "first");
  return (
    <div className="my-2.5 grid gap-1.5 rounded-sm border border-edge p-2.5" data-savant-panel>
      <span className="label">{t("savant")}</span>
      <p className={MUTED}>{t("savantHint")}</p>
      <label className="grid gap-1 text-[13px]">
        {t("savantFirstStatement")}
        <input
          className="field"
          value={first}
          data-savant-first
          onChange={(event) => setFirst(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-[13px]">
        {t("savantSecondStatement")}
        <input
          className="field"
          value={second}
          data-savant-second
          onChange={(event) => setSecond(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-[13px]">
        {t("savantTruth")}
        <select
          className="field"
          value={chosen}
          data-savant-truth
          onChange={(event) => setTruth(event.target.value as SavantTruth)}
        >
          {savant.choices.map((choice) => (
            <option key={choice} value={choice}>
              {t(TRUTH_LABEL[choice])}
            </option>
          ))}
        </select>
      </label>
      <button
        className="btn"
        type="button"
        data-act="savant-visit"
        disabled={!first.trim() || !second.trim()}
        onClick={() => {
          const result = actions.run({
            type: "savantVisit",
            payload: { playerId: savant.playerId, statements: [first, second], truth: chosen },
          });
          if (result.status === "allowed") {
            setFirst("");
            setSecond("");
          }
        }}
      >
        {t("recordSavant")}
      </button>
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
    <div className="my-2.5 grid gap-1.5 rounded-sm border border-edge p-2.5">
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
  const storedDay =
    state.juggler && typeof state.juggler.day === "number" ? state.juggler.day : null;
  const guessingDay = jugglerGuessingDay(
    state.day.number,
    storedDay,
    Boolean(juggler && juggler.changedFrom),
  );
  if (
    !juggler ||
    state.phase !== "day" ||
    state.day.ended ||
    state.winner ||
    juggler.used.juggler ||
    guessingDay !== state.day.number
  ) {
    return null;
  }
  const guesses = normalizeJugglerGuesses(state.juggler ? state.juggler.guesses : null);
  const count = guesses.length;
  const target = drafts.jugglerTarget;
  const full = count >= 5;
  return (
    <div className="my-2.5 grid gap-1.5 rounded-sm border border-edge p-2.5">
      <span className="label">{t("jugglerPanel")}</span>
      <p className={MUTED}>
        {displayName(juggler, t)}: {t("jugglerHint")}
      </p>
      <p className={MUTED} data-juggler-count>
        {t("jugglerCount", { count })}
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
        <button
          className="btn"
          type="button"
          data-act="juggler-none"
          disabled={count > 0 || Boolean(state.juggler) || Boolean(state.winner)}
          onClick={() => actions.run({ type: "jugglerGuess", payload: { guesses: [] } })}
        >
          {t("jugglerNone")}
        </button>
      </div>
      {count ? (
        <ul className="m-0 grid gap-1 pl-4">
          {guesses.map((guess, index) => {
            const player = state.players[guess.playerId];
            return (
              <li key={guess.playerId + "-" + index} className={MUTED}>
                {player ? displayName(player, t) : guess.playerId}:{" "}
                {roleNameOf(guess.roleId, ports.roles.byId)}
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
    <div className="my-2.5 grid gap-1.5 rounded-sm border border-edge p-2.5">
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

const SETUP_STEPS = ["roles", "names", "seats", "secrets"] as const;
type SetupStep = (typeof SETUP_STEPS)[number];

// The pre-night surface: the roster, the setup rail and the one action the
// current step owes. It reads names and claims only; no role reaches it.
export function SetupBoard({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const players = orderedPlayers(state);
  const claimed = players.filter((player) => player.claimed).length;
  const everyoneNamed = players.length > 0 && claimed === players.length;
  const seated = state.phase === "seat";
  const step: SetupStep =
    state.phase === "setup" && !state.setup.roles.length
      ? "roles"
      : !everyoneNamed
        ? "names"
        : !seated
          ? "seats"
          : "secrets";
  const current = SETUP_STEPS.indexOf(step);
  const errors = step === "secrets" ? secretsProjection(state).errors : [];
  const labels: Record<SetupStep, string> = {
    roles: t("ui.setupRoles"),
    names: t("ui.setupNames"),
    seats: t("seats"),
    secrets: t("secrets"),
  };
  const titles: Record<SetupStep, string> = {
    roles: t("noRoles"),
    names: t("ui.names"),
    seats: t("ui.arrange"),
    secrets: t("ui.checkSecrets"),
  };
  const route = step === "names" ? "player" : step === "seats" ? "seat" : null;
  const primaryClass = `${ACTION_PRIMARY} ${BOARD_PRIMARY}`;
  return (
    <section className={`host-card ${BOARD}`} data-setup-board data-setup-step={step}>
      <p className="label">{t("setup")}</p>
      <h1 className={CARD_TITLE}>{titles[step]}</h1>
      {step === "roles" ? <p className={CARD_TEXT}>{t("setupIntro")}</p> : null}
      <ol className={BOARD_STEPS} aria-label={t("setup")}>
        {SETUP_STEPS.map((entry, index) => {
          const mark = index < current ? "done" : index === current ? "current" : "pending";
          const tone =
            mark === "current"
              ? BOARD_STEP_CURRENT
              : mark === "done"
                ? BOARD_STEP_DONE
                : BOARD_STEP_PENDING;
          return (
            <li
              key={entry}
              className={`${BOARD_STEP} ${tone}`}
              data-board-step={entry}
              data-state={mark}
              aria-current={mark === "current" ? "step" : undefined}
            >
              <span aria-hidden="true" className="tabular-nums">
                {mark === "done" ? "✓" : index + 1}
              </span>
              <span className="truncate">{labels[entry]}</span>
            </li>
          );
        })}
      </ol>
      {manualWarning(view)}
      {bmrWarning(view)}
      <div className="mt-3 grid gap-1.5">
        <p className="m-0 text-[11px] tabular-nums text-muted" data-board-count>
          {t("ui.namesCount", { claimed, total: players.length })}
        </p>
        <ul className={BOARD_ROSTER}>
          {players.map((player) => {
            const named = player.claimed && Boolean(player.name);
            return (
              <li
                key={player.id}
                className={BOARD_SEAT}
                data-board-seat={player.seat}
                data-board-claim={player.claimed ? "claimed" : "unclaimed"}
              >
                <span className={BOARD_SEAT_NO}>{player.seat}</span>
                <span
                  className={`min-w-0 flex-1 truncate text-[13px] ${
                    named ? "font-semibold text-text" : "text-muted"
                  }`}
                >
                  {named ? player.name : t("ui.unclaimed")}
                </span>
                <span className="sr-only">
                  {player.claimed ? t("ui.claimed") : t("ui.unclaimed")}
                </span>
                <span
                  aria-hidden="true"
                  className={player.claimed ? "text-table-primary" : "text-muted"}
                >
                  {player.claimed ? "✓" : "·"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {step === "secrets" && errors.length ? (
        <Warn title={t("setupErrors")} bad>
          <ul className="mt-1 list-disc pl-4">
            {errors.map((error) => {
              const localized = t(error.code);
              return (
                <li key={error.code + error.message}>
                  {localized !== error.code ? localized : error.message}
                </li>
              );
            })}
          </ul>
        </Warn>
      ) : null}
      <div className={BOARD_ACTIONS}>
        {step === "roles" ? (
          <a className={primaryClass} data-board-primary href={ports.router.path("bag")}>
            {t("ui.begin")}
          </a>
        ) : null}
        {route ? (
          <a className={primaryClass} data-board-primary href={ports.router.path(route)}>
            {route === "player" ? t("ui.handoff") : t("ui.seats")}
          </a>
        ) : null}
        {step === "secrets" ? (
          <button
            className={primaryClass}
            type="button"
            data-board-primary
            data-act="start-night"
            disabled={errors.length > 0}
            onClick={() => actions.run({ type: "startNight", payload: {} })}
          >
            {t("startFirstNight")}
          </button>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {step === "roles"
            ? null
            : (
                [
                  ["player", t("ui.handoff")],
                  ["seat", t("seats")],
                  ["secrets", t("secrets")],
                ] as const
              )
                .filter(([target]) => target !== route)
                .map(([target, label]) => (
                  <a
                    className={ACTION_QUIET}
                    data-board-link
                    href={ports.router.path(target)}
                    key={target}
                  >
                    {label}
                  </a>
                ))}
          <button
            className={ACTION_QUIET}
            type="button"
            data-act="demo-15"
            title={t("ui.demoHint")}
            onClick={() => ports.router.go("demo")}
          >
            {t("demo")}
          </button>
        </div>
      </div>
      {step === "roles" ? null : <p className={`m-0 ${MUTED}`}>{t("discussWarning")}</p>}
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
      <p className={CARD_TEXT} data-win-reason={winner?.reason ?? ""}>
        {winner ? t(winReasonKey(state, winner)) : ""}
      </p>
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
                  className="border-b border-edge px-1.5 py-1.5 text-left text-[9.5px] font-semibold uppercase tracking-[.06em] text-muted"
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
                <td className="border-b border-edge px-1.5 py-1.5 text-left">{player.seat}</td>
                <td className="border-b border-edge px-1.5 py-1.5 text-left">
                  {displayName(player, t)}
                </td>
                <td className="border-b border-edge px-1.5 py-1.5 text-left">
                  {role ? role.name : "—"}
                </td>
                <td className="border-b border-edge px-1.5 py-1.5 text-left">
                  {shown ? shown.name : "—"}
                </td>
                <td className="border-b border-edge px-1.5 py-1.5 text-left">
                  {role ? ports.strings.teamText(role.team) : "—"}
                </td>
                <td className="border-b border-edge px-1.5 py-1.5 text-left">
                  {player.alive
                    ? "—"
                    : player.deadAt
                      ? causeText(player.deadAt.cause || "", t)
                      : "—"}
                </td>
                <td className="border-b border-edge px-1.5 py-1.5 text-left">
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
