"""Blender-side step for make_chef.py: the spatula's world pose and the right arm that holds it, solved per frame -> plans/chef-solve.json.
Run inside Blender after exec()-ing ldr_to_blender.py and ikgrip.py (BASE, IO, clear, build_sigfig, apply_plan come from the session's devfig.py):

    exec(open(BASE + 'plans/solve_chef.py').read())

The pan stays as imported in the left hand (level, handle toward the figure). The spatula's blade is held FLAT (blade normal vertical) a hair above the egg and
sweeps a small circle; it leaves the pan while the pan is flicked. A hand turns only about its pin, so a limb has 4 DOF (arm x, y, z and the twist). The clip
must sit on the spatula's handle (ring centre on the handle axis, ring axis along it); where along the handle and how it is rolled in the clip are free, so
those come out of the solve. The arm is kept out of the torso. Spatula geometry (local): handle along z (imported grip at z ~ 0.01), blade at z 0.28 .. 0.51
with its normal on local y, offset +0.05 in y (the blade's underside is local y = +0.069 when y points down).
"""
import json
from mathutils import Matrix, Vector

exec(open(BASE + 'ikgrip.py').read())
exec(open(BASE + 'plans/motionlib.py').read())
LEAN, HEAD_TILT = 8.0, 14.0
PAN_LEVEL = -8.5                                                 # the left arm counters the lean so the pan stays level
T = 10.0
clear()
build_sigfig(IO % 'chef', 'chef')
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-chef']
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
SP_TRUE = _R('acc_93082e').matrix_world.copy()                 # unleaned rest: what world-space keys are measured from
PAN_TRUE = _R('acc_4528').matrix_world.copy()
EGG_TRUE = _R('prop_98138pb088').matrix_world.copy()
apply_plan('chef', dict(duration=1.0, fps=24, keys={'torso': {'rotation_x': [[0, LEAN]]}, 'head': {'rotation_x': [[0, HEAD_TILT]]}, 'arm_l': {'rotation_x': [[0, PAN_LEVEL]]}}))
bpy.context.scene.frame_set(0)
bpy.context.view_layer.update()
Rl = Limb('chef', 'r')
pan, torso = _R('acc_4528'), _R('torso')
PAN0 = pan.matrix_world.copy()
PC = Vector(PAN0 @ Vector((0, 0, -0.06)))                       # pan floor centre in the leaned stance
EGG_TOP = PC.z + 0.08
BLADE_Z = EGG_TOP + 0.014                                        # blade underside hovers just over the egg
GRIP_TO_BLADE = 0.39
SP_RING = Vector((-0.001, -0.007, 0.009))                        # the imported ring centre, spatula-local: on the handle (axis at x = y = 0 give or take a cm)
tb = [torso.matrix_world @ v.co for v in torso.data.vertices]
TLO = Vector((min(v.x for v in tb), min(v.y for v in tb), min(v.z for v in tb)))
THI = Vector((max(v.x for v in tb), max(v.y for v in tb), max(v.z for v in tb)))
MARGIN = 0.012


def spatula_pose(Bc, alpha_deg, zb):
    """World matrix: long axis horizontal at alpha (0 = +x, positive turns toward -y), blade centre over Bc (xy), underside at zb, blade flat (local y down)."""
    a = Vector((math.cos(math.radians(alpha_deg)), -math.sin(math.radians(alpha_deg)), 0.0))
    yc = Vector((0, 0, -1))
    xc = yc.cross(a)
    M = Matrix((xc, yc, a)).transposed().to_4x4()
    M.translation = Vector((Bc[0], Bc[1], zb + 0.069)) - a * GRIP_TO_BLADE
    return M


def torso_pen(x):
    Ma, Mh = Rl.arm_world(x), Rl.hand_world(x)
    S0, W = Ma.translation, Mh.translation
    pts = [S0.lerp(W, s) for s in (0.55, 0.75, 0.95)] + [Mh @ HAND_RING]
    r = []
    for p in pts:
        dx = min(p.x - (TLO.x - MARGIN), (THI.x + MARGIN) - p.x)
        dy = min(p.y - (TLO.y - MARGIN), (THI.y + MARGIN) - p.y)
        dz = min(p.z - (TLO.z - MARGIN), (THI.z + MARGIN) - p.z)
        r.append(min(dx, dy, dz) / 0.01 * 3.0 if (dx > 0 and dy > 0 and dz > 0) else 0.0)
    return r


