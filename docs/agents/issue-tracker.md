# Issue tracker: GitHub

Issues and specs live in vitural2904/esports_tournament_management_system.
Use gh. Pass --repo vitural2904/esports_tournament_management_system
on every issue or PR command. This folder has no Git remote.

## Conventions

- Create: gh issue create --repo <repo> --title "..." --body-file <file>
- Read: gh issue view <number> --repo <repo> --comments
- List: gh issue list --repo <repo> --state open --json number,title,body,labels
- Comment: gh issue comment <number> --repo <repo> --body-file <file>
- Labels: gh issue edit <number> --repo <repo> --add-label "..."
  or --remove-label "..."
- Close: gh issue close <number> --repo <repo> --comment "..."

<repo> means vitural2904/esports_tournament_management_system.
Use a saved text file for multiline bodies.

## Pull requests as a triage surface

PRs as a request surface: no.

## Skill routing

"Publish to the issue tracker" means create a GitHub issue.
"Fetch the relevant ticket" means read the issue with comments.

## Wayfinding

- Map: one issue labelled wayfinder:map. Body: Notes, Decisions-so-far, Fog.
- Children: issues labelled wayfinder:<type>.
  Types: research, prototype, grilling, task.
  Link as GitHub sub-issues. If unavailable, use a map task list
  plus "Part of #<map>" in each child.
- Blocking: use native GitHub issue dependencies.
  POST repos/<repo>/issues/<child>/dependencies/blocked_by through gh api.
  Pass issue_id as the blocker's database ID.
  Fetch that ID from repos/<repo>/issues/<blocker> with --jq .id.
  If unavailable, record "Blocked by: #<number>" in the child.
- Frontier: map's open children, in map order.
  Eligible: no open blockers, no assignee.
- Claim: assign the issue to @me before work.
- Resolve: comment with the answer. Close the child.
  Add its gist and link to the map's Decisions-so-far.
