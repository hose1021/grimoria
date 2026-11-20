// The host table: one stadium of seats around a centre hub. The screen owns
// every action; a seat only reports the target choice, and the hub reads the
// published state. The rail, the felt and the seats share one contour.
import { orderedPlayers, playerById } from "../../../core/model/state.ts";
import { seatProjection, tableProjection } from "../../../application/read-models/table.ts";
import type { Nomination } from "../../../core/model/types.ts";
import { displayName, roleNameOf, stepTitle } from "./helpers.ts";
import {
  dawnReport,
  seatBadges,
  SEAT_BADGE_KEY,
  SEAT_BADGE_TONE,
  SEAT_LABEL_SIDE,
} from "./ring.ts";
import type { DawnReport } from "./ring.ts";
import { TableFelt, useTableLayout } from "./surface.tsx";
import type { TableView } from "./view.ts";

export interface TableRingProps {
  view: TableView;
  /** The dawn report the host has already dismissed, keyed by game and day. */
  dismissedDawn: Set<string>;
  onDismissDawn(key: string): void;
}

export function TableRing({ view, dismissedDawn, onDismissDawn }: TableRingProps) {
  const { state, ports, actions } = view;
  const t = ports.strings.t;
  const players = orderedPlayers(state);
  const { ref: tableRef, layout } = useTableLayout(players.length);
  const placements = layout.seats;
  const projection = tableProjection(state);
  const nomination =
    state.day.nominations.find((entry) => entry.id === state.day.activeNominationId) ??
    state.day.nominations[state.day.nominations.length - 1];
  // While the host owes the Demon's heir, the step behind it takes no target.
  const step = projection.pendingDemonChange ? null : projection.step;
  const targetStep = state.phase === "night" && step && step.targetMode !== "none" ? step : null;
  const targetKey = targetStep ? targetStep.key : null;
  const draftKey = targetStep ? `${state.createdAt}:${state.night.number}:${targetStep.key}` : "";
  const selectedTargets = targetStep ? (view.drafts.targets.get(draftKey) ?? []) : [];
  const dawnKey = `${state.createdAt}:${state.day.number}`;
  const dawnVisible =
    state.phase === "day" &&
    !dismissedDawn.has(dawnKey) &&
    state.day.nominations.length === 0 &&
    !state.day.execution &&
    !state.day.ended;
  const dawn = dawnReport(
    players.map((player) => ({
      id: player.id,
      name: displayName(player, t),
      roleName: roleNameOf(player.roleId, ports.roles.byId),
      alive: player.alive,
    })),
    state.day.morning,
  );

  return (
    <div
      ref={tableRef}
      className="relative mx-auto h-full min-h-[400px] w-full max-w-[560px] min-[620px]:aspect-[1.42] min-[620px]:h-full min-[620px]:min-h-[320px] min-[620px]:w-auto min-[620px]:max-w-none"
      data-game-table
      aria-label={t("table")}
      role="group"
    >
      <TableFelt layout={layout} phase={state.phase} />
      <Hub
        view={view}
        dawnVisible={dawnVisible}
        dawn={dawn}
        onDismissDawn={() => onDismissDawn(dawnKey)}
        nomination={nomination}
      />
      {players.map((player, index) => {
        const seat = seatProjection(state, player.id);
        const role = player.roleId ? ports.roles.byId(player.roleId) : null;
        const placement = placements[index];
        if (!placement) return null;
        const name = displayName(player, t);
        const roleName = role ? role.name : t("ui.unknown");
        const nominated = nomination?.nomineeId === player.id;
        const selected = targetStep
          ? selectedTargets.includes(player.id)
          : state.phase === "day" && view.drafts.executeTarget === player.id;
        const disabled = targetStep
          ? Boolean(
              (targetStep.targetMode === "one-other" && player.id === targetStep.actorId) ||
              (targetStep.sv &&
                ["dreamer", "seamstress"].includes(String(targetStep.roleId)) &&
                player.id === targetStep.actorId) ||
              (targetStep.sv && targetStep.roleId === "snakecharmer" && !player.alive) ||
              targetStep.previousTarget === player.id ||
              (targetStep.bmr && targetStep.roleId === "professor" && player.alive) ||
              (targetStep.bmr &&
                targetStep.targetMode === "one-any" &&
                targetStep.canResurrect &&
                !player.alive &&
                targetStep.roleId !== "moonchild" &&
                String(targetStep.roleId) !== "professor"),
            )
          : false;
        const badges = seatBadges({
          alive: player.alive,
          voteToken: player.voteToken,
          acting: step?.actorId === player.id,
          nominated: Boolean(nominated),
          impaired: seat.impaired && player.roleId !== "drunk",
          drunk: seat.drunk && player.roleId !== "drunk",
          poisoned: seat.poisoned && player.roleId !== "drunk",
          protected: seat.protected,
          scheduledDeath: seat.scheduledDeath,
          registeredDead: seat.registeredDead,
        });
        const badgeSources: Partial<Record<(typeof badges)[number], string | null>> = {
          drunk: seat.drunkSourceRoleId,
          poison: seat.poisonSourceRoleId,
          protection: seat.protectionSourceRoleId,
        };
        const badgeLabels = badges.map((badge) => {
          const source = badgeSources[badge];
          const sourceName = source ? roleNameOf(source, ports.roles.byId) : "";
          return t(SEAT_BADGE_KEY[badge]) + (sourceName ? " · " + sourceName : "");
        });
        const badgeText = badgeLabels.join(", ");
        const labelSide = placement.y > 62 ? "above" : "below";
        const voteCount = state.phase === "day" ? state.day.voteCounts?.[player.id] : undefined;
        const voteText = voteCount === undefined ? "" : t("ui.seatVoteCount", { n: voteCount });
        return (
          <button
            key={player.id}
            type="button"
            className="group absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 overflow-visible border-0 bg-transparent p-0 text-center text-text disabled:cursor-not-allowed disabled:opacity-45"
            style={{ left: `${placement.x}%`, top: `${placement.y}%`, zIndex: placement.z }}
            data-seat-open={player.id}
            data-target={targetKey ?? undefined}
            data-id={targetKey ? player.id : undefined}
            aria-pressed={selected}
            aria-label={`${player.seat}, ${name}, ${roleName}${badgeText ? `, ${badgeText}` : ""}${voteText ? `, ${voteText}` : ""}`}
            disabled={disabled}
            onClick={() => actions.selectSeat(player.id)}
          >
            <span
              className={`relative mx-auto block size-11 rounded-[2px] bg-table-chip shadow-[0_6px_14px_rgba(0,0,0,.45)] transition-[border-color,box-shadow] group-hover:border-table-primary/70 group-hover:brightness-110 min-[620px]:size-[64px] ${
                step?.actorId === player.id
                  ? "border-2 border-table-primary shadow-[0_0_0_2px_var(--color-table-primary),0_0_22px_rgba(255,201,60,.35)]"
                  : nominated
                    ? "border-2 border-table-danger shadow-[0_0_0_2px_var(--color-table-danger),0_0_22px_rgba(255,107,94,.35)]"
                    : selected
                      ? "border-2 border-table-primary shadow-[0_0_0_2px_var(--color-table-primary)]"
                      : "border border-table-rim"
              }`}
            >
              {role ? (
                <img
                  className={`absolute inset-0 m-auto size-[74%] rounded-full object-contain ${
                    player.alive ? "" : "opacity-50 grayscale"
                  }`}
                  src={ports.roles.image(role)}
                  alt=""
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center font-role text-[18px] text-table-secondary">
                  {player.seat}
                </span>
              )}
              {seat.poisoned && player.roleId !== "drunk" ? (
                <span
                  className="pointer-events-none absolute inset-0 rounded-full bg-[repeating-linear-gradient(45deg,rgba(111,191,139,.35)_0_3px,transparent_3px_6px)]"
                  aria-hidden="true"
                />
              ) : null}
              {selected ? (
                <span
                  data-seat-selected=""
                  className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-table-chip bg-table-primary"
                  aria-hidden="true"
                />
              ) : null}
              <span
                data-seat-number=""
                className="absolute -left-1 -top-1 grid place-items-center rounded-full border border-table-rim bg-crypt px-1 text-[12px] tabular-nums text-table-muted"
              >
                {player.seat}
              </span>
              {player.alive ? null : (
                <span className="absolute inset-0 grid place-items-center text-[20px] text-crimson">
                  ✕
                </span>
              )}
            </span>
            <span
              className={`absolute z-30 flex w-max max-w-[96px] flex-col gap-0.5 rounded-[1px] bg-[#0a0a0c]/92 px-1.5 py-0.5 min-[620px]:max-w-[170px] ${SEAT_LABEL_SIDE[labelSide]}`}
            >
              <b
                data-seat-name=""
                className={`block max-w-full truncate text-[12px] font-semibold leading-tight min-[620px]:text-[14px] ${
                  player.alive ? "" : "text-muted line-through decoration-crimson"
                }`}
              >
                {name}
              </b>
              {voteCount !== undefined ? (
                <span
                  data-seat-vote-count={voteCount}
                  className="text-[11px] font-semibold tabular-nums text-table-secondary min-[620px]:text-[12px]"
                >
                  {voteText}
                </span>
              ) : null}
              {badges.length ? (
                <span className="flex flex-wrap gap-0.5">
                  {badges.map((badge, index) => (
                    <span
                      key={badge}
                      data-seat-badge={badge}
                      className={`whitespace-nowrap rounded-sm border px-1 py-px text-[9px] font-semibold uppercase tracking-[.04em] min-[620px]:text-[10px] ${SEAT_BADGE_TONE[badge]}`}
                    >
                      {badgeLabels[index]}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Hub({
  view,
  dawnVisible,
  dawn,
  onDismissDawn,
  nomination,
}: {
  view: TableView;
  dawnVisible: boolean;
  dawn: DawnReport;
  onDismissDawn(): void;
  nomination: Nomination | undefined;
}) {
  const { state, ports } = view;
  const t = ports.strings.t;
  const projection = tableProjection(state);
  const executed = state.day.execution ? playerById(state, state.day.execution.playerId) : null;
  const diedToday =
    executed !== null &&
    !executed.alive &&
    executed.deadAt?.phase === "day" &&
    executed.deadAt?.number === state.day.number;
  const heir = projection.pendingDemonChange;
  const step = heir ? null : projection.step;
  const actor = step?.actorId ? playerById(state, step.actorId) : null;
  const label = "label-mono text-[9.5px] text-muted min-[620px]:text-[10px]";
  const phaseLabel = "label-mono text-[9.5px] text-amber min-[620px]:text-[10px]";
  const sub = "text-[11px] leading-tight text-muted min-[620px]:text-[12px]";

  if (state.phase === "night") {
    const role = step?.roleId ? ports.roles.byId(step.roleId) : null;
    return (
      <div className="screen pointer-events-none absolute left-1/2 top-1/2 z-10 flex w-[min(178px,52%)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 px-2.5 py-3 text-center min-[620px]:w-[min(320px,50%)] min-[620px]:gap-2 min-[620px]:px-4">
        <span data-hub-phase className={phaseLabel}>
          {t("night")} {state.night.number}
        </span>
        {step && role ? (
          <img
            className="size-11 rounded-[2px] border border-edge-2 bg-crypt-3 object-contain p-1 min-[620px]:size-14"
            src={ports.roles.image(role)}
            alt=""
          />
        ) : null}
        <b
          data-hub-step
          className="line-clamp-2 max-w-full text-balance font-role text-[17px] leading-tight text-text min-[620px]:text-[22px]"
        >
          {heir ? t("pendingHeir") : step ? stepTitle(step, ports.roles.byId, t) : t("ui.allDone")}
        </b>
        <span className={sub}>
          {step
            ? actor
              ? `${displayName(actor, t)} · ${t("seatNumber", { seat: actor.seat })}`
              : t("ui.activeSeat")
            : `${projection.progress.done} / ${projection.progress.total}`}
        </span>
        <span className="flex flex-wrap justify-center gap-1" aria-hidden="true">
          {state.night.queue.slice(0, 16).map((entry) => (
            <i
              key={entry.key}
              className={`size-1 rounded-full ${entry.key === step?.key ? "bg-amber" : "bg-crypt-3"}`}
            />
          ))}
        </span>
      </div>
    );
  }

  return (
    <div className="screen pointer-events-none absolute left-1/2 top-1/2 z-10 flex w-[min(184px,54%)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 px-2.5 py-3 text-center min-[620px]:w-[min(330px,52%)] min-[620px]:gap-1.5 min-[620px]:px-4">
      <span data-hub-phase className={phaseLabel}>
        {t("day")} {state.day.number}
      </span>
      {dawnVisible ? (
        <div className="grid gap-1" data-dawn>
          <span className={label}>
            {t("dawn")} · {t("night")} {state.night.number}
          </span>
          {dawn.none ? (
            <b className="text-[13px] leading-tight text-text min-[620px]:text-[14px]">
              {t("noDeaths")}
            </b>
          ) : (
            <div className="grid gap-0.5">
              <b className="label-mono text-[9.5px] text-danger">{t("died")}</b>
              {dawn.deaths.map((death) => (
                <span
                  key={death.playerId}
                  data-dawn-death=""
                  className="block text-[12px] leading-tight text-text min-[620px]:text-[14px]"
                >
                  {death.name} · {death.roleName}
                </span>
              ))}
            </div>
          )}
          <span data-dawn-survivors className={sub}>
            {t("dawnSurvivors", { living: dawn.survivors, total: dawn.total })}
          </span>
          <button
            className="pointer-events-auto mx-auto mt-1 inline-flex min-h-11 items-center border border-edge-2 bg-crypt-3 px-2.5 text-[12px] uppercase tracking-[.1em] text-text"
            type="button"
            data-act="dawn-dismiss"
            onClick={onDismissDawn}
          >
            {t("dawnDismiss")}
          </button>
        </div>
      ) : executed ? (
        <div className="grid gap-1" data-executed>
          <span className={label}>{t("execution")}</span>
          <b className="text-[14px] leading-tight text-danger min-[620px]:text-[16px]">
            {displayName(executed, t)} · {roleNameOf(executed.roleId, ports.roles.byId)}
          </b>
          <span className={sub}>{diedToday ? t("ui.executedDied") : t("ui.executedNoDeath")}</span>
        </div>
      ) : nomination ? (
        <div className="grid gap-1" data-nomination>
          <span className={label}>{t("nomination")}</span>
          <span className="text-[12px] leading-tight text-text min-[620px]:text-[13px]">
            {displayName(playerById(state, nomination.nominatorId), t)} →{" "}
            {displayName(playerById(state, nomination.nomineeId), t)}
          </span>
          <span className="flex justify-center gap-0.5" aria-hidden="true">
            {Array.from({ length: nomination.threshold }, (_, index) => (
              <i
                key={index}
                data-nomination-dot={index < nomination.count ? "filled" : "empty"}
                className={`size-1.5 rounded-full border ${
                  index < nomination.count
                    ? "border-amber bg-amber"
                    : "border-edge-2 bg-transparent"
                }`}
              />
            ))}
          </span>
          <b
            data-nomination-tally
            className="font-marquee text-[30px] leading-none tabular-nums text-amber min-[620px]:text-[38px]"
          >
            {nomination.count} / {nomination.threshold}
          </b>
          <span className={sub}>{t("votes")}</span>
        </div>
      ) : (
        <b
          className="max-w-full text-[13px] leading-tight text-text min-[620px]:text-[14px]"
          data-nomination-none
        >
          {t("ui.noNomination")}
        </b>
      )}
      <span
        data-hub-threshold
        className="label-mono text-[9.5px] text-muted min-[620px]:text-[10px]"
      >
        {t("threshold")} {projection.threshold}
      </span>
    </div>
  );
}
