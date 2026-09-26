# Contract: Agent Tools

**Owner:** TBD
**Status:** Proposed — not agreed, not implemented
**Producer:** [`backend/src/features/assistant/`](../../../backend/src/features/assistant/README.md)
**Permissions:** [`docs/permissions.md`](../../../docs/permissions.md)

No TypeScript interfaces and no Gemini tool declarations yet. This document names the tools
whose argument and result shapes the team must confirm **jointly** before coding.

## The allowlist

Only these tools may run. Gemini requests them; the backend validates arguments and executes.

| Tool | Kind | Executed by | Args/results agreed? |
|---|---|---|---|
| `expandWidget` | UI action | Assistant → UI event | TBD |
| `collapseWidget` | UI action | Assistant → UI event | TBD |
| `showOverview` | UI action | Assistant → UI event | TBD |
| `getWeather` | Read | Weather feature | TBD |
| `getUpcomingEvent` | Read | Calendar feature | TBD |
| `getCommute` | Read | Maps feature | TBD |
| `generatePreparationPlan` | Read/compute | Planner feature | TBD |
| `updateTaskDuration` | Mutates plan | Planner feature | TBD |
| `markTaskComplete` | Mutates plan | Planner feature | TBD |
| `getPreferences` | Read (optional) | TBD | TBD |

`getPreferences` is optional and may be deferred.

## Rules that are not negotiable

- Only allowlisted tools may run. An unrecognized tool name is rejected, not improvised.
- Tool arguments are validated before execution. Unvalidated arguments are never passed
  through.
- Arbitrary model-generated code is never executed.
- The assistant calls other features' **public services**, never their provider adapters.
- Tool results return to Gemini **before** it makes factual spoken recommendations.

## Open questions

- Which widget names are valid targets for `expandWidget` and `collapseWidget`?
- May a single turn carry both a UI action and an information request? The demo flow implies
  yes — confirm how that is represented.
- What does a tool return when its underlying feature is in an error state?

## Change rule

Changing this contract requires notifying the other developer before merging. When
implementation has begun, the contract doc and all consumers are updated in the **same** pull
request. See [`docs/collaboration.md`](../../../docs/collaboration.md).
