# Backend Feature: Assistant (Grok orchestration)

**Owner:** TBD
**Status:** Tool loop started — Grok requests tools; this feature validates and executes them
**Contract:** [`shared/contracts/assistant/`](../../../../shared/contracts/assistant/README.md)
**Permissions:** [`docs/permissions.md`](../../../../docs/permissions.md)

## Responsibility

Owns Grok orchestration, the permitted tool registry, conversation context for one turn,
human-readable response wording, and the translation of user intent into UI actions.

Grok — not ElevenLabs Agents — is the central decision-maker. The React UI must not string
match spoken phrases. Intent selection happens here through a bounded tool list.

The model is xAI's Responses API (`POST https://api.x.ai/v1/responses`), default model
`grok-4.7`. Server-side web search is turned off. Grok cannot look up weather, routes, or
the calendar on its own.

## The core security rule

Grok **requests** named tools. The backend **validates and executes** them.

- Only allowlisted tools may run.
- Never execute arbitrary model-generated code.
- Never accept unvalidated tool arguments.
- A rejected call is not coerced into a different tool. The model receives
  `{ ok: false, error: { status: "input-invalid" } }` and may explain that. It does not run.

## Public service

`runAssistantTurn` in [`assistantService.ts`](assistantService.ts).

**Inputs**

- Transcribed utterance.
- Optional prior user/assistant text. Tool roles in that history are dropped.
- Current time, honoring the demo/test-time override (`now`). When omitted, the system clock is used.

**Outputs**

- Spoken text, taken from Grok only after tool results have been sent back.
- Validated tool outcomes.
- UI events for `expandWidget`, `collapseWidget`, and `showOverview`. Those events are
  streamed to the voice button as soon as Grok requests them, before the spoken follow-up.
  React owns the animation.

An action and an information request can occur in the same turn. Weather, the fixture
calendar, the sample commute, and the planner are wired. Planner follow-ups
(`updateTaskDuration`, `markTaskComplete`) reuse the last named routine in memory.

`POST /api/assistant` is mounted on the laptop Express app at port 3001.

## Environment

Put the key in `backend/.env` (gitignored). Names only belong in
[`backend/.env.example`](../../../.env.example). A shell export of the same name wins over the file.

| Name | Required | Purpose |
|---|---|---|
| `XAI_API_KEY` | yes, for a live turn | xAI API key |
| `XAI_MODEL` | no | Overrides `grok-4.7` |

A missing key is `not-configured`. The process still starts.

## Files

- [`prompt.ts`](prompt.ts) — the system instructions sent to Grok on every turn.
- [`grokAdapter.ts`](grokAdapter.ts) — the only file that knows the xAI response shape.
- [`tools.ts`](tools.ts) — allowlist, JSON schemas sent to Grok, argument validation.
- [`handlers.ts`](handlers.ts) — hooks for other features' public services.
- [`assistantService.ts`](assistantService.ts) — `runAssistantTurn`.
- [`assistant.test.ts`](assistant.test.ts) — rejection, ordering, and the weather handoff.

## Error states

- `not-configured` — `XAI_API_KEY` is missing, or a tool's feature is not connected.
- `external-provider-unavailable` — Grok is unreachable or returns an error.
- `input-invalid` — empty utterance, unknown tool, or arguments that fail validation.
- Downstream tool errors stay in the tool result so the spoken reply can name the failure.

## Does NOT own

- Directly editing the React DOM, generating JSX, or playing audio.
- Calendar, maps, or planner internals. Those features supply public handlers.
- Deciding that a schedule fits. The planner computes that; Grok only explains the result.
