# Backend Shared: Errors

**Owner:** Integration owner (TBD)
**Status:** Not implemented

Future home of the shared error conventions every feature returns, so the frontend can render
one consistent set of fallback states.

## Agreed vocabulary

| State | Meaning |
|---|---|
| `not-authorized` | The user has not granted access, for example calendar or microphone |
| `not-configured` | Credentials or setup are missing for that provider |
| `no-data` | The request succeeded but there is nothing to return |
| `external-provider-unavailable` | The upstream provider is unreachable or erroring |
| `input-invalid` | The request arguments were unusable |
| `schedule-conflict` | The planner cannot fit the tasks before the deadline |

Exact naming and serialization are TBD; the **set** of states comes from `AGENTS.md` Section 5.

## The rule that matters most

Every state must expose a useful UI fallback. **Never substitute fabricated live data** for an
error. A visible "weather unavailable" is correct; an invented forecast is not.

`schedule-conflict` is a legitimate outcome, not a failure to hide.

## Planned future files

Error type definitions, construction helpers, and consistent serialization for responses.
