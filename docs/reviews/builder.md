# Builder and grants review

Fixed point: `30dbf40`. Slice commits: `2fb2a47`, `0650ad6`, followed by review fixes. Ticket #4.

## Standards

No documented breaches. Three P2 defects were reported and resolved:

- New organization accounts were absent from the grant selector until remount. The root now passes its live account list through the directory workspace.
- Structural changes could leave BO overrides pointing at removed matches. Each stage now exposes override removal independently of graph validity.
- The API accepted downstream dependencies on conditional reset outcomes. The compiler rejects them. Final placement sources wait for the stage champion/runner-up instead.

The reviewer rechecked all three fixes and reported no new P1/P2.

## Spec

P1: a directory refresh advanced the revision attached to an older format draft. The builder now retains its base format and revision, detects another operator's change and sends the original revision for writes. Browser regression: edit local draft; a separate API session saves another format; save an unrelated team edit; local draft remains with a conflict warning; attempted save returns 409; API read proves the other operator's format remains intact.

P2: stale BO overrides made structural edits unrecoverable. Removal controls resolve this. Browser regression: override a return-leg match, change to one leg, remove the obsolete override, restore two legs, save successfully.

The reviewer rechecked both fixes and reported no new defects.

## Validation

- Fourteen public API tests pass; production type check/build pass.
- Eight-team fixture produces 24 group matches, 14 unconditional DE matches and one conditional reset. Exact source routing and final BOs checked against the design.
- Presets for round robin, single elimination and double elimination; multiple stages, direct teams, seeds, match outcomes and final placements; invalid/duplicate sources, invalid BO, stale revisions and incomplete lock coverage tested.
- Grants isolate reads/writes, support combined roles, survive restart, and revoke current-session access immediately. Entry cannot grant itself roles, change registration, save format or lock.
- Browser: choose eight-team preset, inspect 39-match preview, save, recover obsolete BO override, reproduce concurrent edit conflict and lock successfully. After lock edit controls disappear or disable. Read the existing entry grant correctly. No console errors.
- Mobile 390×844: document width 375px; canvas and settings width 343px, no page overflow. Graph columns scroll inside the canvas.
- Browser used isolated `.local/builder-qa.sqlite`. Organization data was not seeded.

Results, scheduling, standings, progression, corrections and roster approvals follow in later tickets. A conditional reset is a graph definition at this stage; runtime activation is ticket #6.
