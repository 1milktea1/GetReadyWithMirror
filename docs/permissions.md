# Permissions and Tool Safety

**Status:** Proposed policy. No tools, validation, or confirmation flows are implemented.

This document collects the permission rules stated in [`AGENTS.md`](../AGENTS.md) Section 3
into one reviewable place. It covers three separate things that are easy to confuse:

1. **Agent tool permissions** — what Gemini is allowed to invoke.
2. **User confirmation** — which actions require an explicit yes.
3. **Device and account permissions** — microphone and calendar access.

## 1. Agent tool permissions

### The core rule

> Gemini **requests** named tools. The backend **validates and executes** them.

- Only **allowlisted** tools may run.
- Tool arguments are **validated before execution**. Never accept unvalidated arguments.
- **Never execute arbitrary model-generated code.**
- An unrecognized tool name is **rejected**, not guessed at or improvised into something
  similar.

### The allowlist

| Tool | Effect | Executed by | Confirmation |
|---|---|---|---|
| `expandWidget` | UI only | Assistant emits UI event | No |
| `collapseWidget` | UI only | Assistant emits UI event | No |
| `showOverview` | UI only | Assistant emits UI event | No |
| `getWeather` | Read | Weather feature | No |
| `getUpcomingEvent` | Read | Calendar feature | No |
| `getCommute` | Read | Maps feature | No |
| `generatePreparationPlan` | Compute | Planner feature | No |
| `updateTaskDuration` | **Mutates the plan** | Planner feature | **Yes, if it overwrites a saved plan** |
| `markTaskComplete` | **Mutates the plan** | Planner feature | **Yes, if it overwrites a saved plan** |
| `getPreferences` | Read (optional) | TBD | No |

Argument and result shapes are **TBD** and must be confirmed jointly — see
[`shared/contracts/assistant/`](../shared/contracts/assistant/README.md).

### What the assistant may not do

- Directly edit the React DOM or generate JSX. It emits a **typed UI event**; React owns the
  expansion and fade animation.
- Execute code outside the allowlist.
- Duplicate another feature's service logic, or import another feature's provider adapter. It
  calls **public services**.
- State a fact before receiving the tool result that supports it. Results return to Gemini
  **before** it makes factual spoken recommendations.

## 2. User confirmation

**Read-only demo functions may run without confirmation.** That is what keeps the demo fast
and conversational.

Two categories require **explicit user confirmation**:

| Action | Why |
|---|---|
| Modifying a real calendar event | It changes something outside the mirror |
| Overwriting a saved plan | It destroys work the user may still want |

Specific protections for the demo flow:

- When the user says *"give me 20 more minutes for my hair"*, the planner recalculates. It must
  **not silently remove tasks** and must **not change the calendar reservation**.
- If the recalculated schedule does not fit, surface the **conflict** and suggested
  adjustments. Never resolve it silently by dropping a task.

The confirmation mechanism — spoken confirmation, on-screen control, or both — is **TBD**.

## 3. Device and account permissions

| Permission | Needed for | Denied state | Fallback |
|---|---|---|---|
| Microphone | Voice input | `not-authorized` | On-screen controls; visible retry |
| Calendar access | Real events | `not-authorized` | Labeled synthetic event |

Neither denial may break the mirror. Unauthorized calendar access must not block other feature
development either — work against fixtures instead.

## 4. Secrets

API keys for Gemini, ElevenLabs, maps, and calendar **never** appear in:

- React bundles
- Git
- Documentation

All provider access is server-side. The frontend never calls a provider directly.

An `.env.example` containing **names only** comes later. Until then, variable names live in
[`backend/src/shared/config/`](../backend/src/shared/config/README.md), and `.gitignore`
excludes `.env` files from the start.

## Open questions

- How is confirmation requested and captured — spoken, on-screen, or both?
- Is a confirmation scoped to one action or to a session?
- Where does validation live: in the assistant's dispatcher, in each feature's service, or
  both?
- What exactly does the assistant return to Gemini when a requested tool is rejected?
- Is there a saved plan at all before SQLite is introduced, and if not, does
  `updateTaskDuration` need confirmation during the hackathon demo?

## Repository permissions

Feature ownership is currently enforced by convention in
[`collaboration.md`](collaboration.md). A `.github/CODEOWNERS` file would automate reviewer
assignment, but is deliberately **not** created while every owner is `TBD`. Add it once the
ownership table has real names.
