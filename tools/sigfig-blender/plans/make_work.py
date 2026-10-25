"""Work: the laptop floats at waist height, one hand types (the laptop dips with each keystroke), the other holds the coffee and sips; midway
the hands swap jobs, and swap back before the loop closes. A foot taps slowly throughout. 10 s loop.
    python3 make_work.py > work.json"""
import json, math
from motionlib import *

T = 10.0
# arm angles (degrees, deltas from the imported pose) found by search; the imported pose is: left holds the cup, right types
L_REST, R_REST = (0, 0, 0), (0, 0, 0)
L_SIP, L_TYPE, L_HAND = (-46.6, -10, -12), (74.6, -40.8, -35.9), (-21.2, -12.8, -2.4)
R_HOLD, R_HAND, R_SIP = (-63.1, -15.4, 15.7), (-71.1, 19.4, 7.7), (-97.1, 25.9, 1.9)

def track(pts, k):
    """pts [(t, (x,y,z)...)] -> value of component k."""
    return pulse(0, [(0, 0)]) if False else None

def arm(keys):
    return {c: dense(lambda t, i=i: pulse(t, [(tt, v[i]) for tt, v in keys]), T) for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))}

arm_l = arm([(0, L_REST), (1.6, L_REST), (2.25, L_SIP), (2.95, L_SIP), (3.6, L_REST), (4.2, L_HAND), (4.5, L_HAND), (5.25, L_TYPE), (8.0, L_TYPE),
             (8.7, L_HAND), (9.0, L_HAND), (9.7, L_REST), (T, L_REST)])
arm_r = arm([(0, R_REST), (3.6, R_REST), (4.2, R_HAND), (4.5, R_HAND), (5.25, R_HOLD), (6.3, R_HOLD), (6.85, R_SIP), (7.5, R_SIP), (8.1, R_HOLD), (8.5, R_HOLD),
             (8.7, R_HAND), (9.0, R_HAND), (9.7, R_REST), (T, R_REST)])

# keystrokes: a burst every ~0.23 s with varying strength
KS = [0.15 + 0.23 * k + 0.045 * math.sin(k * 1.9) for k in range(int(T / 0.23))]
AMP = [0.55 + 0.45 * abs(math.sin(k * 2.3 + 0.7)) for k in range(len(KS))]
def stroke(t):
    s = 0.0
    for tk, a in zip(KS, AMP):
        d = t - tk
        if 0 <= d <= 0.14:
            s += a * math.sin(math.pi * d / 0.14) ** 2
    return min(1.0, s)
r_typing = lambda t: win(t, 0.2, 4.0, 0.3) + win(t, 9.2, 9.95, 0.1) + 0.0
l_typing = lambda t: win(t, 5.5, 8.2, 0.3)
hand_r_x = lambda t: -9 * stroke(t) * min(1, r_typing(t))
hand_l_x = lambda t: -9 * stroke(t + 0.07) * min(1, l_typing(t))
typing_now = lambda t: min(1.0, r_typing(t) + l_typing(t))

def laptop_dz(t):
    return 0.010 * math.sin(2 * math.pi * t / 3.3) - 0.014 * stroke(t) * typing_now(t)
def laptop_rx(t):
    return 0.6 * math.sin(2 * math.pi * t / 3.3 + 1.0) - 1.6 * stroke(t) * typing_now(t)
laptop_keys = [dict(t=round(i / 24, 4), off=[0, 0, round(laptop_dz(i / 24), 5)], rot=[round(laptop_rx(i / 24), 3), 0, 0]) for i in range(int(T * 24))]

def head_x(t):    # looks at the screen, back for the sips
    return 10 - 10 * win(t, 1.9, 3.1, 0.35) - 10 * win(t, 6.55, 7.65, 0.35) - 4 * win(t, 4.0, 4.8, 0.3) - 4 * win(t, 8.6, 9.3, 0.3)
def head_z(t):
    return 6 * math.sin(2 * math.pi * t / T * 2) * 0.5
def torso_x(t):
    return 4 + 0.9 * math.sin(2 * math.pi * t / T * 3)
def tap(t):       # slow foot tap, about 1 per second
    return -8 * (math.sin(math.pi * ((t * 1.0) % 1.0)) ** 2)

plan = dict(
    duration=T, fps=24,
    description="He types on the floating laptop with one hand and sips coffee with the other, swaps jobs between the hands (and back), one foot tapping slowly; the laptop dips with the typing. 10 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots_local={'hand_r': [0, -0.04, -0.005], 'hand_l': [0, -0.04, -0.005]},
    keys={'arm_l': arm_l, 'arm_r': arm_r,
          'hand_r': {'rotation_x': dense(hand_r_x, T)}, 'hand_l': {'rotation_x': dense(hand_l_x, T)},
          'leg_l': {'rotation_x': dense(tap, T)},
          'head': {'rotation_x': dense(head_x, T, 2), 'rotation_z': dense(head_z, T, 4)},
          'torso': {'rotation_x': dense(torso_x, T, 2)}},
    free=[
        dict(part='prop_62698', keys=laptop_keys, mix=[[0, 0, 1]]),                              # the laptop: world, bobbing, dipping with each stroke
        dict(part='acc_68495pb03', keys=[], follow=[dict(to='hand_l'), dict(to='hand_r', capture=4.2, **{'from': 0})],
             mix=[[0, 0, 0, 1, 0], [4.15, 0, 0, 1, 0], [4.25, 0, 0, 0, 1], [8.65, 0, 0, 0, 1], [8.75, 0, 0, 1, 0], [T, 0, 0, 1, 0]]),
    ],
)
print(json.dumps(plan))
