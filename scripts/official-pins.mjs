// Pinned wiki revisions read from docs/rules-matrix.md.
//
// The matrix is the only place that pins a revision; this module parses those
// links and derives the snapshot path. It never writes a pin.
export const WIKI = "https://wiki.bloodontheclocktower.com";

const PIN = /index\.php\?title=([^&)\s"'<>]+)&(?:amp;)?oldid=(\d+)/g;

function canonicalTitle(title) {
  return title.replace(/_/g, " ");
}

function sourceUrl(title, revid) {
  const encoded = encodeURIComponent(title).replace(/%20/g, "_");
  return `${WIKI}/index.php?title=${encoded}&oldid=${revid}`;
}

export function parsePinnedRevisions(matrixText) {
  const pins = new Map();
  for (const match of matrixText.matchAll(PIN)) {
    const title = canonicalTitle(decodeURIComponent(match[1]));
    const revid = Number(match[2]);
    const key = `${title}\u0000${revid}`;
    if (pins.has(key)) continue;
    pins.set(key, { title, revid, source: sourceUrl(title, revid) });
  }
  return [...pins.values()].sort((a, b) => a.title.localeCompare(b.title) || a.revid - b.revid);
}

export function snapshotFileName(title, revid) {
  return `${title.replace(/ /g, "_")}.r${revid}.wikitext`;
}

export function snapshotPath(title, revid) {
  return `docs/official/wiki/${snapshotFileName(title, revid)}`;
}
