import { cpSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const site = join(root, "site");

function copy(from, to) {
  const source = join(root, from);
  if (!existsSync(source)) throw new Error("Missing asset source: " + from);
  mkdirSync(dirname(join(site, to)), { recursive: true });
  cpSync(source, join(site, to), { recursive: true });
  console.log("copied", from, "->", join("site", to));
}

copy("web/build/data", "assets/data");
copy("web/build/img/roles", "assets/img/roles");
copy("web/fonts/inter", "assets/fonts/inter");
copy("web/favicon.svg", "favicon.svg");

writeFileSync(join(site, ".nojekyll"), "");
console.log("wrote site/.nojekyll");
