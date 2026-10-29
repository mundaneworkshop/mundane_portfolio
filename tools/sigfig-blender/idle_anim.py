"""Idle loop for a sig fig built by ldr_to_blender.py (run INSIDE Blender, after exec()-ing that file).

    exec(open('<repo>/tools/sigfig-blender/idle_anim.py').read())
    report = apply_idle('vr-gamer', SPEC)        # keyframes the rig; SPEC is the dict described below
    ... export_glb('vr-gamer', '/path/out.glb')  # exports it as the glTF animation named "idle"
    restore_scene()                               # puts the scene's fps / frame range back

SPEC (plain JSON, so a request can store it and it can be re-run or tweaked):
    {"duration": 4.0, "fps": 24,
     "layers": [ {"part": "head", "channel": "rotation_z", "amp": 12, "cycles": 1, "phase": 0.0}, ... ]}

A layer adds  amp * sin(2*pi*(cycles * t/duration + phase))  to one channel of one part, on top of its rest pose.
`cycles` is a whole number, so every layer repeats exactly within `duration` and the loop has no seam.
Channels and units:
    rotation_x / rotation_y / rotation_z   degrees, about the PART'S OWN pivot (shoulder, hip, neck, wrist)
    location_x / location_y / location_z   LDraw units (1 stud = 20; the figure is ~100 tall), in the part's local axes
    scale_x / scale_y / scale_z            fraction of rest scale (0.01 = breathe 1% bigger)
Axes for the upright parts: x = side to side (rotation_x nods / swings a limb forward and back), y = front to back
(rotation_y tilts / rolls sideways), z = up (rotation_z turns left and right). A positive rotation_z turns counter-clockwise from above.
Parts are the role names ldr_to_blender.py gives (the object custom property 'role'; the Blender object name is '<fig>:<role>'): head, torso, hips, arm_l, arm_r, hand_l, hand_r, leg_l, leg_r, and acc_* / prop_*.
Keep the feet planted: animate torso / head / arms / hands, not hips rotation (the legs hang off the hips).
"""
import bpy, math

_SAVED = {}
LDU = 0.01      # keep in step with ldr_to_blender.SCALE


def _rest(ob):
    if 'rest' not in ob:                       # first time: remember the rest pose
        ob['rest'] = list(ob.location) + list(ob.rotation_euler) + list(ob.scale)
    r = list(ob['rest'])
    return r[0:3], r[3:6], r[6:9]


def apply_idle(fig_id, spec):
    coll = bpy.data.collections['sigfig-' + fig_id]
    objs = {o.get('role', o.name): o for o in coll.all_objects if o.type == 'MESH'}
    sc = bpy.context.scene
    _SAVED.setdefault('scene', dict(fps=sc.render.fps, fs=sc.frame_start, fe=sc.frame_end, cur=sc.frame_current))
    dur = float(spec.get('duration', 4.0))
    fps = int(spec.get('fps', 24))
    n = max(2, int(round(dur * fps)))
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = 0, n          # start at frame 0 so the glTF clip runs 0..duration with no leading hold
    report = {'frames': n + 1, 'duration': n / fps, 'missing_parts': [], 'layers': 0}
    # reset every part to rest and drop old animation
    for o in objs.values():
        if o.animation_data:
            o.animation_data_clear()
        loc, rot, scl = _rest(o)
        o.location, o.rotation_euler, o.scale = loc, rot, scl
    by_part = {}
    for L in spec.get('layers', []):
        if L['part'] not in objs:
            if L['part'] not in report['missing_parts']:
                report['missing_parts'].append(L['part'])
            continue
        by_part.setdefault(L['part'], []).append(L)
        report['layers'] += 1
    ch_map = {'rotation': 'rotation_euler', 'location': 'location', 'scale': 'scale'}
    for part, layers in by_part.items():
        ob = objs[part]
        loc0, rot0, scl0 = _rest(ob)
        base = {'rotation': rot0, 'location': loc0, 'scale': scl0}
        used = set()
        for L in layers:
            kind, ax = L['channel'].split('_')
            used.add((kind, 'xyz'.index(ax)))
        for f in range(0, n + 1):
            t = f / n                                          # 0..1 over the loop; the last frame equals the first
            vals = {(k, i): base[k][i] for (k, i) in used}
            for L in layers:
                kind, ax = L['channel'].split('_')
                i = 'xyz'.index(ax)
                w = math.sin(2 * math.pi * (int(L.get('cycles', 1)) * t + float(L.get('phase', 0.0))))
                a = float(L.get('amp', 0.0))
                if kind == 'rotation':
                    vals[(kind, i)] += math.radians(a) * w
                elif kind == 'location':
                    vals[(kind, i)] += a * LDU * w
                else:
                    vals[(kind, i)] += a * w * base['scale'][i]
            for (k, i), v in vals.items():
                getattr(ob, ch_map[k])[i] = v
            for k, i in used:
                ob.keyframe_insert(data_path=ch_map[k], index=i, frame=f)
        if ob.animation_data and ob.animation_data.action:
            ob.animation_data.action.name = 'idle_' + part
    sc.frame_set(0)
    return report


def restore_scene():
    s = _SAVED.pop('scene', None)
    if s:
        sc = bpy.context.scene
        sc.render.fps, sc.frame_start, sc.frame_end = s['fps'], s['fs'], s['fe']
        sc.frame_set(s['cur'])
