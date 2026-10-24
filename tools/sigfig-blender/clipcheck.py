"""Interpenetration check for a posed sig fig (run INSIDE Blender after apply_plan).

    exec(open('<repo>/tools/sigfig-blender/clipcheck.py').read())
    clipcheck('vr-gamer', [0.5, 4.35, 10.0], [('hand_r', 'acc_23186'), ('hand_l', 'acc_53118pb01')])

Returns {t: {'a|b': overlapping polygon pairs}}. Zero is clean; the C clip on a handle always touches a little."""
import bpy
from mathutils.bvhtree import BVHTree


def _tree(ob, dg):
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    mw = ev.matrix_world
    verts = [mw @ v.co for v in me.vertices]
    polys = [tuple(p.vertices) for p in me.polygons]
    t = BVHTree.FromPolygons(verts, polys)
    ev.to_mesh_clear()
    return t


def clipcheck(fig_id, times, pairs):
    coll = bpy.data.collections['sigfig-' + fig_id]
    objs = {o.get('role', o.name): o for o in coll.all_objects if o.type == 'MESH'}
    sc = bpy.context.scene
    fps = sc.render.fps
    out = {}
    for t in times:
        sc.frame_set(int(round(t * fps)))
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        trees = {}
        row = {}
        for a, b in pairs:
            for n in (a, b):
                if n not in trees:
                    trees[n] = _tree(objs[n], dg)
            row[a + '|' + b] = len(trees[a].overlap(trees[b]))
        out[t] = row
    return out


def gaps(fig_id, times, pairs):
    """Closest distance (metres) between each pair of meshes, from vertex-to-surface queries both ways (0 when they interpenetrate
    at a vertex). Use it to ask "is the hand actually touching the face?"."""
    coll = bpy.data.collections['sigfig-' + fig_id]
    objs = {o.get('role', o.name): o for o in coll.all_objects if o.type == 'MESH'}
    sc = bpy.context.scene
    fps = sc.render.fps
    out = {}
    for t in times:
        sc.frame_set(int(round(t * fps)))
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        trees, verts = {}, {}
        row = {}
        for a, b in pairs:
            for n in (a, b):
                if n not in trees:
                    ev = objs[n].evaluated_get(dg)
                    me = ev.to_mesh()
                    vs = [ev.matrix_world @ v.co for v in me.vertices]
                    trees[n] = BVHTree.FromPolygons(vs, [tuple(p.vertices) for p in me.polygons])
                    verts[n] = vs
                    ev.to_mesh_clear()
            d = 9.0
            for n, m in ((a, b), (b, a)):
                for v in verts[n][::3]:
                    hit = trees[m].find_nearest(v)
                    if hit[0] is not None:
                        d = min(d, hit[3])
            row[a + '|' + b] = round(d, 3)
        out[t] = row
    return out
