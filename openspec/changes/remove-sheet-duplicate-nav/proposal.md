# Proposal

## Why

The `/sheet` header repeats navigation the app bar already offers: links to the
table and Help plus its own RU/EN/AZ switch. On a phone this row takes the top
of the screen from the roles, and two separate controls can write the same
language preference. The app bar menu is now the one navigation surface; the
sheet header must not carry a second one.

Issue: #151

## What Changes

- Remove the route links and the language links from the `/sheet` header. The
  header keeps the title, the intro, the scenario summary, the scenario filter
  and the Travellers toggle.
- Make the app bar menu the only language control. A language change while the
  sheet is open SHALL land on `/sheet/{code}`, so the URL keeps declaring the
  rendered language. Today `locale.change` re-renders the same path, and the
  sheet, which binds its language to the path, would revert to the old one.
- Drop the language list that only the removed header navigation used.
- Update the browser check that selected `.sheet-langs`: it SHALL open the app
  bar menu, choose the language, and assert `/sheet/{code}` with the rendered
  catalog. One assertion SHALL prove the sheet header carries no link.
- Re-record the computed-style baseline for `/sheet/en` at both widths: the
  generic probes resolve to different first matches once the header links are
  gone.
- No game rule, command, storage key or route changes. `/sheet` and
  `/sheet/{ru,en,az}` stay, and the scenario and Travellers preferences keep
  surviving a language switch and a reload.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-shell`: the Role sheet parity requirement loses the in-header
  navigation and states that the app bar menu changes the sheet language and
  the URL.

## Impact

- `src/ui/screens/sheet.tsx`: the header markup and the unused language list.
- `src/entry/main.ts`: the language change maps a sheet route to
  `/sheet/{code}`.
- `scripts/browser-check.mjs`: the sheet language steps and one header
  assertion.
- `scripts/fixtures/computed-styles.json`: the `/sheet/en` entries.
- `openspec/specs/app/ui-shell/spec.md` after the archive.
