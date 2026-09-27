# Hardware






## Raspberry Pi Pico

A **Raspberry Pi Pico**, connects to the laptop over **USB serial** and handles
optional physical input or output — an activation button, or an indicator light.

The Pico **does not host** the frontend or the backend. It is an accessory to a system that
already works without it.

See [`pico/`](pico/README.md).

## Ownership

Owns Pico USB-serial messaging and future physical controls. Does **not** own hosting the
frontend or backend, and is never required for the voice demo to work.

An unfinished Pico setup must not block any other feature's development.
