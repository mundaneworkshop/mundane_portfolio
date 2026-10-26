"""Blender-side step for make_pilot.py: where the helmet sits on the head -> plans/<FIG>-seat.json.
Run inside Blender after exec()-ing the session's devfig.py (BASE, IO, clear, build_sigfig):

    FIG = 'rebel-pilot'; exec(open(BASE + 'plans/seat_pilot.py').read())

The seat is the plan's `follow` of the head: an offset (in the head's axes) and a tilt (about the helmet's own origin) on top of the helmet's imported pose.
It is searched, not eyeballed: no triangle of the helmet may cut the head or the torso, the helmet must touch the head (its closest point within 3 mm), and the
face has to stay visible, measured by casting a grid of rays from in front at the eye / mouth band and counting how many reach the head before the helmet.
The cost of the old, hand-set seat is reported alongside for comparison.
"""
import json
from mathutils import Matrix, Vector, Euler
from mathutils.bvhtree import BVHTree

HELMET = {'rebel-pilot': 'acc_x164px2', 'tie-pilot': 'acc_30408p02'}[FIG]
OLD = {'rebel-pilot': ([0.216, 0.306, 0.317], [-15.3, 0, 0]), 'tie-pilot': ([-0.212, 0.338, 0.362], [-15.3, 5.5, -0.7])}[FIG]

clear()
build_sigfig(IO % FIG, FIG)
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-' + FIG]
_R = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
helm, head, torso = _R(HELMET), _R('head'), _R('torso')
HEADM = head.matrix_world.copy()
H0 = HEADM.inverted() @ helm.matrix_world
hl, hq, hs = H0.decompose()
HV = [v.co.copy() for v in helm.data.vertices]
HP = [p.vertices[:] for p in helm.data.polygons]


def tris(o):
    me = o.data
    return BVHTree.FromPolygons([(o.matrix_world @ v.co)[:] for v in me.vertices], [p.vertices[:] for p in me.polygons])


head_b, torso_b = tris(head), tris(torso)
hvs = [HEADM @ v.co for v in head.data.vertices]
zlo, zhi = min(v.z for v in hvs), max(v.z for v in hvs)
yfront = min(v.y for v in hvs)
xc = 0.5 * (min(v.x for v in hvs) + max(v.x for v in hvs))
hh = zhi - zlo
# the face band: eyes and mouth, 22..78 % of the head's height, a little inside its width
RAYS = [(xc + dx, zlo + hh * fz) for dx in (-0.04, -0.02, 0.0, 0.02, 0.04) for fz in (0.22, 0.38, 0.5, 0.62, 0.78)]
HEAD_PTS = hvs[::max(1, len(hvs) // 120)]


def pose(off, rot):
    rq = Euler([math.radians(a) for a in rot], 'XYZ').to_quaternion().to_matrix().to_4x4()
    return HEADM @ Matrix.Translation(Vector(off)) @ Matrix.Translation(hl) @ rq @ hq.to_matrix().to_4x4()


def measure(off, rot):
    F = pose(off, rot)
    hb = BVHTree.FromPolygons([(F @ v)[:] for v in HV], HP)
    n_head, n_torso = len(hb.overlap(head_b)), len(hb.overlap(torso_b))
    vis = 0
    for (x, z) in RAYS:
        o = Vector((x, yfront - 0.6, z))
        d = Vector((0, 1, 0))
        h1 = head_b.ray_cast(o, d, 1.5)
        h2 = hb.ray_cast(o, d, 1.5)
        if h1[0] is not None and (h2[0] is None or h1[3] <= h2[3] + 1e-5):
            vis += 1
    near = min((hb.find_nearest(p)[3] for p in HEAD_PTS if hb.find_nearest(p)[3] is not None), default=9.0)
    return dict(head=n_head, torso=n_torso, vis=vis / len(RAYS), near=near)


VIS_W = {'rebel-pilot': 300.0, 'tie-pilot': -300.0}[FIG]            # the rebel helmet has a face opening (keep the face in view); the TIE helmet is a full face cover (keep it covered)


def cost(m):
    return 10 * (m['head'] + m['torso']) + VIS_W * ((1.0 - m['vis']) if VIS_W > 0 else -m['vis']) + 2000 * max(0.0, m['near'] - 0.003)


old = measure(*OLD)
old['cost'] = cost(old)
cands = []
for dx in (-0.04, -0.02, 0.0, 0.02, 0.04):
    for dz in [i * 0.01 for i in range(-10, 13)]:
        for dy in (-0.06, -0.03, 0.0, 0.03, 0.06, 0.09):
            for rx in range(-40, 21, 10):
                off = [OLD[0][0] + dx, OLD[0][1] + dy, OLD[0][2] + dz]
                rot = [rx, OLD[1][1], OLD[1][2]]
                m = measure(off, rot)
                cands.append((cost(m), off, rot, m))
cands.sort(key=lambda c: c[0])


def polish(start):
    """Pattern search: nudge each of x, y, z and the three tilts, halving the step when nothing improves."""
    c0, off0, rot0, m0 = start
    step, ang = 0.01, 4.0
    for it in range(80):
        improved = False
        for ax in range(6):
            for sgn in (-1, 1):
                off, rot = list(off0), list(rot0)
                if ax < 3:
                    off[ax] += sgn * step
                else:
                    rot[ax - 3] += sgn * ang
                m = measure(off, rot)
                c = cost(m)
                if c < c0 - 1e-9:
                    c0, off0, rot0, m0, improved = c, off, rot, m, True
        if not improved:
            step, ang = step / 2, ang / 2
            if step < 0.0006:
                break
    return (c0, off0, rot0, m0)


# several starts (the cost surface has many pockets), the winner of them all
starts = cands[:10] + [(cost(old), list(OLD[0]), list(OLD[1]), old)]
best = min((polish(st) for st in starts), key=lambda c: c[0])
out = dict(fig=FIG, off=[round(v, 4) for v in best[1]], rot=[round(v, 2) for v in best[2]], measure=best[3], cost=best[0], old=dict(off=OLD[0], rot=OLD[1], measure=old))
json.dump(out, open(BASE + 'plans/%s-seat.json' % FIG, 'w'), indent=1)
result = out
