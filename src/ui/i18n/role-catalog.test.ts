import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { SUPPORTED_ROLES } from "../../core/model/rules.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

interface CatalogRole {
  id: string;
  ability?: string;
}

function catalog(file: string): Map<string, CatalogRole> {
  const context: { PG?: { roles?: CatalogRole[] } } = {};
  vm.createContext(context);
  vm.runInContext(readFileSync(join(ROOT, "public", "assets", "data", file), "utf8"), context);
  const roles = context.PG?.roles ?? [];
  return new Map(roles.map((role) => [role.id, role]));
}

const catalogs = {
  ru: catalog("ru_RU.js"),
  en: catalog("en_GB.js"),
  az: catalog("az_AZ.js"),
};

test("the role catalogs carry every supported ability (SYS-I18N-02)", () => {
  for (const [locale, roles] of Object.entries(catalogs)) {
    for (const id of SUPPORTED_ROLES) {
      const role = roles.get(id);
      assert.ok(role, locale + " catalog has " + id);
      assert.ok(
        role.ability && role.ability.trim().length > 0,
        locale + " catalog states the ability of " + id,
      );
    }
  }
});

test("the audited role abilities keep their mechanical terms (SYS-I18N-02)", () => {
  const ru = catalogs.ru;
  const az = catalogs.az;
  assert.match(
    ru.get("empath")?.ability ?? "",
    /2\s+живых соседей/,
    "the Empath counts two living neighbours",
  );
  assert.match(
    ru.get("juggler")?.ability ?? "",
    /свой первый день/i,
    "the Juggler's guesses are on their own first day",
  );
  assert.match(ru.get("tinker")?.ability ?? "", /в любое время/i, "the Tinker dies at any time");
  assert.match(
    az.get("godfather")?.ability ?? "",
    /Kənardakı/,
    "the Godfather names the Outsider set",
  );
  assert.match(az.get("exorcist")?.ability ?? "", /Demon/, "the Exorcist names the Demon");
  assert.match(az.get("exorcist")?.ability ?? "", /oyanmır/, "the chosen Demon does not wake");
});
