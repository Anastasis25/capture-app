# LGSG Integration Notes

## Current Understanding

LGSG is built in Laravel.

The existing LGSG data currently sits in a Google Sheet.

The Capture App should remain general-purpose, but some captures may later connect to LGSG, especially:

- Gastronomy
- Shopping

## Why Standalone First

Standalone first keeps the new app safe to iterate on without risking the live LGSG codebase.

Using Laravel keeps the future integration path familiar:

- compatible models and migrations
- similar auth patterns
- easier merge into LGSG later if needed
- easier API/export path if kept separate

## Future Integration Options

### Option A: Export From Capture App

Capture App exports approved items as JSON/CSV/Markdown.

LGSG imports them manually or through an admin process.

Best for early stage.

### Option B: API Between Apps

Capture App exposes approved LGSG candidates through an API.

LGSG reads from that API.

Best if the apps remain separate.

### Option C: Merge Into LGSG

Capture App becomes a Laravel module inside the LGSG app.

Best if the workflow becomes central to LGSG.

## First LGSG Mapping

```text
capture_type = recipe       -> possible Gastronomy
capture_type = restaurant   -> possible Gastronomy
capture_type = cafe         -> possible Gastronomy
capture_type = shop         -> possible Shopping
capture_type = product      -> possible Shopping
capture_type = place        -> possible Gastronomy or Shopping, depending on target
capture_type = idea/note    -> no LGSG target by default
```

## Visibility Controls

The app should distinguish between:

```text
private capture
LGSG candidate
approved for LGSG
published in LGSG
client visible
```

These should not be collapsed into one yes/no flag.

## Information Needed From Existing LGSG

To integrate properly later, we need:

1. Local path to the LGSG Laravel repo.
2. GitHub repo URL and branch.
3. Laravel version.
4. Current auth/client portal setup.
5. Current Google Sheet tabs and columns.
6. Gastronomy page code location.
7. Shopping page code location.
8. How content is currently shown/hidden.
9. Where recipe popup/modal code lives.
10. AWS deployment process.
