# Correct the Evil Twin partner

Issue: #216

## Why

The Evil Twin setup and the Pit-Hag creation pair the twins automatically. The
pinned ability leaves the opposing player to the Storyteller, and the table had
no way to correct a wrong pair without changing a role and corrupting both the
win and the setup view.

## What changes

- `manualCorrection` accepts `kind: "twin"` with the holder, the partner and a
  reason.
- It validates the script, the holder's `eviltwin` role, the partner's life and
  the opposing real alignment before writing anything.
- A successful correction writes both stored player ids and the good twin's
  role, so the setup view, the win and a later Barber swap agree.
- The correction dialog offers the twin action only for an Evil Twin holder.
- Distinct errors `error.74` (not S&V), `error.75` (not the holder) and
  `error.76` (same alignment) replace the generic unknown-correction reason.

## Impact

- Public command payload: one added `CorrectionChange` variant.
- No storage shape or journal shape change; the correction is a normal command
  and replays.
- EN/RU/AZ copy added.
