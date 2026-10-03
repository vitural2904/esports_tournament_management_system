# Scheduling and game operations review

Fixed point: `da1e4a6`. Initial slice: `31f86cf`, followed by review fixes. Ticket #5.

## Standards

No documented breaches or material smell findings. Two P2 defects resolved:

- Match/game selection discarded unsaved input. Same selection now does nothing; navigating keeps per-game draft data, pick text and original revision. Cached revision zero is preserved even if another member has since created the game.
- Roster updates did not reach the mounted game editor. Reload fetches both tournament and matches; parent tournament revision updates refresh data without replacing the current draft.

Reviewer rechecked both fixes: no new P1/P2.

## Spec

P2: initial requests showed an empty-state instruction before loading completed. Explicit loading status now precedes loaded-empty content. Reviewer rechecked: no remaining spec defect in this slice.

## Validation

- Eighteen public API tests pass. Production type check and build pass.
- BO1/3/5 thresholds verified, including a full 3–2 BO5. Draft/submitted data does not score. Duplicate sends/confirms, stale writes, invalid state transitions and extra games rejected.
- Entry saves/submits; operator confirms. Unauthorized account cannot read the match. Entry cannot confirm or schedule; operator without entry cannot save game input.
- Winner must belong to the match. Optional duration, sides, patch, roster lineups and pick/ban persist through restart. Invalid/duplicate lineups, duplicate champions and equipment/KDA fields rejected without creating a partial game.
- Schedule edits work after format lock. Batches validate all records before a transaction; stale revisions, unknown IDs and invalid dates leave existing times intact.
- Browser QA on isolated `.local/builder-qa.sqlite`: saved an incomplete draft; selected a winner; clicked the same match; switched away/back and retained the selection; entered duration, patch, sides, lineup and typed comma-separated champions; sent and confirmed. Score became 1–0 only after confirmation.
- Browser placed two matches at 19:00 and 19:45 after locking the format.
- Mobile 390×844: sent and confirmed a game. Document width 375px, editor width 343px, no page overflow.

Starting the first saved game locks both registration snapshots in the same transaction. Drafts count as an operational start in v1; approval/history for roster changes follows in #8. Group ranking/tiebreaks and group seed resolution follow in #6. Direct winner/loser and conditional final scaffolding already support match reads.
