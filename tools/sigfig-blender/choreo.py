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
  pivots:  {part: dz}    rotate about a point dz above the part's origin (world units) instead of its origin
  bend:    {part: {zone, segments}}   torso and head are SKINNED, not rotated as rigid blocks: a short chain of bones runs up the
                         bottom `zone` metres of the mesh (`segments` bones), the mesh is sliced there and weighted along the chain,
                         and rotation_x/y/z on that part become bend forward / bend sideways / twist spread along the chain.
                         The bottom of the mesh never moves (the torso stays flush on the hips, the head on the torso) and the
                         geometry stretches between. Default: torso {zone 0.32, segments 4}, head {zone 0.12, segments 3}.
                         Children (arms, headset, hair) are parented to the bone at their height.
  prop:    {part, keys: [{t, pos:[dx,dy,z], rot:[rx,ry,rz], scale}]}
           a free prop (the controller) is re-parented to the root and keyed in world space. dx, dy are metres from the
           figure's centre (+dx = the figure's left, +dy = behind it, -dy = in front); z is height. rot is degrees about the
           world axes, applied after the prop's base orientation (`base`: "print_up_handles_in", "buttons_to_player" or None).
  grips:   {name: [lx, ly, lz]}                         points in the prop's local space
  hand_grips: {arm_l|arm_r: {target, handle_axis, open}}   while that arm's aim weight on `target` is up, the arm AND the hand (turned in its
                         wrist socket) are solved so the hand's C clip ring sits on the target point, its ring axis lies along the
                         prop-local `handle_axis`, and its opening faces the prop-local `open` direction (default: away from the print)
  targets: {name: {frame, mode, p, o?}}            o: optional world-space offset added to the target (a fist that must clear the headset)                     aim targets. frame: a part name ("hips"..), a bone ("head_3"), or "prop";
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
    if name == 'print_up_handles_in':        # print face (local +z) up, handles (local -y) toward the figure: a half turn about Z
        return Matrix(((-1, 0, 0), (0, -1, 0), (0, 0, 1)))
    return Matrix.Identity(3)


# the LDraw hand's C clip, in the hand's own frame (measured: ring centre, ring axis, direction of the opening)
HAND_RING = dict(center=(0.0, -0.114, 0.04), axis=(0.0, 0.999, -0.035), opening=(0.0, -0.035, -0.999))


def _solve_grip(Barm, aloc, ascl, Q0, PIh, hloc, hscl, qh0, ring, G, D, Od, x0=None, iters=10):
    """Least squares for (arm rotation vector, hand rotation vector): ring centre -> G, ring axis || D, opening -> Od."""
    import numpy as np
    rc, ra, ro = (Vector(HAND_RING['center']), Vector(HAND_RING['axis']).normalized(), Vector(HAND_RING['opening']).normalized())

    def quat(v):
        v = Vector(v)
        return Quaternion(v.normalized(), v.length) if v.length > 1e-9 else Quaternion((1, 0, 0, 0))

    def resid(x):
        Qa = quat(x[0:3]) @ Q0
        Aw = Barm @ Matrix.LocRotScale(aloc, Qa, ascl)
        Hw = Aw @ PIh @ Matrix.LocRotScale(hloc, quat(x[3:6]) @ qh0, hscl)
        H3 = Hw.to_3x3()
        c = Hw @ rc
        a = (H3 @ ra).normalized()
        o = (H3 @ ro).normalized()
        r = list((c - G) / 0.01) + list(a.cross(D) / 0.04) + list((o - Od) / 0.6) + list(np.asarray(x) / 0.8)
        return np.array(r), Qa, quat(x[3:6]) @ qh0

    def run(x):
        lam = 1e-2
        r, _, _ = resid(x)
        for _ in range(iters):
            J = np.zeros((len(r), 6))
            for k in range(6):
                dx = np.zeros(6)
                dx[k] = 1e-4
                J[:, k] = (resid(x + dx)[0] - r) / 1e-4
            step = np.linalg.solve(J.T @ J + lam * np.eye(6), -J.T @ r)
            r2, _, _ = resid(x + step)
            if (r2 ** 2).sum() < (r ** 2).sum():
                x, r = x + step, r2
                lam = max(lam * 0.5, 1e-6)
            else:
                lam *= 4
        return x, r

    # the hand can be turned either way round its ring axis: start from "as is" and from a half turn, keep the better one
    Rh = (PIh @ Matrix.LocRotScale(hloc, qh0, hscl)).to_3x3()
    flip = np.array(list((Rh @ ra).normalized() * 3.14159))
    starts = [np.zeros(6) if x0 is None else np.array(x0, dtype=float), np.concatenate([np.zeros(3), flip])]
    best = None
    for st in starts:
        x, r = run(st)
        c = float((r ** 2).sum())
        if best is None or c < best[0]:
            best = (c, x)
    x = best[1]
    r, Qa, Qh = resid(x)
    return x, Qa, Qh, (Vector(r[0:3]) * 0.01).length


