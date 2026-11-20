// Console overlays. The information and role cards are full-screen privacy
// surfaces; the roster, the table menu, the role reference card, the day help,
// the correction and the two backup dialogs use the shared Radix dialog for the
// focus trap and Escape handling.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  seatProjection,
  stepProjection,
  tableProjection,
} from "../../../application/read-models/table.ts";
import { hasAbility, orderedPlayers, playerById, realTeamOf } from "../../../core/model/state.ts";
import { roleTeam } from "../../../core/model/rules.ts";
import { Dialog, DialogClose } from "../../components/dialog.tsx";
import {
  blockerText,
  defaultCorrectionValue,
  displayName,
  guideForStep,
  previewIdentity,
  rejectionText,
  roleNameOf,
  cardRoleId,
  shownCardText,
  stepTitle,
} from "./helpers.ts";
import type { StepInfo } from "./helpers.ts";
import { EffectBadges, ConsequenceList, PanelHead, RoleToken } from "./parts.tsx";
import { DayActionsPanel, DayCard, NightCard, SlayerPanel } from "./cards.tsx";
import { DayPanel, QueuePanel, SidePanel } from "./frame.tsx";
import { stepContext } from "./step-context.ts";
import { writeStepDraft } from "./step-draft.ts";
import { seatBadges, SEAT_BADGE_KEY } from "./ring.ts";
import type { TableView } from "./view.ts";
import { CHIPS, FIELD_BOX, GRIMOIRE, INLINE, MUTED, WARNING } from "./styles.ts";

const HIDDEN_TRIGGER = <button className="hidden" type="button" tabIndex={-1} aria-hidden="true" />;

export function Overlays({ view }: { view: TableView }) {
  switch (view.drafts.overlay) {
    case "info":
      return <PlayerInfoCard view={view} />;
    case "player":
      return <PlayerRoleCard view={view} />;
    case "playerSheet":
      return <PlayerSheet view={view} />;
    case "step":
      return <StepSheet view={view} />;
    case "grimoire":
      return <GrimoireOverlay view={view} />;
    case "role":
      return <RoleCardDialog view={view} />;
    case "roster":
      return <RosterDialog view={view} />;
    case "menu":
      return <MenuDialog view={view} />;
    case "execute":
      return <ExecutionConfirm view={view} />;
    case "day":
      return (
        <ShellDialog
          open
          onClose={view.actions.closeOverlay}
          title={view.ports.strings.t("ui.dayHelp")}
          closeLabel={view.ports.strings.t("close")}
        >
          <DayCard view={view} roleFormsOnly />
        </ShellDialog>
      );
    case "correction":
      return <CorrectionDialog view={view} />;
    case "export":
      return <ExportDialog view={view} />;
    case "import":
      return <ImportDialog view={view} />;
    default:
      return null;
  }
}

