# Contract: Planner Input and Output

**Owner:** TBD
**Status:** Proposed — not agreed, not implemented
**Producer:** [`backend/src/features/planner/`](../../../backend/src/features/planner/README.md)

No TypeScript interfaces yet. This document describes the shape the team must agree on before
anyone implements against it.

## Input fields to agree

| Field | Purpose | Decided? |
|---|---|---|
| Current time | Real now, or the overridden demo time | TBD |
| Event time | When the user must have arrived | TBD |
| Venue | Where the event is | TBD |
| Route duration | Travel time supplied by the maps feature | TBD |
| Preferred arrival buffer | Minutes of slack before event start | TBD |
| Preparation tasks | Named tasks with durations | TBD |

## Output: feasible schedule **or** explicit conflict

| Field | Purpose | Decided? |
|---|---|---|
| Leave-by time | Deterministically derived deadline | TBD |
| Task windows | Start and end per task | TBD |
| Feasibility result | Feasible, or conflict | TBD |
| Conflict detail | What does not fit, and by how much | TBD |
| Suggested adjustments | Options the user may accept | TBD |

If the schedule does not fit, return the conflict. **Never** fabricate a feasible plan.

## Open questions

- Are tasks ordered by the user, or may the planner reorder them?
- Are any tasks fixed in sequence (for example, shower before hair)?
- What is the default arrival buffer when the user does not state one?
- How are conflicts ranked when several adjustments could resolve them?

## Consumers

- Backend assistant feature, via `generatePreparationPlan`, `updateTaskDuration`, and
  `markTaskComplete`.
- Frontend planner and overview modules.

## Determinism requirement

All time arithmetic here is computed in **time-zone-aware code**, not produced by Gemini
prose. Gemini may explain a result; it may not calculate one.

## Change rule

Changing this contract requires notifying the other developer before merging. When
implementation has begun, the contract doc and all consumers are updated in the **same** pull
request. See [`docs/collaboration.md`](../../../docs/collaboration.md).
