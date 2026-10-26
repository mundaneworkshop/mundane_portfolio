"""Biker: a standing wheelie that goes on forever. The imported pose already has him standing on the frame with the left hand on the bars; the whole
bike + rider is held pitched to 45 degrees about the rear axle (the plan's `root` block keys the root node: base -20 degrees, the wheelie balance
wobbles around it: a slow dip forward / lean back, a quick correction, a slight side-to-side roll), both wheels spin in place (12 turns in the loop),
the free right arm and the free left leg swing for balance, the head sways a little from side to side.
    python3 make_biker.py > biker.json
Free limbs: the right hand is the one away from the bars (0.38 m from the frame), the left foot is the one off the frame (x = 0.19, outside it)."""
import json, math
from motionlib import *

T = 10.0
TURNS = 12                                 # wheel turns per loop: 18 degrees a frame, smooth for the 8-spoke rims
PER = 2.0                                  # balance swing period (5 per loop)

def sw(t, ph=0.0): return math.sin(2 * math.pi * t / PER + ph)

def wheel(t): return 360.0 * TURNS * t / T

def nose_up(t):                            # degrees more nose-up than the 45 held: a slow dip forward and lean back, plus a quick correction
    return 5.0 * math.sin(2 * math.pi * t / 5.0 + 0.5) + 1.3 * math.sin(2 * math.pi * t / (T / 9) + 1.0)
def roll(t): return 1.8 * math.sin(2 * math.pi * t / 2.5 + 0.4)

plan = dict(
    duration=T, fps=24,
    description="Standing wheelie held at 45 degrees on the spot: both wheels spin, the free arm and leg swing for balance, the other hand stays on the bars. 10 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    root=dict(pivot='prop_50862c01_2', base_deg=-20.0, pitch=dense(lambda t: -nose_up(t), T, 2), roll=dense(roll, T, 2)),
    keys={
        'prop_50862c01': {'rotation_x': dense(wheel, T)},
        'prop_50862c01_2': {'rotation_x': dense(wheel, T)},
        'arm_r': {'rotation_x': dense(lambda t: 30 * sw(t), T, 2), 'rotation_y': dense(lambda t: 14 * sw(t, 1.4), T, 2)},
        'leg_l': {'rotation_x': dense(lambda t: 24 * sw(t, math.pi), T, 2), 'rotation_y': dense(lambda t: 8 * sw(t, math.pi + 1.2), T, 2)},
        'torso': {'rotation_z': dense(lambda t: -2.5 * sw(t), T, 2), 'rotation_y': dense(lambda t: 2.0 * sw(t, 0.6), T, 2)},
        'head': {'rotation_z': dense(lambda t: 7.0 * math.sin(2 * math.pi * t / 2.5 + 0.3), T, 2), 'rotation_y': dense(lambda t: 3.0 * math.sin(2 * math.pi * t / 2.5 + 1.2), T, 2),
                 'rotation_x': dense(lambda t: -0.6 * nose_up(t), T, 2)},
    },
)
print(json.dumps(plan))
