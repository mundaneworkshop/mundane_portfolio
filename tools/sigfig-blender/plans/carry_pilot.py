"""Blender-side step for make_pilot.py: the arm pose that carries the helmet clear of the head after he takes it off -> plans/<FIG>-carry.json.
Run inside Blender after solve_pilot.py and the m1 measure (the grip and the seat pose are read from <fig>-solve.json / <fig>-measure.json):

    FIG = 'rebel-pilot'; exec(open(BASE + 'plans/carry_pilot.py').read())

The hold turned the helmet to a new orientation in the hand, so the old "arm raised overhead" carry pose no longer clears the head. Over a grid of raises, swings
out and turns of the upper arm, the one is taken where the held helmet (tested 3 % oversize) cuts nothing - arm, head, hair, torso - and is closest to the head, so
the lift off the head and the hand's pick-up stay short.
"""
import json
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

HELMET = {'rebel-pilot': 'acc_x164px2', 'tie-pilot': 'acc_30408p02'}[FIG]
SIDE = {'rebel-pilot': 'r', 'tie-pilot': 'l'}[FIG]
M_SIGN = 1 if SIDE == 'r' else -1
SOL = json.load(open(BASE + 'plans/%s-solve.json' % FIG))
MEAS = json.load(open(BASE + 'plans/%s-measure.json' % FIG))
REL = Matrix(SOL['rel_hold'] if FIG == 'rebel-pilot' else SOL['rel_rim'])     # the rebel keeps the searched rim grip; the TIE the imported one
PIN = {'hand_r': [0, -0.04, -0.005], 'hand_l': [0, -0.04, -0.005]}
BEND = {'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}}
TESTED = ('arm_' + SIDE, 'hand_' + SIDE, 'head', 'torso', 'acc_23186', 'arm_' + ('l' if SIDE == 'r' else 'r'))
SEAT = Vector(MEAS['seat_loc'])

clear()
build_sigfig(IO % FIG, FIG)
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-' + FIG]
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
helm, hand = _R(HELMET), _R('hand_' + SIDE)
HV = [v.co.copy() for v in helm.data.vertices]
HP = [p.vertices[:] for p in helm.data.polygons]
C0 = Vector((0, -0.01, 0.0))


def bvh_of(o, dg):
    eo = o.evaluated_get(dg)
    me = eo.to_mesh()
    b = BVHTree.FromPolygons([(eo.matrix_world @ v.co)[:] for v in me.vertices], [p.vertices[:] for p in me.polygons])
    eo.to_mesh_clear()
    return b


def trial(x, y, z):
    apply_plan(FIG, dict(duration=1.0, fps=24, bend=BEND, pivots_local=PIN,
                         keys={'arm_' + SIDE: {'rotation_x': [[0, x]], 'rotation_y': [[0, M_SIGN * y]], 'rotation_z': [[0, M_SIGN * z]]},
                               'head': {'rotation_x': [[0, 0.0]]}, 'torso': {'rotation_x': [[0, 2.0]]}}))
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    HM = hand.matrix_world.copy()
    M = HM @ REL
    hb = BVHTree.FromPolygons([(M @ (C0 + (v - C0) * 1.03))[:] for v in HV], HP)
    n = {r: len(hb.overlap(bvh_of(_R(r), dg))) for r in TESTED if r != 'hand_' + SIDE}
    return n, (M.translation - SEAT).length


rows = []
for x in (-70.0, -85.0, -100.0, -115.0, -130.0):
    for y in (-20.0, 0.0, 20.0, 40.0):
        for z in (0.0, 15.0, 30.0):
            n, d = trial(x, y, z)
            rows.append((sum(n.values()), d, x, y, z, n))
clean = sorted([r for r in rows if r[0] == 0], key=lambda r: r[1])
pick = clean[0] if clean else min(rows, key=lambda r: (r[0], r[1]))
out = dict(fig=FIG, arm=[pick[2], pick[3], pick[4]], dist=round(pick[1], 3), overlaps=pick[5], clean_poses=len(clean))
json.dump(out, open(BASE + 'plans/%s-carry.json' % FIG, 'w'), indent=1)
result = out
