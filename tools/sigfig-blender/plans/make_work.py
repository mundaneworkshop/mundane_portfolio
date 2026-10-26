"""Work: he leans in over the floating laptop (laptop dips with each keystroke), types with one hand while the other holds the mug by its handle and
sips; midway the mug is turned a half turn in mid air and taken by the other hand (the handle is in the clip both times), and it goes back before the
loop closes. A foot taps slowly throughout. 10 s loop.
    (Blender)  exec(open(BASE + 'plans/solve_work.py').read())     # arm + hand angles for every pose, the mug-in-hand relations -> work-solve.json
    python3 make_work.py > work.json
Arm keys are solved poses (ikgrip.Limb: the clip's far edge on a key, the mug handle in the clip, the near rim edge on the lips) blended with smoothstep
between them; the torso and head are held at the lean the poses were solved in."""
import json, math, os
from motionlib import *
from physlib import *

HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, 'work-solve.json')))
T = 10.0
LEAN, HEAD = S['lean'], S['head_tilt']
ID = [0.0] * 6

# ---- when things happen
T_SIP_L = (0.8, 1.5, 2.2, 2.9)            # start rising, at the lips, leaving the lips, back at rest
T_SWAP_A = (3.6, 4.1)                     # the mug turns (left hand lets go, right takes the handle)
T_SIP_R = (4.8, 5.5, 6.2, 6.9)
T_SWAP_B = (7.5, 8.0)                     # and back

def track(pts):
    """[(t, keys6)] -> t -> six values. Arm and hand rotations are blended as quaternions (a pose's Euler triple can sit far from its neighbour's while
    the rotation is close), smoothstep between waypoints, held at them."""
    pts = sorted(pts, key=lambda p: p[0])
    qs = [(t, euler_xyz_to_q(*p[0:3]), euler_xyz_to_q(*p[3:6])) for t, p in pts]
    def f(t):
        if t <= qs[0][0]:
            qa, qh = qs[0][1], qs[0][2]
        elif t >= qs[-1][0]:
            qa, qh = qs[-1][1], qs[-1][2]
        else:
            i = max(k for k in range(len(qs) - 1) if qs[k][0] <= t)
            u = sm((t - qs[i][0]) / (qs[i + 1][0] - qs[i][0]))
            qa, qh = qslerp(qs[i][1], qs[i + 1][1], u), qslerp(qs[i][2], qs[i + 1][2], u)
        return qeuler_xyz(qa) + qeuler_xyz(qh)
    cache = {}
    def comp(i):
        return lambda t: cache.setdefault(round(t, 6), f(t))[i]
    return [comp(i) for i in range(6)]

arm_l = track([(0, ID), (T_SIP_L[0], ID), (T_SIP_L[1], S['sip_l']['x']), (T_SIP_L[2], S['sip_l']['x']), (T_SIP_L[3], ID), (3.1, ID), (T_SWAP_A[0], S['swap_l']),
               (4.4, S['type_l']), (6.7, S['type_l']), (T_SWAP_B[0], S['swap_l']), (T_SWAP_B[1], S['swap_l']), (8.8, ID), (T, ID)])
arm_r = track([(0, S['type_r']), (2.9, S['type_r']), (T_SWAP_A[1], S['swap_r']), (T_SIP_R[0], S['hold_r']), (T_SIP_R[1], S['sip_r']), (T_SIP_R[2], S['sip_r']),
               (T_SIP_R[3], S['hold_r']), (T_SWAP_B[0], S['swap_r']), (8.5, S['type_r']), (T, S['type_r'])])

# ---- typing
KS = [0.15 + 0.23 * k + 0.045 * math.sin(k * 1.9) for k in range(int(T / 0.23))]
AMP = [0.55 + 0.45 * abs(math.sin(k * 2.3 + 0.7)) for k in range(len(KS))]
def stroke(t):
    s = 0.0
    for tk, a in zip(KS, AMP):
        d = t - tk
        if 0 <= d <= 0.14:
            s += a * math.sin(math.pi * d / 0.14) ** 2
    return min(1.0, s)
r_typing = lambda t: win(t, 0.2, 2.8, 0.3) + win(t, 8.8, 9.95, 0.1)
l_typing = lambda t: win(t, 4.6, 6.7, 0.3)
typing_now = lambda t: min(1.0, r_typing(t) + l_typing(t))
tap_r = lambda t: -9 * stroke(t) * min(1, r_typing(t))
tap_l = lambda t: -9 * stroke(t + 0.07) * min(1, l_typing(t))

def chan(tr, i, extra=None):
    return dense((lambda t: tr[i](t) + (extra(t) if extra else 0.0)), T)

