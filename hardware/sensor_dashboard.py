import os
import json
import serial
import time
import urllib.error
import urllib.request
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

# =======================================================
# SERIAL SETTINGS
# =======================================================

PORT = "COM3"      # CHANGE THIS to your Pico COM port
BAUD = 115200
MIRROR_GESTURE_URL = os.environ.get(
    "MIRROR_GESTURE_URL",
    "http://127.0.0.1:3001/api/hardware/gesture",
)

ser = serial.Serial(PORT, BAUD, timeout=0.01)


# =======================================================
# STATE
# =======================================================

depth = np.ones((8, 8)) * 1000

lux = 0.0
presence = 0

hand_x = None
hand_y = None
hand_distance = None

gesture_message = ""
gesture_time = 0.0

GESTURE_DISPLAY_TIME = 3.0  # seconds


# =======================================================
# FIGURE
# =======================================================

fig = plt.figure(figsize=(12, 7))

ax_depth = fig.add_subplot(121, projection="3d")
ax_info = fig.add_subplot(122)

ax_info.axis("off")


# =======================================================
# SERIAL LINE PROCESSING
# =======================================================

def process_line(line):
    global depth
    global lux
    global presence
    global hand_x
    global hand_y
    global hand_distance
    global gesture_message
    global gesture_time

    # ---------------- DEPTH ----------------
    if line.startswith("DEPTH:"):

        values = line[6:].split(",")

        if len(values) == 64:
            try:
                nums = [float(v) for v in values]
                depth = np.array(nums).reshape((8, 8))

            except ValueError:
                pass


    # ---------------- LUX ----------------
    elif line.startswith("LUX:"):

        try:
            lux = float(line[4:])

        except ValueError:
            pass


    # ---------------- PRESENCE ----------------
    elif line.startswith("PRESENCE:"):

        try:
            presence = int(line.split(":")[1])

        except ValueError:
            pass


    # ---------------- HAND ----------------
    elif line.startswith("HAND:"):

        data = line[5:]

        if data == "NONE":

            hand_x = None
            hand_y = None
            hand_distance = None

        else:
            try:
                x, y, d = data.split(",")

                hand_x = int(x)
                hand_y = int(y)
                hand_distance = float(d)

            except ValueError:
                pass


    # ---------------- GESTURE ----------------
    elif line.startswith("SWIPE:"):

        gesture_message = line
        gesture_time = time.time()
        forward_swipe(line)


def forward_swipe(line):
    payload = json.dumps({"line": line}).encode()
    request = urllib.request.Request(
        MIRROR_GESTURE_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(request, timeout=0.4)
    except (urllib.error.URLError, TimeoutError, OSError):
        pass


# =======================================================
# UPDATE FUNCTION
# =======================================================

def update(frame):
    global gesture_message

    # Read all currently available serial lines
    while ser.in_waiting:

        try:
            line = ser.readline().decode(
                "utf-8",
                errors="ignore"
            ).strip()

            if line:
                process_line(line)

        except Exception:
            pass


    # ===================================================
    # 3D DEPTH PLOT
    # ===================================================

    ax_depth.clear()

    X, Y = np.meshgrid(
        np.arange(8),
        np.arange(8)
    )

    ax_depth.plot_surface(
        X,
        Y,
        depth
    )

    ax_depth.set_title("VL53L5CX Depth")

    ax_depth.set_xlabel("X")
    ax_depth.set_ylabel("Y")
    ax_depth.set_zlabel("Distance (mm)")

    # Close objects appear "higher"
    ax_depth.invert_zaxis()

    ax_depth.set_zlim(2000, 0)


    # ===================================================
    # INFO PANEL
    # ===================================================

    ax_info.clear()
    ax_info.axis("off")

    text = ""


    # ---------------- LIGHT ----------------

    text += "LIGHT\n"
    text += f"{lux:.1f} lux\n\n"


    # ---------------- PRESENCE ----------------

    text += "PRESENCE\n"

    if presence:
        text += "YES\n\n"
    else:
        text += "NO\n\n"


    # ---------------- HAND ----------------

    text += "TRACKED HAND\n"

    if hand_x is not None:

        text += f"x = {hand_x}\n"
        text += f"y = {hand_y}\n"
        text += f"distance = {hand_distance:.0f} mm\n\n"

    else:

        text += "NONE\n\n"


    # ---------------- GESTURE ----------------

    text += "GESTURE\n"

    if (
        gesture_message
        and time.time() - gesture_time < GESTURE_DISPLAY_TIME
    ):
        text += gesture_message + "\n"

    else:
        text += "---\n"


    # ---------------- DRAW TEXT ----------------

    ax_info.text(
        0.05,
        0.95,
        text,
        va="top",
        fontsize=15,
        family="monospace"
    )


# =======================================================
# ANIMATION
# =======================================================

animation = FuncAnimation(
    fig,
    update,
    interval=70,
    cache_frame_data=False
)

plt.tight_layout()
plt.show()