# Spec Delta

## Purpose

Defines how the repository keeps the provenance of official rule sources and
pinned wiki revisions, verifies it offline, and reports drift without changing a
pin.

## ADDED Requirements

### Requirement: Official snapshot manifest

Every file in `docs/official/`, except `manifest.json` and `README.md`, SHALL have
exactly one entry in `docs/official/manifest.json`, and each entry SHALL state the
repository-relative path, the source URL, the retrieval date, the commit where
known and the SHA-256 of the file.

**Source**: [Issue #178](https://github.com/hose1021/grimoria/issues/178);
`docs/AGENTS.md` "Preserve provenance in `official/` snapshots"
**Tests**: `scripts/check-official.test.mjs`, `docs/official/manifest.json`

#### Scenario: Snapshot without an entry

- **WHEN** a file exists in `docs/official/` and the manifest has no entry for it
- **THEN** the check fails and names the unlisted file

#### Scenario: Entry without a file

- **WHEN** the manifest lists a path that does not exist
- **THEN** the check fails and names the missing path

### Requirement: Offline verification

`node scripts/check-official.mjs` SHALL verify every manifest entry against the
working tree without network access, SHALL fail with a non-zero exit code when a
listed file is missing or its bytes differ from the recorded SHA-256, and SHALL
pass without writing any file when the tree matches. An entry marked `localOnly`
SHALL be verified only when its file is present.

**Source**: [Issue #178](https://github.com/hose1021/grimoria/issues/178)
"PR 1: provenance manifest and offline verification"
**Tests**: `scripts/check-official.test.mjs`, `.github/workflows/ci.yml`

#### Scenario: Edited snapshot

- **WHEN** one byte of `docs/official/roles.json` differs from the recorded hash
- **THEN** the check exits 1 and reports the hash mismatch for that path

#### Scenario: Clean tree

- **WHEN** every entry matches its file and no file is unlisted
- **THEN** the check exits 0 and writes nothing

#### Scenario: Generated snapshot absent

- **WHEN** an entry is marked `localOnly` and its snapshot was never fetched
- **THEN** the check does not fail for the absent file

### Requirement: Pinned revision coverage

Every distinct `index.php?title=<Title>&oldid=<N>` link in
`docs/rules-matrix.md` SHALL have one manifest entry that records the page title,
the revision id, the revision timestamp, the source URL and the retrieval date.
The check SHALL fail when a pinned pair has no entry, and it SHALL NOT add,
change or remove a pin.

**Source**: `docs/rules-matrix.md` "Supported ruleset pin"; [Issue #178](https://github.com/hose1021/grimoria/issues/178)
**Tests**: `scripts/check-official.test.mjs`

#### Scenario: Uncovered pin

- **WHEN** the matrix links a revision that has no manifest entry
- **THEN** the check exits 1 and names the title and revision

#### Scenario: Duplicate link

- **WHEN** several rows link the same title and revision
- **THEN** one manifest entry covers all of them

### Requirement: Snapshot generation

`node scripts/fetch-official.mjs` SHALL read the pinned revisions from the matrix,
fetch each revision's wikitext, store it as `docs/official/wiki/<Title>.r<revid>.wikitext`
and extend the manifest with the revision id, revision timestamp, retrieval date
and content hash. The script SHALL send an explicit `User-Agent`, request one
revision at a time, and SHALL fail when the API reports a title that differs from
the pinned link.

**Source**: `docs/rules-matrix.md` "Update procedure"; [Issue #178](https://github.com/hose1021/grimoria/issues/178)
**Tests**: `scripts/fetch-official.test.mjs`

#### Scenario: Repeat run

- **WHEN** the pinned revisions have not changed and the script runs again
- **THEN** the manifest and every snapshot stay byte-identical, including each
  `retrieved` date

#### Scenario: Title mismatch

- **WHEN** the API returns a page title that differs from the linked title
- **THEN** the script exits non-zero and writes no snapshot for that revision

### Requirement: Drift reporting

`node scripts/fetch-official.mjs --check` SHALL compare every pinned revision with
the latest revision id of its page, SHALL list each page that moved, SHALL write no
file, and SHALL exit 1 when any pin is behind. It SHALL NOT fetch snapshot content
or update a pin.

**Source**: `docs/rules-matrix.md` "Update procedure" steps 1-2; [Issue #178](https://github.com/hose1021/grimoria/issues/178)
**Tests**: `scripts/fetch-official.test.mjs`

#### Scenario: Changed page

- **WHEN** a page's latest revision id is newer than the pinned id
- **THEN** the command lists the page with both ids, writes nothing and exits 1

#### Scenario: No drift

- **WHEN** every pinned revision is the latest revision of its page
- **THEN** the command writes nothing and exits 0
