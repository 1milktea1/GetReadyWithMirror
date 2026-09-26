# Collaboration

**Status:** Proposed rules. Ownership is unassigned — fill in the names below first.

The goal of this structure is blunt: **two developers should almost never edit the same file.**
Everything here follows from that.

## Ownership

Assign owners before implementation begins. `TBD` means unclaimed.

| Area | Owner | Notes |
|---|---|---|
| Weather | carolynl950 | Backend and frontend; provider adapter, normalized forecast, suggestions |
| Calendar | TBD | Provider adapter, event, auth boundary |
| Maps | TBD | Routing adapter, durations |
| Planner | TBD | Scoped jointly after contracts are agreed |
| Assistant (Grok) | TBD | Tool registry, orchestration |
| Voice (ElevenLabs) | TBD | Speech-to-text and text-to-speech transport |
| Frontend app shell | TBD | Integration-owned |
| `backend/src/app/` | TBD | **Integration-owned** |
| `backend/src/shared/events/` | TBD | **Integration-owned** |
| Hardware / Pico | TBD | Optional; must not block anyone |

**A feature owner changes only files within that feature and its contract documentation.**

### One possible split

Developer A takes **weather + calendar**; Developer B takes **maps + Grok assistant**;
**planner** is scoped jointly once contracts are agreed.

This is a suggestion, **not a forced assignment**. Rebalance as needed — but agree explicitly
before anyone starts, and record the result in the table above.

## Integration-owned files

[`backend/src/app/`](../backend/src/app/README.md) and
[`backend/src/shared/events/`](../backend/src/shared/events/README.md) are the central files
that would otherwise cause repeated merges. **Choose one integration owner for both.**

Other developers request changes there, or schedule a brief integration session. Feature work
happens inside the feature; the integration owner handles the mount point.

## Branching

Proposed pattern — exact naming is optional, non-overlapping changes are not:

```text
feature/weather
feature/calendar
feature/maps
feature/planner
feature/assistant
integration/...
```

Use feature branches and short pull requests so both developers can work simultaneously
without repeatedly merging the same central file.

## Working rules

- **Merge small changes frequently.** Long-lived branches are what create the conflicts this
  structure exists to avoid.
- **Rebase or pull before editing an integration boundary.** Always.
- **Git is the source of truth.** Two laptops do not sync automatically. Nothing is "done"
  until it is pushed.
- **Changing a shared contract requires communication before merging.** Once implementation
  has begun, update the contract doc **and** its consumers in the **same** pull request.
- **Do not include unrelated formatting refactors** in a feature branch. They turn a
  three-line review into a hundred-line one.
- **Do not change packages or dependencies inside a feature branch** without agreement.
- **Keep feature-specific docs and tests beside the feature** they belong to.

## Working in parallel when things are not ready

Do **not** block all feature work on Google authorization, ElevenLabs access, or a finished
Pico setup. Use synthetic fixtures or a documented mock-service boundary when another feature
is not ready. See [`fixtures/`](../fixtures/README.md).

The planner, in particular, can be built entirely against normalized fixture inputs before any
provider is connected.

## Agree on these before writing code

1. Ownership — fill in the table above.
2. Contract shapes — see [`api-contracts.md`](api-contracts.md).
3. Fixture scenarios — which cases, what format.
4. Event transport — one choice. See [`decisions.md`](decisions.md).

## Enforcing ownership later

Once the ownership table has real names, a `.github/CODEOWNERS` file would make these
boundaries automatic by requesting the right reviewer on every pull request. It is
intentionally **not** created yet, because a file full of `TBD` placeholders enforces nothing.
Add it when owners are assigned.
