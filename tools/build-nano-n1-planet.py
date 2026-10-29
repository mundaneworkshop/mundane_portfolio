"""Galaxy-level Arcade planet model: boolean-union of the game N-1 hero ship into one solid.
Run: /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/build-nano-n1-planet.py  (from repo root)
Reads assets/battle/models/nano-n1.glb (used by the game; never modified) and writes
assets/models/arcade/nano-n1-planet.glb (used only by manifest key mesh:arcade).
"""
import bpy, bmesh, os, time, collections
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='assets/battle/models/nano-n1.glb')  # game model, read-only
o=[x for x in bpy.data.objects if x.type=='MESH'][0]
bpy.context.view_layer.objects.active=o; o.select_set(True)
def stats(tag):
    bm=bmesh.new(); bm.from_mesh(o.data)
    seen=set(); n=0; nonman=sum(1 for e in bm.edges if not e.is_manifold)
    for f in bm.faces:
        if f.index in seen: continue
        n+=1; st=[f]; seen.add(f.index)
        while st:
            c=st.pop()
            for e in c.edges:
                for nf in e.link_faces:
                    if nf.index not in seen: seen.add(nf.index); st.append(nf)
    print(tag,'verts',len(o.data.vertices),'faces',len(o.data.polygons),'islands',n,'nonmanifold edges',nonman)
    bm.free()
stats('BEFORE')
# weld coincident verts first so touching pieces fuse
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=1e-5)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
stats('WELDED')
t=time.time()
bpy.ops.mesh.primitive_cube_add(size=0.001, location=(50,50,50)); tmp=bpy.context.object
for ob in bpy.data.objects: ob.select_set(False)
bpy.context.view_layer.objects.active=o; o.select_set(True)
md=o.modifiers.new('u','BOOLEAN'); md.operation='UNION'; md.solver='EXACT'; md.operand_type='OBJECT'; md.object=tmp
md.use_self=True; md.use_hole_tolerant=True
if hasattr(md,'material_mode'): md.material_mode='TRANSFER'
bpy.ops.object.modifier_apply(modifier=md.name)
bpy.data.objects.remove(tmp,do_unlink=True)
# the union operand (tiny dummy cube parked at 50,50,50) is merged into the result: remove it
bm=bmesh.new(); bm.from_mesh(o.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if max(abs(c) for c in v.co) > 10], context='VERTS')
bm.to_mesh(o.data); bm.free()
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.mesh.delete_loose()
bpy.ops.object.mode_set(mode='OBJECT')
print('union secs',round(time.time()-t,1))
stats('AFTER')
print('mats',[m.name for m in o.data.materials], collections.Counter(p.material_index for p in o.data.polygons))
os.makedirs('assets/models/arcade',exist_ok=True)
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
out='assets/models/arcade/nano-n1-planet.glb'
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('WROTE',os.path.getsize(out))
