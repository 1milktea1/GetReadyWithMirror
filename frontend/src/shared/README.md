# Frontend Shared

**Owner:** Integration owner (TBD)
**Status:** Not implemented

Future home of cross-module presentation utilities and hooks: mirror-friendly layout
primitives, transition helpers, formatting, and the hook that consumes backend UI events.

## Mirror-friendly by default

The display sits behind a two-way mirror, so shared presentation choices should assume a
**black background**, high contrast, and type large enough to read at a distance. Anything
that is not luminous effectively disappears.

## Keep this directory small

Shared frontend code is a merge-conflict magnet when two developers work concurrently. Keep
presentation logic inside the feature that owns it; promote something here only when a second
module genuinely needs it.

## Planned future files

Layout primitives, transition and fade helpers, formatting utilities, and the UI event
subscription hook.

## Does NOT own

Secret API credentials, or any provider request that bypasses the backend.
