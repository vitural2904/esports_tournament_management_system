Implemented individual/bulk schedules with revision checks and atomic writes. Schedules remain editable after format lock. Manual selected-match intervals support entering a batch without automatic tournament scheduling.

Implemented persisted game draft → submitted → confirmed flow. Only confirmed games score; BO1/3/5 finish at 1/2/3 wins. Entry saves/submits, operator confirms. Optional duration, sides, patch, roster lineups and pick/ban are supported; equipment and statistics are rejected. Invalid states, stale writes, duplicate sends and excess games are blocked.

UI prioritizes pending confirmations and active matches. Optional fields are folded away. Drafts survive match navigation. Parent roster changes refresh the game editor; initial loading and errors are explicit.

Validation: 18 API tests and production build pass. Browser verified incomplete draft, navigation preservation, optional metadata, submit/confirm and official scores; bulk schedule; mobile 390px send/confirm without overflow. Independent Standards/Spec findings were resolved and rechecked. Details: `docs/reviews/results.md`.

Standings, tiebreaks, group seeds and full tournament progression continue in #6. Correction/walkover workflow follows in #7; roster additions/history in #8.
