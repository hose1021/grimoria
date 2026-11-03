// Static file server with an app-shell fallback for path routes.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const ROOT = new URL("../", import.meta.url);
const PORT = Number(process.argv[2] || process.env.PORT) || 8010;
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

function send(res, body, type) {
  res.writeHead(200, { "content-type": type || "application/octet-stream" });
  res.end(body);
}

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = new URL("." + pathname, ROOT);
  if (!file.pathname.startsWith(ROOT.pathname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    send(res, await readFile(file), TYPES[extname(file.pathname)]);
  } catch {
    try {
      send(res, await readFile(new URL("index.html", ROOT)), TYPES[".html"]);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
}).listen(PORT, () => {
  console.log(`Pocket Grimoire on http://localhost:${PORT}/`);
});
