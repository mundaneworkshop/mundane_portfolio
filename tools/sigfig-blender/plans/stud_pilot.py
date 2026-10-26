"""Blender-side step for make_pilot.py: the helmet's anti-stud and the head's stud -> plans/<FIG>-stud.json.
Run inside Blender after exec()-ing the session's devfig.py (BASE, IO, clear, build_sigfig):

    FIG = 'rebel-pilot'; exec(open(BASE + 'plans/stud_pilot.py').read())

A LEGO helmet sits on a minifig head with the head's top stud in the anti-stud inside the helmet's crown. So the seat is not searched: the helmet is turned to the
head's frame exactly as the hair piece is (LDraw headgear is modelled with its origin at the stud's base), which puts the stud in the anti-stud with its top on
the anti-stud's ceiling (found by a ray up the helmet's axis from the middle of its rim). The same anti-stud is what a fingertip goes into when the helmet is balanced on a hand (`rel_tip`: the helmet's axis along the
hand's fingers, the ceiling on the fingertips). Writes both relations (helmet pose in the head's / the hand's frame) and the overlap counts at the seat.
"""
import json
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

HELMET, SIDE = {'rebel-pilot': ('acc_x164px2', 'r'), 'tie-pilot': ('acc_30408p02', 'l')}[FIG]
HAND_TIP = Vector((0.0, -0.15, 0.015))                 # the fingertips, hand-local (the hand mesh reaches y = -0.155)

clear()
build_sigfig(IO % FIG, FIG)
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-' + FIG]
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
helm, head, hand, torso = _R(HELMET), _R('head'), _R('hand_' + SIDE), _R('torso')
HV = [v.co.copy() for v in helm.data.vertices]
HP = [p.vertices[:] for p in helm.data.polygons]
hb_local = BVHTree.FromPolygons([v[:] for v in HV], HP)
zr = min(v.z for v in HV)
# the crown's axis: the middle of the shell in x / y
cx = (min(v.x for v in HV) + max(v.x for v in HV)) / 2
cy = (min(v.y for v in HV) + max(v.y for v in HV)) / 2
hit = hb_local.ray_cast(Vector((cx, cy, zr + 0.01)), Vector((0, 0, 1)), 1.0)
CEIL = Vector((cx, cy, hit[0].z)) if hit[0] is not None else Vector((cx, cy, max(v.z for v in HV) - 0.03))

# the seat: LDraw puts a headgear part's origin where it attaches, the top of the head (the stud's base), turned with the head; the hair piece sits
# exactly so. The helmet goes on the same way: its pose in the head's frame is the hair's (the stud then fills the anti-stud, ceiling on the stud's top)
HEADM = head.matrix_world.copy()
W = _R('acc_23186').matrix_world.copy()
REL_SEAT = HEADM.inverted() @ W
STUD = Vector((0, 0, max(v.co.z for v in head.data.vertices)))           # the stud's top, head-local
hbw = BVHTree.FromPolygons([(W @ v)[:] for v in HV], HP)


def bvh(o):
    return BVHTree.FromPolygons([(o.matrix_world @ v.co)[:] for v in o.data.vertices], [p.vertices[:] for p in o.data.polygons])


over = {'head': len(hbw.overlap(bvh(head))), 'torso': len(hbw.overlap(bvh(torso)))}

# balanced on the fingertips: helmet +z along the fingers (hand -y), helmet x along hand x, the ceiling on the tips
Rt = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))        # columns: helmet x -> hand x, helmet y -> hand z, helmet z -> hand -y (along the fingers)
REL_TIP = Rt.to_4x4()
REL_TIP.translation = HAND_TIP - Rt @ CEIL

out = dict(fig=FIG, helmet=HELMET, ceil_local=list(CEIL), rim_z=zr, top_z=max(v.z for v in HV), crown_depth=round(CEIL.z - zr, 4), stud_head=list(STUD),
           rel_seat=[list(r) for r in REL_SEAT], rel_tip=[list(r) for r in REL_TIP], tip_axis_hand=[0.0, -1.0, 0.0], tip_pivot_hand=list(HAND_TIP),
           seat_overlap=over)
json.dump(out, open(BASE + 'plans/%s-stud.json' % FIG, 'w'), indent=1)
result = {k: out[k] for k in ('ceil_local', 'crown_depth', 'stud_head', 'seat_overlap')}
