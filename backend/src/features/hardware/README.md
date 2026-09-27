# Backend Feature: Hardware (Pico USB serial)

**Owner:** TBD
**Status:** Optional. The core demo works with no Pico attached.

## Responsibility

Owns the laptop-side USB-serial connection to the Raspberry Pi Pico and turns recognized
hand swipes into typed UI commands. The Pico does **not** host the app.

## Serial lines the Pico already sends

The ToF / light board streams newline-delimited text at **115200** baud:

| Line | Meaning |
|---|---|
| `DEPTH:` + 64 comma-separated mm values | 8×8 VL53L5CX depth frame |
| `LUX:` + number | Ambient light |
| `PRESENCE:` + `0` or `1` | Someone in front of the mirror |
| `HAND:` + `x,y,distance` or `NONE` | Tracked hand |
| `SWIPE:LEFT` / `SWIPE:RIGHT` | Recognized swipe |

Only swipe lines change the UI. Everything else stays on the debug dashboard in
[`hardware/sensor_dashboard.py`](../../../../hardware/sensor_dashboard.py).

## Swipe → page

| Gesture | UI command |
|---|---|
| `SWIPE:LEFT` | Open the unwind page |
| `SWIPE:RIGHT` | Return to the main dashboard |

React still owns the screen change via `window.mirrorCommand`. This feature only publishes
the gesture.

## Public HTTP

- `GET /api/hardware/gestures` — server-sent events `{ gesture, timestamp }` for the browser.
- `POST /api/hardware/gesture` — `{ "gesture": "left" \| "right" }` or `{ "line": "SWIPE:LEFT" }`.
  Used by tests and by the Python dashboard when it already holds the serial port.

## Upstream

- Pico on `PICO_SERIAL_PORT`, or the first `/dev/cu.usbmodem*` / `/dev/ttyACM*` device.
- If the Python dashboard has the port open, it forwards swipes with POST instead.

## Downstream

Frontend `usePicoGestures` maps left/right onto `expandWidget(unwind)` and `showOverview`.

## Error states

Missing Pico, busy port, or a dropped serial line must not break voice or the dashboard.
The stream is fire-and-forget; a reconnecting EventSource is enough.

## Does NOT own

Hosting the React app, Grok tool selection, or interpreting speech.
