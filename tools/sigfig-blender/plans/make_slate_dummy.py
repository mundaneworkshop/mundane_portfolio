"""Slate crash-test dummy: runs in place holding the steering wheel, steers left and right and looks around, honks the horn twice with his right hand, throws both arms
up and shakes his hands in shock as the wall comes, hits it at 11 s and falls apart (the cap pops off, every piece flies, tumbles, bounces and settles), lies still for
about 3 s, then the pieces snap back in reverse order and he is running again. 20 s loop (the timeline is in dummy_run.py).
    (Blender)  exec(open(BASE + 'plans/solve_dummy.py').read())               # joints + the two arms holding the wheel -> slate-dummy-solve.json
    python3 make_slate_dummy.py measure > slate-dummy-run.json              # the run only (no break) + slate-dummy-table.json
    (Blender)  exec(open(BASE + 'plans/measure_dummy.py').read())            # every piece's centre / origin / resting height at the wall -> slate-dummy-measure.json
    python3 make_slate_dummy.py > slate-dummy.json                          # the full plan
The dummy's arms and legs are custom parts whose origins are not their joints: pivots_local carries the hip pin line and the shoulders (from solve_dummy.py).
`bend` is switched off (the torso and head must fly as plain rigid pieces). The wheel rides in the hands (carried with the torso, turned about its own axis);
every body piece is a `live` free part: it runs on its keyed motion, is launched from that pose at T_I and blends back to it when it is called home."""
import json, math, os, sys
from motionlib import *
from physlib import *
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dummy_run.py')).read())

HERE = os.path.dirname(os.path.abspath(__file__))
SNAP = 0.45                                # one piece's trip home
GAP = 0.12                                 # between pieces
HOME_ORDER = ['hips', 'leg_l', 'leg_r', 'torso', 'head', 'cap', 'arm_l', 'arm_r', 'wheel']       # reverse of the order they came apart (the wheel falls off first)

SOL = json.load(open(os.path.join(HERE, 'slate-dummy-solve.json')))
MEASURE_MODE = len(sys.argv) > 1 and sys.argv[1] == 'measure'
WHEEL, CAP = 'acc_30663', 'acc_m64a4bc45_202587_011646'
N = int(T * FPS)

# pieces: members (Blender roles, the first is the free part; riders hang off it), launch velocity, tumble axis and final angle
PIECES = {
    'wheel': dict(members=[WHEEL], v=(0.55, 0.35, 2.3), axis=(1, 0, 0), theta=720 + 90),
    'arm_l': dict(members=['arm_l', 'hand_l'], v=(0.95, 0.5, 2.5), axis=(0.2, 1, 0), theta=720 + 90),
    'arm_r': dict(members=['arm_r', 'hand_r'], v=(-0.9, 0.6, 2.8), axis=(0.2, 1, 0), theta=-(360 + 90)),
    'head': dict(members=['head'], v=(0.15, 0.5, 2.6), axis=(1, 0.4, 0), theta=1080 + 90),
    'cap': dict(members=[CAP], v=(-0.35, 1.0, 4.2), axis=(0.6, 0.8, 0), theta=1440 + 180),                    # pops straight off the head and tumbles away
    'torso': dict(members=['torso'], v=(-0.3, 0.8, 2.4), axis=(1, 0, 0), theta=-(360 + 90)),
    'leg_l': dict(members=['leg_l'], v=(0.7, 0.9, 2.2), axis=(0.1, 1, 0), theta=360 + 90),
    'leg_r': dict(members=['leg_r'], v=(-0.7, 0.8, 2.0), axis=(0.1, 1, 0), theta=-(720 + 90)),
    'hips': dict(members=['hips'], v=(0.0, 0.5, 1.7), axis=(1, 0, 0), theta=270),
}
FLY_ORDER = ['hips', 'torso', 'leg_l', 'leg_r', 'head', 'cap', 'arm_l', 'arm_r']          # parents before children (the free pass keys them in this order)

keys = body_keys()
for s in 'lr':
    keys['arm_' + s] = {c: [[round(f / FPS, 5), SOL['arm_keys'][s][f][i]] for f in range(N)] for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))}
    keys['hand_' + s] = {c: [[round(f / FPS, 5), SOL['arm_keys'][s][f][3 + i]] for f in range(N)] for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))}

plan = dict(duration=T, fps=FPS, bend={'none': {'zone': 0.1, 'segments': 1}},
            description="Runs in place gripping the steering wheel, steers left and right and looks around, honks the horn twice, throws both arms up and shakes his hands in shock, hits an imaginary wall and falls apart (the cap pops off), lies still for 3 s, the pieces snap back together and he runs again. 20 s loop.",
            pivots_local=SOL['pivots_local'], keys=keys)

