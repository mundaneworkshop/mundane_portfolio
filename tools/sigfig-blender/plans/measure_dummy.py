"""Blender-side: applies the dummy's run-only plan and measures every piece at the wall (T_I): its bounding-box centre, its origin and how high its centre rides
when it lies at its final tumble angle -> slate-dummy-measure.json. Needs slate-dummy-table.json (python3 make_slate_dummy.py measure > slate-dummy-run.json)."""
import json
from mathutils import Quaternion
table = json.load(open(BASE + 'plans/slate-dummy-table.json'))
go('slate-dummy', json.load(open(BASE + 'plans/slate-dummy-run.json')))
bpy.context.scene.frame_set(int(round(T_I * 24)))
bpy.context.view_layer.update()
_c = bpy.data.collections['sigfig-slate-dummy']
_RR = lambda r: [o for o in _c.all_objects if o.get('role') == r][0]
out = {}
for name, pc in table.items():
    mem = [_RR(m) for m in pc['members']]
    vs = [o.matrix_world @ v.co for o in mem for v in o.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    cen = (lo + hi) / 2
    q = Quaternion(Vector(pc['axis']).normalized(), math.radians(pc['theta']))
    zmin = min((q @ (v - cen)).z for v in vs)
    out[name] = {'c': [round(x, 5) for x in cen], 'o': [round(x, 5) for x in mem[0].matrix_world.translation], 'r_final': round(-zmin + 0.002, 4),
                 'size': [round(x, 3) for x in (hi - lo)]}
open(BASE + 'plans/slate-dummy-measure.json', 'w').write(json.dumps(out, indent=1))
result = out
