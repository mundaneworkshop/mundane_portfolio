"""Builds the Space Arcade starfighter and HoloNet comms-dish GLBs.

Run:  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/build-planet-assets.py
Outputs assets/models/arcade/starfighter.glb and assets/models/holonet/comms-dish.glb.

Greys only (matching the existing GLBs' neutral palette): the site's holo shader tints
everything per planet (planetFx hot/tint), so no hue is baked in here.
"""
import bpy, bmesh, math, os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(bpy.data.filepath or __file__), '..')) if False else os.getcwd()

LIGHT = MID = DARK = None

def reset():
    global LIGHT, MID, DARK
    bpy.ops.wm.read_factory_settings(use_empty=True)
    LIGHT, MID, DARK = mat('Light', 0.55), mat('Mid', 0.3), mat('Dark', 0.05)

def mat(name, v):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (v, v, v, 1)
    b.inputs['Metallic'].default_value = 0.0
    b.inputs['Roughness'].default_value = 0.8
    return m

def finish(obj, m, smooth=False):
    obj.data.materials.append(m)
    if smooth:
        for p in obj.data.polygons: p.use_smooth = True
    return obj

def box(name, size, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m)

def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=12, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    return finish(o, m)

def lathe(name, profile, m, loc=(0, 0, 0), rot=(0, 0, 0), steps=24, closed=False):
    """Revolve (r, z) profile around Z."""
    me = bpy.data.meshes.new(name); o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in profile]
    edges = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    if closed: edges.append(bm.edges.new((vs[-1], vs[0])))
    bmesh.ops.spin(bm, geom=vs + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=steps)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o.location = loc; o.rotation_euler = rot
    return finish(o, m)

def export(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    # one object, multiple material slots (joined) -> fine for the site's per-material pass
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    o.location = (0, 0, 0)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False,
                              export_lights=False)
    print('WROTE', path, os.path.getsize(path))

def union_all(parts, name='Solid'):
    """Boolean-union every part into one watertight mesh (no interior/intersecting faces), keeping per-part materials."""
    base = parts[0]
    for o in parts[1:]:
        for ob in bpy.data.objects: ob.select_set(False)
        bpy.context.view_layer.objects.active = base; base.select_set(True)
        for m in o.data.materials:
            if m.name not in [x.name for x in base.data.materials if x]: base.data.materials.append(m)
        md = base.modifiers.new('u', 'BOOLEAN'); md.operation = 'UNION'; md.object = o; md.solver = 'EXACT'
        if hasattr(md, 'material_mode'): md.material_mode = 'TRANSFER'
        bpy.ops.object.modifier_apply(modifier=md.name)
        bpy.data.objects.remove(o, do_unlink=True)
    base.name = name
    return base

# ───────────── Arcade: starfighter (X-wing-style silhouette, nose +X) ─────────────
def starfighter():
    reset(); parts = []
    # fuselage: lathe along X (profile built on Z then rotated)
    prof = [(0.0, 3.4), (0.10, 3.3), (0.22, 2.4), (0.34, 1.0), (0.42, -0.4), (0.46, -1.6), (0.34, -2.0), (0.0, -2.0)]
    parts.append(lathe('Fuselage', prof, LIGHT, rot=(0, math.radians(90), 0), steps=12))
    # nose probe tip
    parts.append(cyl('Probe', 0.035, 0.7, (3.55, 0, 0), DARK, rot=(0, math.radians(90), 0), verts=8))
    # cockpit canopy
    parts.append(lathe('Canopy', [(0.0, 0.55), (0.2, 0.5), (0.3, 0.25), (0.32, 0.0)], DARK, loc=(0.7, 0, 0.28), rot=(0, math.radians(90), 0), steps=12))
    parts[-1].scale = (1, 0.9, 1.0)
    # four S-foil wings in X, slight sweep
    for sy in (1, -1):
        for sz in (1, -1):
            w = box('Wing', (1.9, 2.4, 0.07), (-1.2, sy * 1.35, sz * 0.62), MID, rot=(sz * sy * math.radians(0), 0, 0))
            # tilt so tips spread out in X-shape
            w.rotation_euler = (math.radians(sz * 24 * sy), 0, math.radians(sy * -8))
            bpy.context.view_layer.update()
            parts.append(w)
            # engine pod at wing tip
            ex, ey, ez = -1.0, sy * 2.35, sz * 1.05
            parts.append(cyl('Engine', 0.17, 2.2, (ex, ey, ez), LIGHT, rot=(0, math.radians(90), 0), verts=10))
            parts.append(cyl('Nozzle', 0.12, 0.18, (ex - 1.12, ey, ez), DARK, rot=(0, math.radians(90), 0), verts=10))
            # laser cannon barrel
            parts.append(cyl('Cannon', 0.035, 2.0, (ex + 1.45, ey, ez + sz * 0.04), DARK, rot=(0, math.radians(90), 0), verts=6))
    # dorsal astromech socket
    parts.append(cyl('Socket', 0.16, 0.2, (-0.9, 0, 0.52), DARK, verts=10))
    export(os.path.join(ROOT, 'assets/models/arcade/starfighter.glb'), parts)

