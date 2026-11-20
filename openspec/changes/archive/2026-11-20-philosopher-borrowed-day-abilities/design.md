# Design

## Predicates

`hasAbility(player, roleId)` already meant "the player may attempt this
ability": the effective character (a Drunk's shown character included) or a
good character the Philosopher borrowed. It stays for public attempts whose
failure is part of the game: the Slayer's shot, the Juggler's guesses, the
Klutz's choice.

`hasTrueAbility(player, roleId)` is new and means "the ability really works":
the printed character or a borrowed good character. A Drunk's shown character
never qualifies. It is used for a hidden consequence the Storyteller records:
the Tinker's death, the Virgin's execution, the Moonchild's curse.

## Consumers

| Ability | Engine | Console | Predicate |
| --- | --- | --- | --- |
| Slayer | `useSlayer` | `dayHelpForms`, day card, player sheet | `hasAbility` |
| Juggler | `jugglerGuess`, `reportJugglerGuesses` | `dayHelpForms`, juggler panel | `hasAbility` |
| Klutz | `recordKlutzChoice` | day control (issue #319) | `hasAbility` |
| Tinker | `tinkerDeath` | day actions panel | `hasTrueAbility` |
| Virgin | `nominate`, `virginTriggers` | `dayHelpForms`, day card | `hasTrueAbility` |
| Moonchild | `moonchildChoice`, moonchild step actor | `dayHelpForms`, moonchild panel | `hasTrueAbility` |

The Moonchild step actor now finds the real or borrowed holder instead of the
effective holder, so a Drunk shown the Moonchild never wakes as one.

## Why not one predicate

A single predicate would either let a Drunk's shown Tinker die by the ability or
refuse the Drunk's public Slayer attempt that #315 established. The two names
keep the distinction explicit at every call site.
