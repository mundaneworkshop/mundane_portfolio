"""Blender-side step for make_slate_dummy.py: the joints, and the two arms that hold the steering wheel, solved per frame -> plans/slate-dummy-solve.json.
Run inside Blender after exec()-ing ldr_to_blender.py (BASE, IO, clear, build_sigfig, apply_plan from the session's devfig.py):

    exec(open(BASE + 'plans/solve_dummy.py').read())

The dummy's legs and arms are custom parts whose origins are NOT at the joints, so every turn needs its pivot:
  hips joint  = the figure's hip pin line: x axis through (hips y, hips z - 0.117)   (a standard leg's pin sits 0.087 under its top, the legs' tops are at hips z - 0.03)
  shoulders   = hips + (+-0.156, 0, 0.231)                                           (the standard shoulder sockets; the arm meshes touch them to 1 mm)
Both go into the plan's pivots_local (part-local coordinates). The arms then hold the rim of the wheel at the two imported grip points while it steers: for each
frame the torso's pose is read from the running body, the wheel is turned about its own axis, and each limb (arm x, y, z + the hand's twist about its pin)
is solved so the clip's centre sits on the rim point and its ring axis (the clip's hole, hand-local z) follows the rim. Solved over the loop until it closes.
Two things change the plain grip: while the right hand honks (dummy_run.hub_w) its target moves from the rim to the wheel's hub and pushes in with each press, with the
axis left free; and from the moment the arms are thrown up (dummy_run.up_w) the solved pose is blended into the thrown-up, trembling pose (dummy_run.up_dir),
re-solved for the clip's centre on that direction, with the hands shaking about their pins. Frames after the impact go back to the grip, so the pieces have a pose to come home to.
"""
import json
from mathutils import Matrix, Vector

exec(open(BASE + 'ikgrip.py').read())
exec(open(BASE + 'plans/motionlib.py').read())
exec(open(BASE + 'plans/dummy_run.py').read())

clear()
build_sigfig(IO % 'slate-dummy', 'slate-dummy')
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-slate-dummy']
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
hips = _R('hips').matrix_world.translation.copy()
HIP_PIVOT = Vector((hips.x, hips.y, hips.z - 0.117))
SHOULDER = {'l': Vector((hips.x + 0.156, hips.y, hips.z + 0.231)), 'r': Vector((hips.x - 0.156, hips.y, hips.z + 0.231))}
pl = {}
for role, w in (('leg_l', HIP_PIVOT), ('leg_r', HIP_PIVOT), ('arm_l', SHOULDER['l']), ('arm_r', SHOULDER['r'])):
    pl[role] = [round(v, 5) for v in (_R(role).matrix_world.inverted() @ w)]
pl['hand_l'] = pl['hand_r'] = [0, -0.04, -0.005]
_hd = _R('head')
_hv = [_hd.matrix_world @ v.co for v in _hd.data.vertices]
_hz = min(v.z for v in _hv)
_neck = Vector((sum(v.x for v in _hv) / len(_hv), sum(v.y for v in _hv) / len(_hv), _hz))       # the bottom of the head, where it sits on the torso's neck stud
pl['head'] = [round(v, 5) for v in (_hd.matrix_world.inverted() @ _neck)]
WHEEL_IMPORT = _R('acc_30663').matrix_world.copy()
TM0_REST = _R('torso').matrix_world.copy()
SHIFT = Vector((hips.x - WHEEL_IMPORT.translation.x, 0, 0))             # the import holds the wheel a little to the left of the figure; centre it so both hands reach it alike
WHEEL0 = Matrix.Translation(SHIFT) @ WHEEL_IMPORT
W_CENTER = WHEEL0.translation.copy()
W_AXIS = Vector((-0.0052, 0.9866, 0.1631)).normalized()           # the wheel's normal (smallest extent of its mesh), world, at rest
rest = {'hips': list(hips), 'hip_pivot': list(HIP_PIVOT), 'shoulder': {k: list(v) for k, v in SHOULDER.items()}, 'pivots_local': pl, 'wheel_center': list(W_CENTER),
        'wheel_axis': list(W_AXIS), 'wheel_shift': list(SHIFT)}
# the grips: the left hand as imported (carried along with the wheel), the right one its mirror image about the figure's centre plane
hnd = _R('hand_l').matrix_world
ring_l = Matrix.Translation(SHIFT) @ (hnd @ HAND_RING)
axis_l = (hnd.to_3x3() @ HAND_AXIS).normalized()                       # the imported hand holds the rim through the clip's hole
mir = lambda v: Vector((2 * hips.x - v.x, v.y, v.z))
ring_r = mir(ring_l)
axis_r = Vector((-axis_l.x, axis_l.y, axis_l.z)).normalized()
grip = {'l': {'p': WHEEL0.inverted() @ ring_l, 'a': (WHEEL0.to_3x3().inverted() @ axis_l).normalized()},
        'r': {'p': WHEEL0.inverted() @ ring_r, 'a': (WHEEL0.to_3x3().inverted() @ axis_r).normalized()}}
