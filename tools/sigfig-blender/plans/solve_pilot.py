"""Blender-side step for make_pilot.py (set FIG = 'rebel-pilot' | 'tie-pilot' before exec()-ing; BASE, IO, clear, build_sigfig, apply_plan, go from devfig.py):

    FIG = 'rebel-pilot'; exec(open(BASE + 'plans/solve_pilot.py').read())          # -> plans/<FIG>-solve.json

The helmet is still held by its lower rim in the hand's clip (the rim runs through the clip along its hole axis, hand-local z) but turned about that grip so that its
body lies away from the arm: the rim point in the clip (THETA, a point round the opening), the roll of the helmet about the rim's tangent there (PHI, 0 = the body
turned out along the hand's x) and how deep the rim sits in the clip (OFF). The helmet then spins about its OWN axis through its centre (the axis / pivot are
hand-local), which slides the rim through the clip and sweeps nothing through the arm. The values were found by searching for zero triangle overlaps between the helmet
and arm / hand / head / torso over a full turn at the spin's arm pose; the imported grip had 500 arm overlaps. Also solved here: the free arm, hand on the hip at an angle.
"""
import json
import numpy as np
from mathutils import Matrix, Vector, Euler
from mathutils.bvhtree import BVHTree

exec(open(BASE + 'ikgrip.py').read())
HELMET = {'rebel-pilot': ('acc_x164px2', 'r'), 'tie-pilot': ('acc_30408p02', 'l')}[FIG]
H_ROLE, SIDE = HELMET
OTHER = 'l' if SIDE == 'r' else 'r'
M_SIGN = 1 if SIDE == 'r' else -1
ARM_UP = 45.0
ARM_OUT = {'rebel-pilot': 18.0, 'tie-pilot': 30.0}[FIG]

clear()
build_sigfig(IO % FIG, FIG)
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-' + FIG]
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
helm, hand, arm = _R(H_ROLE), _R('hand_' + SIDE), _R('arm_' + SIDE)
REL_RIM = hand.matrix_world.inverted() @ helm.matrix_world

def tris_of(o):
    eo = o.evaluated_get(dg)
    me = eo.to_mesh()
    vs = [eo.matrix_world @ v.co for v in me.vertices]
    ps = [p.vertices[:] for p in me.polygons]
    eo.to_mesh_clear()
    return vs, ps


def bvh_of(o):
    vs, ps = tris_of(o)
    return BVHTree.FromPolygons([v[:] for v in vs], ps)


HV = [v.co.copy() for v in helm.data.vertices]
HP = [p.vertices[:] for p in helm.data.polygons]


INFLATE = 1.03                                  # the helmet is tested a little larger than it is: a clear result has a few mm to spare when the plan's own motion nudges things


def helmet_bvh(M, grow=1.0):
    c = Vector((0, -0.01, 0.0))
    return BVHTree.FromPolygons([(M @ (c + (v - c) * grow))[:] for v in HV], HP)


PIN = {'hand_r': [0, -0.04, -0.005], 'hand_l': [0, -0.04, -0.005]}


