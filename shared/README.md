# Shared Contracts

**Status:** Scaffold only — no TypeScript interfaces, no fixtures, no handlers.

This directory holds the **cross-feature contracts**: the normalized shapes that let weather,
calendar, maps, planner, assistant, and the UI event transport interoperate without any
feature reaching into another's internals.

## Why this exists

Two developers build separate backend features concurrently. The contracts are the seam
between them. Agree on the shapes here **first**, and each developer can then implement a
feature independently without waiting on the other.

## Layout

```text
shared/contracts/
├── weather/     # Normalized forecast result
├── calendar/    # Upcoming event
├── maps/        # Routes, durations, freshness
├── planner/     # Planner input, and schedule-or-conflict output
├── assistant/   # Agent tool allowlist and argument/result shapes
└── events/      # UI expansion/collapse event envelope (integration-owned)
```

Every contract is currently **proposed, not agreed**. Each README lists the fields to settle
and the open questions blocking agreement.

## Ownership rules

- A contract is owned jointly by its producer feature and its consumers. Do not change one
  unilaterally.
- Communicate **before merging** a contract change.
- Once implementation has begun, a contract change updates the contract doc **and** its
  consumers in the **same pull request**.
- [`contracts/events/`](contracts/events/README.md) is integration-owned; route changes
  through the integration owner.

## What belongs here

Normalized, provider-agnostic shapes. Third-party API response shapes stay inside the owning
feature's provider adapter and never leak into this directory.

See [`docs/api-contracts.md`](../docs/api-contracts.md) for the index, and
[`docs/collaboration.md`](../docs/collaboration.md) for the ownership process.
