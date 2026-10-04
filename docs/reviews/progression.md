# Progression review — #6

Fixed point: `6eb1bca047b12e0f6f7ce2b6b13aa381d020f3e9`. Implementation: `f1f4a4f`.

## Standards

Independent Standards reviewer was dispatched, but its turn failed on an account usage limit. No independent pass is claimed. Parent review checked domain names, pure ranking seam, transaction boundaries, persisted tie definitions and API permissions. No hard documented-standard breach found. Ranking repeats score-bucket construction twice; this is a possible Duplicated Code heuristic, not a hard breach. Independent review remains pending before release.

## Spec

Independent Spec reviewer also failed on the same usage limit. Parent review found a final multi-group round robin could finish without one champion. Fixed: such a format remains editable as a draft, but cannot lock until it ends with one group or a championship elimination stage. This preserves arbitrary intermediate grouping and makes the final outcome explicit.

The frozen format graph showed unresolved source labels below the live bracket, without distinguishing its purpose. Fixed caption: it represents locked source structure; the live bracket above shows resolved teams and results.

## Evidence

- API: 8-team preset finishes with exact A1/B4 etc. routing; 38 matches without reset, 39 with reset; each non-champion loses twice in DE.
- API: two-team BO1 tie, three-team repeated round robin, and four-team tie shrinking to only an unresolved three-team subset. Draft/submitted outcomes never produce final seeds. Reads and restart do not duplicate tie matches.
- API: points and head-to-head decide ranks; later stages wait for all previous stages, including direct entrants. Single elimination and championship return correct winners.
- API: final multiple independent groups cannot lock; rollback leaves no materialized matches.
- Browser: isolated QA database only. A/B rows show 6/4/2/0 and exact seeds. U1 displays QA Team 1 vs QA Team 8 with Seed A1/B4. A bracket selection opens the game editor and scrolls to it.
- Browser at 390 px: document width 375 px, tables 343 px, bracket scroll regions 343 px. Wider rounds scroll internally. Game-panel scroll completes at the top of the viewport. Approved gradient remains behind legible panels.

No public deployment. No real organization account or credentials created. Independent reviews must be retried when available; do not treat this record as an independent review pass.
