# Record every role's night choice

Issue: #491

A completed night step logs its localized note. For many roles that note names
the target, but for others it is the prompt, and the chosen players are only
stored on the night step. The Courtier's choice is a character, not a player,
and its drunk effect is applied without a line naming the character or the
players. The game chronicle therefore cannot answer "who chose whom" for every
role.

This change records the actor and the chosen players on every completed role
step, records the Courtier's character and its drunk players, and renders the
actor and targets on every chronicle line.

Out of scope: rules changes, the journal format, a schema version bump.