function PlayerCardShell({
  label,
  children,
  closeLabel,
  onClose,
}: {
  label: string;
  children: ReactNode;
  closeLabel: string;
  onClose(): void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  return (
    <div
      className="fixed inset-0 z-[200] grid min-h-dvh place-items-center overflow-y-auto bg-crypt p-5"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-player-card
    >
      <div className="grid w-[min(400px,100%)] justify-items-center gap-3 rounded-lg bg-card-parchment p-6 text-center text-card-ink shadow-deep">
        {children}
      </div>
      <button
        ref={closeRef}
        className="btn min-h-11 min-w-[180px] !justify-center border-edge-2 bg-crypt-2 text-parchment"
        type="button"
        data-act="hide-card"
        onClick={onClose}
      >
        {closeLabel}
      </button>
    </div>
  );
}

function PlayerInfoCard({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const step = state.night.queue.find((candidate) => candidate.key === drafts.infoKey);
  if (!step) return null;
  // The Lunatic is shown the Demon's first-night card: the same layout, the
  // Demon they believe they are, the Minions and the bluffs. Only the real
  // Demon's player never reaches this card.
  if (step.roleId === "lunatic" && state.night.number === 1) {
    const actor = step.actorId ? playerById(state, step.actorId) : null;
    const mask = actor?.shownRoleId ? ports.roles.byId(actor.shownRoleId) : null;
    const bluffIds = (
      state.setup.lunaticBluffs?.length
        ? state.setup.lunaticBluffs
        : state.bluffs?.length
          ? state.bluffs
          : state.setup.bluffs
    ).map(String);
    const bluffRoles = bluffIds
      .map((id) => ports.roles.byId(id))
      .filter((bluff): bluff is NonNullable<typeof bluff> => Boolean(bluff));
    // The host points at any players as the Minions; the picks are the step
    // targets. Nothing is filled in automatically.
    const draftKey = `${state.createdAt}:${state.night.number}:${step.key}`;
    const pickedIds = drafts.targets.get(draftKey) ?? step.targetIds ?? [];
    const minions = pickedIds
      .map((id) => playerById(state, id))
      .filter((player): player is NonNullable<typeof player> => Boolean(player));
    return (
      <PlayerCardShell
        label={t("demonInfo")}
        closeLabel={t("hideCard")}
        onClose={actions.closeInfo}
      >
        {mask ? (
          <img className="size-20 object-contain" src={ports.roles.image(mask)} alt="" />
        ) : null}
        <span className="text-[8px] font-semibold uppercase tracking-[.2em] text-ink-2">
          {t("night")} {state.night.number}
        </span>
        <h2 data-player-card-role className="m-0 font-role text-[30px] leading-tight text-card-ink">
          {t("demonInfo")}
        </h2>
        {actor && mask ? (
          <p className="m-0 text-[15px] text-ink-2" data-lunatic-mask>
            {displayName(actor, t)} · {mask.name}
          </p>
        ) : null}
        <div className="grid w-full gap-3 text-left" data-lunatic-card>
          <div className="grid gap-1.5">
            <span className="label">{t("minionInfo")}</span>
            <ul className="m-0 grid list-none gap-2 p-0" data-info-minions>
              {minions.map((player) => (
                <li
                  key={player.id}
                  className="flex items-baseline gap-2.5 border-t border-card-ink/10 pt-2 first:border-t-0 first:pt-0"
                >
                  <span className="w-5 shrink-0 text-[11px] tabular-nums text-ink-2">
                    {player.seat}
                  </span>
                  <b className="text-[16px] font-semibold">{displayName(player, t)}</b>
                </li>
              ))}
            </ul>
          </div>
          {bluffRoles.length ? (
            <div className="grid gap-1.5">
              <span className="label">{t("bluffs")}</span>
              <div className="flex flex-wrap gap-2" data-info-bluffs>
                {bluffRoles.map((bluff) => (
                  <span
                    key={bluff.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-card-ink/15 bg-card-parchment px-3 py-1.5 text-[13px] text-card-ink"
                  >
                    <img className="size-4 object-contain" src={ports.roles.image(bluff)} alt="" />
                    {bluff.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </PlayerCardShell>
    );
  }
  const draftKey = `${state.createdAt}:${state.night.number}:${step.key}`;
  const derived = stepProjection(state, step, {
    targetIds: drafts.targets.get(draftKey) || [],
    registrations: drafts.registrations.get(draftKey) || {},
  });
  // The draft and the command are one answer. Once the step is recorded the
  // draft is gone, so the card reads the answer the engine stored.
  const draftGiven = drafts.givens.get(draftKey);
  const recorded = (step.given as StepInfo | null | undefined) || undefined;
  const shown = draftGiven || recorded || derived.info;
  const given = draftGiven || recorded;
  const actor = step.actorId ? playerById(state, step.actorId) : null;
  const roleId = actor ? cardRoleId(actor) : step.roleId;
  const role = roleId ? ports.roles.byId(roleId) : null;
  const generic = step.system === "minioninfo" || step.system === "demoninfo" ? step.system : null;
  const text = shownCardText(
    state,
    step,
    shown,
    given,
    derived.actorImpaired || Boolean(step.impaired) || Boolean(given?.impaired),
    ports.roles.byId,
    t,
  );
  if (generic) {
    const players = orderedPlayers(state);
    const roleOf = (id: string | null) => (id ? ports.roles.byId(id) : null);
    const actorIds = Array.isArray(step.actorIds) ? (step.actorIds as string[]) : [];
    const minions =
      generic === "minioninfo" && actorIds.length
        ? actorIds
            .map((id) => playerById(state, id))
            .filter((player): player is NonNullable<typeof player> => Boolean(player))
        : players.filter((player) => roleTeam(player.roleId || "") === "minion");
    const demon =
      (step.demonId ? playerById(state, step.demonId) : null) ??
      players.find((player) => roleTeam(player.roleId || "") === "demon");
    const demonRole = demon ? roleOf(demon.roleId) : null;
    const bluffIds = step.bluffs && step.bluffs.length ? step.bluffs : state.setup.bluffs || [];
    const bluffRoles = bluffIds
      .map((id) => roleOf(id))
      .filter((bluff): bluff is NonNullable<typeof bluff> => Boolean(bluff));
    const title = t(generic === "demoninfo" ? "demonInfo" : "minionInfo");
    return (
      <PlayerCardShell label={title} closeLabel={t("hideCard")} onClose={actions.closeInfo}>
        {generic === "demoninfo" && demonRole ? (
          <img className="size-20 object-contain" src={ports.roles.image(demonRole)} alt="" />
        ) : null}
        <span className="text-[8px] font-semibold uppercase tracking-[.2em] text-ink-2">
          {t("night")} {state.night.number}
        </span>
        <h2 data-player-card-role className="m-0 font-role text-[30px] leading-tight text-card-ink">
          {title}
        </h2>
        {generic === "demoninfo" && demon && demonRole ? (
          <p className="m-0 text-[15px] text-ink-2">
            {displayName(demon, t)} · {demonRole.name}
          </p>
        ) : null}
        {generic === "minioninfo" && demon ? (
          <p className="m-0 text-[15px] text-ink-2" data-info-demon>
            {t("demonInfo")}: {displayName(demon, t)}
          </p>
        ) : null}
        <div className="grid w-full gap-3 text-left">
          <div className="grid gap-1.5">
            <span className="label">{t("minionInfo")}</span>
            <ul className="m-0 grid list-none gap-2 p-0" data-info-minions>
              {minions.map((player) => (
                <li
                  key={player.id}
                  className="flex items-baseline gap-2.5 border-t border-card-ink/10 pt-2 first:border-t-0 first:pt-0"
                >
                  <span className="w-5 shrink-0 text-[11px] tabular-nums text-ink-2">
                    {player.seat}
                  </span>
                  <b className="text-[16px] font-semibold">{displayName(player, t)}</b>
                </li>
              ))}
            </ul>
          </div>
          {generic === "demoninfo" && bluffRoles.length ? (
            <div className="grid gap-1.5">
              <span className="label">{t("bluffs")}</span>
              <div className="flex flex-wrap gap-2" data-info-bluffs>
                {bluffRoles.map((bluff) => (
                  <span
                    key={bluff.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-card-ink/15 bg-card-parchment px-3 py-1.5 text-[13px] text-card-ink"
                  >
                    <img className="size-4 object-contain" src={ports.roles.image(bluff)} alt="" />
                    {bluff.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </PlayerCardShell>
    );
  }
  return (
    <PlayerCardShell label={t("showCard")} closeLabel={t("hideCard")} onClose={actions.closeInfo}>
      {role ? (
        <img className="size-24 object-contain" src={ports.roles.image(role)} alt="" />
      ) : null}
      <span className="text-[8px] font-semibold uppercase tracking-[.2em] text-ink-2">
        {t("night")} {state.night.number}
        {role ? ` · ${role.name}` : ""}
      </span>
      <h2 data-player-card-role className="m-0 font-role text-[26px] leading-tight text-card-ink">
        {role ? role.name : stepTitle(step, ports.roles.byId, t)}
      </h2>
      <p data-player-card-text className="m-0 text-[16px] leading-[1.45] text-card-ink">
        {text}
      </p>
    </PlayerCardShell>
  );
}

function SheetClose({ onClose, label }: { onClose(): void; label: string }) {
  return (
    <div className="mb-2 flex justify-end">
      <button
        className="btn btn--quiet min-h-11 !border-edge-2 !px-3 !text-[12px] text-text hover:!bg-crypt-3"
        type="button"
        data-act="close"
        onClick={onClose}
      >
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        {label}
      </button>
    </div>
  );
}

function StepSheet({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const projection = tableProjection(state);
  if (projection.pendingDemonChange) {
    // The heir is the only question until the host answers it: the sheet
    // offers no control of the step that waits behind it.
    return (
      <ShellDialog
        open
        onClose={actions.closeOverlay}
        title={t("pendingHeir")}
        description={t("pendingHeirText")}
        closeLabel={t("close")}
        footer={<></>}
        bare
      >
        <SheetClose onClose={actions.closeOverlay} label={t("close")} />
        <div className="grid gap-3 rounded-md border border-edge-2 bg-crypt-2 p-4 shadow-lg">
          <NightCard view={view} flat />
        </div>
      </ShellDialog>
    );
  }
  const step = projection.step;
  if (!step) return null;
  const context = stepContext(state, drafts, step);
  const guide = guideForStep(t, ports.guidance.for, state, step);
  // The Po's "no one" is a recorded decision, not a skip: when its step allows
  // zero targets, the sheet offers that choice by name (Po r3104).
  const poNoOne = step.targetMode === "po" && context.minTargets === 0;
  const preview = actions.preview({ type: "completeNightStep", payload: context.payload });
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={stepTitle(step, ports.roles.byId, t)}
      description={guide.host || ""}
      closeLabel={t("close")}
      footer={<></>}
      bare
    >
      <SheetClose onClose={actions.closeOverlay} label={t("close")} />
      <div className="grid gap-3 rounded-md border border-edge-2 bg-crypt-2 p-4 shadow-lg">
        <NightCard view={view} flat />
        {context.blockers.length ? (
          <ul
            className="m-0 grid list-none gap-1 p-0 text-[12px] leading-tight text-table-secondary"
            data-step-blockers
          >
            {context.blockers.map((blocker) => (
              <li key={blocker} data-blocker-reason={blocker}>
                {blockerText(blocker, context.minTargets, t)}
              </li>
            ))}
          </ul>
        ) : null}
        <div className={projection.skippable || poNoOne ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
          {projection.skippable ? (
            <button
              className="btn min-h-11 !justify-center"
              type="button"
              data-act="step-skip"
              onClick={() => {
                actions.run({ type: "skipStep", payload: { key: step.key } });
                actions.closeOverlay();
              }}
            >
              {t("skipWake")}
            </button>
          ) : poNoOne ? (
            <button
              className="btn min-h-11 !justify-center"
              type="button"
              data-act="step-no-one"
              onClick={() => {
                const payload = { key: step.key, targetIds: [] };
                const result = actions.run({
                  type: "completeNightStep",
                  payload,
                  ...previewIdentity(actions.preview({ type: "completeNightStep", payload })),
                });
                if (result.status === "allowed") {
                  drafts.clearStep(context.draftKey);
                  writeStepDraft(ports.prefs.write, null);
                  actions.closeOverlay();
                }
              }}
            >
              {t("ui.noOne")}
            </button>
          ) : null}
          <button
            className="btn min-h-11 !justify-center border-table-primary bg-table-primary text-table-primary-ink !bg-none font-semibold disabled:!border-edge-2 disabled:!bg-transparent disabled:!text-muted disabled:!opacity-100"
            type="button"
            data-act="step-confirm"
            disabled={context.blockers.length > 0}
            onClick={() => {
              const result = actions.run({
                type: "completeNightStep",
                payload: context.payload,
                ...previewIdentity(preview),
              });
              if (result.status === "allowed") {
                drafts.clearStep(context.draftKey);
                writeStepDraft(ports.prefs.write, null);
                actions.closeOverlay();
              }
            }}
          >
            {t("ui.confirm")}
          </button>
        </div>
        {poNoOne ? (
          <p className="m-0 text-[12px] leading-tight text-table-secondary" data-step-no-one-hint>
            {t("ui.noOneHint")}
          </p>
        ) : null}
      </div>
    </ShellDialog>
  );
}

function PlayerSheet({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const player = drafts.playerCardId ? playerById(state, drafts.playerCardId) : null;
  if (!player) return null;
  const role = player.roleId ? ports.roles.byId(player.roleId) : null;
  const dead = !player.alive || Boolean(player.registeredDead);
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={displayName(player, t)}
      description={role ? `${role.name} · ${ports.strings.teamText(role.team)}` : t("ui.unknown")}
      closeLabel={t("close")}
    >
      <div className="grid gap-3" data-player-sheet>
        <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
          {role ? (
            <img className="size-14 object-contain" src={ports.roles.image(role)} alt="" />
          ) : null}
          <div>
            <p className="m-0 text-[12px] text-muted">
              {t("seat")} {player.seat} · {dead ? t("ui.dead") : t("ui.alive")}
            </p>
            <b className="block font-role text-[18px] text-parchment">
              {role ? role.name : t("ui.unknown")}
            </b>
          </div>
        </div>
        {role?.ability ? (
          <p className="m-0 text-[12px] leading-[1.5] text-muted">{role.ability}</p>
        ) : null}
        {state.phase === "day" && !state.day.ended && !state.winner ? (
          <PlayerVoteControls
            key={`${player.id}:${state.day.number}`}
            view={view}
            playerId={player.id}
          />
        ) : null}
        {state.phase === "day" && !state.day.execution && !state.day.ended && !state.winner ? (
          <button
            className="btn btn--accent"
            type="button"
            data-act="player-execute"
            onClick={() => {
              drafts.setExecuteTarget(drafts.executeTarget === player.id ? "" : player.id);
              drafts.setExecuteSurvives(false);
              actions.closeOverlay();
            }}
          >
            {drafts.executeTarget === player.id
              ? t("ui.clearExecution")
              : t("ui.selectForExecution")}
          </button>
        ) : null}
        {hasAbility(player, "slayer") && player.alive && !player.used.slayer ? (
          <SlayerPanel view={view} slayerId={player.id} />
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn"
            type="button"
            data-act="player-correct"
            onClick={() => actions.openCorrection(player.id)}
          >
            {t("correction")}
          </button>
          <button
            className="btn"
            type="button"
            data-act="player-card"
            onClick={() => drafts.setOverlay("player")}
          >
            {t("showCard")}
          </button>
        </div>
        <button
          className="btn"
          type="button"
          data-act="player-role"
          disabled={!player.roleId}
          onClick={() => player.roleId && actions.openRole(player.roleId)}
        >
          {t("roleCard")}
        </button>
      </div>
    </ShellDialog>
  );
}

function PlayerVoteControls({ view, playerId }: { view: TableView; playerId: string }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const [count, setCount] = useState(String(state.day.voteCounts?.[playerId] ?? 0));
  const player = playerById(state, playerId);
  if (!player) return null;
  const value = Number(count);
  const valid =
    count.trim() !== "" && Number.isInteger(value) && value >= 0 && value <= state.order.length;
  const dead = !player.alive || Boolean(player.registeredDead);
  const rejection = rejectionText(actions.rejection, t);
  const saved = state.day.voteCounts?.[playerId];
  const commit = () => {
    if (!valid) return;
    if ((saved ?? 0) === value) return;
    actions.run({ type: "setVoteCount", payload: { playerId, count: value } });
  };
  // A blur dispatch re-renders the sheet between pointerdown and pointerup, and
  // the browser then drops the click on the control that took the focus. The
  // commit waits one task so the tap that caused the blur still lands.
  const commitAfterTap = () => {
    window.setTimeout(commit, 0);
  };
  return (
    <div className="grid gap-3 rounded-md border border-edge bg-crypt-3 p-3" data-player-voting>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          commit();
        }}
      >
        <label className="grid gap-1 text-[12px] text-muted">
          {t("ui.playerVoteCount")}
          <input
            className="field min-h-11 w-full"
            type="number"
            inputMode="numeric"
            min={0}
            max={state.order.length}
            step={1}
            data-vote-count
            value={count}
            onBlur={commitAfterTap}
            onChange={(event) => setCount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              commit();
            }}
          />
        </label>
        {saved !== undefined ? (
          <p className="m-0 text-[12px] text-muted" role="status">
            {t("ui.savedVoteCount", { n: saved })}
          </p>
        ) : null}
      </form>
      {dead ? (
        <div className="grid gap-2 border-t border-edge pt-2">
          <span className="text-[12px] text-muted">
            {t(player.voteToken ? "ui.ghostVote" : "ui.noGhostVote")}
          </span>
          <button
            className="btn min-h-11"
            type="button"
            data-act="toggle-dead-vote"
            aria-pressed={!player.voteToken}
            onClick={() =>
              actions.run({
                type: "setDeadVoteUsed",
                payload: { playerId, used: player.voteToken },
              })
            }
          >
            {t(player.voteToken ? "ui.spendDeadVote" : "ui.restoreDeadVote")}
          </button>
        </div>
      ) : null}
      {rejection ? (
        <p className="m-0 text-[12px] text-danger" role="alert">
          {rejection}
        </p>
      ) : null}
    </div>
  );
}

function PlayerRoleCard({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const player = drafts.playerCardId ? playerById(state, drafts.playerCardId) : null;
  const roleId = cardRoleId(player);
  const role = roleId ? ports.roles.byId(roleId) : null;
  if (!player || !role) return null;
  return (
    <PlayerCardShell
      label={t("roleCard")}
      closeLabel={t("hideCard")}
      onClose={actions.closeOverlay}
    >
      <img className="size-24 object-contain" src={ports.roles.image(role)} alt="" />
      <span className="text-[8px] font-semibold uppercase tracking-[.2em] text-ink-2">
        {displayName(player, t)} · {ports.strings.teamText(role.team)}
      </span>
      <h2 data-player-card-role className="m-0 font-role text-[26px] leading-tight text-card-ink">
        {role.name}
      </h2>
      <p data-player-card-text className="m-0 text-[14px] leading-[1.5] text-card-ink">
        {role.ability || ""}
      </p>
    </PlayerCardShell>
  );
}

function GrimoireOverlay({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  return (
    <div className={GRIMOIRE} role="dialog" aria-modal="true" aria-label={t("ui.grimoire")}>
      <div className="mx-auto w-[min(1000px,100%)] rounded-md border border-edge-2 bg-crypt-2 p-4">
        <PanelHead
          label={`${t("ui.spy")} · ${t("ui.grimoire")}`}
          note={
            <button
              className="btn"
              type="button"
              data-act="hide-grimoire"
              onClick={actions.closeOverlay}
            >
              {t("ui.hideGrimoire")}
            </button>
          }
        />
        <p className={MUTED}>{t("ui.spyOnly")}</p>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-1.5">
          {orderedPlayers(state).map((player) => (
            <article
              key={player.id}
              className={`grid grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-sm border border-edge bg-crypt-3 p-2 ${
                player.alive ? "" : "border-dashed opacity-65"
              }`}
            >
              <span className="text-[12px] text-muted">{player.seat}</span>
              <div className="min-w-0">
                <b className="block text-[12px]">{displayName(player, t)}</b>
                {player.roleId ? <RoleToken id={player.roleId} ports={ports} /> : null}
                <p className="my-0.5 text-[12px]">
                  {roleTeam(player.roleId || "")
                    ? ports.strings.teamText(roleTeam(player.roleId || "") || "")
                    : "—"}{" "}
                  · {player.alive ? t("ui.alive") : t("ui.dead")}
                </p>
                <span className={CHIPS}>
                  <EffectBadges state={state} player={player} ports={ports} />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleCardDialog({ view }: { view: TableView }) {
  const { drafts, ports, actions } = view;
  const t = ports.strings.t;
  const role = drafts.roleCardId ? ports.roles.byId(drafts.roleCardId) : null;
  if (!role) return null;
  return (
    <ShellDialog
      open
      onClose={actions.closeRole}
      title={role.name}
      description={ports.strings.teamText(role.team)}
      closeLabel={t("close")}
    >
      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
        <img className="h-[96px] w-[96px] object-contain" src={ports.roles.image(role)} alt="" />
        <div>
          <p className="mb-2 text-[13px] leading-[1.5]">{role.ability || ""}</p>
          {typeof role.flavor === "string" && role.flavor ? (
            <p className="text-[13px] leading-[1.5] text-muted">{role.flavor}</p>
          ) : null}
        </div>
      </div>
    </ShellDialog>
  );
}

function RosterDialog({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const projection = tableProjection(state);
  const nomination =
    state.day.nominations.find((entry) => entry.id === state.day.activeNominationId) ??
    state.day.nominations[state.day.nominations.length - 1];
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={t("roster")}
      description={t("rosterHint")}
      closeLabel={t("close")}
    >
      <ol className="grid max-h-[62dvh] list-none gap-1 overflow-y-auto p-0" data-roster>
        {orderedPlayers(state).map((player) => {
          const seat = seatProjection(state, player.id);
          const role = player.roleId ? ports.roles.byId(player.roleId) : null;
          const badges = seatBadges({
            alive: player.alive,
            voteToken: player.voteToken,
            acting: projection.step?.actorId === player.id,
            nominated: nomination?.nomineeId === player.id,
            impaired: seat.impaired && player.roleId !== "drunk",
            drunk: seat.drunk && player.roleId !== "drunk",
            poisoned: seat.poisoned && player.roleId !== "drunk",
            protected: seat.protected,
          });
          return (
            <li
              key={player.id}
              data-roster-player={player.id}
              className="flex items-center gap-2 rounded-sm border border-edge bg-crypt-3 p-2"
            >
              <span
                data-seat-number=""
                className="w-6 shrink-0 text-[11px] tabular-nums text-muted"
              >
                {player.seat}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px]">{displayName(player, t)}</b>
                <small className="block truncate text-[12px] text-muted">
                  {role ? role.name : t("ui.unknown")}
                  {role ? ` · ${ports.strings.teamText(role.team)}` : ""}
                </small>
                {badges.length ? (
                  <span className="flex flex-wrap gap-1 pt-0.5">
                    {badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-edge-2 px-1 py-px text-[10px] uppercase tracking-[.06em] text-muted"
                      >
                        {t(SEAT_BADGE_KEY[badge])}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              <button
                className="btn min-h-11 shrink-0 !justify-center"
                type="button"
                data-act="role-card"
                onClick={() => {
                  drafts.setPlayerCardId(player.id);
                  drafts.setOverlay("playerSheet");
                }}
              >
                {t("roleCard")}
              </button>
            </li>
          );
        })}
      </ol>
    </ShellDialog>
  );
}

function MenuDialog({ view }: { view: TableView }) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  return (
    <ShellDialog open onClose={actions.closeOverlay} title={t("tableMenu")} closeLabel={t("close")}>
      <div className="grid max-h-[68dvh] gap-2 overflow-y-auto" data-menu>
        {state.phase === "day" ? (
          <p className="m-0 text-[13px] leading-[1.45] text-muted" data-day-instruction>
            {t("ui.tableVotes")}
          </p>
        ) : null}
        <SidePanel view={view} />
        {state.phase === "night" || state.phase === "day" ? <QueuePanel view={view} /> : null}
        <DayPanel view={view} />
        <DayActionsPanel view={view} />
      </div>
    </ShellDialog>
  );
}

function ExecutionConfirm({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const player = drafts.executeTarget ? playerById(state, drafts.executeTarget) : null;
  if (!player) return null;
  const role = player.roleId ? ports.roles.byId(player.roleId) : null;
  const preview = actions.preview({
    type: "executeByDecision",
    payload: {
      playerId: player.id,
      options: { survives: drafts.executeSurvives },
    },
  });
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={t("ui.executeConfirmTitle")}
      description={t("ui.executeConfirmBody")}
      closeLabel={t("close")}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn min-h-11 !justify-center"
            type="button"
            data-act="execute-cancel"
            onClick={actions.closeOverlay}
          >
            {t("cancel")}
          </button>
          <button
            className="btn btn--danger min-h-11 !justify-center"
            type="button"
            data-act="execute-confirm"
            onClick={() => {
              const result = actions.run({
                type: "executeByDecision",
                payload: {
                  playerId: player.id,
                  options: { survives: drafts.executeSurvives },
                },
                ...previewIdentity(preview),
              });
              if (result.status === "allowed") {
                drafts.setExecuteTarget("");
                actions.closeOverlay();
              }
            }}
          >
            {t("execute")}
          </button>
        </div>
      }
    >
      <div className="grid gap-2" data-execute-confirm>
        <p className="m-0 font-role text-[22px] leading-tight text-parchment">
          {displayName(player, t)}
        </p>
        <p className="m-0 text-[13px] text-muted">
          {t("seat")} {player.seat} · {role ? role.name : t("ui.unknown")}
        </p>
        <ConsequenceList outcome={preview} targets={[player.id]} state={state} ports={ports} />
      </div>
    </ShellDialog>
  );
}

function CorrectionDialog({ view }: { view: TableView }) {
  const { state, drafts, ports, actions } = view;
  const t = ports.strings.t;
  const players = orderedPlayers(state);
  const current = drafts.correction || {
    playerId: players[0] ? players[0].id : "",
    kind: "alive",
    value: "dead",
    reason: "",
  };
  const selected = playerById(state, current.playerId);
  const update = (patch: Partial<typeof current>) => drafts.setCorrection({ ...current, ...patch });
  const apply = () => {
    if (!current.reason.trim()) {
      window.alert(t("correctionReason"));
      return;
    }
    const base = { playerId: current.playerId, reason: current.reason };
    const change =
      current.kind === "alive"
        ? { ...base, kind: "alive" as const, value: current.value === "alive" }
        : current.kind === "role"
          ? { ...base, kind: "role" as const, value: current.value }
          : current.kind === "twin"
            ? { ...base, kind: "twin" as const, value: current.value }
            : current.kind === "reminder"
              ? { ...base, kind: "reminder" as const, value: current.value }
              : current.kind === "shown"
                ? { ...base, kind: "shown" as const, value: current.value || null }
                : current.kind === "effect"
                  ? {
                      kind: "effect" as const,
                      effectId: current.value,
                      value: false,
                      reason: current.reason,
                    }
                  : { kind: "clear-winner" as const, reason: current.reason };
    const result = actions.run({ type: "manualCorrection", payload: { change } });
    if (result.status === "allowed") actions.closeOverlay();
  };
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={t("correction")}
      description={t("correctionHint")}
      closeLabel={t("close")}
      footer={
        <div className={`${INLINE} mt-3`}>
          <button
            className="btn btn--accent"
            type="button"
            data-act="apply-correction"
            onClick={apply}
          >
            {t("apply")}
          </button>
          <DialogClose>
            <button className="btn" type="button" data-act="close" onClick={actions.closeOverlay}>
              {t("cancel")}
            </button>
          </DialogClose>
        </div>
      }
    >
      <label className={FIELD_BOX}>
        <span className="label">{t("ui.correctPlayer")}</span>
        <select
          className="field"
          data-correct="player"
          value={current.playerId}
          onChange={(event) =>
            update({
              playerId: event.target.value,
              value: defaultCorrectionValue(current.kind, playerById(state, event.target.value)),
            })
          }
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.seat} · {displayName(player, t)}
            </option>
          ))}
        </select>
      </label>
      <label className={FIELD_BOX}>
        <span className="label">{t("ui.correctAction")}</span>
        <select
          className="field"
          data-correct="kind"
          value={current.kind}
          onChange={(event) =>
            update({
              kind: event.target.value,
              value: defaultCorrectionValue(event.target.value, selected),
            })
          }
        >
          <option value="alive">
            {t("markDead")} / {t("revive")}
          </option>
          <option value="role">{t("role")}</option>
          {selected && selected.roleId === "eviltwin" ? (
            <option value="twin">{t("twinPartner")}</option>
          ) : null}
          <option value="reminder">{t("addReminder")}</option>
          <option value="shown">{t("correctShownRole")}</option>
          <option value="effect">{t("correctEffect")}</option>
          <option value="clear-winner">{t("rollback")}</option>
        </select>
      </label>
      {current.kind === "alive" ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("ui.correctStatus")}</span>
          <select
            className="field"
            data-correct="alive-value"
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          >
            <option value="dead">{t("markDead")}</option>
            <option value="alive">{t("revive")}</option>
          </select>
        </label>
      ) : null}
      {current.kind === "role" ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("role")}</span>
          <select
            className="field"
            data-correct="role-value"
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          >
            {(state.script?.roles ?? []).map((id) => (
              <option key={id} value={id}>
                {roleNameOf(id, ports.roles.byId)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {current.kind === "twin" ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("twinPartner")}</span>
          <select
            className="field"
            data-correct="twin-value"
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          >
            <option value="">—</option>
            {players
              .filter(
                (player) =>
                  selected &&
                  player.id !== current.playerId &&
                  realTeamOf(player) !== realTeamOf(selected),
              )
              .map((player) => (
                <option key={player.id} value={player.id}>
                  {player.seat} · {displayName(player, t)}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      {current.kind === "shown" ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("correctShownRole")}</span>
          <select
            className="field"
            data-correct="shown"
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          >
            <option value="">—</option>
            {(state.script?.roles ?? []).map((id) => (
              <option key={id} value={id}>
                {roleNameOf(id, ports.roles.byId)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {current.kind === "effect" ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("correctEffect")}</span>
          <select
            className="field"
            data-correct="effect"
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          >
            <option value="">—</option>
            {(state.effects || [])
              .filter(
                (effect) =>
                  effect.active !== false &&
                  (effect.targetId === current.playerId ||
                    (current.playerId === "" && effect.targetId == null)),
              )
              .map((effect) => (
                <option key={effect.id} value={effect.id}>
                  {effect.sourceId
                    ? displayName(playerById(state, effect.sourceId), t) + " → "
                    : ""}
                  {effect.targetId ? displayName(playerById(state, effect.targetId), t) : "—"}
                  {": "}
                  {effect.kind}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      {current.kind === "reminder" ? (
        <label className={FIELD_BOX}>
          <span className="label">{t("addReminder")}</span>
          <input
            className="field"
            data-correct="reminder-value"
            maxLength={28}
            value={current.value}
            onChange={(event) => update({ value: event.target.value })}
          />
        </label>
      ) : null}
      <label className={FIELD_BOX}>
        <span className="label">{t("correctionReason")}</span>
        <input
          className="field"
          data-correct="reason"
          maxLength={120}
          placeholder={t("correctionReason")}
          value={current.reason}
          onChange={(event) => update({ reason: event.target.value })}
        />
      </label>
      {current.kind === "clear-winner" ? <p className={WARNING}>{t("reviewHidden")}</p> : null}
      <button
        className="btn"
        type="button"
        data-act="recover-claim"
        onClick={() => {
          const reason = window.prompt(t("correctionReason"));
          if (!reason) return;
          const id = current.playerId;
          actions.closeOverlay();
          actions.run({ type: "recoverClaim", payload: { playerId: id, reason } });
        }}
      >
        {t("recoverClaim")}
      </button>
      <p className={MUTED}>{t("recoverClaimHint")}</p>
    </ShellDialog>
  );
}

function ExportDialog({ view }: { view: TableView }) {
  const { drafts, ports, actions } = view;
  const t = ports.strings.t;
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={t("export")}
      closeLabel={t("close")}
      footer={
        <div className={`${INLINE} mt-3`}>
          <button className="btn" type="button" data-act="download" onClick={actions.download}>
            {t("save")}
          </button>
          <button className="btn" type="button" data-act="copy" onClick={actions.copy}>
            {t("ui.copy")}
          </button>
          <DialogClose>
            <button className="btn" type="button" data-act="close" onClick={actions.closeOverlay}>
              {t("close")}
            </button>
          </DialogClose>
        </div>
      }
    >
      <p className={WARNING}>{t("exportWarning")}</p>
      <textarea
        className="field min-h-[220px] w-full resize-y font-mono text-[12px]"
        readOnly
        value={drafts.exportText}
      />
    </ShellDialog>
  );
}

function ImportDialog({ view }: { view: TableView }) {
  const { drafts, ports, actions } = view;
  const t = ports.strings.t;
  return (
    <ShellDialog
      open
      onClose={actions.closeOverlay}
      title={t("import")}
      closeLabel={t("close")}
      footer={
        <div className={`${INLINE} mt-3`}>
          <button
            className="btn btn--accent"
            type="button"
            data-act="apply-import"
            onClick={actions.applyImport}
          >
            {t("apply")}
          </button>
          <DialogClose>
            <button className="btn" type="button" data-act="close" onClick={actions.closeOverlay}>
              {t("cancel")}
            </button>
          </DialogClose>
        </div>
      }
    >
      <p className={WARNING}>{t("exportWarning")}</p>
      <textarea
        className="field min-h-[220px] w-full resize-y font-mono text-[12px]"
        data-import-text
        placeholder={t("importLabel")}
        value={drafts.importText}
        onChange={(event) => drafts.setImportText(event.target.value)}
      />
    </ShellDialog>
  );
}

function ShellDialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  footer,
  bare,
  children,
}: {
  open: boolean;
  onClose(): void;
  title: string;
  description?: string;
  closeLabel: string;
  footer?: ReactNode;
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      trigger={HIDDEN_TRIGGER}
      title={title}
      {...(description === undefined ? {} : { description })}
      closeLabel={closeLabel}
      footer={footer}
      bare={Boolean(bare)}
    >
      {children}
    </Dialog>
  );
}
