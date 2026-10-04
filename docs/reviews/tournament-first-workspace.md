# Review: trang chọn giải

Fixed point: `2a939b3`. Main change: `2c5adb8`. Repair: disable catalog add buttons during pending saves.

## Standards

No hard documented-standard breaches or material new smells. One P2 finding: catalog add buttons could replace a form during a pending save; the earlier save callback would close the new draft. Both buttons now use `disabled={busy}`. No open findings.

## Spec

No actionable findings. Explicit tournament selection, separate directory/account areas, conditional forms, tool initialization on first visit and mounted hidden tabs match the spec. No API/schema changes. Independent review used source inspection, not browser verification.

## Validation

- Production build and typecheck passed after repair.
- Existing API suite: 54/54 passed. No backend changes.
- Admin browser: reload shows tournament picker with one heading and zero forms. Create/cancel opens and closes form. Tournament opens short overview.
- Registration initially shows saved registrations without edit form. Opening GAM edit shows five selected players; unchecking one then switching to Overview and back keeps four selected. Restored checkbox without saving.
- Match empty state, format graph and tournament grants reachable only through their tools. Account administration remains reachable.
- Directory initially has zero forms, eight teams and forty players. Add/cancel works.
- Phone viewport 390×844: tournament picker and overview have document width 390; tool navigation scrolls horizontally within its own container. Temporary viewport reset afterward.
- No writes to actual tournament/account data during browser checks. App left on tournament picker.
