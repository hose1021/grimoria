// Pinned wiki revisions read from docs/rules-matrix.md.
//
// The matrix is the only place that pins a revision; this module parses those
// links and derives the snapshot path. It never writes a pin.
export const WIKI = "https://wiki.bloodontheclocktower.com";

/** One revision the matrix pins: the page title, its id and the permanent URL. */
export interface Pin {
  revid: number;
  source: string;
  title: string;
}

const PIN = /index\.php\?title=([^&)\s"'<>]+)&(?:amp;)?oldid=(\d+)/g;

function canonicalTitle(title: string): string {
  return title.replace(/_/g, " ");
}

function sourceUrl(title: string, revid: number): string {
  const encoded = encodeURIComponent(title).replace(/%20/g, "_");
  return `${WIKI}/index.php?title=${encoded}&oldid=${revid}`;
}

export function parsePinnedRevisions(matrixText: string): Pin[] {
  const pins = new Map<string, Pin>();
  for (const match of matrixText.matchAll(PIN)) {
    const title = canonicalTitle(decodeURIComponent(match[1]));
    const revid = Number(match[2]);
    const key = `${title}\u0000${revid}`;
    if (pins.has(key)) continue;
    pins.set(key, { title, revid, source: sourceUrl(title, revid) });
  }
  return [...pins.values()].sort((a, b) => a.title.localeCompare(b.title) || a.revid - b.revid);
}

export function snapshotFileName(title: string, revid: number): string {
  return `${title.replace(/ /g, "_")}.r${revid}.wikitext`;
}

export function snapshotPath(title: string, revid: number): string {
  return `docs/official/wiki/${snapshotFileName(title, revid)}`;
}