# ───────────── HoloNet: comms dish on pylon with antenna rings ─────────────
def comms_dish():
    reset(); parts = []
    # base plinth + pylon
    parts.append(cyl('Plinth', 1.3, 0.35, (0, 0, 0), MID, verts=16, r2=1.0))
    parts.append(cyl('Collar', 0.7, 0.25, (0, 0, 0.3), DARK, verts=16))
    parts.append(cyl('Pylon', 0.22, 1.9, (0, 0, 1.2), LIGHT, verts=10, r2=0.16))
    # yoke
    parts.append(box('Yoke', (0.5, 1.1, 0.14), (0, 0, 2.1), MID))
    for s in (1, -1):
        parts.append(box('YokeArm', (0.14, 0.14, 0.7), (0, s * 0.55, 2.4), MID))
    # dish: shallow paraboloid shell tilted back toward +X
    pts = []
    n = 14
    for i in range(n + 1):
        r = 1.9 * i / n
        z = 0.32 * r * r / 1.9  # depth
        pts.append((r, z))
    shell = pts + [(r, z - 0.09) for r, z in reversed(pts)]   # closed, solid (thickness along the dish axis)
    parts.append(lathe('Dish', shell, LIGHT, loc=(0.25, 0, 2.85), rot=(0, math.radians(-50), 0), steps=24, closed=True))
    # rim ring
    parts.append(lathe('Rim', [(1.9, 0.3), (1.97, 0.3), (1.97, 0.37), (1.9, 0.37)], DARK, loc=(0.25, 0, 2.85), rot=(0, math.radians(-50), 0), steps=24, closed=True))
    # feed boom + horn along dish axis
    ax = Vector((math.sin(math.radians(50)), 0, math.cos(math.radians(50))))
    base = Vector((0.25, 0, 2.85))
    for s in (1, 2):
        pass
    tip = base + ax * 1.5
    mid = base + ax * 0.75
    parts.append(cyl('Boom', 0.04, 1.5, tuple(mid), DARK, rot=(0, math.radians(50), 0), verts=6))
    parts.append(cyl('Horn', 0.16, 0.3, tuple(tip), DARK, rot=(0, math.radians(50), 0), verts=10, r2=0.07))
    # antenna mast beside the dish with signal rings
    parts.append(cyl('Mast', 0.05, 2.6, (-0.8, 0.9, 1.6), MID, verts=6))
    for i, zc in enumerate((2.3, 2.7, 3.1)):
        parts.append(lathe('Ring%d' % i, [(0.30 - i * 0.05, 0.0), (0.34 - i * 0.05, 0.0), (0.34 - i * 0.05, 0.05), (0.30 - i * 0.05, 0.05)], LIGHT, loc=(-0.8, 0.9, zc), steps=16, closed=True))
    export(os.path.join(ROOT, 'assets/models/holonet/comms-dish.glb'), [union_all(parts, 'CommsDish')])

# starfighter()  # unused: Arcade planet uses nano-n1-planet.glb (see build-nano-n1-planet.py)
comms_dish()
