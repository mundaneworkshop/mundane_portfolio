"""Multi-phase choreography for a sig fig rig (run INSIDE Blender, after exec()-ing ldr_to_blender.py).

    exec(open('<repo>/tools/sigfig-blender/ldr_to_blender.py').read())
    exec(open('<repo>/tools/sigfig-blender/choreo.py').read())
    build_sigfig('/path/x.io', 'x')
    report = apply_plan('x', PLAN)            # PLAN: dict, see below (tools/sigfig-blender/plans/*.json are examples)
    export_glb('x', '/path/out.glb')          # the clip is exported as "idle"
    restore_scene()

idle_anim.py is for simple sine layers. This is for a story: several poses over a longer loop, a prop that flies
away and comes back, arms that follow it, a figure that sits and stands.

PLAN (all times in seconds; the loop is `duration` long and every channel is closed so t=0 and t=duration match):
  duration, fps
  keys:    {part: {channel: [[t, value], ...]}}      smooth (periodic Catmull-Rom) through the keys
           channels: rotation_x/y/z (degrees, a rotation in the parent's frame applied on top of the part's rest pose), location_x/y/z (LDraw units, 1 stud = 20),
                     scale_x/y/z (fraction of rest). Parts: head torso hips arm_l arm_r hand_l hand_r leg_l leg_r acc_* prop_*
  shakes:  [{part, channel, t0, t1, amp, hz, fade, phase}]   windowed oscillation added on top of keys (fade = ramp in/out, s)
  pivots:  {part: dz}    rotate about a point dz above the part's origin (world units) instead of its origin:
                         torso -0.32 bends at the waist, head -0.20 nods at the neck
  prop:    {part, keys: [{t, pos:[dx,dy,z], rot:[rx,ry,rz], scale}]}
           a free prop (the controller) is re-parented to the root and keyed in world space. dx, dy are metres from the
           figure's centre (+dx = the figure's left, +dy = behind it, -dy = in front); z is height. rot is degrees about the
           world axes, applied after the prop's base orientation (`base`: "buttons_to_player" or None).
  grips:   {name: [lx, ly, lz]}                         points in the prop's local space
  targets: {name: {frame, mode, p}}                     aim targets. frame: a part name ("head", "hips"..) or "prop";
                                                        mode "local" (p is in that frame's local space) or "rest_world"
                                                        (p = [dx, dy, z] in rest-pose world space, then carried with the frame)
  aim:     {arm_l|arm_r: [{target, w: [[t, weight], ...]}]}   the arm points its wrist at the target, blended by weight
                                                        over the keyed pose; weights are smooth between their keys
"""
import bpy, math
from mathutils import Vector, Matrix, Quaternion, Euler

_REST = {}


def _sm(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def _interp(keys, t, T):
    """Periodic Catmull-Rom through [(t, v)] on [0, T]; keys are closed (last == first) automatically."""
    ks = sorted([(float(a), float(b)) for a, b in keys])
    if ks[0][0] > 0:
        ks.insert(0, (0.0, ks[-1][1] if ks[-1][0] >= T else ks[0][1]))
    if ks[-1][0] < T:
        ks.append((T, ks[0][1]))
    else:
        ks[-1] = (T, ks[0][1])
    n = len(ks)
    if t <= 0:
        return ks[0][1]
    if t >= T:
        return ks[-1][1]
    i = 0
    while i < n - 2 and ks[i + 1][0] < t:
        i += 1
    t1, v1 = ks[i]
    t2, v2 = ks[i + 1]
    if n == 2:
        return v1 + (v2 - v1) * _sm((t - t1) / (t2 - t1))
    if i == 0:
        t0, v0 = ks[-2][0] - T, ks[-2][1]
    else:
        t0, v0 = ks[i - 1]
    if i + 1 == n - 1:
        t3, v3 = ks[1][0] + T, ks[1][1]
    else:
        t3, v3 = ks[i + 2]
    h = t2 - t1
    u = (t - t1) / h
    m1 = (v2 - v0) / (t2 - t0) * h
    m2 = (v3 - v1) / (t3 - t1) * h
    u2, u3 = u * u, u * u * u
    return (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * m2


def _weight(pts, t):
    """Smooth piecewise weight through [(t, w)], held before the first and after the last point."""
    pts = sorted(pts)
    if t <= pts[0][0]:
        return pts[0][1]
    for (a, wa), (b, wb) in zip(pts, pts[1:]):
        if t <= b:
            return wa + (wb - wa) * _sm((t - a) / max(1e-6, b - a))
    return pts[-1][1]


def _shake(sh, t):
    if t < sh['t0'] or t > sh['t1']:
        return 0.0
    f = max(1e-3, sh.get('fade', 0.15))
    env = _sm((t - sh['t0']) / f) * _sm((sh['t1'] - t) / f)
    return sh['amp'] * env * math.sin(2 * math.pi * sh['hz'] * (t - sh['t0']) + sh.get('phase', 0.0))


def _rig(fig_id):
    coll = bpy.data.collections['sigfig-' + fig_id]
    objs = {o.get('role', o.name): o for o in coll.all_objects if o.type == 'MESH'}
    root = next(o for o in coll.all_objects if o.type == 'EMPTY')
    return coll, objs, root


def _to_rest(objs):
    for o in objs.values():
        if o.animation_data:
            o.animation_data_clear()
        r = list(o['rest'])
        o.rotation_mode = 'XYZ'
        o.location, o.rotation_euler, o.scale = r[0:3], r[3:6], r[6:9]
    bpy.context.view_layer.update()


def _base_matrix(name):
    if name == 'buttons_to_player':          # local x -> world X (width), local y -> down, local z (the button face) -> +Y (toward the player)
        return Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))     # columns are the images of local x, y, z
    return Matrix.Identity(3)


