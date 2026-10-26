"""Blender-side step for make_work.py: solves the arm + hand angles for every pose of the Work loop and writes plans/work-solve.json.
Run inside Blender after exec()-ing ldr_to_blender.py and ikgrip.py (see devfig.py in the session scratchpad: BASE, IO, build_sigfig):

    exec(open(BASE + 'plans/solve_work.py').read())

Hands turn only about the pin (twist), so each limb has 4 DOF and the ring centre / clip tip stays on a sphere about the shoulder: key targets are
placed on that sphere. Geometry it relies on (measured from the .io): the laptop deck's keys are at z 0.419, y -0.06 .. -0.21 (palm rest y 0 .. 0.06); the figure's mirror plane is
x = 0.015; the mug (acc_68495pb03) has its axis on local +z (bottom at 0, rim at 0.28, radius 0.1) and its handle on local +x. A hand's C clip is a ring
(hand-local centre HAND_RING); the imported left hand holds the handle, so the mug's pose in that hand (C_L) is the grip. The right hand's grip is the
mirror image (C_R = F C_L S: F mirrors the hand, S mirrors the mug about the plane through its axis and handle), so the handle always sits in the clip.
"""
import json
from mathutils import Matrix, Vector, Euler

exec(open(BASE + 'ikgrip.py').read())
LEAN, HEAD_TILT = 20.0, 8.0                  # he leans in to type; every pose below is solved in this leaned stance (torso_x / head_x are held at these
                                             # values in the plan, plus small motion), so the arms' parent frames are the real, bent-rig ones
clear()
build_sigfig(IO % 'work', 'work')
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-work']
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
CUP_TRUE = _R('acc_68495pb03').matrix_world.copy()                       # the unleaned rest pose (what a world-space key is measured from)
apply_plan('work', dict(duration=1.0, fps=24, keys={'torso': {'rotation_x': [[0, LEAN]]}, 'head': {'rotation_x': [[0, HEAD_TILT]]}}))
bpy.context.scene.frame_set(0)
bpy.context.view_layer.update()
L, Rl = Limb('work', 'l'), Limb('work', 'r')
rig = [o for o in _c.all_objects if o.type == 'ARMATURE'][0]
_pb = rig.pose.bones['head_1']
HEAD_D = rig.matrix_world @ _pb.matrix @ rig.data.bones['head_1'].matrix_local.inverted()      # how the head has moved from its rest pose
cupo = _R('acc_68495pb03')
CUP0, HL0, HR0 = cupo.matrix_world.copy(), L.hand.matrix_world.copy(), Rl.hand.matrix_world.copy()
CL = HL0.inverted() @ CUP0
FM = Matrix.Diagonal((-1, 1, 1, 1))
SM = Matrix.Diagonal((1, -1, 1, 1))
CX = 0.015
MX = Matrix.Translation((CX, 0, 0)) @ FM @ Matrix.Translation((-CX, 0, 0))
CR = FM @ CL @ SM
MOUTH0 = Vector((0.015, 0.119, 0.82))        # the lips, in the rest pose; MOUTH is where they are in the leaned stance
RIM_R, CUP_H = 0.10, 0.28
MOUTH = HEAD_D @ MOUTH0
FACE_Y = 0.112 + (MOUTH.y - MOUTH0.y)


def cup_pose(O, tau, psi):
    return Matrix.Translation(O) @ Matrix.Rotation(math.radians(psi), 4, 'Z') @ Matrix.Rotation(math.radians(-tau), 4, 'X')


def hand_target(P, C):          # the hand pose that holds the mug at P with the mug-in-hand relation C
    return P @ C.inverted()


def solve_pose(limb, Mt, x0=None, w=(0.5, 3.0, 1.0, 1.0)):
    x, miss = limb.solve(pose_constraints(Mt, w), x0=x0)
    return [round(v, 2) for v in limb.keys6(x)], round(miss * 1000, 1), [round(float(v), 2) for v in x]


out = {'cup_rest_true': [list(r) for r in CUP_TRUE], 'lean': LEAN, 'head_tilt': HEAD_TILT, 'mirror_x': CX, 'cup_rest': [list(r) for r in CUP0], 'CL': [list(r) for r in CL], 'CR': [list(r) for r in CR]}

# ---- typing: the far lower edge of the C clip (TIP) rests on a key row, ring axis level
TIP = Vector((0.0, -0.155, 0.0))
KEY_Z = 0.419 + 0.006

def key_target(limb, xt):
    """The point at key height, x = xt, on the sphere the clip tip can reach (about this shoulder)."""
    sh = limb.arm_world([0, 0, 0, 0]).translation
    rho = ((limb.hand_world([0, 0, 0, 0]) @ TIP) - sh).length
    dy2 = rho ** 2 - (KEY_Z - sh.z) ** 2 - (xt - sh.x) ** 2
    return Vector((xt, sh.y - math.sqrt(max(dy2, 0.0)), KEY_Z))

def solve_tip(limb, xt, x0=None):
    p = key_target(limb, xt)
    def level(x):                                     # the ring axis (hand x) stays horizontal
        M = limb.hand_world(x)
        return [(M.to_3x3() @ Vector((1, 0, 0))).z * 3.0]
    x, _ = limb.solve([(TIP, p, 3.0)], x0=x0, extra=level)
    miss = ((limb.hand_world(x) @ TIP) - p).length * 1000
    return [round(v, 2) for v in limb.keys6(x)], round(miss, 1), [round(float(v), 2) for v in x], [round(v, 3) for v in p]

