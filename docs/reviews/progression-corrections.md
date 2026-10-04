# Independent review — #6 and #7

Fixed point `6eb1bca047b12e0f6f7ce2b6b13aa381d020f3e9`; reviewed implementation `f1e7ef4`; fixes rechecked at `ca36a67`.

Both reviewers initially hit usage limits. Retried successfully. Reports below keep the axes separate.

## Standards

Hard documented-standard breaches: none. No glossary or ADR conflicts.

- **P2: Correction drafts bypass stale-edit checks.** The command used the latest match's game revision instead of the editor's original base revision. A schedule refresh could attach another operator's fresh revision to an old draft. Fixed: pass original game revision and capture initial game/match revisions per action. Browser reproduced both stale match and stale game paths; both were rejected. Explicit reload retained the concurrent edit at 1840 seconds.
- **P3: Possible Duplicated Code, judgment only.** Standings repeated score-bucket construction for points and head-to-head. Fixed with the shared `scoreBuckets` helper.

Independent recheck: both resolved; no new P1/P2 found.

## Spec

- **P1: DE ends after one loss when reset is disabled.** This violates “DE loại sau hai lần thua” and the required reset after a lower-finalist F1 win. Fixed: reject reset=false and remove the UI option. API regression went red before the fix and now passes.
- **P2: Whole-match walkover leaves false pending confirmation work.** A preserved submitted game kept its completed match at the head of the queue and showed a confirmation button whose API returned 409. Fixed: decision/status precede game submission for priority and labels; confirmation requires an active match without a whole-match decision. Browser submitted a BO3 game then applied whole-match walkover. The match left the pending queue; confirmation-button count was zero. Stored submitted game remained as evidence.

Independent recheck: both resolved; no introduced regressions found. The final-stage rule (one final RR group or a further championship stage) is appropriate. Confirmed standings, repeated ties, seeded/reset progression, signed preview, dependent-match blocking, metadata edits and transaction-backed history looked sound.

Totals: Standards 2 findings, worst P2; Spec 2 findings, worst P1. All four resolved and independently rechecked. Final validation: 36 API tests pass; production build passes. Browser evidence is in the earlier progression/correction review records.
