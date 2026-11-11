#!/usr/bin/env node
// Generates dist/404.html with the configured base baked in. The page always
// redirects to that base, never to a parent of the current URL, so a nested
// route cannot loop.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeBasePath } from "./base-path.mjs";

const root = argument("--root") ?? "dist";
const base = normalizeBasePath(process.env.BASE_PATH);

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Grimoria</title>
</head>
<body>
<p id="fallback-message"></p>
<script>
(function () {
  var base = ${JSON.stringify(base)};
  var pathname = location.pathname;
  if (pathname === base) {
    document.getElementById("fallback-message").textContent = "Grimoria is not available at this path.";
    return;
  }
  try {
    if (pathname.indexOf(base) === 0) {
      var rest = pathname.slice(base.length);
      if (rest.indexOf("..") === -1 && rest.indexOf("//") === -1 && rest.indexOf("\\\\") === -1) {
        sessionStorage.setItem("pg.redirect", pathname + location.search);
      }
    }
  } catch (error) { /* private mode */ }
  location.replace(base);
})();
</script>
</body>
</html>
`;

await writeFile(join(root, "404.html"), html);
console.log(`Fallback page: ${join(root, "404.html")} (base ${base})`);
