# Raspberry Pi Pico (optional USB-serial accessory)

**Owner:** TBD
**Status:** Not implemented — no firmware written, integration not committed to.

## Scope

Optional physical input and output for the mirror, connected to the laptop over **USB serial**:

- An activation button that triggers the same push-to-talk action as the on-screen control.
- An indicator (for example an LED) reflecting listening or speaking state.

## Hard constraints

- The Pico **does not host** the frontend or the backend. The laptop runs everything.
- The core hackathon demo must work with **no Pico attached**. On-screen push-to-talk is the
  primary control; the button is an alternative, never a dependency.
- Nothing in the voice flow may block on Pico availability.

## Planned future files

Pico firmware and a laptop-side USB-serial message handler. Message format is TBD.

## Open questions

- Is the Pico part of the demo at all, or a stretch goal? See
  [`docs/decisions.md`](../../docs/decisions.md).
- What is the serial message format between Pico and laptop?
- Which laptop-side component owns the serial connection — the voice feature, or a separate
  hardware feature?
