"""Rebel / TIE pilot: relaxed pose (one hand on the hip, a foot tapping), the other hand spins the helmet, tosses it, it lands on the head
(the hair piece hides), a pause, then he takes it off and goes back to the start. 15 s loop.
    python3 make_pilot.py rebel > rebel-pilot.json ; python3 make_pilot.py tie > tie-pilot.json"""
import json, math, sys
from motionlib import *

T = 15.0
FIG = sys.argv[1] if len(sys.argv) > 1 else 'rebel'
if FIG == 'rebel':
    side, helmet, other = 'r', 'acc_x164px2', 'l'
    seat = dict(off=[0.216, 0.306, 0.317], rot=[-15.3, 0, 0])
else:
    side, helmet, other = 'l', 'acc_30408p02', 'r'
    seat = dict(off=[-0.212, 0.338, 0.362], rot=[-15.3, 5.5, -0.7])
m = 1 if side == 'r' else -1            # mirror: +1 when the helmet hand is the figure's right
xs = -m                                  # x sign of the helmet hand (the figure's right is -X)
HAIR = 'acc_23186'
T_SPIN0, T_SPIN1 = 1.0, 6.0
T_WIND, T_REL = 6.2, 7.1
T_LAND = 8.4
T_OFF0, T_OFF1 = 10.6, 11.8
ARM_OUT = 18.0                          # and held a little out to the side, clear of the face
ARM_UP = 45.0                           # the helmet arm is raised this far forward while the helmet spins, so the forearm stays out of the helmet's swing

# spin: rev/s profile, scaled so the helmet ends exactly on a whole number of turns
def speed(t):
    return 430.0 * win(t, T_SPIN0, T_SPIN1, 0.7)
_A = sum(speed(i / 240.0) for i in range(int(T * 240))) / 240.0
_K = 360.0 * round(_A / 360.0) / _A
def spin_deg(t):
    n = int(t * 240)
    return _K * sum(speed(i / 240.0) for i in range(n)) / 240.0
spin_keys = [dict(t=round(i / 12.0, 4), deg=round(spin_deg(i / 12.0), 3)) for i in range(0, int(T * 12) + 1)]

def helm_arm_x(t):
    return pulse(t, [(0, 0), (0.4, 0), (T_SPIN0, -ARM_UP), (T_WIND, -ARM_UP), (6.75, 31), (7.0, -60), (T_REL + 0.05, -105), (7.8, -118), (8.6, -12), (9.0, 6), (10.4, 6),
                     (10.95, -103), (11.8, -103), (12.8, 0), (T, 0)])
def helm_arm_y(t):
    return m * pulse(t, [(0, 0), (0.4, 0), (T_SPIN0, ARM_OUT), (T_WIND, ARM_OUT), (6.75, 2), (7.1, -3), (8.6, 0), (10.4, 0), (10.95, 4.5), (11.8, 4.5), (12.8, 0), (T, 0)])
def helm_arm_z(t):
    return m * pulse(t, [(0, 0), (T_WIND, 0), (6.75, 1.7), (7.1, 22), (7.8, 22), (8.6, 0), (10.4, 0), (10.95, 7.5), (11.8, 7.5), (12.8, 0), (T, 0)])

def hip_arm_y(t):                         # hand on hip (found by search: the hand lands on the hip); it breathes
    return 5 * m + 0.8 * math.sin(2 * math.pi * t / T * 3)

def tap(t):                               # foot tap: a toe-down pulse about 2 per second, only while he is relaxed
    on = win(t, 0.4, 6.4, 0.5) + win(t, 12.6, 14.8, 0.5)
    ph = (t * 2.0) % 1.0
    return -9 * on * (math.sin(math.pi * ph) ** 2)

def head_x(t):
    return 8 * win(t, 1.0, 6.0, 0.8) - 20 * win(t, 7.1, 8.2, 0.3) + 4 * win(t, 8.5, 12.8, 0.4) - 4 * win(t, 10.6, 11.7, 0.3)
def head_z(t):                            # glances at the helmet, then proudly around while it sits on his head
    return (-m) * (14 * win(t, 1.0, 6.0, 0.8) + 8 * win(t, 6.8, 8.0, 0.3)) + 10 * pulse(t, [(8.8, 0), (9.3, 1), (9.9, -0.8), (10.4, 0)]) * win(t, 8.6, 10.5, 0.2)
