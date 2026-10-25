"""Slate crash-test dummy: runs in place holding the steering wheel, steers left and right until he hits an imaginary wall at 8 s and falls
apart (every piece flies, tumbles, bounces and settles), lies still for 3 s, then the pieces snap back in reverse order and he is running again. 15 s loop.
    python3 make_slate_dummy.py measure > slate-dummy-run.json     # the run only (no break) + slate-dummy-table.json, for measure_slate_dummy() in Blender
    python3 make_slate_dummy.py > slate-dummy.json                 # the full plan (needs slate-dummy-rest.json and slate-dummy-measure.json)
`bend` is switched off (the dummy's torso and head must fly as plain rigid pieces). The wheel is a free part posed first each frame (`pre`) so the aimed
arms track its rim while it steers. Every body piece is a `live` free part: it runs on its keyed / aimed motion, is launched from that pose at T_I and
blends back to it when it is called home."""
import json, math, os, sys
from motionlib import *
from physlib import *

HERE = os.path.dirname(os.path.abspath(__file__))
T = 15.0
FPS = 24
P = 0.75                                   # run cycle (20 per loop)
T_I = 8.0                                  # impact
T_HOME = 13.3                              # first piece called home (they have lain still for 3 s)
SNAP = 0.45                                # one piece's trip home
GAP = 0.12                                 # between pieces
HOME_ORDER = ['hips', 'leg_l', 'leg_r', 'torso', 'head', 'arm_l', 'arm_r', 'wheel']       # reverse of the order they came apart

REST = json.load(open(os.path.join(HERE, 'slate-dummy-rest.json')))
MEASURE_MODE = len(sys.argv) > 1 and sys.argv[1] == 'measure'
WHEEL = 'acc_30663'
N = REST['wheel_axis_world']

# pieces: members (Blender roles, the first is the free part; riders hang off it), launch velocity, tumble axis and final angle
PIECES = {
    'wheel': dict(members=[WHEEL], v=(0.55, 0.35, 2.3), axis=(1, 0, 0), theta=720 + 90),
    'arm_l': dict(members=['arm_l', 'hand_l'], v=(0.95, 0.5, 2.5), axis=(0.2, 1, 0), theta=720 + 90),
    'arm_r': dict(members=['arm_r', 'hand_r'], v=(-0.9, 0.6, 2.8), axis=(0.2, 1, 0), theta=-(360 + 90)),
    'head': dict(members=['head', 'acc_m64a4bc45_202587_011646'], v=(0.25, 0.7, 3.2), axis=(1, 0.4, 0), theta=1080 + 90),
    'torso': dict(members=['torso'], v=(-0.3, 0.8, 2.4), axis=(1, 0, 0), theta=-(360 + 90)),
    'leg_l': dict(members=['leg_l'], v=(0.7, 0.9, 2.2), axis=(0.1, 1, 0), theta=360 + 90),
    'leg_r': dict(members=['leg_r'], v=(-0.7, 0.8, 2.0), axis=(0.1, 1, 0), theta=-(720 + 90)),
    'hips': dict(members=['hips'], v=(0.0, 0.5, 1.7), axis=(1, 0, 0), theta=270),
}
FLY_ORDER = ['hips', 'torso', 'leg_l', 'leg_r', 'head', 'arm_l', 'arm_r']          # parents before children (the free pass keys them in this order)

# ---- the run
def ph(t): return 2 * math.pi * t / P
S = lambda t: math.sin(ph(t))
def steer(t):                              # degrees, wheel turn
    return pulse(t, [(0, 0), (0.9, 0), (1.8, 32), (3.0, -32), (4.2, 32), (5.4, -34), (6.5, 30), (7.1, -14), (7.6, 0)])
def brace(t): return 10 * win(t, 7.3, T_I, 0.35)
def torso_x(t): return 6 + 2.0 * math.sin(2 * ph(t)) + brace(t)
def torso_z(t): return -4 * S(t) + 0.14 * steer(t)
def torso_y(t): return -0.18 * steer(t)
def head_x(t): return 2.0 * math.sin(2 * ph(t) + 0.6) - 0.5 * brace(t)
def head_z(t): return -0.2 * steer(t)
def hips_z(t): return 2.6 * abs(S(t))
def leg_l_x(t): return -10 - 55 * S(t)
def leg_r_x(t): return -55 + 55 * S(t)                   # rest is a 45 degree stride back, so this is a swing of -65 .. +45 about the hip

keys = {
    'hips': {'location_z': dense(hips_z, T)},
    'torso': {'rotation_x': dense(torso_x, T, 2), 'rotation_z': dense(torso_z, T, 2), 'rotation_y': dense(torso_y, T, 2)},
    'head': {'rotation_x': dense(head_x, T, 2), 'rotation_z': dense(head_z, T, 2)},
    'leg_l': {'rotation_x': dense(leg_l_x, T)},
    'leg_r': {'rotation_x': dense(leg_r_x, T)},
}
targets = {'grip_l': dict(frame=WHEEL, mode='local', p=REST['grip_l_local']), 'grip_r': dict(frame=WHEEL, mode='local', p=REST['grip_r_local'])}
w_aim = [[0, 1], [T_I, 1], [T_I + 0.05, 0], [14.0, 0], [14.8, 1], [T, 1]]
aim = {'arm_l': [dict(target='grip_l', w=w_aim)], 'arm_r': [dict(target='grip_r', w=w_aim)]}

