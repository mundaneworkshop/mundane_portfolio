"""Galaxy-level planet model: rebuild a LEGO-style GLB as ONE continuous skin.

Removing hidden faces (build-exterior-shell.py) still leaves every brick as its own piece,
and the see-through holo shader outlines each seam, so a many-part model reads as busy.
This voxel-remeshes the whole build into a single watertight surface, decimates it, and
gives each new face the colour (material) of the nearest original face. Source is read-only.

Run (from repo root):
  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/build-remesh-solid.py -- <src.glb> <out.glb> [voxel_frac] [target_faces]
  voxel_frac   voxel size as a fraction of the model's longest side (default 0.012; bigger = blobbier)
  target_faces face budget after decimation (default 4000)
Used for:
  assets/battle/models/nano-n1.glb -> assets/models/arcade/nano-n1-planet-v2.glb (manifest mesh:arcade)
"""
import bpy, bmesh, sys, os, collections
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
VOX = float(argv[2]) if len(argv) > 2 else 0.012
TARGET = int(argv[3]) if len(argv) > 3 else 4000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
o = bpy.context.object
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# reference copy for colour lookup
ref = bmesh.new(); ref.from_mesh(o.data); ref.faces.ensure_lookup_table()
ref_tree = BVHTree.FromBMesh(ref)
ref_mat = [f.material_index for f in ref.faces]
mats = list(o.data.materials)
n0 = len(o.data.polygons)

o.data.remesh_voxel_size = max(o.dimensions) * VOX
o.data.remesh_voxel_adaptivity = 0.0
bpy.ops.object.voxel_remesh()
n1 = len(o.data.polygons)

if n1 > TARGET:
    md = o.modifiers.new('d', 'DECIMATE'); md.ratio = TARGET / n1
    bpy.ops.object.modifier_apply(modifier=md.name)

# remesh drops materials: put them back and colour each face from the nearest original face
o.data.materials.clear()
for m in mats: o.data.materials.append(m)
bm = bmesh.new(); bm.from_mesh(o.data)
for f in bm.faces:
    hit = ref_tree.find_nearest(f.calc_center_median())
    if hit[2] is not None: f.material_index = ref_mat[hit[2]]
    f.smooth = False
bm.to_mesh(o.data); bm.free()

# a solid skin has no see-through parts: make every material opaque
for m in mats:
    if m: m.blend_method = 'OPAQUE'
    bsdf = m.node_tree.nodes.get('Principled BSDF') if m and m.use_nodes else None
    if bsdf: bsdf.inputs['Alpha'].default_value = 1.0

print('faces', n0, '-> remesh', n1, '-> final', len(o.data.polygons))
print('mats', collections.Counter(p.material_index for p in o.data.polygons))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True,
                          export_yup=True, export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=6)
print('WROTE', OUT, os.path.getsize(OUT))
