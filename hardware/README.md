# Hardware (optional)

**Status:** Scaffold only — no firmware, no device code.

## The core demo needs no extra hardware

Everything required for the hackathon demo runs on the laptop: the React interface, the
backend, Gemini orchestration, and the voice flow. The laptop sends video over HDMI to a
monitor mounted behind a two-way mirror, and uses its **built-in microphone and speakers** for
voice input and output.

**Do not assume a JBL speaker or a Raspberry Pi computer.** Do not make any additional
hardware a requirement for the core demo.

## Raspberry Pi Pico (optional)

A **Raspberry Pi Pico**, if integrated, connects to the laptop over **USB serial** and handles
optional physical input or output — an activation button, or an indicator light.

The Pico **does not host** the frontend or the backend. It is an accessory to a system that
already works without it.

See [`pico/`](pico/README.md).

## Ownership

Owns Pico USB-serial messaging and future physical controls. Does **not** own hosting the
frontend or backend, and is never required for the voice demo to work.

An unfinished Pico setup must not block any other feature's development.
