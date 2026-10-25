"""OG Boba: stands, lifts off as the jetpack comes on (no thrust effect: the helmet and pack are one molded piece), floats bobbing and weaving,
reaches behind the back for two blasters, fires them in separate directions (a red stud pops off each muzzle), puts them back, drifts down and lands. 20 s loop.
    python3 make_og_boba.py > og-boba.json
Blasters acc_4349 (right hand) / acc_4349_2 (left), red studs prop_4073 / prop_4073_2 (loose in the import, so they follow the hand).
While stowed a blaster is glued to the hips at the pose it has when its arm is swung 75 degrees back (offsets solved from the rig: STOW), so the
hand-over in both directions is seamless; both arms are held still (torso straight) at those two moments."""
import json, math
from motionlib import *

T = 20.0
H = 55.0                                   # hips lift (key units = cm of the model): about half the figure's height
T_LIFT0, T_LIFT1 = 1.4, 3.6
T_WEAVE0, T_WEAVE1 = 3.6, 7.6
T_REACH0, T_GRAB = 7.9, 9.1
T_FIRE_L, T_FIRE_R = 11.5, 13.0
T_BACK0, T_PUT = 14.4, 15.7
T_DOWN0, T_DOWN1 = 16.9, 19.0
PER = 2.4                                  # one weave

STOW = {'R': dict(off=[0.0881, 0.3821, -0.1715], rot=[75, -15, 0]), 'L': dict(off=[-0.0892, 0.3874, -0.1729], rot=[75, 15, 0])}
STUD_STOW = {'R': dict(off=[0.1292, 0.6483, -0.1364], rot=[75, -15, 0]), 'L': dict(off=[-0.1302, 0.6534, -0.1371], rot=[75, 15, 0])}   # the same pose for the stud (it sits at the muzzle, so its own offsets differ)
FIRE_L = (-72.0, -15.0, 50.0)               # up and out to the left (yaw swings the lifted arm sideways)
FIRE_R = (-55.0, 12.0, -50.0)              # forward-right, a little low
HOLD = (-8.0, 0.0, 0.0)                    # blasters brought forward before aiming
# studs fly off along these world directions (set from the aimed blasters)
DIR_L = [0.83, -0.54, 0.12]
DIR_R = [-0.84, -0.51, -0.17]

def way(pts):
    """Per-channel pulse through waypoints [(t, x, y, z)] -> (fx, fy, fz)."""
    return [(lambda t, i=i: pulse(t, [(p[0], p[1 + i]) for p in pts])) for i in range(3)]

armL = way([(0, 0, 0, 0), (T_REACH0, 0, 0, 0), (T_GRAB, 75, 15, 0), (T_GRAB + 0.1, 75, 15, 0), (10.6, *HOLD), (T_FIRE_L - 0.3, *FIRE_L),
            (T_BACK0, *FIRE_L), (T_PUT, 75, 15, 0), (T_PUT + 0.1, 75, 15, 0), (T_DOWN0, 0, 0, 0), (T, 0, 0, 0)])
armR = way([(0, 0, 0, 0), (T_REACH0, 0, 0, 0), (T_GRAB, 75, -15, 0), (T_GRAB + 0.1, 75, -15, 0), (10.6, *HOLD), (T_FIRE_R - 0.9, *HOLD),
            (T_FIRE_R - 0.3, *FIRE_R), (T_BACK0 + 0.2, *FIRE_R), (T_PUT, 75, -15, 0), (T_PUT + 0.1, 75, -15, 0), (T_DOWN0, 0, 0, 0), (T, 0, 0, 0)])

def recoil(t, tf):
    return 9.0 * math.exp(-((t - tf - 0.05) / 0.11) ** 2) if t > tf - 0.2 else 0.0

def sway(t, ph):                           # relaxed arms swing a little against the weave
    return 6 * math.sin(2 * math.pi * (t - T_WEAVE0) / PER + ph) * win(t, T_WEAVE0, T_REACH0 - 0.3, 0.9)

def arm_l_x(t): return armL[0](t) + sway(t, 0) + recoil(t, T_FIRE_L)
def arm_r_x(t): return armR[0](t) + sway(t, math.pi) + recoil(t, T_FIRE_R)
def arm_l_y(t): return armL[1](t) + 7 * win(t, T_WEAVE0, T_REACH0 - 0.3, 0.9) * -1
def arm_r_y(t): return armR[1](t) + 7 * win(t, T_WEAVE0, T_REACH0 - 0.3, 0.9)

# body
def ph(t): return 2 * math.pi * (t - T_WEAVE0) / PER
def env(t): return win(t, T_WEAVE0, T_WEAVE1, 0.9)
def hips_z(t):
    rise = pulse(t, [(T_LIFT0, 0), (T_LIFT1, H + 3), (T_LIFT1 + 0.6, H)])
    fall = pulse(t, [(T_DOWN0, 0), (T_DOWN1, H)])
    bob = 1.6 * math.sin(2 * math.pi * (t - T_LIFT1) / PER) * win(t, T_LIFT1, T_DOWN0 + 0.2, 0.9)
    return rise - fall + bob
