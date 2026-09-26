# Contract: Agent Tools

**Owner:** TBD
**Status:** Proposed — implemented behind validation, not yet agreed
**Producer:** [`backend/src/features/assistant/`](../../../backend/src/features/assistant/README.md)
**Types:** [`types.ts`](types.ts)
**Permissions:** [`docs/permissions.md`](../../../docs/permissions.md)

Grok requests these tools. The backend validates arguments and executes them. Shapes below
match `types.ts` and still need joint confirmation before other features depend on them.

## The allowlist

`getPreferences` is deferred and is not declared to the model.

| Tool | Kind | Executed by | Arguments |
|---|---|---|---|
| `expandWidget` | UI action | Assistant emits a UI event | `{ widget }` |
| `collapseWidget` | UI action | Assistant emits a UI event | `{ widget }` |
| `showOverview` | UI action | Assistant emits a UI event | `{}` |
| `getWeather` | Read | Weather `getWeather` | `{ units? }` `imperial` or `metric` |
| `getUpcomingEvent` | Read | Calendar, not connected yet | `{}` |
| `getCommute` | Read | Maps, not connected yet | `{}` |
| `generatePreparationPlan` | Read/compute | Planner, not connected yet | `{ tasks: [{ name, durationMinutes }], arrivalBufferMinutes? }` |
| `updateTaskDuration` | Mutates the plan | Planner, not connected yet | `{ taskName, durationMinutes }` |
| `markTaskComplete` | Mutates the plan | Planner, not connected yet | `{ taskName }` |

`widget` is `weather`, `calendar`, `maps`, or `planner`. Durations are whole minutes from 1 to
180. The arrival buffer is a whole number from 0 to 120. Task names are 1 to 60 characters.
Unknown fields are rejected.

A single turn may include both a UI tool and an information tool. Tool results go back to Grok
before it speaks a factual recommendation.

## What a tool returns to Grok

| Situation | Result sent back | Executed? |
|---|---|---|
| Arguments valid and the feature is connected | That feature's public result | Yes |
| Arguments valid and the feature is not connected | `{ ok: false, error: { status: "not-configured" } }` | Outcome `executed`; no provider call |
| Unknown tool, bad arguments, or non-JSON arguments | `{ ok: false, error: { status: "input-invalid" } }` | No |

Nothing in the error result is replaced with a guessed event, route, or forecast.

## UI event this feature emits

Transport is still undecided. Each event carries `action`, `target` when a widget is involved,
`requestId`, and `timestamp`. `showOverview` has no target.

## Rules that are not negotiable

- Only allowlisted tools may run. An unrecognized tool name is rejected, not improvised.
- Tool arguments are validated before execution. Unvalidated arguments are never passed through.
- Arbitrary model-generated code is never executed.
- The assistant calls other features' **public services**, never their provider adapters.
- Grok's own web search stays off.

## Still open

- Joint sign-off on the argument table above.
- Whether `updateTaskDuration` and `markTaskComplete` need confirmation before a saved plan exists. See D12 in [`docs/decisions.md`](../../../docs/decisions.md).
- How these UI events cross to React. That envelope is integration-owned.

## Change rule

Changing this contract requires notifying the other developer before merging. Update this
document, `types.ts`, and the assistant validator in the same pull request. See
[`docs/collaboration.md`](../../../docs/collaboration.md).