def _bone_parent(o, arm_obj, bone_name, mw0):
    """Re-parent o to a bone without moving it at rest (it stays at world matrix mw0): world = P_pose * P_rest^-1 * mw0."""
    Mb = o.matrix_basis.copy()
    o.parent = arm_obj
    o.parent_type = 'BONE'
    o.parent_bone = bone_name
    o.matrix_parent_inverse = Matrix.Identity(4)
    bpy.context.view_layer.update()
    P = o.matrix_world @ Mb.inverted()
    o.matrix_parent_inverse = P.inverted() @ mw0 @ Mb.inverted()


def _build_bend_rig(fig_id, coll, objs, root, cfg, rest_o, prop_role):
    """Slice + weight the bend parts and give them a bone chain. Returns (arm_obj, chains)."""
    import bmesh
    mw0 = {o: o.matrix_world.copy() for o in objs.values()}              # rest world matrices (the figure root may be offset)
    par = objs.get('hips') or root
    arm_data = bpy.data.armatures.new('rig-' + fig_id)
    arm_obj = bpy.data.objects.new('rig-' + fig_id, arm_data)
    coll.objects.link(arm_obj)
    arm_obj.parent = par
    arm_obj.matrix_parent_inverse = par.matrix_world.inverted()       # armature world = identity at rest
    chains = {}
    for part in [p for p in ('torso', 'head') if p in cfg]:
        L, N = float(cfg[part]['zone']), int(cfg[part]['segments'])
        zb = min(v.co.z for v in objs[part].data.vertices)
        B = rest_o[part] + Vector((0, 0, zb))
        chains[part] = dict(L=L, N=N, zb=zb, B=B, names=['%s_%d' % (part, k) for k in range(N + 1)])
    view = bpy.context.view_layer
    for o in view.objects:
        o.select_set(False)
    view.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones
    for part, ch in chains.items():
        prev = None
        for k, name in enumerate(ch['names']):
            b = eb.new(name)
            b.head = ch['B'] + Vector((0, 0, ch['L'] * k / ch['N']))
            b.tail = b.head + Vector((0, 0, ch['L'] / ch['N'] if k < ch['N'] else 0.06))
            b.roll = 0.0
            if prev is not None:
                b.parent = prev
            prev = b
    if 'head' in chains and 'torso' in chains:
        eb[chains['head']['names'][0]].parent = eb[chains['torso']['names'][-1]]
    bpy.ops.object.mode_set(mode='OBJECT')
    for part, ch in chains.items():
        ob, L, N, zb = objs[part], ch['L'], ch['N'], ch['zb']
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        cuts = 2 * N
        for k in range(1, cuts + 1):                                    # slice the zone so it has something to bend
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-7, plane_co=(0, 0, zb + L * k / cuts), plane_no=(0, 0, 1))
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
        ob.vertex_groups.clear()
        vgs = [ob.vertex_groups.new(name=n) for n in ch['names']]
        for v in ob.data.vertices:
            x = min(max((v.co.z - zb) / (L / N), 0.0), float(N))
            k = int(math.floor(x))
            f = x - k
            if k >= N:
                vgs[N].add([v.index], 1.0, 'REPLACE')
            else:
                if 1 - f > 1e-4:
                    vgs[k].add([v.index], 1 - f, 'REPLACE')
                if f > 1e-4:
                    vgs[k + 1].add([v.index], f, 'REPLACE')
        mod = ob.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm_obj
    kids = [o for o in objs.values() if o.parent is not None and o.get('role') not in chains and o.get('role') != prop_role]
    for o in kids:
        for part, ch in chains.items():
            if o.parent is objs[part]:
                sh = rest_o[o['role']].z - ch['B'].z
                idx = min(max(int(round(sh / (ch['L'] / ch['N']))), 0), ch['N'])
                _bone_parent(o, arm_obj, ch['names'][idx], mw0[o])
    for part in chains:                                                  # the skinned meshes hang off the armature
        ob = objs[part]
        ob.parent = arm_obj
        ob.matrix_parent_inverse = arm_obj.matrix_world.inverted() @ mw0[ob] @ ob.matrix_basis.inverted()
    for part, ch in chains.items():                                      # bone rest orientation, for converting world-axis rotations
        ch['M'] = arm_data.bones[ch['names'][0]].matrix_local.to_3x3()
    bpy.context.view_layer.update()
    return arm_obj, chains


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

    bend_cfg = plan.get('bend') or {'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}}
    bend_cfg = {p: c for p, c in bend_cfg.items() if p in objs}
    arm_obj, chains = (None, {})
    if bend_cfg:
        arm_obj, chains = _build_bend_rig(fig_id, coll, objs, root, bend_cfg, rest_o, prop_role)
        for pb in arm_obj.pose.bones:
            pb.rotation_mode = 'QUATERNION'

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
        if not ch or part in arms or part == prop_role or part in chains:
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

    # ---- bend parts: rotation channels become angles spread along the bone chain
    for part, ch in chains.items():
        report['parts_keyed'].append(part)
        M = ch['M']
        Mi = M.inverted()
        for f in range(0, N + 1):
            t = f / fps
            ax, ay, az = (math.radians(delta(part, 'rotation_' + c, t)) / ch['N'] for c in 'xyz')
            Rw = Euler((0, 0, az), 'XYZ').to_matrix() @ Euler((0, ay, 0), 'XYZ').to_matrix() @ Euler((ax, 0, 0), 'XYZ').to_matrix()
            q = (Mi @ Rw @ M).to_quaternion()
            for name in ch['names'][1:]:
                pb = arm_obj.pose.bones[name]
                pb.rotation_quaternion = q
                pb.keyframe_insert('rotation_quaternion', frame=f)

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
            if tg['mode'] == 'rest_world' and arm_obj is not None and tg['frame'] in arm_obj.data.bones:
                local_cache[name] = arm_obj.data.bones[tg['frame']].matrix_local.inverted() @ (center + Vector(tg['p']))
            elif tg['mode'] == 'rest_world' and tg['frame'] in rest_m:
                p = center + Vector(tg['p'])
                local_cache[name] = rest_m[tg['frame']].inverted() @ p
            else:
                local_cache[name] = Vector(tg['p'])

        def target_world(name):
            tg = targets[name]
            fr = tg['frame']
            if fr == 'prop':
                return prop.matrix_world @ local_cache[name] + Vector(tg.get('o', (0, 0, 0)))
            if arm_obj is not None and fr in arm_obj.pose.bones:
                return arm_obj.matrix_world @ arm_obj.pose.bones[fr].matrix @ local_cache[name]
            return objs[fr].matrix_world @ local_cache[name]

        for a in arms:
            objs[a].rotation_mode = 'QUATERNION'
        hand_of = {'arm_l': 'hand_l', 'arm_r': 'hand_r'}
        grips_cfg = plan.get('hand_grips', {})
        for a in grips_cfg:
            h = objs.get(hand_of.get(a))
            if h is not None:
                h.rotation_mode = 'QUATERNION'
        prevq = {a: None for a in arms}
        warm = {}
        report['grip_gap_max'] = {}
        for f in range(0, N + 1):
            t = f / fps
            sc.frame_set(f)
            bpy.context.view_layer.update()
            for a in arms:
                ob = objs[a]
                rot = [delta(a, 'rotation_' + c, t) for c in 'xyz']
                Q = Euler([math.radians(r) for r in rot], 'XYZ').to_quaternion() @ q0[a]
                par = ob.parent
                B3 = (ob.matrix_world @ ob.matrix_basis.inverted()).to_3x3()      # whatever the parent (object or bone) does
                R0 = B3 @ q0[a].to_matrix()
                v0 = (R0 @ arm_vec[a]).normalized()
                pivot = ob.matrix_world.translation
                gw = 0.0
                for ent in aims[a]:
                    w = _weight(ent['w'], t)
                    if a in grips_cfg and ent['target'] == grips_cfg[a]['target']:
                        gw = w
                    elif gw > 0.0:
                        gw *= (1.0 - w)
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
                hobj = objs.get(hand_of.get(a))
                qh_rest = Euler(list(hobj['rest'])[3:6], 'XYZ').to_quaternion() if hobj is not None else None
                qh_key = qh_rest
                if a in grips_cfg and gw > 0.01 and hobj is not None:
                    gc = grips_cfg[a]
                    PM = prop.matrix_world
                    G = PM @ Vector(targets[gc['target']]['p'])
                    D = (PM.to_3x3() @ Vector(gc.get('handle_axis', (0, 1, 0)))).normalized()
                    Od = (PM.to_3x3() @ Vector(gc.get('open', (0, 0, -1)))).normalized()
                    Barm = ob.matrix_world @ ob.matrix_basis.inverted()
                    x, Qa_s, Qh_s, gap = _solve_grip(Barm, Vector(ob.location), Vector(ob.scale), Q, hobj.matrix_parent_inverse,
                                                     Vector(list(hobj['rest'])[0:3]), Vector(list(hobj['rest'])[6:9]), qh_rest,
                                                     None, G, D, Od, x0=warm.get(a))
                    warm[a] = x
                    if Q.dot(Qa_s) < 0:
                        Qa_s.negate()
                    Q = Q.slerp(Qa_s, min(1.0, gw))
                    if qh_rest.dot(Qh_s) < 0:
                        Qh_s.negate()
                    qh_key = qh_rest.slerp(Qh_s, min(1.0, gw))
                    if gw > 0.9:
                        report['grip_gap_max'][a] = max(report['grip_gap_max'].get(a, 0.0), round(gap, 3))
                else:
                    warm.pop(a, None)
                if prevq[a] is not None and Q.dot(prevq[a]) < 0:
                    Q.negate()
                prevq[a] = Q
                ob.rotation_quaternion = Q
                ob.keyframe_insert('rotation_quaternion', frame=f)
                if hobj is not None and a in grips_cfg:
                    hobj.rotation_quaternion = qh_key
                    hobj.keyframe_insert('rotation_quaternion', frame=f)
        report['parts_keyed'] += sorted(arms)
    # name the actions (the exporter merges them into one glTF animation)
    for n, o in objs.items():
        if o.animation_data and o.animation_data.action:
            o.animation_data.action.name = 'idle_' + n
    if arm_obj is not None and arm_obj.animation_data and arm_obj.animation_data.action:
        arm_obj.animation_data.action.name = 'idle_rig'
    sc.frame_set(0)
    return report


_SAVED_SCENE = {}


def restore_scene():
    s = _SAVED_SCENE.pop('s', None)
    if s:
        sc = bpy.context.scene
        sc.render.fps, sc.frame_start, sc.frame_end = s['fps'], s['fs'], s['fe']
        sc.frame_set(s['cur'])
