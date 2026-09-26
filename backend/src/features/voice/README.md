# Backend Feature: Voice (ElevenLabs)

**Owner:** TBD
**Status:** Not implemented — contract not yet agreed

## Responsibility

Owns ElevenLabs speech-to-text and text-to-speech transport, plus voice session lifecycle and
listening indicators.

Input uses ElevenLabs Scribe for transcription; output uses ElevenLabs text-to-speech played
through the laptop speakers. Audio input comes from the laptop's built-in microphone.

**Do not assume a JBL speaker or a Raspberry Pi computer.**

## Planned public inputs

- Audio captured from the laptop microphone, initiated by the on-screen push-to-talk control
  (an optional Pico button may trigger it later).
- Response text from the assistant feature, for speech synthesis.

## Planned public outputs

- Transcribed utterance text, handed to the assistant feature.
- Session lifecycle state, so the frontend can render listening, processing, and speaking
  indicators.
- Synthesized speech played through the laptop speakers.

## Upstream dependencies

- ElevenLabs API. Credentials stay server-side.
- The assistant feature, for the text to speak.

## Downstream consumers

- The assistant feature, which receives the transcript.
- The frontend assistant module, which renders microphone and listening status.

## Error states

- `not-configured` — no ElevenLabs credentials present.
- `external-provider-unavailable` — ElevenLabs unreachable or erroring.
- `not-authorized` — the browser denied microphone access.
- `no-data` — audio captured but nothing transcribable.

When recognition fails the user must be able to retry or fall back to basic on-screen
controls. Voice failure must not make the mirror unusable.

## Planned future files

- Transport handling for speech-to-text and text-to-speech.
- Session lifecycle management.
- Feature-local tests.

## Does NOT own

- Independent assistant reasoning.
- Its own competing tool-selection logic. Grok alone selects tools.

## Open question

Whether voice is exposed via a dedicated backend namespace or folded into integrated session
endpoints is undecided. Record the outcome in
[`docs/decisions.md`](../../../../docs/decisions.md).
