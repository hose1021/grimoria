# Mixed-edition residual gaps

Updated 2026-11-23. Scope: the mixed-script coverage in PR #484 and
[issue #220](https://github.com/hose1021/grimoria/issues/220).

## Covered by this pass

- The shared protection rules now apply in a mixed script: Monk protection,
  the Soldier, and the BMR Fool, Tea Lady, Sailor, Zombuul, Innkeeper and
  Devil's Advocate protections. The real cause is kept and Demon attribution
  is separate, so the Innkeeper and the Advocate still protect. A non-Demon
  mixed ability still kills the Soldier.
- The Fang Gu jump refuses a Monk-protected Outsider before transforming it,
  so the target and the old Demon stay alive.
- The shared win rules now apply in a mixed script: the living Vortox
  no-execution win, the Evil Twin good-twin execution and the Mastermind extra
  day. The Mayor and demon-dead/two-alive rules stay shared.
- A Barber swap works across a TB and an S&V character.
- Existing coverage keeps timing (`MIXED-QUEUE-01`), poisoning
  (`MIXED-EFFECT-01`, `MIXED-PROTECTION-01`), succession
  (`MIXED-SUCCESSION-01`), jinxes (`JINX-SAGE-06`) and replay
  (`MIXED-EFFECT-01`).

Evidence: `MIXED-PROTECTION-02` to `MIXED-PROTECTION-06`, `MIXED-VICTORY-01`,
`MIXED-VICTORY-02`, `MIXED-TRANSFORM-01`; `npm test` 1597/1597; full
verification on the PR head.

## Remaining gap

**The Mayor redirect is not offered on an S&V Demon attack.** The S&V death
command carries the host-marked deaths, not a `redirectId`; the Imp's
`resolveAttack` path offers the redirect. In a mixed script, a Demon attack on
the Mayor therefore kills the marked target, and the host must use the
correction dialog to apply the official "another player might die instead"
choice. This is a missing host-choice shape in the S&V death path, not a
missing rule. It needs a `redirectId` decision on the S&V step and a UI control;
until then it stays an explicit table resolution.

## Not a gap

The Tea Lady and Sailor use the same shared `bmrCannotDie` gate as the Fool
(tested in a mixed script) and the Soldier (tested in a mixed script). Their
own single-edition behavior stays covered by the BMR suite. A per-role mixed
command-path test is a coverage improvement, not a missing mechanic.

The ten Al vs Al characters and their pairs remain unsupported; the separate
scope is [issue #481](https://github.com/hose1021/grimoria/issues/481).
