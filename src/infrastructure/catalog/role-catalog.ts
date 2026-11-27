import { assetUrl } from "../platform/asset-url.ts";
import { imageName } from "./role-image.ts";
import { LOCALE_FILES } from "./locale-files.ts";
import type { Role, RoleId } from "../../core/model/types.ts";

export { imageName };

type CatalogWindow = Window & { PG?: { roles?: Role[] } };

const browser = window as CatalogWindow;
function usableCatalog(value: CatalogWindow["PG"]): boolean {
  return (
    Array.isArray(value?.roles) &&
    value.roles.length > 0 &&
    value.roles.every(
      (role) =>
        role &&
        typeof role.id === "string" &&
        typeof role.name === "string" &&
        typeof role.edition === "string" &&
        typeof role.team === "string" &&
        (role.ability === undefined || typeof role.ability === "string"),
    )
  );
}

let activeCatalog = usableCatalog(browser.PG) ? browser.PG : undefined;
let requested = 0;
let lang = "ru";

function catalog(): Role[] {
  return activeCatalog?.roles ?? [];
}

function filter(): Role[] {
  return catalog().filter(
    (role) =>
      (role.edition === "tb" || role.edition === "bmr" || role.edition === "snv") &&
      role.team !== "traveller",
  );
}

export let TB: Role[] = filter();

export function currentLang(): string {
  return lang;
}

export async function loadLocale(code: string, signal?: AbortSignal): Promise<boolean> {
  const next = Object.hasOwn(LOCALE_FILES, code) ? code : "en";
  const request = ++requested;
  if (next === lang && Array.isArray(activeCatalog?.roles)) return true;
  const src = assetUrl("assets/data/" + LOCALE_FILES[next]! + ".js");
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      // Each shipped script assigns window.PG. Restore the committed catalog
      // synchronously when an older request finishes after the latest selection.
      if (request !== requested || signal?.aborted) {
        browser.PG = activeCatalog ?? {};
        resolve(false);
        return;
      }
      const published = browser.PG;
      if (published === activeCatalog || !usableCatalog(published)) {
        browser.PG = activeCatalog ?? {};
        reject(new Error("Invalid language catalog: " + src));
        return;
      }
      activeCatalog = published;
      TB = filter();
      lang = next;
      resolve(true);
    };
    script.onerror = () => {
      browser.PG = activeCatalog ?? {};
      if (request === requested && !signal?.aborted) reject(new Error("Could not load " + src));
      else resolve(false);
    };
    document.head.append(script);
  });
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

export function imageFor(role?: Role | null): string {
  const name = imageName(role);
  return name ? assetUrl("assets/img/roles/" + name) : "";
}
