# Design

## Row ownership

The first cell owns the identifier. A role row reads
`` `washerwoman` [r2630](...) `TB-WASHERWOMAN-01` `` and a shared row reads
`SYS-SETUP-01 Base composition 5–15`. The checker reads identifiers from the
first cell only, so a test name that asserts two roles cannot satisfy two rows
by accident. The row count stays 137; the identifiers are unique and permanent.

## Position versus declaration

An identifier is not inferred from the row's position in a table. The chef row
cites a test that also asserts the Washerwoman, and a Pukka row cites a test for
two Pukka rules, so a citation count cannot name a row. The first cell names it.
The role document and the row are then matched by identifier, not by order.

## Shared document

`docs/rules-shared.md` has the four-column shape that `parseRuleDoc` already
reads: identifier, level, matrix revision and asserting tests. The revision is
the pinned wiki revision the row names, or an explicit `app contract` marker for
rows that this application owns and no wiki page describes. The document does
not copy wiki text.

## What the gate rejects

1. A supported row with zero or several identifiers in its first cell.
2. An identifier no document declares.
3. A declaration whose level or revision differs from its matrix row.
4. A declared identifier that no row carries.
5. An identifier shared by two rows or two documents.
6. A verified row with no cited test whose name carries its identifier.
7. A verified shared rule whose document cites no test carrying the identifier.
8. An identifier that does not match its namespace: a role identifier on a
   shared row, a shared identifier on a role row, or a role identifier outside
   its edition.

## Compatibility

`parseRuleDoc` is unchanged. `check-acceptance.ts` keeps its existing checks and
adds the shared document, the strict traceability result and a pass check for
the shared citations. The support model, the README counts, the secrets screen
and every engine path are untouched. The existing `rules-for.ts` identifier
shape widens to accept digits in the area so `SYS-I18N-01` is found.
