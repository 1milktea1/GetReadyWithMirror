# Frontend Feature: Assistant (voice UI and status)

**Owner:** TBD
**Status:** “Hey Mirror” starts a turn without a tap. Saying it alone starts recording until the user goes quiet; saying a request in the same breath sends that request on. The on-screen button still works as a fallback.

Owns the on-screen push-to-talk control, the microphone and listening indicators, and the
visible loading, speaking, and error states for the voice session. Recent spoken turns are
sent back to `/api/assistant` so follow-ups such as “give hair 20 more minutes” keep context.

An optional Pico button may trigger the same control later, but the demo must work without
any additional hardware.

When voice recognition fails, the user must be able to retry or fall back to basic on-screen
controls.

## Planned future files

Push-to-talk control, listening/processing/speaking indicators, and error and retry states.

## Does NOT own

Assistant reasoning, tool selection, or ElevenLabs credentials. This module renders session
state; it does not decide anything.
