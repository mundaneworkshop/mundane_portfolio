"""Blender-side: makes the VR gamer's controller grips strict -> plans/vr-gamer-rage-quit-grips.json (the v9 motion with its arm poses refined while a hand holds).
Run inside Blender after exec()-ing ldr_to_blender.py (BASE, IO, clear, build_sigfig, apply_plan from the session's devfig.py):

    exec(open(BASE + 'plans/solve_vr.py').read())

The v9 plan (make_vr_gamer_plan.py) aims each arm's wrist at a point on the controller and rolls the hand 90 degrees about its pin; the controller itself, the body,
the head and every timing stay exactly as they are. Here the plan is applied once and each arm's pose is read back per frame (the arm's rotation keys and the hand's
twist, plus the arm's parent frame). While a hand is holding (the plan's own aim weight for its grip point), the limb (arm x, y, z + the hand's twist about its pin)
is re-solved so that the C clip's centre sits ON the handle's axis (the controller's wing bar, along prop-local y, through the grip point) and the clip's ring axis runs
along the bar, staying as close as it can to the v9 pose. The refined angles are blended in with the same aim weight, then written out as plain arm / hand keys
(the aim and hand_roll blocks are dropped: they were what put the wrist, not the clip, on the handle).
"""
import json, copy
from mathutils import Matrix, Vector, Euler, Quaternion

exec(open(BASE + 'ikgrip.py').read())
PLAN = json.load(open(BASE + 'plans/vr-gamer-rage-quit.json'))
T = PLAN['duration']
FPS = PLAN['fps']
N = int(round(T * FPS))
clear()
build_sigfig(IO % 'vr-gamer', 'vr-gamer')
apply_plan('vr-gamer', PLAN)
_c = bpy.data.collections['sigfig-vr-gamer']
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
prop = _R('acc_53118pb01')
arm = {'l': _R('arm_l'), 'r': _R('arm_r')}
hand = {'l': _R('hand_l'), 'r': _R('hand_r')}
limbs = {s: Limb('vr-gamer', s) for s in 'lr'}
GRIP = {'l': Vector(PLAN['targets']['grip_l']['p']), 'r': Vector(PLAN['targets']['grip_r']['p'])}
MAX_DEV, MAX_TW = 40.0, 70.0                                     # the largest change from v9's arm rotation / hand twist the grip may ask for
HANDLE_AXIS = Vector((0, 1, 0))                                   # the controller's wings run front to back (prop-local y)


def _weight(pts, t):
    pts = sorted(pts)
    if t <= pts[0][0]:
        return pts[0][1]
    for (a, wa), (b, wb) in zip(pts, pts[1:]):
        if t <= b:
            x = max(0.0, min(1.0, (t - a) / max(1e-6, b - a)))
            return wa + (wb - wa) * x * x * (3 - 2 * x)
    return pts[-1][1]


def hold_weight(s, t):
    """How much of the grip the plan has on this hand at t: the grip target's aim weight (it is 0 whenever another target, the face, the pocket, a fist, has the arm)."""
    ent = PLAN['aim']['arm_' + s]
    w = _weight(ent[0]['w'], t)
    for e in ent[1:]:
        w *= (1.0 - _weight(e['w'], t))
    return max(0.0, min(1.0, w))


rec = {s: {'F': [], 'arm': [], 'tw': [], 'hand_euler': []} for s in 'lr'}
prop_M = []
for f in range(N):
    bpy.context.scene.frame_set(f)
    bpy.context.view_layer.update()
    prop_M.append(prop.matrix_world.copy())
    for s in 'lr':
        a, h = arm[s], hand[s]
        rec[s]['F'].append((a.matrix_world @ a.matrix_basis.inverted()).copy())
        q0a = Euler(list(a['rest'])[3:6], 'XYZ').to_quaternion()
        qd = a.rotation_quaternion @ q0a.inverted()
        e = qd.to_euler('XYZ')
        rec[s]['arm'].append([math.degrees(v) for v in e])
        q0h = Euler(list(h['rest'])[3:6], 'XYZ').to_quaternion()
        qdh = h.rotation_quaternion @ q0h.inverted()
        he = qdh.to_euler('XYZ')
        rec[s]['hand_euler'].append([math.degrees(v) for v in he])
        loc_twist = q0h.inverted() @ qdh @ q0h                         # the same turn seen in the hand's own frame: about y if it is a pure twist
        rec[s]['tw'].append(math.degrees(2 * math.atan2(loc_twist.y, loc_twist.w)))

