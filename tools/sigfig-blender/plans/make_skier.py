"""Skier: a relaxed, experienced skier grooming down smooth powder in a half crouch, parallel skis, mild leaning. He weaves side to side twice
(the whole rig swings about the snow: hips + skis roll, yaw and slide together), crouches and hops, lands, and goes straight back to weaving. 10 s loop.
    python3 make_skier.py > skier.json
Needs build_sigfig(..., roles={'970c00pb0922': 'leg_l', '20461bp0c': 'leg_r'}): the dual-mould legs carry no usable role on their own.
The skis (acc_18744 = right, acc_18744_2 = left) follow their legs (free parts), so the legs can pump without leaving the skis; the hips roll about a
point at the snow (pivots). The weaves are in phase at the loop seam (sin from 0 at t = 0 and at t = 10)."""
import json, math
from motionlib import *

T = 10.0
P1, P2 = 2.5, 3.1                          # one weave of the first pair, one lazier weave after the landing
T_W2 = 6.9                                 # the second weave starts the moment he is back on the snow
T_CROUCH, T_AIR0, T_APEX, T_AIR1 = 5.0, 5.55, 6.05, 6.55
A = 14.0                                   # lateral slide, cm
HOP = 17.0                                 # hop height, cm
HIPS_Z = 0.658                             # hips origin height: the roll pivot sits at the snow

def env1(t): return 1.0 - ramp(t, 4.3, 5.0)
def env2(t): return ramp(t, T_W2, T_W2 + 0.4)
def sv(t): return math.sin(2 * math.pi * t / P1) * env1(t) + math.sin(2 * math.pi * (t - T_W2) / P2) * env2(t) if t >= T_W2 else math.sin(2 * math.pi * t / P1) * env1(t)
def cv(t): return math.cos(2 * math.pi * t / P1) * env1(t) + math.cos(2 * math.pi * (t - T_W2) / P2) * env2(t) if t >= T_W2 else math.cos(2 * math.pi * t / P1) * env1(t)
def sh(t, a): return math.sin(a + (2 * math.pi * t / P1 if t < T_W2 else 2 * math.pi * (t - T_W2) / P2)) * (env1(t) if t < T_W2 else env2(t))   # a shifted wave, same envelope

def slide(t): return A * sv(t)
def roll(t): return -13.0 * sv(t)          # leans into the turn (towards the middle of the track)
def yaw(t): return 13.0 * cv(t)
def hop(t):
    up = pulse(t, [(T_AIR0 - 0.2, 0), (T_AIR0, 0), (T_APEX, HOP)])
    dn = pulse(t, [(T_APEX, 0), (T_AIR1, HOP)])
    return up - dn
def pitch(t):                              # nose up on take-off, level at the top, a touch nose-down coming in
    return pulse(t, [(T_AIR0, 0), (T_AIR0 + 0.2, -4), (T_APEX, 0), (T_AIR1 - 0.1, 3), (T_AIR1 + 0.25, 0)])
def crouch(t):                             # forward lean while loading and landing
    return pulse(t, [(T_CROUCH - 0.4, 0), (T_CROUCH + 0.3, 13), (T_AIR0, 13), (T_AIR0 + 0.25, -4), (T_APEX, -2), (T_AIR1 - 0.15, 4),
                     (T_AIR1 + 0.2, 12), (T_W2 + 0.1, 6), (T_W2 + 0.9, 0)])
def pole(t):                               # arms: poles swing and plant with the turns, thrown back to load the hop and up and forward on take-off
    load = pulse(t, [(T_CROUCH - 0.4, 0), (T_CROUCH + 0.3, 24), (T_AIR0, 24), (T_AIR0 + 0.25, -34), (T_APEX, -22), (T_AIR1 - 0.1, -8), (T_AIR1 + 0.3, 10), (T_W2 + 0.5, 0)])
    return load
def legs_land(t): return pulse(t, [(T_AIR1 - 0.05, 0), (T_AIR1 + 0.12, 11), (T_AIR1 + 0.5, 0)])      # the legs take the landing

keys = {
    'hips': {'location_x': dense(slide, T, 2), 'location_z': dense(hop, T), 'rotation_y': dense(roll, T, 2), 'rotation_z': dense(yaw, T, 2),
             'rotation_x': dense(pitch, T, 2)},
    'torso': {'rotation_z': dense(lambda t: -0.7 * yaw(t), T, 2), 'rotation_y': dense(lambda t: 4.0 * sv(t), T, 2), 'rotation_x': dense(crouch, T, 2)},
    'head': {'rotation_z': dense(lambda t: -0.5 * yaw(t), T, 2), 'rotation_y': dense(lambda t: 5.0 * sv(t), T, 2),
             'rotation_x': dense(lambda t: -0.4 * crouch(t), T, 2)},
    'arm_l': {'rotation_x': dense(lambda t: 20 * sh(t, 1.0) + pole(t), T, 2), 'rotation_y': dense(lambda t: -10 * sh(t, 2.4), T, 2)},
    'arm_r': {'rotation_x': dense(lambda t: -20 * sh(t, 1.0) + pole(t), T, 2), 'rotation_y': dense(lambda t: 10 * sh(t, 2.4), T, 2)},
    'leg_l': {'rotation_x': dense(lambda t: 9 * sh(t, 0.9) + legs_land(t), T, 2), 'rotation_y': dense(lambda t: 5 * sv(t), T, 2)},
    'leg_r': {'rotation_x': dense(lambda t: -9 * sh(t, 0.9) + legs_land(t), T, 2), 'rotation_y': dense(lambda t: 5 * sv(t), T, 2)},
}

plan = dict(
    duration=T, fps=24,
    description="Relaxed skier grooming down powder: two lazy weaves, a crouch and a hop, a smooth landing, straight back into the weave. 10 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots={'hips': -HIPS_Z},
    keys=keys,
    free=[dict(part='acc_18744', follow=[dict(to='leg_r')], mix=[[0, 0, 0, 1]]), dict(part='acc_18744_2', follow=[dict(to='leg_l')], mix=[[0, 0, 0, 1]])],
)
print(json.dumps(plan))
