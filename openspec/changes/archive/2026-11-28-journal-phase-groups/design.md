# Design

## Grouping

`EventEntry` gains an optional `group` label. `EventLog` walks the filtered
entries in the order it received them and starts a new section whenever the
label changes. Sequential grouping keeps the real order and handles the result
and preparation lines, whose phase is a plain string, without a second sort.
An empty group is never rendered because the sections are built after the
filter.

## Chronicle order

`GameLog` gains `grouped`. Without it, the side panel keeps the reversed recent
preview. With it, the entries stay in append order, each carries the phase label
as its group, and the line drops the phase prefix because the heading owns it.
`OverCard` renders the grouped chronicle. The heading carries `data-log-group`
for the browser check.

## Tests

The `game-end-chronicle` browser case asserts at least two phase headings and
that the first is the night. The existing line and winner assertions stay.
