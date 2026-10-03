Implemented persistent per-tournament operator/entry grants, combined roles, API access checks, filtered tournament lists, and immediate revocation. Operators can create tournaments and manage the shared directory. Admins grant roles through the tournament UI.

Implemented layout C with graph beside configuration, three stage presets plus the eight-team demonstration, composable stages and team/seed/outcome/final-placement sources, group assignment, rounds, stage/final/per-match BO and reset configuration. Saving validates the schema. Locking is one-time, transactional, checks all registered teams appear in the first stage and materializes the match graph. Locked structure cannot be edited.

Validation: 14 public API tests and production build pass. Browser verified preset/save/lock, responsive layout, obsolete BO override recovery and concurrent-edit protection. Two independent reviews found four distinct defects; all fixed and rechecked. Evidence: `docs/reviews/builder.md`.

Scheduling and game operations continue in #5; runtime standings/advancement/reset in #6. This ticket defines and locks the graph.