out['type_r'], e1, _, pr = solve_tip(Rl, -0.115)
out['type_l'], e2, _, pl = solve_tip(L, 0.075)
out['miss_type_mm'] = [e1, e2]
out['type_targets'] = [pr, pl]

# ---- holding: left hand as imported; right hand the mirror image of it
out['hold_l'] = [0.0] * 6
out['hold_r'], e, _ = solve_pose(Rl, MX @ HL0 @ FM)
out['miss_hold_r_mm'] = e

# ---- sipping: the mug tipped so the rim's near edge meets the lips, nothing through the face
rim_pts = lambda P: [P @ Vector((RIM_R * math.cos(a), RIM_R * math.sin(a), CUP_H)) for a in np.linspace(0, 2 * math.pi, 40, endpoint=False)]


TAU0 = 32.0
_a = Vector((0, math.sin(math.radians(TAU0)), math.cos(math.radians(TAU0))))
_u1 = Vector((0, math.cos(math.radians(TAU0)), -math.sin(math.radians(TAU0))))
O_NOM = np.array(list(MOUTH - RIM_R * _u1 - CUP_H * _a))         # the mug tipped TAU0 degrees with its near rim edge on the lips
u0 = np.array([0, 0, 0, 0, 0, 0] + list(O_NOM) + [TAU0])

def sip_resid(limb, side_psi, x0):
    def resid(u):
        P = cup_pose(Vector(u[4:7]), u[7], side_psi)
        C = CL if side_psi == 0 else CR
        Mt = hand_target(P, C)
        Mh = limb.hand_world(u[0:4])
        r = []
        for p, k in zip(hand_frame_points(Mt), (0.5, 3.0, 1.0, 1.0)):
            d = (Mh @ p) - (Mt @ p)
            r += [3 * k * d.x / 0.01, 3 * k * d.y / 0.01, 3 * k * d.z / 0.01]
        rp = rim_pts(P)
        dmin = min((q - MOUTH).length for q in rp)
        r.append((dmin - 0.006) / 0.01 * 2.0)
        for q in rp:
            if abs(q.x - CX) < 0.125 and 0.745 < q.z < 0.998 and q.y > FACE_Y:
                r.append((q.y - FACE_Y) / 0.01 * 3.0)
        r.append((u[7] - TAU0) * 0.08)
        r += list(0.0003 * (np.array(u[0:4]) - x0) / 0.01)
        r += list(((np.array(u[4:7]) - O_NOM) / 0.05) * 0.4)
        return np.array(r)
    return resid


u0 = np.array([0, 0, 0, 0] + list(O_NOM) + [TAU0])
def fixed(resid, n=140):
    def f(u):
        r = resid(u)
        return np.concatenate([r, np.zeros(max(0, n - len(r)))])[:n]
    return f

ul, cl = lm(fixed(sip_resid(L, 0, np.zeros(4))), u0, restarts=12, spread=25.0)
out['sip_l'] = {'x': [round(v, 2) for v in L.keys6(ul[0:4])], 'O': [round(float(v), 4) for v in ul[4:7]], 'tau': round(float(ul[7]), 1)}
P_sip_l = cup_pose(Vector(ul[4:7]), ul[7], 0)
rp = rim_pts(P_sip_l)
out['sip_l']['mouth_gap_mm'] = round(min((q - MOUTH).length for q in rp) * 1000, 1)
out['sip_l']['max_face_pen_mm'] = round(max([0] + [(q.y - FACE_Y) * 1000 for q in rp if abs(q.x - CX) < 0.125 and 0.745 < q.z < 0.998]), 1)
Mh_l = L.hand_world(ul[0:4]); Mt_l = hand_target(P_sip_l, CL)
out['sip_l']['grip_miss_mm'] = round(max(((Mh_l @ p) - (Mt_l @ p)).length for p in hand_frame_points(Mt_l)) * 1000, 1)
# right hand: the mirror image of the left sip
P_sip_r = MX @ P_sip_l @ SM
Mt_r = hand_target(P_sip_r, CR)
out['sip_r'], e, _ = solve_pose(Rl, Mt_r)
out['sip_r_miss_mm'] = e

# ---- the hand-over: the mug in front of the chest, held by one hand, turned a half turn about its own axis in mid air, taken by the other
# the hand-over happens at the left hand's hold (the imported one, leaned) and ends at its mirror image, the right hand's hold: the mug swings a half
# turn about its own axis and the tilt mirrors
P_swap_a = CUP0.copy()
P_swap_b = MX @ CUP0 @ SM
out['swap_l'] = [0.0] * 6
out['swap_r'] = out['hold_r']
out['swap_O'] = [round(v, 4) for v in CUP0.translation]
out['swap_miss_mm'] = [0.0, out['miss_hold_r_mm']]
out['P_swap_a'] = [list(r) for r in P_swap_a]
out['P_swap_b'] = [list(r) for r in P_swap_b]
out['P_hold_r'] = [list(r) for r in (MX @ CUP0 @ SM)]
out['P_sip_l'] = [list(r) for r in P_sip_l]
out['P_sip_r'] = [list(r) for r in P_sip_r]
json.dump(out, open(BASE + 'plans/work-solve.json', 'w'), indent=1)
result = {k: v for k, v in out.items() if k not in ('cup_rest', 'CL', 'CR', 'P_swap_a', 'P_swap_b', 'P_hold_r', 'P_sip_l', 'P_sip_r')}
