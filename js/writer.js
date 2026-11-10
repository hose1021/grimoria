// @ts-check
// Hold an exclusive browser lock for the lifetime of a Storyteller tab.
/** @type {(() => void) | null} */
let release = null;
let acquired = false;
/** @type {Promise<boolean> | null} */
let pending = null;
/** @returns {Promise<boolean>} */
export async function acquireWriter() {
  if (acquired) return true;
  if (!navigator.locks) return true; // Store revision checks protect older browsers.
  if (pending) return pending;
  pending = new Promise((resolve) => {
    navigator.locks.request("pocket-grimoire-writer", { ifAvailable: true }, async (lock) => {
      if (!lock) { resolve(false); return; }
      acquired = true;
      resolve(true);
      await new Promise((done) => { release = () => done(undefined); });
      acquired = false;
      release = null;
    }).catch(() => resolve(false));
  }).finally(() => { pending = null; });
  return pending;
}
export function releaseWriter() { release?.(); }
