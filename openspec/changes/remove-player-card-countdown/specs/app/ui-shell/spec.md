# Spec Delta

## MODIFIED Requirements

### Requirement: Role card dismissal

The role card SHALL stay open until the player saves a name or the screen is
hidden. It SHALL close on Escape, when the document becomes hidden and when the
page is hidden; it SHALL carry no countdown and no cancel control.

**Source**: `SPEC.md` `/player`; `SPEC.md` "Reliability and live-play additions"
**Tests**: `scripts/browser-check.ts`

#### Scenario: No countdown

- **WHEN** the card stays open longer than any countdown
- **THEN** it remains open with the name field

#### Scenario: Escape

- **WHEN** the card is open and the user presses Escape
- **THEN** the card closes without a claim
