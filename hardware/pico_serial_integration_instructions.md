# Pico USB Serial Integration Instructions

## Goal

Integrate the Raspberry Pi Pico's USB serial output into the existing software system.

The only serial messages that should affect application behavior are:

```text
PRESENCE:0
PRESENCE:1
SWIPE:LEFT
SWIPE:RIGHT
```

If the firmware currently emits `PPRESENCE:0` / `PPRESENCE:1` instead of `PRESENCE:0` / `PRESENCE:1`, treat `PPRESENCE` as an alias for `PRESENCE`.

**Ignore all other serial messages.** The Pico may also emit debugging or sensor data such as `DEPTH:...`, `LUX:...`, `HAND:...`, `CMD_SET_BRIGHTNESS:...`, or `STATUS:...`. Those should not trigger any behavior unless explicitly requested later.

## USB / Serial Connection

The Pico is connected to the laptop over USB and appears as a serial/COM port.

Use:

```text
Baud rate: 115200
Data format: newline-delimited UTF-8 text
```

On Windows, the port will usually look like `COM3`, `COM4`, `COM5`, etc. Do not assume the port number is permanently fixed. Prefer either a configurable serial-port setting or automatic discovery if the existing codebase already supports it.

Only one program should own the Pico's serial port at a time. The Arduino Serial Monitor must be closed while the application is connected.

## Important Serial-Reading Rule

Serial data can arrive in arbitrary chunks. Do **not** assume one USB read equals one complete message.

Maintain a persistent text buffer:

1. Read any currently available serial bytes.
2. Decode them as UTF-8.
3. Append them to the buffer.
4. Split the buffer on `\n`.
5. Process every complete line.
6. Keep the final unfinished piece in the buffer for the next read.

Conceptually:

```text
incoming bytes
    ↓
persistent buffer
    ↓
split on newline
    ↓
complete lines → parser
unfinished tail → keep for next read
```

Trim whitespace and `\r` before parsing.

## Protocol

### Presence

`PRESENCE:1` means a person is currently detected in front of the mirror. Update the application presence state to `present = true`.

Typical use:

- wake/show the main mirror UI
- enable the active interface
- reset an idle/sleep timer

`PRESENCE:0` means no person is currently detected. Update the application presence state to `present = false`.

Typical use:

- enter an idle state
- hide/fade the active dashboard
- start any desired sleep timeout

Do not treat every repeated `PRESENCE:1` or `PRESENCE:0` line as a new event. Presence is a **state**.

Example:

```text
PRESENCE:1
PRESENCE:1
PRESENCE:1
```

still means only `present = true`.

### Swipe Events

`SWIPE:RIGHT` is a discrete right-swipe event. Trigger the application's existing "move right / next page / next panel" behavior exactly once.

`SWIPE:LEFT` is a discrete left-swipe event. Trigger the application's existing "move left / previous page / previous panel" behavior exactly once.

Swipe messages are **events**, unlike presence messages. The Pico already implements gesture timing/cooldown, so the software should not add another large debounce unless the existing UI requires it.

## Recommended Parser

```pseudo
function handleSerialLine(line):
    line = trim(line)

    if line == "PRESENCE:1" or line == "PPRESENCE:1":
        setPresence(true)
        return

    if line == "PRESENCE:0" or line == "PPRESENCE:0":
        setPresence(false)
        return

    if line == "SWIPE:RIGHT":
        handleSwipeRight()
        return

    if line == "SWIPE:LEFT":
        handleSwipeLeft()
        return

    // Ignore everything else.
```

Do not parse unrelated sensor/debug lines unless requested.

## Recommended Architecture

The serial connection should live in one stable part of the application rather than being opened independently by multiple components.

```text
Raspberry Pi Pico
      │
      │ USB serial @ 115200
      ▼
Serial integration layer
      │
      ├── PRESENCE:0/1 → application presence state
      │
      ├── SWIPE:LEFT   → previous/navigation action
      │
      └── SWIPE:RIGHT  → next/navigation action
      │
      ▼
Existing UI / application state
```

Create a small interface between the serial layer and the existing application, for example:

```text
onPresenceChanged(boolean present)
onSwipeLeft()
onSwipeRight()
```

or equivalent existing state/actions in the codebase.

Do not couple page/UI rendering directly to low-level serial parsing if the existing architecture already has a state-management or event layer.

## If the Existing App Is a Browser Frontend

If this application runs directly in Chrome or Edge and has no desktop/backend process, Web Serial can be used.

Important constraints:

- The user must explicitly grant access to the Pico's serial port.
- The connection normally begins after a user action such as clicking "Connect Pico."
- Open the port at `115200`.
- Keep one persistent reader running.
- Use the same newline-buffering logic described above.

The application should then route parsed messages into its existing UI/state functions.

Do not try to read from the Arduino Serial Monitor. The website should open the Pico's USB serial port directly.

## If the Existing App Has Node/Electron/Desktop Backend

Prefer opening the COM port in that backend process.

```text
Pico USB serial
    ↓
Node/Electron/backend serial reader
    ↓
application event/state layer
    ↓
frontend UI
```

If the frontend is separate from the serial-owning process, forward only normalized events such as:

```text
presenceChanged(true)
swipe("left")
swipe("right")
```

Do not forward the entire raw serial stream unless there is a debugging reason.

## Connection / Reconnection Behavior

The integration should fail gracefully if the Pico is unplugged.

Recommended behavior:

- show/log that the Pico is disconnected
- do not crash the application
- allow reconnecting after the Pico is plugged back in
- clear or safely reset transient serial buffers when reconnecting
- preserve the rest of the UI

If automatic reconnection already exists in the codebase, use it.

## Testing

Before integrating UI actions, first log only recognized commands:

```text
[PICO] presence = true
[PICO] presence = false
[PICO] swipe right
[PICO] swipe left
```

Confirm that unrelated lines are ignored.

Then connect those four recognized inputs to the existing application behavior.

Suggested test sequence:

```text
PRESENCE:1
→ UI enters active state

SWIPE:RIGHT
→ UI moves to next page/panel

SWIPE:LEFT
→ UI moves to previous page/panel

PRESENCE:0
→ UI enters idle state
```

## Scope

For this integration task, only implement behavior for:

```text
PRESENCE:0
PRESENCE:1
SWIPE:LEFT
SWIPE:RIGHT
```

(`PPRESENCE:0/1` may be accepted as an alias if encountered.)

Everything else coming from the Pico should be ignored for application behavior.
