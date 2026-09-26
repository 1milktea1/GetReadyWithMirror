# Frontend App (entry and screen composition)

**Owner:** Integration owner (TBD)
**Status:** Not implemented

Future home of the React app entry point and screen composition: the greeting screen, the fade
into the compact overview, and the display-state machine that governs which module is
expanded.

## Display flow

1. Greeting screen with a time-appropriate salutation.
2. Fade into the compact overview.
3. A typed UI event expands one module into a focused view.
4. "Go back" or "show overview" restores the compact view.

Only one module is expanded at a time. This directory owns that state, so feature modules do
not need to know about each other.

## Intent does not come from string matching

The UI must not match spoken phrases to decide what to do. Grok selects intent through a
bounded tool list, and the backend emits a typed UI event. This app layer reacts to events.

## Integration-owned

Shared app shell and display state are coordinated, not edited unilaterally by feature owners.

## Planned future files

App entry, screen composition, display-state management, and UI event subscription.
