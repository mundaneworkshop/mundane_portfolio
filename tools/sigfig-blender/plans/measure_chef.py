"""Blender-side: applies the current chef plan without the egg's landing data and records how the pan moves between the egg's take-off (7.2 s) and landing (8.05 s):
the egg's world-space offset and rotation from the take-off pose to the pan-seated landing pose -> chef-solve.json ('egg_land', 'egg_takeoff_q'). Run after solve_chef.py."""
import json, subprocess, sys
S = json.load(open(BASE + 'plans/chef-solve.json'))
for k in ('egg_land', 'egg_takeoff_q'):
    S.pop(k, None)
json.dump(S, open(BASE + 'plans/chef-solve.json', 'w'))
p = subprocess.run([sys.executable if False else '/usr/bin/python3', BASE + 'plans/make_chef.py'], capture_output=True, text=True, cwd=BASE + 'plans')
plan0 = json.loads(p.stdout)
go('chef', plan0)
_c = bpy.data.collections['sigfig-chef']
_pan = [o for o in _c.all_objects if o.get('role') == 'acc_4528'][0]
REL = Matrix(((1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0.0205), (0, 0, 0, 1)))
def seat(t):
    bpy.context.scene.frame_set(int(round(t * 24)))
    bpy.context.view_layer.update()
    return _pan.matrix_world @ REL
A, B = seat(7.2), seat(8.05)
qa, qb = A.to_quaternion(), B.to_quaternion()
dq = qb @ qa.inverted()
S['egg_land'] = {'off': [round(v, 5) for v in (B.translation - A.translation)], 'q': [round(v, 6) for v in (dq.w, dq.x, dq.y, dq.z)]}
S['egg_takeoff_q'] = [round(v, 6) for v in (qa.w, qa.x, qa.y, qa.z)]
json.dump(S, open(BASE + 'plans/chef-solve.json', 'w'))
result = {'egg_land': S['egg_land']}