def laptop_dz(t): return 0.010 * math.sin(2 * math.pi * t / 3.3) - 0.014 * stroke(t) * typing_now(t)
def laptop_rx(t): return 0.6 * math.sin(2 * math.pi * t / 3.3 + 1.0) - 1.6 * stroke(t) * typing_now(t)
laptop_keys = [dict(t=i / 24.0, off=[0, 0, laptop_dz(i / 24.0)], rot=[laptop_rx(i / 24.0), 0, 0]) for i in range(int(T * 24))]

def tap(t): return -8 * (math.sin(math.pi * ((t * 1.0) % 1.0)) ** 2)        # slow foot tap, about 1 per second

# ---- the mug: in the left hand (rig), turned in the air (world), in the right hand (follow, explicit grip), turned back, left again
cup0 = S['cup_rest_true']
q0 = mat3_to_q([r[:3] for r in cup0[:3]])
loc0 = [cup0[i][3] for i in range(3)]
PA, PB = S['P_swap_a'], S['P_swap_b']
qa, qb = mat3_to_q([r[:3] for r in PA[:3]]), mat3_to_q([r[:3] for r in PB[:3]])
Oa, Ob = [PA[i][3] for i in range(3)], [PB[i][3] for i in range(3)]
qz_half = qaxis((0, 0, 1), -180.0)
Dq = qmul(qinv(qmul(qa, qz_half)), qb)                # what is left after a half turn about the mug's own axis: the mirrored tilt

def swing(u):
    """Mug pose u in 0..1 of the way from the left hand's hold to the right hand's: a half turn about its own axis (the handle swings round the front),
    the tilt mirroring on the way."""
    q = qmul(qmul(qa, qaxis((0, 0, 1), -180.0 * u)), qslerp((1, 0, 0, 0), Dq, u))
    e = sm(u)
    return [Oa[i] + (Ob[i] - Oa[i]) * e for i in range(3)], q

def cup_pose(t):
    if t < T_SWAP_A[0]:
        u = 0.0
    elif t < T_SWAP_A[1]:
        u = ramp(t, *T_SWAP_A)
    elif t < T_SWAP_B[0]:
        u = 1.0
    elif t < T_SWAP_B[1]:
        u = 1.0 - ramp(t, *T_SWAP_B)                    # and the same way back
    else:
        u = 0.0
    pos, q = swing(u)
    dq = qmul(q, qinv(q0))
    return [pos[i] - loc0[i] for i in range(3)], qeuler_xyz(dq)
cup_keys = []
for f in range(int(T * 24) + 1):
    off, rot = cup_pose(f / 24.0)
    cup_keys.append(dict(t=f / 24.0, off=[round(c, 5) for c in off], rot=[round(c, 3) for c in rot]))
cup_mix = [[0, 1, 0, 0], [T_SWAP_A[0] - 0.02, 1, 0, 0], [T_SWAP_A[0], 0, 1, 0], [T_SWAP_A[1] - 0.02, 0, 1, 0], [T_SWAP_A[1], 0, 0, 1],
           [T_SWAP_B[0] - 0.02, 0, 0, 1], [T_SWAP_B[0], 0, 1, 0], [T_SWAP_B[1] - 0.02, 0, 1, 0], [T_SWAP_B[1], 1, 0, 0], [T, 1, 0, 0]]

plan = dict(
    duration=T, fps=24,
    description="He leans in over the floating laptop, types with one hand and sips from the mug with the other, turns the mug in mid air and passes it to the other hand (handle in the clip each time) and back; one foot taps slowly; the laptop dips with the typing. 10 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots_local={'hand_r': [0, -0.04, -0.005], 'hand_l': [0, -0.04, -0.005]},
    keys={
        'arm_l': {c: chan(arm_l, i) for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))},
        'arm_r': {c: chan(arm_r, i) for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))},
        'hand_l': {'rotation_x': chan(arm_l, 3, tap_l), 'rotation_y': chan(arm_l, 4), 'rotation_z': chan(arm_l, 5)},
        'hand_r': {'rotation_x': chan(arm_r, 3, tap_r), 'rotation_y': chan(arm_r, 4), 'rotation_z': chan(arm_r, 5)},
        'leg_l': {'rotation_x': dense(tap, T)},
        'head': {'rotation_x': dense(lambda t: HEAD + 1.2 * math.sin(2 * math.pi * t / T * 2), T, 2)},
        'torso': {'rotation_x': dense(lambda t: LEAN + 0.8 * math.sin(2 * math.pi * t / T * 3), T, 2)},
    },
    free=[
        dict(part='prop_62698', keys=laptop_keys, mix=[[0, 0, 1]]),                                  # the laptop: world, bobbing, dipping with each stroke
        dict(part='acc_68495pb03', keys=cup_keys, follow=[dict(to='hand_r', rel=S['CR'])], mix=cup_mix),
    ],
)
print(json.dumps(plan))
