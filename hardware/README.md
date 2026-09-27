# Hardware (optional)

The laptop still hosts the React UI, backend, Grok, and voice. A **Raspberry Pi Pico**
can plug in over **USB serial** as an accessory. It does not host the app, and the core
demo must work with no Pico attached.

## What the Pico is doing

The Pico runs a depth / light / presence board (VL53L5CX plus lux). It streams
newline-delimited sensor lines to the laptop at **115200** baud. It does **not** decide
which screen to show.

Typical lines:

```text
DEPTH:1200,1180,...   # 64 mm readings, 8×8
LUX:42.0
PRESENCE:1
HAND:3,4,380
HAND:NONE
SWIPE:LEFT
SWIPE:RIGHT
```

`hardware/sensor_dashboard.py` is a debug plot of depth, lux, presence, and the last
gesture. The mirror UI only cares about **swipes**.

| Pico line | Mirror |
|---|---|
| `SWIPE:LEFT` | Switch to the unwind page |
| `SWIPE:RIGHT` | Switch back to the main dashboard |

The laptop-side owner is [`backend/src/features/hardware/`](../backend/src/features/hardware/README.md):
it reads serial when the port is free, or accepts a POST from the Python dashboard when
that script already holds the port. React applies `expandWidget(unwind)` / `showOverview`.

See [`pico/`](pico/README.md).

## Ownership

Owns Pico USB-serial messaging and physical swipe input. Does **not** own hosting the
frontend or backend, and is never required for the voice demo to work.
