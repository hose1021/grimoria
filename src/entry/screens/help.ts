// @ts-check
import { esc } from "../../ui/dom.ts";
import { assetUrl } from "../../infrastructure/platform/asset-url.ts";
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
        `<li class="flex items-baseline gap-1.5 text-[11.5px] max-[640px]:text-[12.5px]"><span class="min-w-4 text-[9px] tabular-nums text-muted max-[640px]:text-[10px]">${index + 1}</span><b>${esc(roleName(id))}</b></li>`,
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
  root.innerHTML = `<div class="help mx-auto w-[min(1120px,100%)] px-4 pt-3.5 pb-12">
    <header class="help-head flex flex-wrap items-start justify-between gap-3 px-0 pt-1 pb-3.5"><div><img class="brand-lockup" src="${esc(assetUrl("grimoria-logo.svg"))}" alt="Grimoria">
      <p class="label">${esc(t("help"))}</p>
      <h1 class="my-0.5 text-[24px] max-[640px]:text-[20px]">${esc(state.script ? state.script.name : "Trouble Brewing")} · ${esc(t("rulesFull"))}</h1>
      <p class="text-[12px] text-muted max-[640px]:text-[13px]">${esc(t("publicHint"))}</p>${bmr ? `<p class="text-[13px] leading-[1.45] text-muted">${esc(t("bmrHelpNote"))}</p>` : ""}</div>
      <nav class="help-nav flex flex-wrap gap-1.5"><a class="btn" href="${path("table")}">${esc(t("table"))}</a>
        <a class="btn" href="${path("bag")}">${esc(t("setup"))}</a><a class="btn" href="${path("sheet")}">${esc(t("roleSheet"))}</a></nav>
    </header>
    <main class="help-shell grid gap-3.5">
      <section class="help-section rounded-[14px] border border-line bg-panel p-4"><h2 class="m-0 mb-2.5 text-[16px]">${esc(t("stepHelp"))}</h2><div class="help-walk grid gap-2">
        ${STAGES.map(([key, label]) => `<article class="help-walk-row rounded-[10px] border border-line bg-[#0d1215] p-2.5"><h3 class="m-0 mb-1.5 text-[13px] text-accent max-[640px]:text-[14px]">${esc(t(label))}</h3><p>${esc(t("help." + key))}</p></article>`).join("")}
      </div></section>
      <section class="help-section rounded-[14px] border border-line bg-panel p-4"><h2 class="m-0 mb-2.5 text-[16px]">${esc(t("firstNightList"))}</h2><ol class="help-order m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-1 p-0">${nightList(first)}</ol><p>${esc(t("noBluffs"))}</p></section>
      <section class="help-section rounded-[14px] border border-line bg-panel p-4"><h2 class="m-0 mb-2.5 text-[16px]">${esc(t("otherNightList"))}</h2><ol class="help-order m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-1 p-0">${nightList(other)}</ol><p>${esc(t("help.nightExceptions"))}</p></section>
      <section class="help-section rounded-[14px] border border-line bg-panel p-4"><h2 class="m-0 mb-2.5 text-[16px]">${esc(t("votingHelp"))}</h2><ul class="help-list m-0 pl-[18px] text-[12px] leading-[1.55] text-muted max-[640px]:text-[13px]">
        ${["help.nominationRules", "voteRule", "help.deadVotes"].map((key) => `<li class="my-[3px]">${esc(t(key))}</li>`).join("")}
      </ul></section>
      <section class="help-section rounded-[14px] border border-line bg-panel p-4"><h2 class="m-0 mb-2.5 text-[16px]">${esc(t("roleList"))}</h2><div class="help-roles grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-1.5">
        ${TB.map(
          (
            role,
          ) => `<details class="help-role rounded-lg border border-line bg-[#0d1215] p-[7px]"><summary class="flex max-[640px]:min-h-11 cursor-pointer list-none items-center gap-[7px] [&::-webkit-details-marker]:hidden">
          <img class="h-[26px] w-[26px] object-contain" src="${esc(imageFor(role))}" alt=""><b class="text-[11.5px] max-[640px]:text-[13px]">${esc(role.name)}</b><span class="ml-auto text-[9.5px] text-muted max-[640px]:text-[10.5px]">${esc(teamText(role.team))}</span>
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
