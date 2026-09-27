# Raspberry Pi Pico (optional USB-serial accessory)

**Owner:** TBD
**Status:** Sensor stream exists. The Pico does not host the app.

## Scope

The Pico is a USB-serial accessory on the laptop. It reports depth, light, presence,
a tracked hand, and recognized **left / right swipes**. An activation button or LED is
still optional.

## Swipe contract

The firmware already emits:

```text
SWIPE:LEFT
SWIPE:RIGHT
```

Laptop mapping (React applies the screen change):

- **Left** → unwind page
- **Right** → main dashboard

## Hard constraints

- The Pico **does not host** the frontend or the backend. The laptop runs everything.
- The core hackathon demo must work with **no Pico attached**.
- Nothing in the voice flow may block on Pico availability.

## Laptop-side files

- [`sensor_dashboard.py`](../sensor_dashboard.py) — debug plot; also POSTs swipes to the API
  when it has the serial port.
- [`backend/src/features/hardware/`](../../backend/src/features/hardware/README.md) — serial
  reader, gesture hub, SSE/POST so the browser can switch pages.

Set `PICO_SERIAL_PORT` if auto-detect misses the device (macOS often `/dev/cu.usbmodem*`,
Windows `COM3`).