def torso_z(t):
    return (-m) * (6 * win(t, 1.0, 6.0, 0.8) + 8 * win(t, 6.6, 7.6, 0.2) + 6 * win(t, 10.7, 11.9, 0.3))
def torso_x(t):
    return 2 + 1.0 * math.sin(2 * math.pi * t / T * 4) - 8 * win(t, 6.4, 6.9, 0.15) + 6 * win(t, 7.0, 7.5, 0.15)
def hips_x(t):                            # weight on the hip-hand leg
    return -m * 0.8 * (1 - 0.0)

hand_wob = lambda t: 4 * math.sin(2 * math.pi * 2.2 * t) * win(t, T_SPIN0, T_SPIN1, 0.6)

# helmet: in the hand, spins, is tossed (world path anchored at the release pose), lands on the head, is lifted off, back in the hand
toss = [
    dict(t=T_REL,        off=[0, 0, 0],                         rot=[0, 0, 0]),
    dict(t=T_REL + 0.30, off=[-xs * 0.06, 0.12, 0.55],          rot=[-130, 0, 0]),
    dict(t=T_REL + 0.60, off=[-xs * 0.15, 0.26, 0.80],          rot=[-250, 0, 0]),
    dict(t=T_REL + 0.90, off=[-xs * 0.20, 0.31, 0.58],          rot=[-330, 0, 0]),
    dict(t=T_REL + 1.15, off=[-xs * 0.22, 0.33, 0.22],          rot=[-358, 0, 0]),
    dict(t=T_REL + 1.30, off=[-xs * 0.22, 0.32, 0.08],          rot=[-360, 0, 0]),
]
bump = [dict(t=T_OFF0, off=[0, 0, 0]), dict(t=(T_OFF0 + T_OFF1) / 2, off=[0, 0, 0.10]), dict(t=T_OFF1, off=[0, 0, 0])]
helmet_free = dict(
    part=helmet, keys=toss, anchor=T_REL, anchor_follow=0, bump=bump,
    spin=dict(axis=[0, 0, 1], keys=spin_keys),
    follow=[dict(to='hand_' + side), dict(to='head', bone='head_3', off=seat['off'], rot=seat['rot'])],
    mix=[[0, 0, 0, 1, 0], [T_REL - 0.01, 0, 0, 1, 0], [T_REL + 0.01, 0, 1, 0, 0], [T_LAND - 0.15, 0, 1, 0, 0], [T_LAND + 0.15, 0, 0, 0, 1],
         [T_OFF0, 0, 0, 0, 1], [T_OFF1, 0, 0, 1, 0], [T, 0, 0, 1, 0]])
hair_free = dict(part=HAIR, keys=[dict(t=0, scale=1), dict(t=T_LAND + 0.05, scale=1), dict(t=T_LAND + 0.10, scale=0.0001), dict(t=T_OFF0 + 0.45, scale=0.0001), dict(t=T_OFF0 + 0.5, scale=1), dict(t=T, scale=1)],
                 mix=[[0, 1, 0]])

plan = dict(
    duration=T, fps=24,
    description="Relaxed pose, one hand on the hip, a foot tapping; the other hand spins the helmet, tosses it up and it lands on the head (hair hides); he waits a couple of seconds, takes it off and goes back to the start. 15 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots_local={'hand_r': [0, -0.04, -0.005], 'hand_l': [0, -0.04, -0.005]},
    keys={
        'arm_' + side: {'rotation_x': dense(helm_arm_x, T), 'rotation_y': dense(helm_arm_y, T), 'rotation_z': dense(helm_arm_z, T)},
        'hand_' + side: {'rotation_x': dense(hand_wob, T, 2)},
        'arm_' + other: {'rotation_y': dense(hip_arm_y, T, 4), 'rotation_x': [[0, 15]], 'rotation_z': [[0, -18 * m]]},
        'leg_' + side: {'rotation_x': dense(tap, T)},
        'head': {'rotation_x': dense(head_x, T, 2), 'rotation_z': dense(head_z, T, 2)},
        'torso': {'rotation_z': dense(torso_z, T, 2), 'rotation_x': dense(torso_x, T, 2)},
    },
    free=[helmet_free, hair_free],
)
print(json.dumps(plan))
