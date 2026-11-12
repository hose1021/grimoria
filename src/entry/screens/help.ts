// @ts-check
import { esc } from "../../ui/dom.ts";
import { assetUrl } from "../../infrastructure/platform/asset-url.ts";
import { appBarMarkup } from "../../ui/components/arcane/app-bar-html.ts";
import { TB, imageFor } from "../../infrastructure/catalog/role-catalog.ts";
import {
  NIGHT_FIRST,
  NIGHT_OTHER,
  isBmrScript,
  isSnvScript,
  nightSequence,
} from "../../core/model/rules.ts";
import { t, teamText } from "../../ui/i18n/strings.ts";
import { path } from "../../infrastructure/routing/history-router.ts";
import { state } from "../store.ts";

let abort: AbortController | null = null;
const STAGES: Array<readonly [string, string]> = [
  ["setup", "setup"],
  ["player", "playerHandoff"],
  ["seats", "seats"],
  ["secrets", "secrets"],
  ["night", "firstNight"],
  ["dawn", "dawn"],
  ["day", "day"],
  ["execution", "execution"],
  ["win", "winHelp"],
];
function roleName(id: string): string {
  if (id === "info") return t("system.info");
  return TB.find((role) => role.id === id)?.name || t("system." + id);
}
function nightList(sequence: string[]): string {
  return sequence
    .filter((id) => id !== "scarletwoman")
    .map(
      (id, index) =>
        `<li class="flex items-baseline gap-1.5 text-[11.5px] max-[640px]:text-[12.5px]"><span class="min-w-4 text-[9px] tabular-nums text-brass max-[640px]:text-[10px]">${index + 1}</span><b class="font-[550] text-text">${esc(roleName(id))}</b></li>`,
    )
    .join("");
}
export function mount(root: HTMLElement): () => void {
  unmount();
  abort = new AbortController();
  const bmr = isBmrScript(state.script);
  const snv = isSnvScript(state.script);
  const edition = snv ? "snv" : bmr ? "bmr" : "tb";
  const first = edition === "tb" ? NIGHT_FIRST : nightSequence(1, edition);
  const other = edition === "tb" ? NIGHT_OTHER : nightSequence(2, edition);
  const phase =
    state.phase === "night"
      ? `${t("night")} ${state.night.number}`
      : state.phase === "day"
        ? `${t("day")} ${state.day.number}`
        : "";
  root.innerHTML = `${appBarMarkup({
    active: "help",
    scriptName: state.script?.name ?? "",
    phase,
    href: path,
    brandUrl: assetUrl("favicon.svg"),
  })}
    <div class="help mx-auto w-[min(1120px,100%)] px-4 pt-3.5 pb-12 max-[640px]:px-3">
    <header class="help-head flex flex-wrap items-start justify-between gap-3 border-b border-edge px-0 pt-1 pb-3.5"><div class="min-w-0">
      <p class="mt-2 mb-0 text-[9.5px] font-[650] uppercase tracking-[0.18em] text-brass">${esc(t("help"))}</p>
      <h1 class="my-0.5 font-role text-[24px] font-normal text-text max-[640px]:text-[20px]">${esc(state.script ? state.script.name : "Trouble Brewing")} · ${esc(t("rulesFull"))}</h1>
      <p class="m-0 text-[12px] text-muted max-[640px]:text-[13px]">${esc(t("publicHint"))}</p>${bmr ? `<p class="m-0 text-[13px] leading-[1.45] text-muted">${esc(t("bmrHelpNote"))}</p>` : ""}</div>
      <nav class="help-nav flex flex-wrap gap-1.5"><a class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-edge-2 bg-crypt-2 px-3 py-2 text-[12px] font-medium text-text no-underline transition-colors hover:border-brass/60 hover:bg-crypt-3" href="${path("table")}">${esc(t("table"))}</a>
        <a class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-edge-2 bg-crypt-2 px-3 py-2 text-[12px] font-medium text-text no-underline transition-colors hover:border-brass/60 hover:bg-crypt-3" href="${path("bag")}">${esc(t("setup"))}</a><a class="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-edge-2 bg-crypt-2 px-3 py-2 text-[12px] font-medium text-text no-underline transition-colors hover:border-brass/60 hover:bg-crypt-3" href="${path("sheet")}">${esc(t("roleSheet"))}</a></nav>
    </header>
    <main class="help-shell mt-3.5 grid grid-cols-1 gap-3">
      <section class="help-section min-w-0 rounded-md border border-edge bg-crypt-2 p-4"><h2 class="m-0 mb-2.5 font-role text-[17px] font-normal text-brass">${esc(t("stepHelp"))}</h2><div class="help-walk grid grid-cols-1 gap-2">
        ${STAGES.map(([key, label]) => `<article class="help-walk-row rounded-sm border border-edge bg-crypt-3 p-2.5"><h3 class="m-0 mb-1.5 font-role text-[13px] font-normal text-amber max-[640px]:text-[14px]">${esc(t(label))}</h3><p class="m-0 text-[12px] leading-[1.55] text-muted max-[640px]:text-[13px]">${esc(t("help." + key))}</p></article>`).join("")}
      </div></section>
      <section class="help-section min-w-0 rounded-md border border-edge bg-crypt-2 p-4"><h2 class="m-0 mb-2.5 font-role text-[17px] font-normal text-brass">${esc(t("firstNightList"))}</h2><ol class="help-order m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-1 p-0">${nightList(first)}</ol><p class="m-0 mt-2 text-[12px] leading-[1.5] text-muted">${esc(t("noBluffs"))}</p></section>
      <section class="help-section min-w-0 rounded-md border border-edge bg-crypt-2 p-4"><h2 class="m-0 mb-2.5 font-role text-[17px] font-normal text-brass">${esc(t("otherNightList"))}</h2><ol class="help-order m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-1 p-0">${nightList(other)}</ol><p class="m-0 mt-2 text-[12px] leading-[1.5] text-muted">${esc(t("help.nightExceptions"))}</p></section>
      <section class="help-section min-w-0 rounded-md border border-edge bg-crypt-2 p-4"><h2 class="m-0 mb-2.5 font-role text-[17px] font-normal text-brass">${esc(t("votingHelp"))}</h2><ul class="help-list m-0 pl-[18px] text-[12px] leading-[1.55] text-muted max-[640px]:text-[13px]">
        ${["help.nominationRules", "voteRule", "help.deadVotes"].map((key) => `<li class="my-[3px]">${esc(t(key))}</li>`).join("")}
      </ul></section>
      <section class="help-section min-w-0 rounded-md border border-edge bg-crypt-2 p-4"><h2 class="m-0 mb-2.5 font-role text-[17px] font-normal text-brass">${esc(t("roleList"))}</h2><div class="help-roles grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-1.5 max-[640px]:grid-cols-1">
        ${TB.map(
          (
            role,
          ) => `<details class="help-role min-w-0 rounded-sm border border-edge-2 bg-crypt-3 p-[7px]"><summary class="flex min-h-11 cursor-pointer list-none items-center gap-[7px] [&::-webkit-details-marker]:hidden">
          <img class="h-[26px] w-[26px] object-contain" src="${esc(imageFor(role))}" alt=""><b class="font-role text-[12px] font-normal leading-tight text-player-role-text max-[640px]:text-[13px]">${esc(role.name)}</b><span class="ml-auto text-[9px] uppercase tracking-[0.14em] text-brass max-[640px]:text-[10px]">${esc(teamText(role.team))}</span>
        </summary><p class="mt-1.5 mb-0 text-[11px] leading-[1.45] text-muted max-[640px]:text-[12.5px]">${esc(role.ability)}</p></details>`,
        ).join("")}
      </div></section>
    </main>
  </div>`;
  return unmount;
}
export function unmount(): void {
  abort?.abort();
  abort = null;
}
