# Backend App (composition point)

**Owner:** Integration owner (TBD)
**Status:** `createApp.ts` mounts `/health`, `/api/weather`, `/api/maps`, and `/api/planner`.
`server.ts` listens on port 3001 (`npm run dev` from `backend/`). Feature logic stays in the
feature directories.

Future home of the **single** Express integration and composition point: server bootstrap,
middleware, and the wiring that mounts each feature's routes.

## Integration-owned — this is the file to not fight over

`AGENTS.md` Section 6 is explicit that the structure must prevent two developers repeatedly
editing the same central file. This directory and
[`backend/src/shared/events/`](../shared/events/README.md) are exactly those files.

- One integration owner is chosen for this directory.
- Feature developers add code **inside their own feature**, then request a single mount point
  here rather than restructuring the bootstrap.
- Rebase or pull before editing anything in this directory.

## Composition boundary

This directory wires features together. It must not contain feature logic, provider calls, or
business rules. If something here would need to know what a forecast looks like, it belongs in
a feature instead.

## Likely future API namespaces

`/api/weather`, `/api/calendar`, `/api/maps`, `/api/planner`, `/api/assistant`, plus a health
endpoint. Whether voice gets a dedicated namespace or integrated session endpoints is
undecided.

These are **namespaces to discuss**, not endpoints to create now. See
[`docs/api-contracts.md`](../../../docs/api-contracts.md).

## Planned future files

Server entry point, middleware setup, route mounting, and health check.
