import { assetUrl } from "../platform/asset-url.ts";
import { LOCALE_FILES } from "./locale-files.ts";
import type { Role, RoleId } from "../../core/model/types.ts";

type CatalogWindow = Window & { PG?: { roles?: Role[] } };

const EVIL: Record<string, boolean> = { minion: true, demon: true };

function catalog(): Role[] {
  return (window as CatalogWindow).PG?.roles ?? [];
}

function filter(): Role[] {
  return catalog().filter(
    (role) =>
      (role.edition === "tb" || role.edition === "bmr" || role.edition === "snv") &&
      role.team !== "traveller",
  );
}

export let TB: Role[] = filter();
let lang = "ru";

export function currentLang(): string {
  return lang;
}

function loadScript(src: string): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const script = document.createElement("script");
  script.src = assetUrl(src);
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Could not load " + src));
  document.head.append(script);
  return promise;
}

export async function loadLocale(code: string): Promise<void> {
  const next = LOCALE_FILES[code] ? code : "en";
  if (next === lang && Array.isArray((window as CatalogWindow).PG?.roles)) return;
  await loadScript("assets/data/" + LOCALE_FILES[next]! + ".js");
  TB = filter();
  lang = next;
}

export function allRoles(): Role[] {
  return catalog().slice();
}

export function roleById(id: RoleId): Role | null {
  return TB.find((role) => role.id === id) || null;
}

export function teamName(team: string | null | undefined): string {
  return team ? team.charAt(0).toUpperCase() + team.slice(1) : "";
}

function suffix(role: Role): string {
  return EVIL[role.team] ? "_e" : "_g";
}

export function imageName(role?: Role | null): string {
  if (!role) return "";
  const images = Array.isArray(role.image) ? role.image : [role.image];
  const want = suffix(role);
  const match = images.find((path) => path && path.includes(want + "."));
  const chosen = match || images[0] || "";
  return chosen.slice(chosen.lastIndexOf("/") + 1);
}

export function imageFor(role?: Role | null): string {
  const name = imageName(role);
  return name ? assetUrl("assets/img/roles/" + name) : "";
}
