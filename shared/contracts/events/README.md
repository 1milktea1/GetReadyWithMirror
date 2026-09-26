# Contract: UI Event Envelope

**Owner:** Integration owner (TBD)
**Status:** Proposed — not agreed, not implemented
**Producer:** [`backend/src/shared/events/`](../../../backend/src/shared/events/README.md)

No TypeScript interfaces and no transport implementation yet.

This is an **integration-owned** contract. It is one of the few shared surfaces both
developers touch, so changes are coordinated rather than made unilaterally.

## Envelope fields to agree

| Field | Purpose | Decided? |
|---|---|---|
| Action name | What should happen, for example expand or collapse | TBD |
| Target widget | Which module the action applies to, where relevant | TBD |
| Request / correlation ID | Ties an event to the utterance that caused it | TBD |
| Payload | Optional action-specific data | TBD |
| Timestamp | When the event was emitted | TBD |

The envelope must support **widget expansion** and **return to overview**.

## Transport: one choice, made once

WebSocket is the proposed option. Server-sent events are the obvious alternative. **Decide one
transport before implementing it** and record the outcome in
[`docs/decisions.md`](../../../docs/decisions.md).

## Division of responsibility

A spoken request such as `expandWidget(weather)` produces a **typed UI event**. React owns the
actual expansion and fade animation. The assistant never generates JSX and never manipulates
browser elements directly.

## Open questions

- Does the frontend acknowledge events, or is delivery fire-and-forget?
- What happens to queued events if the socket drops mid-session?
- Are UI events and tool results delivered over the same channel or separate ones?

## Change rule

This contract is integration-owned. Other developers request changes or coordinate a brief
integration session rather than editing it directly. See
[`docs/collaboration.md`](../../../docs/collaboration.md).
