# Correction/walkover review — #7

Fixed point: `7a933ed` (progression and locked-source label complete).

## Standards

Parent review: transaction-only simulation behind preview/apply; result history behind a shared storage interface; game details reused in preview/history; friendly stage/match labels reused in operations/history. SQL values parameterized. API checks operator rights after parsing a write request. No documented-standard breach found. Independent Standards review is still required before release; earlier reviewer turns failed on account usage limits. No independent pass is claimed here.

## Spec

Implemented correction, game walkover and whole-match walkover commands. Preview runs the proposed write inside a transaction and rolls it back. Apply verifies a signed, actor-bound preview valid for ten minutes and tied to the exact command and current tournament/match revisions. It recomputes effects in the same transaction and rejects changes if any affected match has started. Reasons are mandatory. Replay/stale/tampered commands cannot append history or leave partial writes.

Whole-match decisions preserve real games and actual scores in storage; UI shows W/L and a decision label. Game decisions carry their own reason/actor/time and score as one game win. Neither creates fabricated durations, lineups or picks/bans. Metadata corrections remain allowed when winner/advancement are unchanged.

Found and fixed during parent review:

- Old tie rounds could dominate ranking after correcting an earlier circular tie. Ranking now evaluates rounds in order and skips obsolete subsequent rounds. Started affected ties block correction.
- A correction could reopen an earlier stage while a later direct-entry match remained marked in progress. Stage gating now participates in preview effects for started/completed matches too, so the correction is blocked.
- Saving a correction cleared its success message during editor reload. The success message is set after reload, including when refresh fails.
- Preview initially showed only the match winner. It now shows game data before/after and new BO1 tie matches before approval.
- Long internal tie IDs were exposed as game titles. Operations/history now use stage, group and round names; whole-match decisions show W/L instead of an invented series score.

Independent Spec review remains pending; do not interpret this record as an independent review pass.

## Evidence

API tests cover read-only preview, successful correction/restart/history, blocked started final, metadata-only edit, stale/replayed/tampered preview, withdrawn unused ties, earlier circular tie correction, single-game and whole-match decisions, DE one-loss routing, entry/outsider permissions, newly proposed ties and reopening a prior stage after a direct-entry final starts.

Browser QA used only `.local/builder-qa.sqlite`. On laptop: corrected a confirmed group winner; preview listed four playoff matches; applying created a BO1 tie and history with actor/reason/before/after. On 390px mobile: game walkover finished that tie and restored seeds. Changing the original winner was then blocked because the tie had started; duration-only correction succeeded. Preview showed 1825 → 1830 seconds and saving retained the success message. Whole BO3 walkover preview listed two dependent matches; saved UI displayed QA Team 1 W / QA Team 8 L and the decision reason. Mobile document width 375px; editor/history 343px. Approved background/font remain in place.

Remaining gates: independent two-axis review; roster approval/history (#8); final security/persistence/visual audit and handover (#9). No public deployment or real organization account provisioning.