BEND = {'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}}
TESTED = ('arm_' + SIDE, 'hand_' + SIDE, 'head', 'torso', 'acc_23186')           # what the helmet must not cut: the holding arm and hand, the head, the torso, the hair piece


def set_pose(up, tw, out=None):
    """Pose the holding arm (raised `up` degrees, out `out`, the hand twisted `tw` about its pin) in two contexts: with the head turned to watch the helmet and the
    torso turned a little with it (the plan's own values at the spin), and with both level (the plan's values while the head is still turning round to it), and
    rebuild what the helmet is tested against in each."""
    global ctxs, HM, dg
    out = ARM_OUT if out is None else out
    ctxs = []
    for hx, hz, tz in ((8.0, -M_SIGN * 14.0, -M_SIGN * 6.0), (0.0, 0.0, 0.0)):
        apply_plan(FIG, dict(duration=1.0, fps=24, bend=BEND, pivots_local=PIN,
                             keys={'arm_' + SIDE: {'rotation_x': [[0, -up]], 'rotation_y': [[0, M_SIGN * out]]}, 'hand_' + SIDE: {'rotation_y': [[0, tw]]},
                                   'head': {'rotation_x': [[0, hx]], 'rotation_z': [[0, hz]]},
                                   'torso': {'rotation_x': [[0, 2.0]], 'rotation_z': [[0, tz]]}}))
        bpy.context.scene.frame_set(0)
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        ctxs.append((hand.matrix_world.copy(), {r: bvh_of(_R(r)) for r in TESTED}))
    HM = ctxs[0][0]


set_pose(ARM_UP, 0.0)

# ---- the helmet held by its rim, turned so its body lies away from the arm
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
zr = min(v.z for v in HV)
CC = Vector((0, -0.01, zr + 0.01))                    # the rim circle's centre (helmet-local)


def rim_point(theta):
    """The lowest bit of the shell within 8 degrees of that angle round the axis, if there is a rim there (the shell reaches within 4 cm of the helmet's lowest point):
    (point in the clip, outward direction, tangent). None where the rim is cut away (visor, face opening)."""
    nl = Vector((math.cos(math.radians(theta)), math.sin(math.radians(theta)), 0))
    cand = []
    for v in HV:
        p = Vector((v.x - CC.x, v.y - CC.y, 0))
        if p.length > 0.05 and p.normalized().dot(nl) > math.cos(math.radians(8)) and v.z - zr < 0.04:
            cand.append(v)
    if not cand:
        return None
    v0 = min(cand, key=lambda v: v.z)
    r = Vector((v0.x - CC.x, v0.y - CC.y, 0)).dot(nl)
    tl = Vector((-nl.y, nl.x, 0))
    return Vector((CC.x + nl.x * (r - 0.004), CC.y + nl.y * (r - 0.004), v0.z + 0.004)), nl, tl


def hold(theta, phi, off):
    """The hand-local pose of the helmet held at that rim point: the rim runs through the clip along its hole axis, the helmet rolled by phi about the rim tangent,
    the rim off cm deep in the clip. Returns (helmet-in-hand matrix, spin axis in the hand, helmet centre in the hand)."""
    rp = rim_point(theta)
    if rp is None:
        return None
    P, nl, tl = rp
    Rm = Matrix((nl, tl.cross(nl), tl)).transposed()
    nx = Vector((math.cos(math.radians(phi)), math.sin(math.radians(phi)), 0))
    Hf = Matrix((nx, Z.cross(nx), Z)).transposed()
    Rhh = Hf @ Rm.transposed()
    rel = Rhh.to_4x4()
    rel.translation = (HAND_RING + nx * off) - Rhh @ P
    return rel, (Rhh @ Z).normalized(), rel @ CC


def overlaps(rel, ax_h, piv_h, steps=6):
    over = {}
    for HMk, others in ctxs:
        Hw = HMk @ rel
        axis_w = (HMk.to_3x3() @ ax_h).normalized()
        piv_w = HMk @ piv_h
        for k in range(steps):
            R = Matrix.Translation(piv_w) @ Matrix.Rotation(math.radians(k * 360.0 / steps), 4, axis_w) @ Matrix.Translation(-piv_w)
            hb = helmet_bvh(R @ Hw, INFLATE)
            for r, b in others.items():
                over[r] = max(over.get(r, 0), len(hb.overlap(b)))
    return over


def tilt_of(h):
    up = (HM.to_3x3() @ (h[0].to_3x3() @ Z)).normalized()                 # the helmet's top in the world
    return math.degrees(math.acos(max(-1.0, min(1.0, up.z))))


HEAD_X = sum((_R('head').matrix_world @ v.co).x for v in _R('head').data.vertices) / len(_R('head').data.vertices)


SIDE_W = {'rebel-pilot': 800.0, 'tie-pilot': 150.0}[FIG]           # the big TIE helmet cannot be held clear of the face and kept off the arm and hand as well: it counts for less there


def side_gap(h):
    """How far to the side of the head the helmet's centre is held (m): the helmet is ~0.4 across and the head ~0.26, so under ~0.35 it hangs in front of the face."""
    return abs((HM @ h[0] @ CC).x - HEAD_X)


def cost(o, h):
    # no triangle of the helmet through the arm, head, hair or torso (heavy), as little as possible through the hand's clip, a spin axis that is as upright as it can be,
    # and the helmet held out to the side of the head rather than in front of the face
    return 6 * (o['arm_' + SIDE] + o['head'] + o['torso'] + o['acc_23186']) + o['hand_' + SIDE] + 0.6 * tilt_of(h) + SIDE_W * max(0.0, 0.35 - side_gap(h))


def grip_search(thetas, phis, offs, steps=6):
    best, n = None, 0
    for th in thetas:
        for ph in phis:
            for of in offs:
                h = hold(float(th % 360), float(ph), of)
                if h is None:
                    continue
                n += 1
                o = overlaps(*h, steps)
                c = cost(o, h)
                if best is None or c < best[0]:
                    best = (c, th % 360, float(ph), of, o)
    return best, n


# the grip: every rim point there is, rolled and set deeper or shallower in the clip, at each of a few arm raises, swings out and hand twists; the least overlap over
# a turn with the most upright spin axis wins. The search turns the helmet in 45 degree steps; the best few poses are then checked in 15 degree steps (a rim can
# slip through a gap between two coarse steps) and the best of those is polished
best = None
tried = 0
POSELOG = []
for up in globals().get('ARM_UPS', (60.0, 75.0, 90.0)):
    for out in globals().get('ARM_OUTS', (18.0, 30.0, 45.0, 60.0)):
        for tw in globals().get('TWISTS', (-30.0, 0.0, 30.0)):
            set_pose(up, tw, out)
            b1, n = grip_search(range(0, 360, 20), (-30.0, 0.0, 30.0), (-0.02, 0.0, 0.02), 8)
            tried += n
            if b1 is not None:
                POSELOG.append((b1[0], up, out, tw, b1))
POSELOG.sort(key=lambda p: p[0])
checked = []
for c0, up, out, tw, b1 in POSELOG[:8]:
    set_pose(up, tw, out)
    h = hold(float(b1[1]), b1[2], b1[3])
    o = overlaps(*h, 24)
    checked.append((cost(o, h), up, out, tw, (cost(o, h), b1[1], b1[2], b1[3], o)))
checked.sort(key=lambda p: p[0])
_, ARM_UP, ARM_OUT, TWIST, b1 = checked[0]
set_pose(ARM_UP, TWIST, ARM_OUT)
# a finer pass round the winner
_, th0, ph0, of0, _o = b1
b2, n = grip_search(range(th0 - 20, th0 + 21, 5), (ph0 - 20, ph0 - 10, ph0, ph0 + 10, ph0 + 20), (of0 - 0.01, of0, of0 + 0.01), 12)
tried += n
best = b2 if b2[0] < b1[0] else b1
_, THETA, PHI, OFF, _o = best
REL_HOLD, SPIN_AXIS_H, SPIN_PIVOT_H = hold(float(THETA), PHI, OFF)
over = overlaps(REL_HOLD, SPIN_AXIS_H, SPIN_PIVOT_H, 36)
_P = rim_point(float(THETA))[0]
RIM_R = math.hypot(_P.x - CC.x, _P.y - CC.y)
hb0 = helmet_bvh(HM @ REL_RIM)
over_rim = {r: len(hb0.overlap(b)) for r, b in ctxs[0][1].items()}

# ---- the free arm: hand on the hip, angled
bpy.context.view_layer.update()
limb = Limb(FIG, OTHER)
limb.set_parent(limb.F)
hips = _R('hips').matrix_world.translation
sh = limb.arm_world([0, 0, 0, 0]).translation
side_sign = 1 if OTHER == 'l' else -1
# a point off the hip's side and a little forward, on the reach sphere about the shoulder
rho = ((limb.hand_world([0, 0, 0, 0]) @ HAND_RING) - sh).length
d = Vector((side_sign * 0.30, -0.22, -0.93)).normalized()                     # forward and out: the arm angled away from the body, the clip on the hip
tgt = sh + d * rho
x_hip, miss = limb.solve([(HAND_RING, tgt, 3.0)], x0=[15.0, side_sign * 18.0, -18.0 * M_SIGN * -1, 0.0], prior=0.0002)
hip_keys = [round(v, 3) for v in limb.keys6(x_hip)]

_axis_w = (HM.to_3x3() @ SPIN_AXIS_H).normalized()
_up_w = (HM.to_3x3() @ (REL_HOLD.to_3x3() @ Z)).normalized()           # the helmet's top (its +z) in the world at the spin pose
AXIS_TILT = round(math.degrees(math.acos(max(-1.0, min(1.0, _up_w.z)))), 1)
out = {'fig': FIG, 'helmet': H_ROLE, 'side': SIDE, 'rel_hold': [list(r) for r in REL_HOLD], 'rel_rim': [list(r) for r in REL_RIM], 'spin_pivot_hand': list(SPIN_PIVOT_H),
       'axis_hand': list(SPIN_AXIS_H), 'arm_up': ARM_UP, 'arm_out': ARM_OUT, 'twist': TWIST, 'rim_r': RIM_R, 'side_gap': round(side_gap((REL_HOLD,)), 3), 'tried': tried, 'axis_tilt_deg': AXIS_TILT, 'axis_world': [round(v, 3) for v in _up_w], 'theta': THETA, 'phi': PHI, 'off': OFF, 'overlap_hold_max': over, 'overlap_rim': over_rim, 'poses_checked': [[round(c[0], 1), c[1], c[2], c[3]] for c in checked], 'hip_keys': hip_keys, 'hip_target_miss_mm': round(miss * 1000, 1),
       'hip_target': [round(v, 3) for v in tgt], 'hips': [round(v, 3) for v in hips]}
json.dump(out, open(BASE + 'plans/%s-solve.json' % FIG, 'w'), indent=1)
result = {k: out[k] for k in ('arm_up', 'twist', 'side_gap', 'rim_r', 'tried', 'axis_tilt_deg', 'axis_world', 'theta', 'phi', 'off', 'overlap_hold_max', 'overlap_rim', 'hip_keys', 'hip_target_miss_mm', 'hip_target', 'hips')}
