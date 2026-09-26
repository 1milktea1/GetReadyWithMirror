# Backend Shared: Config

**Owner:** Integration owner (TBD)
**Status:** Not implemented

Future home of environment and configuration handling: reading environment variables,
validating that required ones are present at startup, and exposing typed config to features.

## Secrets rule

Grok, ElevenLabs, maps, and calendar API keys **never** go into React bundles, Git, or
documentation. All provider requests are made server-side; the frontend never calls a provider
directly.

## Environment variable names

The assistant reads `backend/.env` at turn time. Commit [`backend/.env.example`](../../../.env.example)
with names only. Real values stay in `backend/.env`, which is gitignored. A variable already set
in the process environment is left as-is.

| Purpose | Name | Decided? |
|---|---|---|
| xAI API key (Grok) | `XAI_API_KEY` | Yes, 2026-09-26 |
| Grok model override | `XAI_MODEL` | Optional. Defaults to `grok-4.7` |
| ElevenLabs API key | TBD | TBD |
| Maps / directions provider key | `GOOGLE_MAPS_API_KEY` | Name in use. Optional. See `backend/.env.example`. |
| Calendar provider client credentials | TBD | TBD |
| Server port | TBD | TBD |
| Demo/test time override | TBD | TBD |

## Degradation requirement

A missing credential must produce a clean `not-configured` state for that one feature. It must
not crash the server or break the rest of the demo.

## Planned future files

Environment loading, startup validation, and typed config accessors.
