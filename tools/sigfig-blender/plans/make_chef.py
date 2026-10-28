"""Chef: stirs the egg in the pan with the spatula (twice), takes the spatula out, flips the pan and the egg does a full flip and lands flat in it. 10 s loop.
    (Blender)  exec(open(BASE + 'plans/solve_chef.py').read())      # spatula pose + right arm per frame -> chef-solve.json
    (Blender)  exec(open(BASE + 'plans/measure_chef.py').read())    # where the pan is at take-off and landing -> chef-solve.json (egg_land)
    python3 make_chef.py > chef.json
The pan stays as imported in the left hand, level, so only the left arm's flick is keyed. The spatula is a world-space free part (blade flat, hovering over the
egg) and the right arm / hand-twist keys are the solved ones (clip on the handle, arm clear of the torso). The egg rides the pan, flush on its floor."""
import json, math, os
from motionlib import *
from physlib import *

HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, 'chef-solve.json')))
T = 10.0
LEAN, HEAD = S['lean'], S['head_tilt']
N = int(T * 24)

# ---- the pan's flick (left arm, rotation about the shoulder) and the egg
T_FLICK0, T_LAUNCH, T_LAND = 6.7, 7.2, 8.05
def arm_l_x(t):
    return S['pan_level'] + pulse(t, [(T_FLICK0, 0), (7.0, 7), (T_LAUNCH, -22), (7.5, -5), (7.8, 3), (T_LAND, 0)])

# ---- spatula: absolute world pose per frame -> keys relative to its rest pose
sp0 = S['sp_rest_true']
q0 = mat3_to_q([r[:3] for r in sp0[:3]])
loc0 = [sp0[i][3] for i in range(3)]
sp_keys = []
for f in range(N + 1):
    i = f % N
    pos, q = S['sp_pos'][i], tuple(S['sp_q'][i])
    dq = qmul(q, qinv(q0))
    sp_keys.append(dict(t=f / 24.0, off=[round(pos[k] - loc0[k], 5) for k in range(3)], rot=[round(c, 3) for c in qeuler_xyz(dq)]))

# ---- egg: flush on the pan floor (pan local z = -0.06, the egg's bottom is its local z = -0.08), flips about its own centre at launch, lands back
EGG_REL = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0.0205], [0, 0, 0, 1]]
c_local = (0.0, 0.0, -0.04)                         # the egg's centre relative to its origin
land = S.get('egg_land', {'off': [0, 0, 0], 'q': [1, 0, 0, 0]})            # the pan's move from take-off to landing (world), measured
def egg_path(t):
    """off (world, relative to the take-off pose) and rotation Euler (world) while it is in the air."""
    u = (t - T_LAUNCH) / (T_LAND - T_LAUNCH)
    u = min(1.0, max(0.0, u))
    z = 0.42 * math.sin(math.pi * u) ** 0.9                                  # up and back down
    ang = 360.0 * (u - 0.0)                                                  # one full flip about the world x axis
    qf = qaxis((1, 0, 0), ang)
    e = sm(u)
    cw = qrot(tuple(S.get('egg_takeoff_q', [1, 0, 0, 0])), c_local)          # the centre, in world axes at take-off
    corr = [cw[k] - qrot(qf, cw)[k] for k in range(3)]                       # keep the flip about the centre, not the origin
    off = [land['off'][k] * e + corr[k] + (z if k == 2 else 0.0) for k in range(3)]
    q = qmul(qf, qslerp((1, 0, 0, 0), tuple(land['q']), e))
    return off, qeuler_xyz(q)
egg_keys = []
for f in range(int(T_LAUNCH * 24), int(T_LAND * 24) + 1):
    off, rot = egg_path(f / 24.0)
    egg_keys.append(dict(t=f / 24.0, off=[round(c, 5) for c in off], rot=[round(c, 3) for c in rot]))
egg_mix = [[0, 0, 0, 1], [T_LAUNCH - 0.01, 0, 0, 1], [T_LAUNCH + 0.01, 0, 1, 0], [T_LAND - 0.08, 0, 1, 0], [T_LAND + 0.02, 0, 0, 1], [T, 0, 0, 1]]

head_x = lambda t: HEAD + 1.0 * math.sin(2 * math.pi * t / T) - 8 * win(t, 6.9, 7.9, 0.2)          # looks at the pan, up to follow the egg

plan = dict(
    duration=T, fps=24,
    description="Chef stirs the egg in the pan twice with the spatula, takes it out, flicks the pan and the egg flips and lands flat in it. 10 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots_local={'hand_l': [0, -0.04, -0.005], 'hand_r': [0, -0.04, -0.005]},
    keys={
        'arm_l': {'rotation_x': dense(arm_l_x, T)},
        'arm_r': {c: [[round(f / 24.0, 5), S['arm_r'][f][i]] for f in range(N)] for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))},
        'hand_r': {c: [[round(f / 24.0, 5), S['arm_r'][f][3 + i]] for f in range(N)] for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))},
        'head': {'rotation_x': dense(head_x, T, 2)},
        'torso': {'rotation_x': dense(lambda t: LEAN, T, 12)},
    },
    free=[dict(part='acc_93082e', keys=sp_keys, mix=[[0, 0, 1]]),
          dict(part='prop_98138pb088', keys=egg_keys, anchor=T_LAUNCH, follow=[dict(to='acc_4528', rel=EGG_REL)], mix=egg_mix)],
)
print(json.dumps(plan))
