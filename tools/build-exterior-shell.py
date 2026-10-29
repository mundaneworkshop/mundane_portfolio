"""Galaxy-level planet models: keep only the OUTER SHELL of a LEGO-style GLB.

The galaxy holo shader is see-through and outlines every surface, so hidden interior
pieces (inner bricks, tubes, hollow undersides) read as dense clutter. This removes every
face that no ray from outside can reach, keeping per-face colours. Source files are read-only.

Run (from repo root):
  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/build-exterior-shell.py -- <src.glb> <out.glb> [rays] [eps_frac]
Used for:
  assets/battle/models/nano-n1.glb            -> assets/models/arcade/nano-n1-planet-v2.glb   (manifest mesh:arcade)
  assets/models/holonet/endor-shield.glb      -> assets/models/holonet/endor-shield-planet-v2.glb (manifest mesh:contact)
"""
import bpy, bmesh, sys, os, math, time, collections
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
RAYS = int(argv[2]) if len(argv) > 2 else 48
EPS = float(argv[3]) if len(argv) > 3 else 0.004   # ray start offset, fraction of model size

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
o = bpy.context.object
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=1e-5)
bpy.ops.object.mode_set(mode='OBJECT')

bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
size = max(o.dimensions)
n0 = len(bm.faces)
# transparent parts (e.g. 'Trans-Clear' canopies) must not hide the opaque parts behind them
clear = {i for i, m in enumerate(o.data.materials) if m and 'trans' in m.name.lower()}
obm = bm.copy(); obm.faces.ensure_lookup_table()
bmesh.ops.delete(obm, geom=[f for f in obm.faces if f.material_index in clear], context='FACES')
tree = BVHTree.FromBMesh(obm, epsilon=0.0)

# Fibonacci sphere directions
dirs = []
for i in range(RAYS):
    y = 1 - 2 * (i + .5) / RAYS; r = math.sqrt(1 - y * y); th = math.pi * (3 - math.sqrt(5)) * i
    dirs.append(Vector((math.cos(th) * r, y, math.sin(th) * r)))

t = time.time()
keep = []
for f in bm.faces:
    c = f.calc_center_median(); n = f.normal
    seen = False
    # recessed-but-visible faces (slots, panels) only escape through a narrow cone around their own
    # normal, which a sphere-wide sample misses: also fan rays around +/- the normal (up to ~50 deg)
    t1 = n.cross(Vector((0, 0, 1)) if abs(n.z) < .9 else Vector((1, 0, 0))).normalized(); t2 = n.cross(t1)
    cone = [n.copy()]
    for k in range(16):
        a = k * math.tau / 16; w = 0.85 if k % 2 else 0.4
        cone.append((n + (t1 * math.cos(a) + t2 * math.sin(a)) * w).normalized())
    for d in cone + [-x for x in cone] + dirs:
        # a face is exposed if a ray leaving either side of it escapes the model
        for sgn in (1, -1):
            dd = d if d.dot(n) * sgn >= 0 else None
            if dd is None: continue
            start = c + n * (EPS * size * sgn)
            if tree.ray_cast(start, d)[0] is None:
                seen = True; break
        if seen: break
    keep.append(seen)
print('raycast secs', round(time.time() - t, 1))
dead = [f for f, k in zip(bm.faces, keep) if not k]
bmesh.ops.delete(bm, geom=dead, context='FACES')
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context='VERTS')
print('faces', n0, '->', len(bm.faces))
bm.to_mesh(o.data); bm.free()

# drop only specks (islands under 8 faces); real small parts (stalks, studs) must survive
bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
seen = set(); islands = []
for f in bm.faces:
    if f.index in seen: continue
    st = [f]; seen.add(f.index); cur = [f]
    while st:
        c_ = st.pop()
        for e in c_.edges:
            for nf in e.link_faces:
                if nf.index not in seen: seen.add(nf.index); st.append(nf); cur.append(nf)
    islands.append(cur)
tot = len(bm.faces)
small = [f for isl in islands if len(isl) < 8 for f in isl]
bmesh.ops.delete(bm, geom=small, context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
print('islands', len(islands), 'faces', tot, '->', len(bm.faces))
bm.to_mesh(o.data); bm.free()

print('mats', collections.Counter(p.material_index for p in o.data.polygons))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True,
                          export_yup=True, export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=6)
print('WROTE', OUT, os.path.getsize(OUT))