def wheel_run(t):                          # absolute pose of the wheel before the break: its rest pose turned about its own axis
    return qaxis(N, steer(t))

plan = dict(duration=T, fps=FPS, bend={'none': {'zone': 0.1, 'segments': 1}},
            description="Runs in place gripping the steering wheel, steers left and right until he hits an imaginary wall, falls apart, lies still for 3 s, the pieces snap back together and he runs again. 15 s loop.",
            pivots_local=REST['leg_pivot_local'], keys=keys, targets=targets, aim=aim)

if MEASURE_MODE:
    wf = list(range(0, int(T * FPS) + 1))
    plan['free'] = [dict(part=WHEEL, pre=True, mix=[[0, 0, 1]], keys=[dict(t=f / FPS, off=[0, 0, 0], rot=[round(c, 3) for c in qeuler_xyz(wheel_run(f / FPS))]) for f in wf])]
    json.dump({k: dict(members=v['members'], axis=list(v['axis']), theta=v['theta']) for k, v in PIECES.items()},
              open(os.path.join(HERE, 'slate-dummy-table.json'), 'w'), indent=1)
    print(json.dumps(plan))
    sys.exit(0)

M = json.load(open(os.path.join(HERE, 'slate-dummy-measure.json')))
home_t = {name: T_HOME + GAP * i for i, name in enumerate(HOME_ORDER)}

def flight(name):
    """Frames, origin offsets (world) and rotation Eulers (world, applied on top of the pose at T_I) for one piece, T_I .. when it is called home."""
    pc, m = PIECES[name], M[name]
    c, o = m['c'], m['o']
    rc0 = [c[i] - o[i] for i in range(3)]
    t_end = home_t[name]
    pos = fall(c, pc['v'], m['r_final'], T_I, t_end)
    f_rest = next((f for f in sorted(pos) if f > min(pos) and all(pos[g] == pos[f] for g in range(f, max(pos) + 1))), max(pos))
    D = max(0.4, f_rest / FPS - T_I)
    frames, offs, rots = [], [], []
    for f in sorted(pos):
        t = f / FPS
        u = min(1.0, max(0.0, (t - T_I) / D))
        ang = pc['theta'] * (1 - (1 - u) ** 2.4)
        q = qaxis(pc['axis'], ang)
        r = qrot(q, rc0)
        org = [pos[f][i] - r[i] for i in range(3)]
        frames.append(f); offs.append([org[i] - o[i] for i in range(3)]); rots.append(qeuler_xyz(q))
    return dict(frames=frames, off=offs, rot=rots)

free = []
# the wheel: posed first (pre); steering before the break, flight, then back to its own rest pose
fl = flight('wheel')
wf = list(range(0, int(T * FPS) + 1))
fw = {f: i for i, f in enumerate(fl['frames'])}
w_keys = []
settle_p, settle_q = fl['off'][-1], qaxis(PIECES['wheel']['axis'], PIECES['wheel']['theta'])
t0w = home_t['wheel']
for f in wf:
    t = f / FPS
    if t < T_I:
        off, q = [0, 0, 0], wheel_run(t)
    elif f in fw and t < t0w:
        i = fw[f]; off = fl['off'][i]
        q = qaxis(PIECES['wheel']['axis'], PIECES['wheel']['theta'] * (1 - (1 - min(1.0, (t - T_I) / max(0.4, fl['frames'][-1] / FPS - T_I))) ** 2.4))
    else:
        u = ramp(t, t0w, t0w + SNAP)
        off = [settle_p[i] * (1 - u) for i in range(3)]
        q = qslerp(settle_q, wheel_run(t), u)
    w_keys.append(dict(t=f / FPS, off=[round(c, 5) for c in off], rot=[round(c, 3) for c in qeuler_xyz(q)]))
free.append(dict(part=WHEEL, pre=True, mix=[[0, 0, 1]], keys=w_keys))

for name in FLY_ORDER:
    pc = PIECES[name]
    fl = flight(name)
    keys_ = [dict(t=f / FPS, off=[round(c, 5) for c in o], rot=[round(c, 3) for c in r]) for f, o, r in zip(fl['frames'], fl['off'], fl['rot'])]
    mix = [[0, 1, 0], [T_I - 0.001, 1, 0], [T_I, 0, 1], [home_t[name], 0, 1], [home_t[name] + SNAP, 1, 0], [T, 1, 0]]
    free.append(dict(part=pc['members'][0], live=True, anchor=T_I, anchor_follow=-1, keys=keys_, mix=mix))
plan['free'] = free
print(json.dumps(plan))
