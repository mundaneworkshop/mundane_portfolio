"""Iron Man: stands with the visor open, looks left and right, the visor closes, he looks up and takes off (the two teal cylinders under the feet
appear as thrusters), hovers about half a figure height up, comes back down, the thrusters go off and the visor opens. 15 s loop.
    python3 make_iron_man.py > iron-man.json
The visor (acc_10908pb02) is hinged at its own origin about the figure's X axis; 98 degrees is closed (found by looking, 110 stands off the face,
125 swings into the helmet). The cylinders are acc_3062 (right) and acc_3062_2; they are parented to the hips, so they ride up with the figure."""
import json, math
from motionlib import *

T = 15.0
VISOR, CYL = 'acc_10908pb02', ('acc_3062', 'acc_3062_2')
T_LOOK0, T_CLOSE = 0.9, 4.7
T_UP0, T_THR, T_LIFT0, T_LIFT1 = 5.5, 6.6, 6.9, 9.0
T_DOWN0, T_DOWN1, T_OPEN = 11.2, 13.0, 13.6
H = 60.0                                   # hips lift in key units (cm of the model), about half the figure's height

def visor_k(t):
    if t < T_OPEN:                         # closes with a small bounce as it seats
        return pulse(t, [(0, 0), (T_CLOSE, 0), (T_CLOSE + 0.35, 100), (T_CLOSE + 0.5, 97), (T_CLOSE + 0.65, 98)])
    return max(0.0, 98 + pulse(t, [(T_OPEN, 0), (T_OPEN + 0.25, 6), (T_OPEN + 0.9, -98)]))

def look(t):                               # left, then right, then front
    return pulse(t, [(0, 0), (T_LOOK0, 0), (1.9, 38), (2.6, 38), (3.4, -38), (4.0, -38), (4.6, 0)])
def head_z(t):
    return look(t)
def head_x(t):
    up = pulse(t, [(0, 0), (T_UP0, 0), (6.3, -28), (T_LIFT1, -28), (10.0, -10), (T_DOWN0, -10), (12.0, 0)])
    return up + 3 * win(t, 1.0, 4.2, 0.4)
def torso_z(t):
    return 0.25 * look(t) + 3 * math.sin(2 * math.pi * (t - T_LIFT1) / 4.0) * win(t, T_LIFT1, T_DOWN0, 0.8)
def torso_x(t):                            # arches back for the take-off (the chest leads), eases to a lean in the hover
    return 2 + pulse(t, [(0, 0), (T_UP0, 0), (6.4, -6), (6.9, -20), (8.6, -20), (9.5, -8), (T_DOWN0, -6), (12.4, 0)]) - 2 * win(t, 12.8, 13.4, 0.2)

def air(t): return win(t, T_LIFT0 + 0.2, T_DOWN1 - 0.3, 0.6)
def leg_x(t, ph0):                         # legs trail the lift, then dangle: two loose pendulums out of step
    return air(t) * (10 * win(t, T_LIFT0, T_LIFT1 + 0.6, 0.5) + 11 * math.sin(2 * math.pi * (t - T_LIFT1) / 1.8 + ph0) + 5 * math.sin(2 * math.pi * (t - T_LIFT1) / 0.9 + ph0 * 1.6 + 0.8))
def leg_y(t, s): return air(t) * s * 4 * math.sin(2 * math.pi * (t - T_LIFT1) / 2.2 + 0.5)

def hips_z(t):
    rise = pulse(t, [(T_LIFT0, 0), (T_LIFT1, H)])
    fall = pulse(t, [(T_DOWN0, 0), (T_DOWN1, H)])
    bob = 1.6 * math.sin(2 * math.pi * (t - T_LIFT1) / 2.2) * win(t, T_LIFT1 - 0.2, T_DOWN0 + 0.2, 0.9)
    return rise - fall + bob

# arms: down and slightly back for the flight (left arm: negative y abducts, right arm: positive)
def arm_x(t):
    return pulse(t, [(0, 0), (6.2, 0), (7.0, 28), (T_DOWN1 - 0.3, 28), (T_DOWN1 + 0.6, 0)]) + 3 * math.sin(2 * math.pi * (t - T_LIFT1) / 2.2 + 0.8) * win(t, T_LIFT1, T_DOWN0, 0.8)
def arm_y(t, m):
    return m * pulse(t, [(0, 0), (6.2, 0), (7.0, 10), (T_DOWN1 - 0.3, 10), (T_DOWN1 + 0.6, 0)])

def cyl_scale():
    return [dict(t=0, scale=0.0001), dict(t=T_THR, scale=0.0001), dict(t=T_THR + 0.3, scale=1.08), dict(t=T_THR + 0.45, scale=1.0),
            dict(t=T_DOWN1, scale=1.0), dict(t=T_DOWN1 + 0.25, scale=0.0001), dict(t=T, scale=0.0001)]

plan = dict(
    duration=T, fps=24,
    description="Stands with the visor open, looks left and right, the visor closes, he looks up and takes off, teal thrusters appear under the feet, he hovers half a figure height up, returns, the thrusters turn off and the visor opens. 15 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    keys={
        VISOR: {'rotation_x': dense(visor_k, T)},
        'head': {'rotation_z': dense(head_z, T, 2), 'rotation_x': dense(head_x, T, 2)},
        'torso': {'rotation_z': dense(torso_z, T, 2), 'rotation_x': dense(torso_x, T, 2)},
        'hips': {'location_z': dense(hips_z, T)},
        'leg_l': {'rotation_x': dense(lambda t: leg_x(t, 0.0), T, 2), 'rotation_y': dense(lambda t: leg_y(t, -1), T, 2)},
        'leg_r': {'rotation_x': dense(lambda t: leg_x(t, 2.3), T, 2), 'rotation_y': dense(lambda t: leg_y(t, 1), T, 2)},
        'arm_l': {'rotation_x': dense(arm_x, T, 2), 'rotation_y': dense(lambda t: arm_y(t, -1), T, 2)},
        'arm_r': {'rotation_x': dense(arm_x, T, 2), 'rotation_y': dense(lambda t: arm_y(t, 1), T, 2)},
    },
    free=[dict(part=c, keys=cyl_scale(), follow=[dict(to=leg)], mix=[[0, 0, 0, 1]]) for c, leg in zip(CYL, ('leg_r', 'leg_l'))],     # each thruster rides its foot
)
print(json.dumps(plan))