# ---- the wheel: it rides in the hands; its rest pose in the import is off to the left, SOL['wheel_pos'/'wheel_q'] are its absolute poses per frame
w0 = SOL['wheel_rest_true']
wq0 = mat3_to_q([r[:3] for r in w0[:3]])
wloc0 = [w0[i][3] for i in range(3)]
def wheel_home(f):
    """(off, quaternion) of the wheel held in the hands at frame f, as world-space keys relative to its import pose."""
    i = f % N
    return [SOL['wheel_pos'][i][k] - wloc0[k] for k in range(3)], tuple(SOL['wheel_q'][i])

if MEASURE_MODE:
    wk = []
    for f in range(N + 1):
        off, q = wheel_home(f)
        wk.append(dict(t=f / FPS, off=[round(c, 5) for c in off], rot=[round(c, 3) for c in qeuler_xyz(qmul(q, qinv(wq0)))]))
    plan['free'] = [dict(part=WHEEL, pre=True, mix=[[0, 0, 1]], keys=wk)]
    json.dump({k: dict(members=v['members'], axis=list(v['axis']), theta=v['theta']) for k, v in PIECES.items()}, open(os.path.join(HERE, 'slate-dummy-table.json'), 'w'), indent=1)
    print(json.dumps(plan))
    sys.exit(0)

M = json.load(open(os.path.join(HERE, 'slate-dummy-measure.json')))
home_t = {name: T_HOME + GAP * i for i, name in enumerate(HOME_ORDER)}

def flight(name):
    """Frames, origin offsets (world) and rotation Eulers (world, on top of the pose at T_I) for one piece, T_I .. when it is called home; and the frame it comes to rest."""
    pc, m = PIECES[name], M[name]
    c, o = m['c'], m['o']
    rc0 = [c[i] - o[i] for i in range(3)]
    pos = fall(c, pc['v'], m['r_final'], T_I, home_t[name])
    f_rest = next((f for f in sorted(pos) if f > min(pos) and all(pos[g] == pos[f] for g in range(f, max(pos) + 1))), max(pos))
    D = max(0.4, f_rest / FPS - T_I)
    frames, offs, rots = [], [], []
    for f in sorted(pos):
        u = min(1.0, max(0.0, (f / FPS - T_I) / D))
        q = qaxis(pc['axis'], pc['theta'] * (1 - (1 - u) ** 2.4))
        r = qrot(q, rc0)
        frames.append(f); offs.append([pos[f][i] - r[i] - o[i] for i in range(3)]); rots.append(qeuler_xyz(q))
    return dict(frames=frames, off=offs, rot=rots, f_rest=f_rest)

free = []
# the wheel falls off the hands first, comes to rest flat on the ground (its tumble ends when it stops), and is the last piece to come home: it flies back into the
# hands, which are already waiting at its grip points
fl = flight('wheel')
fw = {f: i for i, f in enumerate(fl['frames'])}
t0w = home_t['wheel']
Dw = max(0.4, fl['f_rest'] / FPS - T_I)
w_keys = []
fT = int(round(T_I * FPS))
hoff_T, hq_T = wheel_home(fT)                           # the wheel's pose in the hands at the wall: where its flight starts from
settle_off = [hoff_T[k] + fl['off'][-1][k] for k in range(3)]
settle_q = qmul(qaxis(PIECES['wheel']['axis'], PIECES['wheel']['theta']), hq_T)
for f in range(N + 1):
    t = f / FPS
    hoff, hq = wheel_home(f)
    if t < T_I:
        off, q = hoff, hq
    elif t < t0w:
        i = fw.get(f, len(fl['off']) - 1)
        off = [hoff_T[k] + fl['off'][i][k] for k in range(3)]
        q = qmul(qaxis(PIECES['wheel']['axis'], PIECES['wheel']['theta'] * (1 - (1 - min(1.0, (t - T_I) / Dw)) ** 2.4)), hq_T)
    else:
        u = ramp(t, t0w, t0w + SNAP)
        off = [settle_off[k] * (1 - u) + hoff[k] * u for k in range(3)]
        q = qslerp(settle_q, hq, u)
    w_keys.append(dict(t=f / FPS, off=[round(c, 5) for c in off], rot=[round(c, 3) for c in qeuler_xyz(qmul(q, qinv(wq0)))]))
free.append(dict(part=WHEEL, pre=True, mix=[[0, 0, 1]], keys=w_keys))

for name in FLY_ORDER:
    pc = PIECES[name]
    fl = flight(name)
    keys_ = [dict(t=f / FPS, off=[round(c, 5) for c in o], rot=[round(c, 3) for c in r]) for f, o, r in zip(fl['frames'], fl['off'], fl['rot'])]
    mix = [[0, 1, 0], [T_I - 0.001, 1, 0], [T_I, 0, 1], [home_t[name], 0, 1], [home_t[name] + SNAP, 1, 0], [T, 1, 0]]
    free.append(dict(part=pc['members'][0], live=True, anchor=T_I, anchor_follow=-1, keys=keys_, mix=mix))
plan['free'] = free
print(json.dumps(plan))
