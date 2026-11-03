# Pocket Grimoire improvement research

Reviewed 2026-11-03. Scope: current static application at the repository root, its tests, CSS, older design prototypes, and deployment workflow. Recommendations are based on source inspection and primary web references; no live browser or player usability session was performed. Existing unrelated working-tree changes were left untouched.

## Assessment

Keep the local, single-device Trouble Brewing scope. The separation of model, rules, engine, store and screens is a useful foundation. Phase state, night queues, player handoff, public projections, import/export and a separate teaching demo already exist. The older design README describes several of these as missing and should be marked historical.

Validation: `node --test js/night.test.mjs js/engine.test.mjs` passed all 39 tests. Passing tests do not establish rules correctness: one test explicitly asserts an incorrect voting threshold.

## 1. Design

### Prioritize the active task on phones

The host markup puts `seatRail()` before the active card and `sidePanel()` after it. The desktop grid uses 270px / flexible / 310px columns. Make the current wake the first visible task at narrow widths; place roster, queue and history in drawers or tabs. Preserve the three-pane workbench on wider screens. This is a design hypothesis to verify on real phones.

The active card should present actor and seat, instruction, targets or information, then one primary completion action. Keep the five-part teaching guidance available in an expandable section. A beginner/expert preference can control the default expansion without changing rules.

Acceptance: at 390px width, starting or advancing a wake exposes the actor, required input and primary action without scrolling through the roster.

### Increase readability and touch reliability

`css/app.css` uses 9.5px labels, 12px buttons, 32px default button heights and 40px mobile heights. `css/host.css` adds 8–11px secondary text and 34–36px navigation controls. Use approximately 16px for primary instructions, 13–14px for secondary information, and 44–48px targets for controls used during play. Keep team colors, but pair them with explicit role/team/state labels.

44px is a practical product target and the project's own specification, not the WCAG 2.2 AA minimum. WCAG's minimum criterion is 24px with exceptions: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

### Make dialogs consistent

The player warning declares `aria-modal` but does not implement initial focus, contained keyboard focus, background inertness or focus restoration. Use a shared dialog primitive, preferably native `<dialog>` with appropriate labeling and tested focus behavior. Reference: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

### Finish localization

Role catalogs switch languages, but host guides, timers, error messages and player flow still contain Russian literals. Move user-visible text into one keyed translation system with parameter interpolation. Add missing-key checks for en/ru/az. Verify long translated labels at phone widths.

## 2. Code system

### P0: Dispose screens when leaving them

`js/app.js:mountRoute` replaces the shared root but does not dispose the previous screen. Screen modules abort their controller only on their next mount. Old root/document handlers and timers can therefore survive navigation. An old table Escape handler can call its renderer against the same root after the player screen has opened if an overlay remained active. This is a source-derived risk requiring browser reproduction.

Contract: `mount(root)` returns a cleanup function. The router calls cleanup before replacing content. Cleanup aborts listeners, stops timers, clears sensitive transient data and closes overlays.

Acceptance: table overlay -> player route -> Escape never renders the host; switching away while a role timer is active never lets that timer replace the new screen.

### P0: Stop clearing legitimate names on every load

`js/store.js:clearUnclaimedDefaultNames` clears matching names and resets `claimed`, even for a claimed player in a valid v3 save. Alice, Ben and other listed names can be genuine player input. Scope this cleanup to a known legacy migration, and preserve explicitly claimed names.

Acceptance: a player named Alice in the corresponding seat remains named and claimed after reload.

### P1: Make state validation and mutations reliable

`js/model.js:validateState` checks some outer structure but does not validate the full phase/night/day/effects shape or all references. Some malformed nested player values can also throw during validation. Imported data should produce a readable rejection instead of a later rendering failure.

`js/store.js:run` snapshots state but does not restore it when a mutator fails or throws after a partial change. Mutate a candidate state and commit only on success, or guarantee rollback on failure. Distinguish an applied action from a failed persistent save in the UI.

Acceptance: malformed imports leave the current game unchanged; failed actions leave no partial mutations; storage errors remain visible.

### P1: Define cross-tab behavior

`js/public.js` renders once from its in-memory singleton. There is no storage subscription, so a separate public tab can stay stale; multiple host tabs can overwrite each other. Add save revisions and a single-writer policy, plus public projection refresh when another tab saves. The browser supplies cross-tab storage events: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event

### P2: Reduce maintenance ambiguity

The root app and `site/` contain parallel source trees; Go implementation files and built web assets also remain, although the current README describes a static app and `go.mod` is deleted in the working tree. Explicitly designate the root as canonical and document/archive legacy material after verifying dependencies. Deployment should copy from that single source.

Split `table.js` by lifecycle, rendering, dialogs and actions; split `engine.js` by setup, information, effects, death/inheritance and day actions. Keep a stable facade for callers. Shared escaping, dialog and translation helpers should replace repeated implementations. A framework rewrite is not necessary for these improvements.

## 3. Game workflow

### P0: Correct the voting threshold

`js/engine.js:executionThreshold` uses `floor(living / 2) + 1`. `js/table.js:dayCard` tells the host that strictly more than half is required. `js/engine.test.mjs` explicitly expects four votes with six alive. Official rules require at least 50%, so the positive-player-count formula is `ceil(living / 2)`: six alive needs three votes; eight needs four. A nominee must also beat the other nomination totals; a tie for the highest total means no execution.

Correct code, tests, UI guidance, README, SPEC and rules-source notes together. Source: https://wiki.bloodontheclocktower.com/Rules_Explanation

### P1: Support Virgin events without a full vote ledger

The engine resolves the Virgin through `nominate`, but the host UI does not call this path. Its direct execution path records the cause as `vote` and cannot record a non-triggering first nomination that consumes the Virgin ability. Add a small host action for a Virgin nomination, including nominator, permitted registration decision, spent state, and execution/day end when appropriate. Keep ordinary nominations and voting at the physical table.

Acceptance: qualifying first nomination executes the nominator and ends the day; an ineligible first nomination still spends the ability; reload preserves that state. Source: https://wiki.bloodontheclocktower.com/Virgin

### P1: Make handoff and recovery explicit

The player projection currently includes every player's shown-role data in memory, although only one role card is rendered. Restrict role lookup to the selected player and build the number-picker projection without role details. This improves separation within the UI; the same-browser local-storage model remains host-trusted.

The auto-hide countdown subtracts interval ticks and can restart when the role card rerenders. Use a fixed deadline instead. Hiding during name entry leaves the seat unclaimed; make this state understandable and provide a host recovery action for abandoned or mistaken claims. Cover secrets on browser-history returns as well as explicit navigation.

### P2: Add deliberate offline support

Local storage preserves state but does not guarantee assets load after an offline reload. Cache the application, relevant catalogs, fonts and role art through a versioned service worker. Show an offline-ready state after installation succeeds and defer updates during active games. Reference: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

## Delivery order and verification

1. Correct threshold; implement route disposal; preserve legitimate names.
2. Add integration tests for route transitions, reload, malformed imports and privacy DOM output. Include Virgin and inheritance scenarios.
3. Improve mobile task hierarchy, text size, controls, dialogs and localization.
4. Add Virgin host controls, handoff recovery, cross-tab policy and offline support.
5. Consolidate source trees and split large modules once behavior is protected.

Run a complete 7-player teaching game on a phone and a 12-player game on a tablet. Include a hidden tab, reload during night, dead-player execution, poisoned information role and Demon inheritance. Measure setup completion, time per wake, corrections and unintended secret exposure. These usability and browser checks remain proposed work, not completed validation.
