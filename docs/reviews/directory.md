# Directory review

Fixed point: `9821808`. Initial slice: `e1c1ca6`. Ticket: #3.

## Standards

No documented-standard breach. P2: refreshing the directory discarded an unsaved roster selection. Resolved by resetting that selection only when the organizer chooses a team or tournament. Browser regression: select a player, save an unrelated team edit, confirm the checkbox remains selected, then save the registration.

P3 judgment: team/player form markup repeats. Deferred while these small forms have distinct fields; no behavior defect reported.

## Spec

P2: archive behavior lacked API coverage. Added a public API test: archived players and teams cannot enter new registrations; historical snapshots remain readable after restart.

## Validation

- Nine public API tests pass. Cover identity, permissions, duplicates, invalid IDs, stale writes, archive behavior, persistence and snapshots.
- Type check and production build pass.
- Isolated QA database: created team, player and tournament through UI; edited both catalog records; registered the player; reloaded and read the registration.
- Mobile viewport 390×844: document width 375px, no horizontal overflow. Text inputs 16px and 50px high. Edited a player from this layout; historical registration retained its old handle.
- QA used `.local/directory-qa.sqlite`; organization database was not seeded. Normal local runtime restored afterward.

Tournament grants and format construction are ticket #4. Locking rosters and approval history are later tickets.