def apply_plan(fig_id, plan):
    coll, objs, root = _rig(fig_id)
    sc = bpy.context.scene
    saved = _SAVED_SCENE.setdefault('s', dict(fps=sc.render.fps, fs=sc.frame_start, fe=sc.frame_end, cur=sc.frame_current))
    T = float(plan['duration'])
    fps = int(plan.get('fps', 24))
    N = int(round(T * fps))
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = 0, N

    prop_role = plan.get('prop', {}).get('part')
    prop = objs.get(prop_role) if prop_role else None
    if prop is not None and prop.parent is not root:                 # a free prop: world-space keys, so it must not ride a hand
        mw = prop.matrix_world.copy()
        prop.parent = root
        prop.matrix_parent_inverse = root.matrix_world.inverted()
        prop.matrix_world = mw
        prop['rest'] = list(prop.location) + list(prop.rotation_euler) + list(prop.scale)
    _to_rest(objs)

    # rest-pose measurements (world space) taken with everything at rest
    rest_o = {n: o.matrix_world.translation.copy() for n, o in objs.items()}
    rest_m = {n: o.matrix_world.copy() for n, o in objs.items()}
    center = Vector((rest_o['hips'].x, rest_o['hips'].y, 0.0)) if 'hips' in rest_o else Vector((0, 0, 0))
    q0 = {n: Euler(list(o['rest'])[3:6], 'XYZ').to_quaternion() for n, o in objs.items()}
    loc0 = {n: Vector(list(o['rest'])[0:3]) for n, o in objs.items()}
    scl0 = {n: Vector(list(o['rest'])[6:9]) for n, o in objs.items()}
    arm_vec = {}                                                      # shoulder -> wrist, in the arm's own rest frame
    for a, h in (('arm_l', 'hand_l'), ('arm_r', 'hand_r')):
        if a in objs and h in objs:
            arm_vec[a] = rest_m[a].to_3x3().inverted() @ (rest_o[h] - rest_o[a])

    keys = plan.get('keys', {})
    shakes = plan.get('shakes', [])
    pivots = plan.get('pivots', {})
    aims = plan.get('aim', {})
    arms = set(aims)

    def delta(part, chan, t):
        v = _interp(keys[part][chan], t, T) if part in keys and chan in keys[part] else 0.0
        for sh in shakes:
            if sh['part'] == part and sh['channel'] == chan:
                v += _shake(sh, t)
        return v

    def touched(part):
        ch = set(keys.get(part, {}))
        ch |= {s['channel'] for s in shakes if s['part'] == part}
        return ch

    report = {'frames': N + 1, 'duration': T, 'parts_keyed': [], 'missing': []}
    # ---- pass A: everything that is not an aimed arm
    for part in set(keys) | {s['part'] for s in shakes}:
        if part not in objs:
            report['missing'].append(part)
    for part, ob in objs.items():
        ch = touched(part)
        if not ch or part in arms or part == prop_role:
            continue
        report['parts_keyed'].append(part)
        dz = pivots.get(part)
        has_rot = any(('rotation_' + a) in ch for a in 'xyz')
        ob.rotation_mode = 'QUATERNION'
        prevq = None
        for f in range(0, N + 1):
            t = f / fps
            rot = [delta(part, 'rotation_' + a, t) for a in 'xyz']
            # the delta is applied in the PARENT's frame, before the part's own rest rotation (some parts, the legs, carry a
            # built-in 180 degree turn, and adding Euler angles to that would swing them backwards)
            Qd = Euler([math.radians(r) for r in rot], 'XYZ').to_quaternion()
            Q = Qd @ q0[part]
            if prevq is not None and Q.dot(prevq) < 0:
                Q.negate()
            prevq = Q
            ob.rotation_quaternion = Q
            loc = loc0[part].copy()
            for i, a in enumerate('xyz'):
                if ('location_' + a) in ch:
                    loc[i] += delta(part, 'location_' + a, t) * 0.01
            if dz is not None and has_rot:
                R = Qd
                offs = Vector((0, 0, dz))
                loc += (R @ (-offs)) + offs                      # rotate about the point `offs` above the origin
            ob.location = loc
            sc_v = scl0[part].copy()
            for i, a in enumerate('xyz'):
                if ('scale_' + a) in ch:
                    sc_v[i] = scl0[part][i] * (1.0 + delta(part, 'scale_' + a, t))
            ob.scale = sc_v
            if has_rot:
                ob.keyframe_insert(data_path='rotation_quaternion', frame=f)
            for chan, path in (('location', 'location'), ('scale', 'scale')):
                for i, a in enumerate('xyz'):
                    if (chan + '_' + a) in ch:
                        ob.keyframe_insert(data_path=path, index=i, frame=f)

    # ---- the prop (world-space keys)
    if prop is not None:
        pk = sorted(plan['prop']['keys'], key=lambda k: k['t'])
        base = _base_matrix(plan['prop'].get('base'))
        prop.rotation_mode = 'QUATERNION'
        report['parts_keyed'].append(prop_role)
        prev = None
        for f in range(0, N + 1):
            t = f / fps
            def ch(fn):
                return _interp([(k['t'], fn(k)) for k in pk], t, T)
            pos = Vector((ch(lambda k: k['pos'][0]), ch(lambda k: k['pos'][1]), ch(lambda k: k['pos'][2])))
            rx, ry, rz = (ch(lambda k, i=i: k['rot'][i]) for i in range(3))
            s = max(0.0, ch(lambda k: k.get('scale', 1.0)))
            R = Euler((math.radians(rx), math.radians(ry), math.radians(rz)), 'XYZ').to_matrix() @ base
            q = R.to_quaternion()
            if prev is not None and q.dot(prev) < 0:
                q.negate()
            prev = q
            prop.location = center + pos
            prop.rotation_quaternion = q
            prop.scale = (s, s, s) if s > 1e-4 else (1e-4, 1e-4, 1e-4)
            prop.keyframe_insert('location', frame=f)
            prop.keyframe_insert('rotation_quaternion', frame=f)
            prop.keyframe_insert('scale', frame=f)

    # ---- pass B: arms aimed at moving targets
    if arms:
        targets = plan.get('targets', {})
        grips = plan.get('grips', {})
        local_cache = {}
        for name, tg in targets.items():
            if tg['mode'] == 'rest_world' and tg['frame'] in rest_m:
                p = center + Vector(tg['p'])
                local_cache[name] = rest_m[tg['frame']].inverted() @ p
            else:
                local_cache[name] = Vector(tg['p'])

        def target_world(name):
            tg = targets[name]
            fr = tg['frame']
            if fr == 'prop':
                return prop.matrix_world @ local_cache[name]
            return objs[fr].matrix_world @ local_cache[name]

        for a in arms:
            objs[a].rotation_mode = 'QUATERNION'
        prevq = {a: None for a in arms}
        for f in range(0, N + 1):
            t = f / fps
            sc.frame_set(f)
            bpy.context.view_layer.update()
            for a in arms:
                ob = objs[a]
                rot = [delta(a, 'rotation_' + c, t) for c in 'xyz']
                Q = Euler([math.radians(r) for r in rot], 'XYZ').to_quaternion() @ q0[a]
                par = ob.parent
                B3 = (par.matrix_world @ ob.matrix_parent_inverse).to_3x3()
                R0 = B3 @ q0[a].to_matrix()
                v0 = (R0 @ arm_vec[a]).normalized()
                pivot = ob.matrix_world.translation
                for ent in aims[a]:
                    w = _weight(ent['w'], t)
                    if w <= 1e-4:
                        continue
                    T_w = target_world(ent['target'])
                    d = T_w - pivot
                    if d.length < 1e-5:
                        continue
                    Rt = v0.rotation_difference(d.normalized()).to_matrix() @ R0
                    Qa = (B3.inverted() @ Rt).to_quaternion()
                    if Q.dot(Qa) < 0:
                        Qa.negate()
                    Q = Q.slerp(Qa, w)
                if prevq[a] is not None and Q.dot(prevq[a]) < 0:
                    Q.negate()
                prevq[a] = Q
                ob.rotation_quaternion = Q
                ob.keyframe_insert('rotation_quaternion', frame=f)
        report['parts_keyed'] += sorted(arms)
    # name the actions (the exporter merges them into one glTF animation)
    for n, o in objs.items():
        if o.animation_data and o.animation_data.action:
            o.animation_data.action.name = 'idle_' + n
    sc.frame_set(0)
    return report


_SAVED_SCENE = {}


def restore_scene():
    s = _SAVED_SCENE.pop('s', None)
    if s:
        sc = bpy.context.scene
        sc.render.fps, sc.frame_start, sc.frame_end = s['fps'], s['fs'], s['fe']
        sc.frame_set(s['cur'])
