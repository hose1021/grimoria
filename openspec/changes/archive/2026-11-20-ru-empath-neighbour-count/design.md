# Design

## The numeral, not the word

The pinned text says "2 alive neighbors". The Russian card uses the same numeral
form as the reminder "(0, 1, 2)" and as the English card, so the ability reads
`2 живых соседей`. A word form would not match the reminder, which is the text
the Storyteller follows when showing fingers.

## Catalog, not an override

`role-catalog.ts` loads the committed locale data and has no review-override
layer. Adding one for a single missing numeral would create a second source of
truth for role text. The data file is the one catalog the sheet, the seat view
and the export read, so the correction belongs there.

## Test

The existing F-015 test accepted any `2` in the ability. The test now requires
`2 живых соседей`, so it fails when the count is removed and fails when the
count is detached from the neighbours. It reads the shipped `ru_RU.js` through a
VM, so it checks the catalog the browser loads rather than a copy.

## Remaining F-015 items

RU Juggler, RU Tinker, AZ Godfather and AZ Exorcist are Bad Moon Rising
abilities. The Trouble Brewing release scope excludes them; #326 keeps them.
