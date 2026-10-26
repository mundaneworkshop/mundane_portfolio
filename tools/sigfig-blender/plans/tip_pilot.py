"""Blender-side step for make_pilot.py (the rebel's spin): the arm pose that holds the helmet balanced on the fingertips -> plans/<FIG>-tip.json.
Run after stud_pilot.py (it reads rel_tip from <fig>-stud.json):

    FIG = 'rebel-pilot'; exec(open(BASE + 'plans/tip_pilot.py').read())

The hand reaches up into the helmet's cavity with the fingertips in the anti-stud under its crown, and the helmet spins about the fingers' axis. For a few points
beside the head the arm is solved for the fingertips there with the fingers pointing up; the pose is taken where the helmet, turned through a whole spin in
30 degree steps and tested 3 % oversize, cuts nothing - the holding arm, the head, the hair, the torso - preferring the fingers nearest upright.
"""
import json, math
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

HELMET, SIDE = {'rebel-pilot': ('acc_x164px2', 'r'), 'tie-pilot': ('acc_30408p02', 'l')}[FIG]
M_SIGN = 1 if SIDE == 'r' else -1
ST = json.load(open(BASE + 'plans/%s-stud.json' % FIG))
REL = Matrix(ST['rel_tip'])
AX_H = Vector(ST['tip_axis_hand'])
PIV_H = Vector(ST['tip_pivot_hand'])
PIN = {'hand_r': [0, -0.04, -0.005], 'hand_l': [0, -0.04, -0.005]}
BEND = {'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}}

clear()
build_sigfig(IO % FIG, FIG)
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-' + FIG]
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
helm, hand = _R(HELMET), _R('hand_' + SIDE)
HV = [v.co.copy() for v in helm.data.vertices]
HP = [p.vertices[:] for p in helm.data.polygons]
C0 = Vector(ST['ceil_local'])


def bvh_of(o, dg):
    eo = o.evaluated_get(dg)
    me = eo.to_mesh()
    b = BVHTree.FromPolygons([(eo.matrix_world @ v.co)[:] for v in me.vertices], [p.vertices[:] for p in me.polygons])
    eo.to_mesh_clear()
    return b


# minifig hands sit at an angle on the arm, so "arm straight up" does not stand the fingers up: the arm pose is solved (Limb) for the fingertips at a
# point beside the head and the fingers pointing up, for a few such points; then each is checked over a whole spin
exec(open(BASE + 'ikgrip.py').read())
HAND_TIP = PIV_H
limb = Limb(FIG, SIDE)
sh = limb.arm_world([0, 0, 0, 0]).translation
side_x = -1.0 if SIDE == 'r' else 1.0
rows = []
for dx in (0.22, 0.30, 0.38):
    for dz in (0.05, 0.15, 0.25):
        for dy in (-0.10, 0.0):
            P = sh + Vector((side_x * dx, dy, dz))
            u, miss = limb.solve([(HAND_TIP, P, 3.0), (HAND_TIP + Vector((0, 0.10, 0)), P - Vector((0, 0, 0.10)), 2.0)], x0=[-120.0, M_SIGN * 20.0, 0.0, 0.0], prior=0.0001)
            k6 = limb.keys6(u)
            apply_plan(FIG, dict(duration=1.0, fps=24, bend=BEND, pivots_local=PIN,
                                 keys={'arm_' + SIDE: {'rotation_x': [[0, k6[0]]], 'rotation_y': [[0, k6[1]]], 'rotation_z': [[0, k6[2]]]},
                                       'hand_' + SIDE: {'rotation_x': [[0, k6[3]]], 'rotation_y': [[0, k6[4]]], 'rotation_z': [[0, k6[5]]]},
                                       'head': {'rotation_x': [[0, 8.0]], 'rotation_z': [[0, -M_SIGN * 14.0]]}}))
            bpy.context.scene.frame_set(0)
            bpy.context.view_layer.update()
            dg = bpy.context.evaluated_depsgraph_get()
            HM = hand.matrix_world.copy()
            others = {r: bvh_of(_R(r), dg) for r in ('arm_' + SIDE, 'head', 'torso', 'acc_23186')}
            ax = (HM.to_3x3() @ AX_H).normalized()
            pv = HM @ PIV_H
            over = {}
            for k in range(12):
                Rm = Matrix.Translation(pv) @ Matrix.Rotation(math.radians(30 * k), 4, ax) @ Matrix.Translation(-pv)
                M = Rm @ HM @ REL
                hb = BVHTree.FromPolygons([(M @ (C0 + (v - C0) * 1.03))[:] for v in HV], HP)
                for r, b in others.items():
                    over[r] = max(over.get(r, 0), len(hb.overlap(b)))
            tilt = math.degrees(math.acos(max(-1.0, min(1.0, ax.z))))
            rows.append((6 * sum(over.values()) + 0.5 * tilt + 2000 * miss, [round(v, 2) for v in k6], over, round(tilt, 1), round(miss * 1000, 1), [dx, dy, dz]))
rows.sort(key=lambda r: r[0])
c, K6, O, TILT, MISS, PT = rows[0]
out = dict(fig=FIG, keys6=K6, overlaps=O, axis_tilt_deg=TILT, miss_mm=MISS, point=PT, top=[r[1:] for r in rows[:5]])
json.dump(out, open(BASE + 'plans/%s-tip.json' % FIG, 'w'), indent=1)
result = out
