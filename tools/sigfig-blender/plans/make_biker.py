"""Biker: a standing wheelie that goes on forever. The imported pose already has him standing on the frame with the left hand on the bars; the whole
bike + rider is pitched up to 45 degrees (a static rotation of the rig about the rear axle, applied after apply_plan with choreo.tilt_rig("biker", "prop_50862c01_2", -20),
because the plan engine only keys parts), both wheels spin in place (12 turns in the loop), the free right arm and the free left leg swing for balance.
    python3 make_biker.py > biker.json
Free limbs: the right hand is the one away from the bars (0.38 m from the frame), the left foot is the one off the frame (x = 0.19, outside it)."""
import json, math
from motionlib import *

T = 10.0
TURNS = 12                                 # wheel turns per loop: 18 degrees a frame, smooth for the 8-spoke rims
PER = 2.0                                  # balance swing period (5 per loop)

def sw(t, ph=0.0): return math.sin(2 * math.pi * t / PER + ph)

def wheel(t): return 360.0 * TURNS * t / T

plan = dict(
    duration=T, fps=24,
    description="Standing wheelie held at 45 degrees on the spot: both wheels spin, the free arm and leg swing for balance, the other hand stays on the bars. 10 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    keys={
        'prop_50862c01': {'rotation_x': dense(wheel, T)},
        'prop_50862c01_2': {'rotation_x': dense(wheel, T)},
        'arm_r': {'rotation_x': dense(lambda t: 30 * sw(t), T, 2), 'rotation_y': dense(lambda t: 14 * sw(t, 1.4), T, 2)},
        'leg_l': {'rotation_x': dense(lambda t: 24 * sw(t, math.pi), T, 2), 'rotation_y': dense(lambda t: 8 * sw(t, math.pi + 1.2), T, 2)},
        'torso': {'rotation_z': dense(lambda t: -2.5 * sw(t), T, 2), 'rotation_y': dense(lambda t: 2.0 * sw(t, 0.6), T, 2)},
        'head': {'rotation_z': dense(lambda t: 2.0 * sw(t), T, 2)},
    },
)
print(json.dumps(plan))
