# Official sources

Snapshots of the official Blood on the Clocktower data and rule text used by
`docs/rules-matrix.md`. Every file in this directory has one entry in
`manifest.json` with its source URL, retrieval date, introducing commit and
SHA-256. Run `node scripts/check-official.mjs` after any change here; it fails on
a missing file, a changed byte or an unlisted file.

## Snapshots

| File              | Source                                                    | Retrieved  | Commit    |
| ----------------- | --------------------------------------------------------- | ---------- | --------- |
| `roles.json`      | <https://release.botc.app/resources/data/roles.json>      | 2026-11-03 | `43d2128` |
| `nightsheet.json` | <https://release.botc.app/resources/data/nightsheet.json> | 2026-11-03 | `43d2128` |
| `jinxes.json`     | <https://release.botc.app/resources/data/jinxes.json>     | 2026-11-11 | `69bb3ba` |

`roles.json` is a bare array of all 181 official characters; the supported
ruleset uses 72 of them. `nightsheet.json` holds the first-night and other-night
order. `jinxes.json` keeps its own `source` and `committed` fields, which agree
with the manifest.

The matrix, not this directory, pins the wiki revisions: every rule claim links
to a permanent `oldid` revision, and the text of those revisions is not part of
the repository. A changed wiki revision needs a rules review, not an automatic
update.

## Licensing

The wiki's terms of use have not been confirmed. Until the owner decides, wiki
text must not be committed to this public repository: pinned revisions are
fetched locally, `docs/official/wiki/` is ignored by git, and their manifest
entries are marked `localOnly`. If the owner permits committing wiki text, remove
the ignore entry and commit the snapshots without the `localOnly` marker.

## Refresh procedure

1. Download the file from its source URL and replace the snapshot byte for byte.
2. Update the entry in `manifest.json`: `retrieved`, the new `commit` once known,
   and `sha256` (for example `node -e "…createHash('sha256')…"`).
3. Run `node scripts/check-official.mjs` and state the result in the change.
4. If the data feeds an engine table, review that table in the same change; the
   snapshot is the engine data, not a reference copy.
