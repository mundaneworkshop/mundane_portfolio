"""Skier: a relaxed, experienced skier grooming down smooth powder in a half crouch, parallel skis, mild leaning. He weaves side to side twice
(the whole rig swings about the snow: hips + skis roll, yaw and slide together), crouches and hops, lands, glides. 10 s loop.
    python3 make_skier.py > skier.json
Needs build_sigfig(..., roles={'970c00pb0922': 'leg_l', '20461bp0c': 'leg_r'}): the dual-mould legs carry no usable role on their own.
The skis (acc_18744, acc_18744_2) hang off the hips, so rolling the hips about a point at the snow (pivots) keeps them planted."""
import json, math
from motionlib import *

T = 10.0
P = 2.6                                    # one weave
W0, W1 = 0.4, 5.6                          # two weaves
T_CROUCH, T_AIR0, T_APEX, T_AIR1, T_SETTLE = 5.8, 6.45, 6.95, 7.45, 9.0
A = 14.0                                   # lateral slide, cm
HOP = 17.0                                 # hop height, cm
HIPS_Z = 0.658                             # hips origin height: the roll pivot sits at the snow

def env(t): return win(t, W0, W1, 0.7)
def ph(t): return 2 * math.pi * (t - W0) / P
def slide(t): return A * math.sin(ph(t)) * env(t)
def roll(t): return -13.0 * math.sin(ph(t)) * env(t)         # leans into the turn (towards the middle of the track)
def yaw(t): return 13.0 * math.cos(ph(t)) * env(t) - 13.0 * math.cos(0) * 0
def hop(t):
    up = pulse(t, [(T_AIR0 - 0.2, 0), (T_AIR0, 0), (T_APEX, HOP)])
    dn = pulse(t, [(T_APEX, 0), (T_AIR1, HOP)])
    return up - dn
def pitch(t):                              # nose up on take-off, level at the top, a touch nose-down coming in
    return pulse(t, [(T_AIR0, 0), (T_AIR0 + 0.2, -4), (T_APEX, 0), (T_AIR1 - 0.1, 3), (T_AIR1 + 0.25, 0)])
def crouch(t):                             # forward lean while loading and landing
    return (pulse(t, [(5.4, 0), (T_CROUCH + 0.3, 13), (T_AIR0, 13), (T_AIR0 + 0.25, -4), (T_APEX, -2), (T_AIR1 - 0.15, 4),
                      (T_AIR1 + 0.2, 12), (8.2, 6), (T_SETTLE, 0)]))
def settle_roll(t): return 0.0

plan = dict(
    duration=T, fps=24,
    description="Relaxed skier grooming down powder: two lazy weaves, a crouch and a hop, a smooth landing, glides on. 10 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots={'hips': -HIPS_Z},
    keys={
        'hips': {'location_x': dense(slide, T, 2), 'location_z': dense(hop, T), 'rotation_y': dense(roll, T, 2), 'rotation_z': dense(yaw, T, 2),
                 'rotation_x': dense(pitch, T, 2)},
        'torso': {'rotation_z': dense(lambda t: -0.7 * yaw(t), T, 2), 'rotation_y': dense(lambda t: 4.0 * math.sin(ph(t)) * env(t), T, 2),
                  'rotation_x': dense(crouch, T, 2)},
        'head': {'rotation_z': dense(lambda t: -0.5 * yaw(t), T, 2), 'rotation_y': dense(lambda t: 5.0 * math.sin(ph(t)) * env(t), T, 2),
                 'rotation_x': dense(lambda t: -0.4 * crouch(t), T, 2)},
        'arm_l': {'rotation_x': dense(lambda t: 6 * math.sin(ph(t) + 1.0) * env(t) + 0.8 * crouch(t), T, 2)},
        'arm_r': {'rotation_x': dense(lambda t: -6 * math.sin(ph(t) + 1.0) * env(t) + 0.8 * crouch(t), T, 2)},
    },
)
print(json.dumps(plan))