prev_arm = {s: list(rec[s]['arm'][0]) for s in 'lr'}
out_arm = {s: [None] * N for s in 'lr'}
out_hand = {s: [None] * N for s in 'lr'}
stats = {s: {'before_mm': [], 'after_mm': [], 'axis_before': [], 'axis_after': []} for s in 'lr'}
for s in 'lr':
    lb = limbs[s]
    u_prev = None
    for f in range(N):
        t = f / FPS
        w = hold_weight(s, t)
        lb.set_parent(rec[s]['F'][f])
        u0 = np.array(rec[s]['arm'][f] + [rec[s]['tw'][f]])
        p_t = prop_M[f] @ GRIP[s]
        a_t = (prop_M[f].to_3x3() @ HANDLE_AXIS).normalized()

        def miss(x):
            Mh = lb.hand_world(x)
            d = ((Mh @ HAND_RING) - p_t)
            # distance of the clip's centre from the bar's AXIS (the bar is long: sliding along it is fine) and the ring axis against the bar
            along = d.dot(a_t)
            perp = (d - a_t * along).length
            ang = math.degrees(math.acos(max(-1, min(1, abs((Mh.to_3x3() @ Vector((1, 0, 0))).normalized().dot(a_t))))))
            return perp, abs(along), ang
        pb, ab, gb = miss(u0)
        if w > 0.02:
            def resid(u):
                Mh = lb.hand_world(u)
                d = (Mh @ HAND_RING) - p_t
                along = d.dot(a_t)
                perp = d - a_t * along
                xa = (Mh.to_3x3() @ Vector((1, 0, 0))).normalized()
                c = xa.cross(a_t)
                r = [3 * 4.0 * perp.x / 0.01, 3 * 4.0 * perp.y / 0.01, 3 * 4.0 * perp.z / 0.01, 3 * 0.35 * along / 0.01, c.x * 6, c.y * 6, c.z * 6]
                r += list(0.0005 * (np.array(u) - u0) / 0.01)               # stay on the v9 pose unless the grip needs it
                if u_prev is not None:
                    r += list(0.0006 * (np.array(u) - u_prev) / 0.01)
                return np.array(r + [0.0] * (16 - len(r)))[:16]
            u1, _ = lm(resid, u0, restarts=1, spread=8.0)
            # blend in rotation space (Euler triples of two close rotations can sit far apart) and take the short way round on the hand's twist
            qa0 = Euler([math.radians(v) for v in u0[0:3]], 'XYZ').to_quaternion()
            qa1 = Euler([math.radians(v) for v in u1[0:3]], 'XYZ').to_quaternion()
            ang1 = math.degrees(qa0.rotation_difference(qa1).angle)
            ang1 = min(ang1, 360.0 - ang1)
            if ang1 > MAX_DEV:                                           # a hard frame (the pocket, the throw): the grip may not drag the arm further than this from the v9 pose
                qa1 = qa0.slerp(qa1, MAX_DEV / ang1)
            eb = qa0.slerp(qa1, w).to_euler('XYZ', Euler([math.radians(v) for v in prev_arm[s]], 'XYZ'))
            tw1 = u0[3] + max(-MAX_TW, min(MAX_TW, (u1[3] - u0[3] + 180.0) % 360.0 - 180.0))
            u = np.array([math.degrees(eb.x), math.degrees(eb.y), math.degrees(eb.z), u0[3] + w * (tw1 - u0[3])])
        else:
            u = u0.copy()
        prev_arm[s] = [float(v) for v in u[0:3]]
        u_prev = u
        pa, aa, ga = miss(u)
        stats[s]['before_mm'].append(pb * 1000 * (1 if w > 0.5 else 0)); stats[s]['after_mm'].append(pa * 1000 * (1 if w > 0.5 else 0))
        stats[s]['axis_before'].append(gb if w > 0.5 else 0); stats[s]['axis_after'].append(ga if w > 0.5 else 0)
        k6 = lb.keys6(u[0:4]) if False else None
        # arm keys: the solved Euler; hand keys: the twist about y written as the Euler of the hand's delta rotation
        Qd = lb.twist_q(u[3])
        he = Qd.to_euler('XYZ')
        out_arm[s][f] = [round(float(v), 3) for v in u[0:3]]
        out_hand[s][f] = [round(math.degrees(he.x), 3), round(math.degrees(he.y), 3), round(math.degrees(he.z), 3)]

new = copy.deepcopy(PLAN)
for blk in ('aim', 'targets', 'hand_roll', 'hand_grips', 'grips'):
    new.pop(blk, None)
for s in 'lr':
    new['keys']['arm_' + s] = {c: [[round(f / FPS, 5), out_arm[s][f][i]] for f in range(N)] for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))}
    new['keys']['hand_' + s] = {c: [[round(f / FPS, 5), out_hand[s][f][i]] for f in range(N)] for i, c in enumerate(('rotation_x', 'rotation_y', 'rotation_z'))}
new['pivots_local'] = {'hand_l': [0, -0.04, -0.005], 'hand_r': [0, -0.04, -0.005]}
new['description'] = PLAN['description'] + ' (grips: the clip sits on the handle bar)'
json.dump(new, open(BASE + 'plans/vr-gamer-rage-quit-grips.json', 'w'))
summ = {s: {'grip_frames': sum(1 for v in stats[s]['before_mm'] if v > 0),
            'before_mm_mean': round(sum(stats[s]['before_mm']) / max(1, sum(1 for v in stats[s]['before_mm'] if v > 0)), 1), 'before_mm_max': round(max(stats[s]['before_mm']), 1),
            'after_mm_mean': round(sum(stats[s]['after_mm']) / max(1, sum(1 for v in stats[s]['after_mm'] if v > 0)), 1), 'after_mm_max': round(max(stats[s]['after_mm']), 1),
            'axis_before_max': round(max(stats[s]['axis_before']), 1), 'axis_after_max': round(max(stats[s]['axis_after']), 1)} for s in 'lr'}
result = summ
