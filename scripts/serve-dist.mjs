#!/usr/bin/env node
// Serves the built artifact like GitHub Pages: a real 404 document for an
// unknown path, no SPA fallback. Used by the browser checks and for manual
// verification of a project subpath.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeBasePath } from "./base-path.mjs";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

/**
 * @param {{ root?: string, prefix?: string, before?: (req, res, pathname) => Promise<boolean> | boolean }} options
 * @returns {import("node:http").Server}
 */
export function createDistServer({ root = "dist", prefix = "/", before } = {}) {
  const base = resolve(root);
  const mount = normalizeBasePath(prefix);
  return createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (before && await before(req, res, pathname)) return;

      if (!pathname.startsWith(mount)) {
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end(await readFile(join(base, "404.html")));
        return;
      }

      const rest = pathname.slice(mount.length);
      const relative = rest === "" || rest.endsWith("/") ? `${rest}index.html` : rest;
      const file = resolve(base, relative);
      if (file !== base && !file.startsWith(base + "\\") && !file.startsWith(base + "/")) {
        res.writeHead(403).end("Forbidden");
        return;
      }

      try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
        res.end(body);
        return;
      } catch {
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end(await readFile(join(base, "404.html")));
      }
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const root = argument("--root") ?? "dist";
  const prefix = argument("--prefix") ?? "/";
  const port = Number(argument("--port") ?? process.env.PORT ?? 8010);
  const server = createDistServer({ root, prefix });
  server.listen(port, () => {
    console.log(`Pocket Grimoire build on http://localhost:${port}${prefix} (root ${root})`);
  });
}
