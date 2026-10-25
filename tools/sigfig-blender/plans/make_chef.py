"""Chef: stirs the egg in the pan with the spatula (twice), then flips the pan and the egg does a full flip. 10 s loop.
    python3 make_chef.py > chef.json"""
import json, math
from motionlib import *

T = 10.0
# base pose found by search (spatula blade over the pan centre, pan held flat): degrees
P = dict(xl=-37.9, yl=9.7, cxh=40.0, hlz=-24.2, hly=9.1, xr=-7.7, yr=-46.6, zr=46.3, hrx=-0.5, hry=-36.7, hrz=-13.8)

def phase(t, t0):
    return 2 * math.pi * 1.25 * (t - t0)

stir1, stir2 = (1.0, 3.5), (4.7, 6.3)

def env(t):
    return win(t, *stir1, fade=0.4) + win(t, *stir2, fade=0.4)

def circ(t):
    """+1 .. -1 sine/cosine pair with the right phase per stir session."""
    if t < 4.0:
        ph = phase(t, stir1[0])
    else:
        ph = phase(t, stir2[0])
    return math.sin(ph), math.cos(ph)

def arm_r_x(t):
    s, c = circ(t)
    wd = win(t, 6.55, 8.7, 0.35)
    return P['xr'] + 7 * env(t) * s - 34 * wd

def arm_r_z(t):
    s, c = circ(t)
    wd = win(t, 6.55, 8.7, 0.35)
    return P['zr'] + 8 * env(t) * (c - 1 if False else c) + 12 * wd

def arm_l_x(t):    # pan: small stir sway, then the flip
    s, c = circ(t)
    flick = pulse(t, [(6.7, 0), (7.0, 7), (7.2, -20), (7.55, -7), (7.95, 5), (8.3, 1), (8.9, 0)])
    return P['xl'] + 1.5 * env(t) * s + flick

def hand_l_x(t):   # wrist keeps the pan level through the arm's motion, and tips it for the flip
    s, c = circ(t)
    flick = pulse(t, [(6.7, 0), (7.0, -8), (7.2, 22), (7.55, 6), (7.95, -6), (8.3, -1), (8.9, 0)])
    return P['cxh'] - (arm_l_x(t) - P['xl']) * 0.0 + flick

def head_x(t):
    return 14 + 5 * env(t) - 12 * win(t, 6.9, 7.9, 0.2) + 0   # looks down at the pan, up to follow the egg

def torso_x(t):
    return 4 + 3 * env(t) + 1.2 * math.sin(2 * math.pi * t / T)

def torso_z(t):
    return -3 * env(t) * math.sin(0.5 * phase(t, 1.0) * 0.4)

# the egg: follows the pan, leaves it at 7.2 s, flips once, lands back at 8.0 s
egg_keys = [
    dict(t=7.2, off=[0, 0, 0], rot=[0, 0, 0]),
    dict(t=7.35, off=[0, 0, 0.26], rot=[100, 0, 0]),
    dict(t=7.55, off=[0, 0, 0.40], rot=[210, 0, 0]),
    dict(t=7.75, off=[0, 0, 0.27], rot=[290, 0, 0]),
    dict(t=7.95, off=[0, 0, 0.05], rot=[350, 0, 0]),
    dict(t=8.05, off=[0, 0, 0], rot=[360, 0, 0]),
]
plan = dict(
    duration=T, fps=24,
    description="Chef stirs the egg in the pan twice with the spatula, then flicks the pan and the egg flips and lands back in it. 10 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots_local={'hand_l': [0, -0.04, -0.005], 'hand_r': [0, -0.04, -0.005]},
    keys={
        'arm_l': {'rotation_x': dense(arm_l_x, T), 'rotation_y': [[0, P['yl']]]},
        'hand_l': {'rotation_x': dense(hand_l_x, T), 'rotation_z': [[0, P['hlz']]], 'rotation_y': [[0, P['hly']]]},
        'arm_r': {'rotation_x': dense(arm_r_x, T), 'rotation_z': dense(arm_r_z, T), 'rotation_y': [[0, P['yr']]]},
        'hand_r': {'rotation_x': [[0, P['hrx']]], 'rotation_y': [[0, P['hry']]], 'rotation_z': [[0, P['hrz']]]},
        'head': {'rotation_x': dense(head_x, T, 2), 'rotation_z': dense(lambda t: 5 * math.sin(2 * math.pi * t / T), T, 4)},
        'torso': {'rotation_x': dense(torso_x, T, 2), 'rotation_z': dense(torso_z, T, 2)},
    },
    free=[dict(part='prop_98138pb088', keys=egg_keys, anchor=7.2,
               follow=[dict(to='acc_4528', off=[-0.018, -0.041, -0.32], rot=[-55.4, 30.2, -27.5])],
               mix=[[0, 0, 0, 1], [7.19, 0, 0, 1], [7.21, 0, 1, 0], [7.98, 0, 1, 0], [8.1, 0, 0, 1]])],
)
print(json.dumps(plan))