rest['grip'] = {s: {'p': list(g['p']), 'a': list(g['a'])} for s, g in grip.items()}
_wv = [SHIFT + WHEEL_IMPORT @ v.co for v in _R('acc_30663').data.vertices]
_cen = sum(_wv, Vector()) / len(_wv)                                      # the wheel's middle (its object origin sits 4 cm behind it)
_hub_far = max((v - _cen).dot(W_AXIS) for v in _wv if ((v - _cen) - W_AXIS * (v - _cen).dot(W_AXIS)).length < 0.05)
HUB_L = WHEEL0.inverted() @ (_cen + W_AXIS * _hub_far)                    # the hub's end face (the side that faces him), wheel-local
HUB_N = (WHEEL0.to_3x3().inverted() @ W_AXIS).normalized()                # the wheel's normal; its +y side faces him
if (WHEEL0 @ HUB_L).y < hips.y:                                          # make HUB_N point at the driver
    pass
rest['hub'] = {'p': list(HUB_L), 'n': list(HUB_N), 'face_world': [round(v, 3) for v in (WHEEL0 @ HUB_L)], 'hub_far': round(_hub_far, 3)}

# ---- the running body (no arm keys), to read the torso's pose each frame
plan0 = dict(duration=T, fps=FPS, bend={'none': {'zone': 0.1, 'segments': 1}}, pivots_local={k: v for k, v in pl.items() if k.startswith('leg')}, keys=body_keys())
build_sigfig(IO % 'slate-dummy', 'slate-dummy')
apply_plan('slate-dummy', plan0)
_c = bpy.data.collections['sigfig-slate-dummy']                      # build_sigfig replaced the collection
N = int(T * FPS)
arms = {s: _R('arm_' + s) for s in 'lr'}
limbs = {s: Limb('slate-dummy', s, shoulder=SHOULDER[s]) for s in 'lr'}
Fs = {s: [] for s in 'lr'}
_torso = _R('torso')
TM = []
for f in range(N):
    bpy.context.scene.frame_set(f)
    bpy.context.view_layer.update()
    TM.append(_torso.matrix_world.copy())
    for s in 'lr':
        Fs[s].append((arms[s].matrix_world @ arms[s].matrix_basis.inverted()).copy())
TM0 = TM0_REST


def wheel_at(f):
    """The wheel rides in the hands: its rest pose turned about its own axis by the steering, carried along with the torso's motion."""
    t = f / FPS
    a = steer(t) if t < T_I else 0.0
    W = Matrix.Translation(W_CENTER) @ Matrix.Rotation(math.radians(a), 4, W_AXIS) @ Matrix.Translation(-W_CENTER) @ WHEEL0
    return TM[f % N] @ TM0.inverted() @ W


def solve_frame(s, f, u0, attract=None):
    lb = limbs[s]
    lb.set_parent(Fs[s][f])
    W = wheel_at(f)
    p_t = W @ grip[s]['p']
    a_t = (W.to_3x3() @ grip[s]['a']).normalized()
    axw = 1.0
    h = hub_w(f / FPS) if s == 'r' else 0.0
    pt_l = HAND_RING
    if h > 1e-4:                                                      # honking: over the hub, pushed in a little on each press, the clip's axis free
        n_w = (W.to_3x3() @ HUB_N).normalized()
        # the horn: the hub's end face at its edge nearest his shoulder. The arm is one stiff piece, so its clip moves on a sphere about the shoulder:
        # wound up, it is 42 degrees up that sphere above the hub; it smashes down onto it (press 1) and goes back up
        hit = W @ HUB_L + Vector((-0.06, 0, 0))
        sh_w = lb.arm_world([0, 0, 0, 0]) @ lb.apl
        dv = hit - sh_w
        ax = dv.cross(Vector((0, 0, 1))).normalized()
        sgn = 1.0 if (Matrix.Rotation(math.radians(42.0), 3, ax) @ dv).z > dv.z else -1.0
        hub = sh_w + Matrix.Rotation(math.radians(sgn * 42.0 * (1.0 - press(f / FPS))), 3, ax) @ dv
        p_t = p_t.lerp(hub, h)
        axw = 1.0 - h
    def resid(u):
        Mh = lb.hand_world(u[0:4])
        d = (Mh @ pt_l) - p_t
        xa = (Mh.to_3x3() @ HAND_AXIS).normalized()
        c = xa.cross(a_t)
        r = [3 * 3.0 * d.x / 0.01, 3 * 3.0 * d.y / 0.01, 3 * 3.0 * d.z / 0.01, c.x * 6 * axw, c.y * 6 * axw, c.z * 6 * axw]
        r += list(0.0003 * (np.array(u[0:4])) / 0.01 * 0.2)
        if u0 is not None:                                          # smooth from frame to frame, more so while the horn frees the clip's axis
            r += list((0.0004 + 0.004 * h) * (np.array(u[0:4]) - u0[0:4]) / 0.01)
        if attract is not None:
            r += list(0.004 * attract[1] * (np.array(u[0:4]) - np.array(attract[0])) / 0.01)
        return np.array(r + [0.0] * (28 - len(r)))[:28]
    cands = [lm(resid, np.zeros(4), restarts=2, spread=25.0)]
    if u0 is not None:
        cands.append(lm(resid, u0, restarts=1, spread=15.0))
    u, cst = min(cands, key=lambda c: c[1])
    Mh = lb.hand_world(u[0:4])
    ring = ((Mh @ pt_l) - p_t).length
    ax = math.degrees(math.acos(max(-1, min(1, abs((Mh.to_3x3() @ HAND_AXIS).normalized().dot(a_t))))))
    return u, ring, ax


