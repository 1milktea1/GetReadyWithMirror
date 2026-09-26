# Backend Shared: Config

**Owner:** Integration owner (TBD)
**Status:** Not implemented

Future home of environment and configuration handling: reading environment variables,
validating that required ones are present at startup, and exposing typed config to features.

## Secrets rule

Gemini, ElevenLabs, maps, and calendar API keys **never** go into React bundles, Git, or
documentation. All provider requests are made server-side; the frontend never calls a provider
directly.

## Environment variable names

Names below are recorded so teammates know what to request. Values stay out of Git.
[`backend/.env.example`](../../../.env.example) lists the maps key with an empty value.
Other names are still TBD and should be confirmed alongside the provider decisions in
[`docs/decisions.md`](../../../../docs/decisions.md).

| Purpose | Name | Decided? |
|---|---|---|
| Gemini API key | TBD | TBD |
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
