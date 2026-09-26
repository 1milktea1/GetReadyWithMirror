# Backend Feature: Assistant (Gemini orchestration)

**Owner:** TBD
**Status:** Not implemented — contract not yet agreed
**Contract:** [`shared/contracts/assistant/`](../../../../shared/contracts/assistant/README.md)
**Permissions:** [`docs/permissions.md`](../../../../docs/permissions.md)

## Responsibility

Owns Gemini orchestration, the permitted tool registry, conversation context, human-readable
response wording, and the translation of user intent into UI actions.

Gemini — not ElevenLabs Agents — is the central decision-maker. The React UI must not string
match spoken phrases; intent selection happens here through a bounded tool list.

## The core security rule

Gemini **requests** named tools. The backend **validates and executes** them.

- Only allowlisted tools may run.
- Never execute arbitrary model-generated code.
- Never accept unvalidated tool arguments.

## Planned public inputs

- Transcribed user utterance, from the voice feature.
- Conversation context for the current session.
- Current time, honoring the demo/test-time override.

## Planned public outputs

- Zero or more validated tool invocations, dispatched to the owning features' public services.
- Zero or more typed UI events emitted toward React (for example an `expandWidget` request for
  the weather module).
- A concise, human-readable response for the voice feature to speak.

An action and an information request can occur in the same turn — for instance expanding the
weather widget while fetching the forecast. Tool results must be returned to Gemini **before**
it makes factual spoken recommendations.

## Upstream dependencies

- Gemini API. Credentials stay server-side.
- The public services of the weather, calendar, maps, and planner features. This feature calls
  those services; it must **not** import their provider adapters.

## Downstream consumers

- The voice feature, which speaks the generated response.
- The frontend, which consumes emitted UI events.

## Error states

- `not-configured` — no Gemini credentials present.
- `external-provider-unavailable` — Gemini unreachable or erroring.
- `input-invalid` — the model requested an unknown tool, or supplied arguments that failed
  validation. Reject the call; do not coerce it into something executable.
- Downstream tool errors propagate with their originating feature's status so the UI can show
  an accurate fallback.

## Planned future files

- A route or controller, if exposed over HTTP at `/api/assistant`.
- Gemini tool declarations and a validating dispatcher.
- Conversation context management.
- Feature-local tests, including rejection of non-allowlisted tool requests.

## Does NOT own

- Directly editing the React DOM.
- Unrestricted code execution.
- Duplicating other features' service logic.
- Generating JSX or manipulating browser elements. It emits typed events; React owns the
  actual expansion and fade animation.
