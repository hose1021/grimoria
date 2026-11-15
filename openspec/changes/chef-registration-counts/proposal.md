# Proposal

Issue: #217

## Why

The Chef learns how many adjacent pairs of evil players sit in the ring. The
pinned text resolves the Spy and Recluse per query: "The Recluse is sitting
between the Imp and the Poisoner. The Chef learns a '1'. Here, the Recluse is
registering as evil for the Imp-Recluse pair, but as good for the
Poisoner-Recluse pair." (`Chef.r2510`, Examples) and "The Recluse may register
as either good or evil … at different parts of the same night."
(`Recluse.r3007`, Summary).

The engine resolved each registrant once per Chef query. With the pinned
arrangement it could produce 0 or 2, never the pinned 1, and it asked the host
for nothing. That is a host decision presented as a computed answer.

## What Changes

- `chefRegistrationRange` computes the unavoidable minimum and the possible
  maximum count from the real alignments and the sober, healthy Spy and Recluse.
- The Chef step requires a host answer when the range has more than one value,
  and offers every number in the range. The host picks the count; the engine
  still picks no registration.
- The impaired Chef path is unchanged: any count from 0 to the player count.
- A Chef with no effective Spy or Recluse keeps the computed count and no host
  answer requirement.

## Out of Scope

- Any other information role. Their registration queries are per target, not
  per pair, and already carry a host answer where the pin needs one.
- A new command, state field, storage key or UI control. The existing numeric
  option control and `registration-ambiguity` journal case carry the answer.
- Travellers, mixed-edition pools and jinxes.