def hips_x(t): return 8 * math.sin(ph(t)) * env(t) + 3 * math.sin(2 * math.pi * (t - T_DOWN0) / 3.8) * win(t, T_DOWN0, T_DOWN1 + 0.4, 0.6)
def hips_y(t): return 4 * math.sin(2 * ph(t)) * env(t)
def torso_z(t):
    tw = -9 * math.sin(ph(t)) * env(t)
    aim = 10 * win(t, 10.8, T_FIRE_L + 1.1, 0.4) - 12 * win(t, T_FIRE_R - 0.5, T_FIRE_R + 1.2, 0.4)
    return tw + aim
def torso_y(t): return 7 * math.cos(ph(t)) * env(t)
def torso_x(t):
    return 3 * math.sin(2 * ph(t)) * env(t) - 3 * (recoil(t, T_FIRE_L) + recoil(t, T_FIRE_R)) / 9.0 + 3 * win(t, T_DOWN1 - 0.3, T_DOWN1 + 0.5, 0.2)
def head_z(t):
    return 8 * math.sin(ph(t) + 1.0) * env(t) + 12 * win(t, 10.8, T_FIRE_L + 1.1, 0.4) - 12 * win(t, T_FIRE_R - 0.5, T_FIRE_R + 1.2, 0.4)
def head_x(t): return -3 * win(t, T_LIFT0, T_DOWN0, 0.8) + 3 * win(t, T_DOWN0, T_DOWN1, 0.4)
def leg_x(t, s):                           # legs trail the lift and swing a little with the weave
    return s * (6 * win(t, T_LIFT0 + 0.2, T_LIFT1 + 0.4, 0.5) + 4 * math.sin(ph(t) + 0.6) * env(t) + 3 * win(t, T_DOWN0, T_DOWN1 - 0.2, 0.5))

# studs: held = follow the hand; stowed = follow the hips; popped = flying in the world, anchored at the pop
def stud(part, hand, side, t_fire, d):
    stow = STUD_STOW[side]
    follows = [dict(to=hand), dict(to='hips', off=stow['off'], rot=stow['rot'])]
    path = [dict(t=t_fire, off=[0, 0, 0], rot=[0, 0, 0], scale=1.0),
            dict(t=t_fire + 0.25, off=[c * 0.55 for c in d], rot=[0, 0, 400], scale=1.0),
            dict(t=t_fire + 0.55, off=[c * 1.2 for c in d], rot=[0, 0, 900], scale=0.9),
            dict(t=t_fire + 0.85, off=[c * 1.8 for c in d], rot=[0, 0, 1400], scale=0.0001),
            dict(t=T_PUT, scale=0.0001), dict(t=T_PUT + 0.12, scale=1.0), dict(t=T, scale=1.0)]
    mix = [[0, 0, 0, 0, 1], [T_GRAB - 0.01, 0, 0, 0, 1], [T_GRAB + 0.01, 0, 0, 1, 0], [t_fire - 0.01, 0, 0, 1, 0], [t_fire + 0.01, 0, 1, 0, 0],
           [t_fire + 0.9, 0, 1, 0, 0], [t_fire + 0.95, 0, 0, 0, 1], [T, 0, 0, 0, 1]]
    return dict(part=part, follow=follows, keys=path, anchor=t_fire, anchor_follow=0, mix=mix)

def blaster(part, side):
    stow = STOW[side]
    return dict(part=part, follow=[dict(to='hips', off=stow['off'], rot=stow['rot'])], keys=[dict(t=0, scale=1)],
                mix=[[0, 0, 0, 1], [T_GRAB - 0.01, 0, 0, 1], [T_GRAB + 0.01, 1, 0, 0], [T_PUT - 0.01, 1, 0, 0], [T_PUT + 0.01, 0, 0, 1], [T, 0, 0, 1]])

plan = dict(
    duration=T, fps=24,
    description="Stands, lifts off as the jetpack turns on, floats bobbing and weaving, reaches behind the back for two blasters, fires them in separate directions (a red stud pops off each), puts them back, drifts down and lands. 20 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    keys={
        'hips': {'location_z': dense(hips_z, T), 'location_x': dense(hips_x, T, 2), 'location_y': dense(hips_y, T, 2)},
        'torso': {'rotation_z': dense(torso_z, T, 2), 'rotation_y': dense(torso_y, T, 2), 'rotation_x': dense(torso_x, T, 2)},
        'head': {'rotation_z': dense(head_z, T, 2), 'rotation_x': dense(head_x, T, 2)},
        'leg_l': {'rotation_x': dense(lambda t: leg_x(t, 1), T, 2)}, 'leg_r': {'rotation_x': dense(lambda t: leg_x(t, 1), T, 2)},
        'arm_l': {'rotation_x': dense(arm_l_x, T, 2), 'rotation_y': dense(arm_l_y, T, 2), 'rotation_z': dense(armL[2], T, 4)},
        'arm_r': {'rotation_x': dense(arm_r_x, T, 2), 'rotation_y': dense(arm_r_y, T, 2), 'rotation_z': dense(armR[2], T, 4)},
    },
    free=[blaster('acc_4349', 'R'), blaster('acc_4349_2', 'L'),
          stud('prop_4073', 'hand_r', 'R', T_FIRE_R, DIR_R), stud('prop_4073_2', 'hand_l', 'L', T_FIRE_L, DIR_L)],
)
print(json.dumps(plan))