PASSES = 3
keys6 = {s: [None] * N for s in 'lr'}
U = {s: [None] * N for s in 'lr'}
stats = {}
for s in 'lr':
    u_prev = None
    for pas in range(1, PASSES + 1):
        rings, axes = [], []
        for f in range(N):
            # coming off the horn the arm is drawn, over half a second, back to the pose the loop starts in (the wheel is straight in both), not left on
            # whatever branch the smashes put it on, so the loop closes without a snap
            pull = ramp(f / FPS, 7.6, 8.1) * (1 - ramp(f / FPS, 8.4, 8.6)) if (s == 'r' and U[s][0] is not None) else 0.0
            u, ring, ax = solve_frame(s, f, u_prev, (U[s][0], pull) if pull > 1e-4 else None)
            u_prev = u
            keys6[s][f] = [round(v, 3) for v in limbs[s].keys6(u[0:4])]
            U[s][f] = [float(v) for v in u[0:4]]
            rings.append(ring); axes.append(ax)
        q0 = Euler([math.radians(v) for v in keys6[s][0][0:3]], 'XYZ').to_quaternion()
        q1 = Euler([math.radians(v) for v in keys6[s][-1][0:3]], 'XYZ').to_quaternion()
        wrap = math.degrees(q0.rotation_difference(q1).angle)
        if pas >= 2 and wrap < 3.0:
            break
    stats[s] = {'ring': rings, 'axis': axes, 'wrap': round(wrap, 2), 'passes': pas}
# the thrown-up arms: the direction the grip pose points in (from the shoulder) is swung round to straight up, a little out, trembling (a quick throw, a little
# overshoot), and the limb is solved for the clip's centre on that direction, so the arm always stays on its own sphere; the hands then shake about their pins
UPLOG = {}
for s_ in 'lr':
    lb = limbs[s_]
    u_prev = None
    for f in range(N):
        t = f / FPS
        w = up_w(t)
        if w <= 1e-4:
            u_prev = None
            continue
        lb.set_parent(Fs[s_][f])
        sh_p = lb.arm_world([0, 0, 0, 0]) @ lb.apl                      # the shoulder: the point the arm turns about (not the part's origin)
        ring_g = lb.hand_world(U[s_][f]) @ HAND_RING
        rho = (ring_g - sh_p).length
        d_g = (ring_g - sh_p).normalized()
        d_u = Vector(up_dir(s_, t))
        axis = d_g.cross(d_u)
        ang = math.acos(max(-1.0, min(1.0, d_g.dot(d_u))))
        d_t = (Matrix.Rotation(ang * w, 3, axis.normalized()) @ d_g) if axis.length > 1e-6 else d_u
        x0 = u_prev if u_prev is not None else U[s_][f]
        u_, miss_ = lb.solve([(HAND_RING, sh_p + d_t * rho, 3.0)], x0=list(x0), prior=0.0002)
        UPLOG.setdefault(s_, []).append((f, round(miss_ * 1000, 1), [round(v, 1) for v in u_], round(rho, 3), round(math.degrees(ang), 1)))
        u_prev = list(u_)
        u2 = list(u_)
        u2[3] += hand_osc(s_, t) * min(1.0, w)
        keys6[s_][f] = [round(v, 3) for v in lb.keys6(u2)]
wp, wq = [], []
for f in range(N):
    W = wheel_at(f)
    q = W.to_quaternion()
    wp.append([round(v, 5) for v in W.translation]); wq.append([round(v, 6) for v in (q.w, q.x, q.y, q.z)])
rest['wheel_pos'], rest['wheel_q'] = wp, wq
rest['wheel_rest_true'] = [list(r) for r in WHEEL_IMPORT]
rest['arm_keys'] = keys6
rest['ring_mm'] = {s_: [round(v * 1000, 1) for v in stats[s_]['ring']] for s_ in 'lr'}
rest['axis_deg'] = {s_: [round(v, 1) for v in stats[s_]['axis']] for s_ in 'lr'}
rest['uplog'] = {s_: UPLOG.get(s_, [])[::6] for s_ in 'lr'}
rest['stats'] = {s: {'ring_mm_max': round(max(stats[s]['ring']) * 1000, 1), 'axis_deg_max': round(max(stats[s]['axis']), 1), 'wrap': stats[s]['wrap'], 'passes': stats[s]['passes']} for s in 'lr'}
json.dump(rest, open(BASE + 'plans/slate-dummy-solve.json', 'w'))
result = {'pivots_local': pl, 'stats': rest['stats'], 'hip_pivot': [round(v, 3) for v in HIP_PIVOT]}