ROLL_PHI = None                                                  # when set: where the wrist sits around the handle (radians, in the spatula's own x-y plane, 0 = +x)

def pin_phi(Mh, M_sp):
    """Where the hand's wrist (pin) is around the handle, as an angle in the spatula's local x-y plane."""
    v = (Mh @ HAND_PIN) - (Mh @ HAND_RING)
    loc = M_sp.to_3x3().inverted() @ v
    return math.atan2(loc.y, loc.x)


def solve_sp(Bc, zb, a0, u0=None, restarts=14, alpha_free=40.0, cont=0.0, attract=None):
    """u = [arm x, y, z, twist, slide, heading]: slide = where the clip sits on the handle (spatula local z), heading = the spatula's heading in degrees
    (free within +-alpha_free of a0: the blade stays flat and over Bc, the handle swings round it). Ring centre on the handle, clip hole axis (hand-local z) along it."""
    u0 = np.array([-55.0, 0, 0, 0, 0.03, a0]) if u0 is None else np.array(u0, float)
    def resid(u):
        M_sp = spatula_pose(Bc, u[5], zb)
        ax_w = M_sp.to_3x3() @ Vector((0, 0, 1))
        Mh = Rl.hand_world(u[0:4])
        tgt = M_sp @ Vector((SP_RING.x, SP_RING.y, u[4]))
        d = (Mh @ HAND_RING) - tgt
        xa = (Mh.to_3x3() @ HAND_AXIS).normalized()                  # the clip's hole axis runs along the handle
        c = xa.cross(ax_w)
        r = [3 * 3.0 * d.x / 0.01, 3 * 3.0 * d.y / 0.01, 3 * 3.0 * d.z / 0.01, c.x * 8, c.y * 8, c.z * 8]
        if ROLL_PHI is not None:                                     # the clip is turned about the handle so its wrist sits at this angle round it
            ph_ = pin_phi(Mh, M_sp)
            r += [(math.cos(ph_) - math.cos(ROLL_PHI)) * 8.0, (math.sin(ph_) - math.sin(ROLL_PHI)) * 8.0]
        r += torso_pen(u[0:4])
        r += list(max(0.0002, cont) * (np.array(u[0:4]) - u0[0:4]) / 0.01)
        if cont: r.append(cont * (u[5] - u0[5]) / 0.01)
        if attract is not None:
            r += list(attract[1] * (np.array(u[0:4]) - attract[0][0:4]) / 0.01)
            r.append(attract[1] * (u[5] - attract[0][5]) / 0.01)
        r.append((u[4] - 0.03) / 0.05 * 0.4)
        if u[4] < -0.06: r.append((-0.06 - u[4]) / 0.01 * 3)
        if u[4] > 0.12: r.append((u[4] - 0.12) / 0.01 * 3)
        r.append((u[5] - a0) / 10.0 * 0.3)
        if abs(u[5] - a0) > alpha_free: r.append((abs(u[5] - a0) - alpha_free) * 0.3)
        return np.array(r + [0.0] * (40 - len(r)))[:40]
    u, c = lm(resid, u0, restarts=restarts, spread=30.0)
    M_sp = spatula_pose(Bc, u[5], zb)
    ax_w = M_sp.to_3x3() @ Vector((0, 0, 1))
    Mh = Rl.hand_world(u[0:4])
    ring = ((Mh @ HAND_RING) - (M_sp @ Vector((SP_RING.x, SP_RING.y, u[4])))).length
    axis_err = math.degrees(math.acos(max(-1, min(1, abs((Mh.to_3x3() @ HAND_AXIS).normalized().dot(ax_w))))))
    solve_sp.phi = pin_phi(Mh, M_sp)
    return u, ring, axis_err, sum(torso_pen(u[0:4]))


