"""Blender-side step for make_pilot.py (set FIG = 'rebel-pilot' | 'tie-pilot' and STAGE = 'm1' | 'm2' before exec()-ing; BASE, IO, clear, build_sigfig, apply_plan, go
from devfig.py):

    FIG = 'rebel-pilot'; STAGE = 'm1'; exec(open(BASE + 'plans/measure_pilot.py').read())

m1: applies <fig>-m1.json (the helmet in the hand until 8 s, on the head after) and records the helmet's world pose at the release frame (in the hand) and at the
    landing frame (on the head) -> <fig>-measure.json: base_loc / base_q and seat_loc / seat_q, which the toss arc runs between.
m2: applies <fig>-m2.json (the whole motion, the hair always shown) and scans every frame: how many triangles of the helmet cut each other part of the figure (the
    holding hand is allowed to touch the rim while it holds), the frame the helmet first meets the hair on the way down (hair_hide_f) and the first frame it is clear
    of it on the way off (hair_show_f); the frames with clipping are listed in the result.
"""
import json
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

HELMET = {'rebel-pilot': 'acc_x164px2', 'tie-pilot': 'acc_30408p02'}[FIG]
SIDE = {'rebel-pilot': 'r', 'tie-pilot': 'l'}[FIG]
MP = BASE + 'plans/%s-measure.json' % FIG
plan = json.load(open(BASE + 'plans/%s-%s.json' % (FIG, STAGE)))
FPS = plan['fps']
F_REL, F_LAND = 171, 202
go(FIG, plan)
_c = bpy.data.collections['sigfig-' + FIG]
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
helm = _R(HELMET)
sc = bpy.context.scene


def at(f):
    sc.frame_set(f)
    bpy.context.view_layer.update()


def pose(o):
    l, q, s = o.matrix_world.decompose()
    return [round(v, 6) for v in l], [round(v, 6) for v in (q.w, q.x, q.y, q.z)]


if STAGE == 'm1':
    at(F_REL)
    bl, bq = pose(helm)
    at(F_LAND)
    sl, sq = pose(helm)
    res = dict(base_loc=bl, base_q=bq, seat_loc=sl, seat_q=sq)
    json.dump(res, open(MP, 'w'), indent=1)
    result = res
else:
    PARTS = ['head', 'torso', 'hips', 'leg_l', 'leg_r', 'arm_l', 'arm_r', 'hand_l', 'hand_r', 'acc_23186']
    N = int(plan['duration'] * FPS)
    dg = bpy.context.evaluated_depsgraph_get()
    hit = {p: [] for p in PARTS}
    hair_f = []
    for f in range(N):
        at(f)
        dg = bpy.context.evaluated_depsgraph_get()

        def bvh(o):
            eo = o.evaluated_get(dg)
            me = eo.to_mesh()
            b = BVHTree.FromPolygons([(eo.matrix_world @ v.co)[:] for v in me.vertices], [p.vertices[:] for p in me.polygons])
            eo.to_mesh_clear()
            return b
        hb = bvh(helm)
        for p in PARTS:
            n = len(hb.overlap(bvh(_R(p))))
            if n:
                hit[p].append((f, n))
    runs = {}
    for p, lst in hit.items():
        rr = []
        for f, n in lst:
            if rr and f - rr[-1][1] <= 1:
                rr[-1][1] = f
                rr[-1][2] = max(rr[-1][2], n)
            else:
                rr.append([f, f, n])
        runs[p] = rr
    hair = dict(hit['acc_23186'])
    down = [f for f in sorted(hair) if F_REL < f < 260]
    off_ = [f for f in sorted(hair) if f >= 250]
    hide_f = min(down) if down else F_LAND
    show_f = (max(off_) + 1) if off_ else int(10.6 * FPS)
    res = json.load(open(MP))
    res.update(hair_hide_f=hide_f, hair_show_f=show_f, runs={p: r for p, r in runs.items() if p != 'acc_23186'}, hair_runs=runs['acc_23186'])
    json.dump(res, open(MP, 'w'), indent=1)
    result = {'hair_hide_f': hide_f, 'hair_show_f': show_f, 'runs': {p: r for p, r in runs.items()}}
