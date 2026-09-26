# Demo Scenario

**Status:** Shared product contract. Not implemented.

This is the flow both developers build toward. It is the **shared definition of done** for the
hackathon demo.

## Setup

| Item | Value |
|---|---|
| Demo can run | **Any time between 12 PM and 4 PM** |
| Fictional user location | Columbia University |
| Event | Dinner reservation, **5 PM** |
| Event location | Somewhere downtown — **exact address TBD** |
| Track | Live Better (strictly personal utility) |

The exact sample restaurant address must be chosen before maps integration, since accurate
routing requires a real destination. Until then it stays `TBD` — do not invent one and hardcode
it.

## The flow

### 1. Session start and overview

The user starts a voice session with an on-screen push-to-talk control (an optional Pico button
may do the same later). The mirror greets them with an appropriate **"Good afternoon"**, then
**fades into a compact overview** showing:

- Current and afternoon weather
- The 5 PM calendar event
- A short getting-ready plan
- A leave-by summary

### 2. "Expand weather and recommend what I should wear and bring."

ElevenLabs transcribes. Grok interprets. The backend retrieves weather and event context.
The React weather module **expands** and displays grounded clothing and essentials
suggestions, while ElevenLabs speaks a concise response.

This turn exercises the rule that one utterance can trigger **both** a UI action and an
information request. Suggestions must be based on the forecast actually retrieved.

### 3. "Show my calendar." / "Go back."

Grok chooses the correct interface action. The relevant module expands, or the overview
returns. Intent comes from Grok's bounded tool list — **not** from React string matching the
phrase.

### 4. "When do I need to leave?"

The maps feature retrieves travel estimates from Columbia to the event address. A
**deterministic backend calculation** combines event start, travel duration, and buffer into a
leave-by time.

Grok explains the result. Grok does not compute it.

### 5. "Plan my time. I need to shower, do my hair, and get dressed."

The planner uses the task durations and the leave-by deadline to propose a getting-ready
timeline.

### 6. "Actually, give me 20 more minutes for my hair."

Grok identifies the update. The planner **recalculates** and explains any conflict.

It must **not** silently remove tasks, and must **not** change the calendar reservation.

## Non-negotiable requirements

**Relative current time.** The system works from the actual current time, never a hardcoded
2:45 PM.

**Demo/test-time override.** A way to override "now" is a **design requirement**, so
developers can test noon, 2 PM, 3:30 PM, and 4 PM scenarios. Every feature that reads the
clock must read it through this override rather than calling the system clock directly. The
mechanism and variable name are TBD — see
[`backend/src/shared/config/`](../backend/src/shared/config/README.md).

**Show conflicts, do not hide them.** If there is not enough time, display a clear conflict.
Never invent a feasible schedule by quietly compressing or dropping tasks. At 4 PM the plan
genuinely may not fit, and that is a correct, demonstrable outcome.

**Label fixtures.** Any example weather or travel time must be visibly labeled as a fixture,
not presented as a live condition. **Never invent current weather, routes, or arrival
estimates.**

**No extra hardware.** The core demo runs on the laptop: built-in microphone, built-in
speakers, HDMI to the monitor behind the mirror. The Pico is optional.

## Test matrix to build later

Fixture scenarios worth covering, all against the same 5 PM event:

| Demo time | What it should show |
|---|---|
| 12 PM | Ample time; relaxed plan |
| 2 PM | Comfortable plan |
| 3:30 PM | Tight; buffer under pressure |
| 4 PM | Likely **conflict** — exercises the conflict path |

Fixtures do not exist yet. See [`fixtures/`](../fixtures/README.md).

## Open questions

- The exact downtown restaurant address.
- The default arrival buffer before a 5 PM reservation.
- Which transport modes to offer for Columbia to downtown.
- Assumed task durations for shower, hair, and getting dressed when the user does not say.