# ---- the spatula's motion (world): stirs twice over the egg, then goes out of the pan while the pan is flicked
DX0 = -0.12                                                      # the stir centre sits a little toward the figure so the hand can reach it
ALPHA0 = 0.0
STIR1, STIR2 = (1.0, 3.5), (4.7, 6.3)
def phase(t, t0): return 2 * math.pi * 1.25 * (t - t0)
def env(t): return win(t, *STIR1, fade=0.4) + win(t, *STIR2, fade=0.4)
def circ(t):
    ph = phase(t, STIR1[0]) if t < 4.0 else phase(t, STIR2[0])
    return math.sin(ph), math.cos(ph)
def wd(t): return win(t, 6.55, 8.7, 0.35)
OUT_DX, OUT_DY, OUT_ALPHA, OUT_UP = -0.14, -0.20, -20.0, 0.08
def spatula_at(t):
    """(blade centre xy, blade underside z, preferred heading)"""
    s, c = circ(t)
    e = env(t)
    Bc = PC + Vector((DX0 + 0.03 * c * e, 0.03 * s * e, 0))
    w = wd(t)
    Bc = Bc.lerp(PC + Vector((DX0 + OUT_DX, OUT_DY, 0)), w)
    return Bc, BLADE_Z + OUT_UP * w, ALPHA0 + 6.0 * s * e + OUT_ALPHA * w


heading = []
frames, arm6, slide, sp_pos, sp_q, ring_mm, axis_deg, pen = [], [], [], [], [], [], [], []
u_prev = None
def _qk(k): return Euler([math.radians(v) for v in k[0:3]], 'XYZ').to_quaternion()
for pass_ in (1, 2, 3, 4, 5):                       # each pass starts from where the last ended, so the loop settles on one solution branch
    frames, arm6, slide, sp_pos, sp_q, ring_mm, axis_deg, pen, heading = [], [], [], [], [], [], [], [], []
    for f in range(0, int(T * 24)):
        t = f / 24.0
        Bc, zb, a0 = spatula_at(t)
        u, ring, ax_err, p = solve_sp(Bc, zb, a0, u0=u_prev, restarts=14 if u_prev is None else 2, cont=0.0 if u_prev is None else 0.0025)
        u_prev = u
        M = spatula_pose(Bc, u[5], zb)
        frames.append(f)
        arm6.append([round(v, 3) for v in Rl.keys6(u[0:4])])
        slide.append(round(float(u[4]), 4)); heading.append(round(float(u[5]), 2))
        sp_pos.append([round(v, 5) for v in M.translation])
        q = M.to_quaternion()
        sp_q.append([round(v, 6) for v in (q.w, q.x, q.y, q.z)])
        ring_mm.append(round(ring * 1000, 1)); axis_deg.append(round(ax_err, 1)); pen.append(round(p, 2))
    wrap = math.degrees(_qk(arm6[-1]).rotation_difference(_qk(arm6[0])).angle)
    if pass_ >= 2 and wrap < 3.0:
        break
out = {'pan_level': PAN_LEVEL, 'lean': LEAN, 'head_tilt': HEAD_TILT, 'pan_center_floor': [round(v, 4) for v in PC], 'blade_z': round(BLADE_Z, 4), 'egg_top_z': round(EGG_TOP, 4),
       'arm_r': arm6, 'slide': slide, 'heading': heading, 'sp_pos': sp_pos, 'sp_q': sp_q,
       'sp_rest_true': [list(r) for r in SP_TRUE], 'pan_rest_true': [list(r) for r in PAN_TRUE], 'egg_rest_true': [list(r) for r in EGG_TRUE],
       'pan_leaned': [list(r) for r in PAN0],
       'stats': {'ring_mm_max': max(ring_mm), 'ring_mm_mean': round(sum(ring_mm) / len(ring_mm), 1), 'axis_deg_max': max(axis_deg), 'pen_max': max(pen),
                 'slide_range': [min(slide), max(slide)], 'heading_range': [min(heading), max(heading)]}}
json.dump(out, open(BASE + 'plans/chef-solve.json', 'w'))
result = {'stats': out['stats'], 'pan_center_floor': out['pan_center_floor']}
