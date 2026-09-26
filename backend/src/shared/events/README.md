# Backend Shared: Events

**Owner:** Integration owner (TBD)
**Status:** Not implemented
**Contract:** [`shared/contracts/events/`](../../../../shared/contracts/events/README.md)

Future home of the server-to-React event transport: the small, typed UI-event interface that
carries actions such as widget expansion and return to overview.

## Integration-owned

This is one of the central files both developers would otherwise edit. It has a **single
integration owner**. Other developers request changes here or coordinate a brief integration
session rather than editing it directly.

## Transport decision is open

WebSocket is the proposed option; the final choice is deferred to the integration discussion.
Decide **one** transport before implementing it, and record the outcome in
[`docs/decisions.md`](../../../../docs/decisions.md).

## Planned future files

Transport setup, typed event emission, and connection lifecycle handling.
