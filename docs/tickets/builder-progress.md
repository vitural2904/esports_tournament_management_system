# Ticket #4 — work in progress

Directory slice closed as #3 after independent reviews and browser QA. Baseline for ticket #4: `30dbf40`.

Implemented tournament-scoped operator/entry grants with revision checks and persisted revocation. Admin grants roles; one member may hold both. Tournament lists filter by current server-side grants. Direct ungranted reads and writes are forbidden. Entry cannot alter registration or grant itself privileges. Operators may manage shared catalogs and create tournaments; a newly created tournament gets an independent operator grant for its creator.

UI has a per-tournament grant editor for admins. Operator members use the directory workspace. Entry members see only assigned tournaments. Builder, stage presets, graph preview and one-time format locking remain unfinished. Do not close #4 yet.

Validation: public HTTP grant regression went red before implementation and green afterward. Full suite: 10 passing tests. Production build passed. New grant UI still needs browser QA and review with the completed builder slice.

Normal local development runtime was restored with session 6577 after directory QA. Revalidate the session handle before restarting. Backend modules are not watched; restart the owned runtime after backend changes. `.local/directory-qa.sqlite` is isolated test data; never use it as organization data.
