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
  hand_grips: {arm_l|arm_r: {target, handle_axis, open}}   while that arm's aim weight on `target` is up, the arm and the hand are solved so the
                         hand's C clip ring sits on the target point (first priority), its ring axis lies along the prop-local
                         `handle_axis` and its opening faces the prop-local `open` direction. The hand turns about the pin where it
                         slots into the arm (HAND_PIVOT), so that connection stays in place; hand-vs-controller overlap is tolerated.
  hand_roll: {arm_l|arm_r: {target, rotvec_deg:[x,y,z]}}   while that arm's aim weight on `target` is up, the hand is turned by that hand-local
                         axis * degrees (or `deg` = about the pin, local y), pivoting where the pin leaves the arm (HAND_PIVOT) so the connection stays seated. No solver:
                         the arm motion is exactly the aimed motion.
           spin: {axis, keys:[{t, deg}], in?, pivot?}: a turn about a world axis through the part's centre, or (`in` = a part name) about that part's local axis through its local point `pivot`
  free:    [{part, keys:[{t, off, rot, scale}], mix:[[t, wRig, wWorld, wFollow1..]], follow:[{to, like?, rel?, off?, rot?}], anchor?}]
           a part (prop, helmet, a limb that breaks off) posed as a weighted blend of RIG / WORLD / FOLLOW poses, see _pose_free. The pose is
           converted to the part's local transform and keyed, so the hierarchy is untouched.
  root:    {pivot, base_deg, axis?, pitch?: [[t, deg]], roll?: [[t, deg]]}   the whole rig held pitched `base_deg` about the world `axis` through `pivot`'s origin
           (a wheelie), with pitch / roll wobble keyed on the root node, standing on z = 0 (no separate tilt_rig call needed)
  pivots_local: {part: [x,y,z]}   rotate about that point given in the part's own frame (a hand: the pin's exit point)
           free-part extras: live (the rig pose is the part's own keyed / aimed motion, for a figure that comes apart mid-run), anchor_follow -1
           (anchor on that live pose), pre (posed before the arms, so aim targets on it are current)
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
HAND_RING = dict(center=(0.0, -0.095, 0.009), axis=(1.0, 0.0, 0.0), opening=(0.0, 1.0, 0.0))   # ring in the hand's y-z plane (fit residual 0.4 mm), open toward the pin


# where the hand's pin leaves the arm (hand-local): the hand turns about THIS point, so the pin stays seated in the socket
HAND_PIVOT = (0.0, -0.04, -0.005)


def _hand_basis(hloc, qh0, hscl, dq, pivot=HAND_PIVOT):
    """Hand basis (location, rotation) after turning it by dq (a hand-local rotation) about the pin's exit point."""
    p = Vector(pivot)
    R = qh0.to_matrix()
    loc = Vector(hloc) + R @ (p - dq.to_matrix() @ p)
    return loc, qh0 @ dq


def _solve_grip(Barm, aloc, ascl, Q0, PIh, hloc, hscl, qh0, ring, G, D, Od, x0=None, iters=12):
    """Least squares for (arm rotation vector, hand rotation vector): ring centre -> G first, then ring axis || D and opening -> Od.
    The hand turns about the pin where it slots into the arm, so that connection stays in place."""
    import numpy as np
    rc, ra, ro = (Vector(HAND_RING['center']), Vector(HAND_RING['axis']).normalized(), Vector(HAND_RING['opening']).normalized())

    def quat(v):
        v = Vector(v)
        return Quaternion(v.normalized(), v.length) if v.length > 1e-9 else Quaternion((1, 0, 0, 0))

    def resid(x):
        Qa = quat(x[0:3]) @ Q0
        dq = quat(x[3:6])
        hl, Qh = _hand_basis(hloc, qh0, hscl, dq)
        Hw = Barm @ Matrix.LocRotScale(aloc, Qa, ascl) @ PIh @ Matrix.LocRotScale(hl, Qh, hscl)
        H3 = Hw.to_3x3()
        c = Hw @ rc
        a = (H3 @ ra).normalized()
        o = (H3 @ ro).normalized()
        r = list((c - G) / 0.01) + list(a.cross(D) / 0.06) + list((o - Od) / 0.8) + list(np.asarray(x) / 0.9)
        return np.array(r), Qa, dq

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

    base = np.zeros(6) if x0 is None else np.array(x0, dtype=float)
    flipped = base.copy()
    flipped[4] += 3.14159                                          # a half turn about the pin (hand-local y): keep the better fit
    best = None
    for st in (base, flipped):
        x, r = run(st)
        c = float((r ** 2).sum())
        if best is None or c < best[0]:
            best = (c, x)
    x = best[1]
    r, Qa, dq = resid(x)
    hl, Qh = _hand_basis(hloc, qh0, hscl, dq)
    return x, Qa, Qh, hl, (Vector(r[0:3]) * 0.01).length


def _mix(pts, t):
    """Smooth interpolation of [[t, a, b, c]...] weight rows; held before the first and after the last."""
    pts = sorted(pts, key=lambda r: r[0])
    if t <= pts[0][0]:
        return list(pts[0][1:])
    for ra, rb in zip(pts, pts[1:]):
        if t <= rb[0]:
            u = _sm((t - ra[0]) / max(1e-6, rb[0] - ra[0]))
            return [a + (b - a) * u for a, b in zip(ra[1:], rb[1:])]
    return list(pts[-1][1:])


def _key_at(keys, t, field, default):
    """Smooth (Catmull-Rom, clamped ends) interpolation of a scalar or vector field over the free-part keys."""
    ks = sorted([k for k in keys if field in k], key=lambda k: k['t'])
    if not ks:
        return default
    if t <= ks[0]['t']:
        return ks[0][field]
    if t >= ks[-1]['t']:
        return ks[-1][field]
    i = 0
    while ks[i + 1]['t'] < t:
        i += 1
    k0, k1 = ks[i], ks[i + 1]
    km, kp = ks[max(i - 1, 0)], ks[min(i + 2, len(ks) - 1)]
    h = k1['t'] - k0['t']
    u = (t - k0['t']) / h
    def cr(v0, v1, vm, vp):
        m0 = (v1 - vm) / max(1e-6, (k1['t'] - km['t'])) * h
        m1 = (vp - v0) / max(1e-6, (kp['t'] - k0['t'])) * h
        u2, u3 = u * u, u * u * u
        return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1
    a, b, am, ap = k0[field], k1[field], km[field], kp[field]
    if isinstance(a, (list, tuple)):
        return [cr(a[j], b[j], am[j], ap[j]) for j in range(len(a))]
    return cr(a, b, am, ap)


def _pose_free(fc, objs, rest_m, center, f, t, T, state):
    """Key one free part for frame f. Its pose is a weighted blend of
         RIG      what its parent chain does (the default),
         WORLD    its rest pose moved by `off` metres (world axes) and turned by `rot` degrees about its own origin,
                  or, with `anchor` (seconds), relative to where the part stood at that moment (a tossed helmet, a flipped egg),
         FOLLOW_i glued to another part (`follow`: [{to, like?, off?, rot?}]): `to` a hand keeps its rest relation; `like` another
                  part names whose rest relation to `to` is copied (a helmet worn like the hair piece sits on the head).
       `mix` rows are [t, wRig, wWorld, wFollow_1, ...] (smooth between rows). `scale` multiplies the result (0 hides it)."""
    part = fc['part']
    ob = objs.get(part)
    if ob is None:
        return
    ob.rotation_mode = 'QUATERNION'
    factor = ob.matrix_world @ ob.matrix_basis.inverted()                  # what its parent chain contributes this frame
    r0 = list(ob['rest'])
    M_rest = Matrix.LocRotScale(Vector(r0[0:3]), Euler(r0[3:6], 'XYZ').to_quaternion(), Vector(r0[6:9]))
    rig = ob.matrix_world.copy() if fc.get('live') else factor @ M_rest      # live: the part's own keyed / aimed motion counts
    Wrest = rest_m[part]
    loc0, rot0, scl0 = Wrest.decompose()
    follows = fc.get('follow', [])
    w = _mix(fc.get('mix', [[0, 1, 0] + [0] * len(follows)]), t)
    w = (w + [0.0] * (2 + len(follows)))[:2 + len(follows)]
    sm = sum(w)
    w = [x / sm for x in w] if sm > 1e-6 else [1.0, 0.0] + [0.0] * len(follows)
    keys = fc.get('keys', [])
    off = Vector(_key_at(keys, t, 'off', [0, 0, 0]))
    rot = _key_at(keys, t, 'rot', [0, 0, 0])
    sc = _key_at(keys, t, 'scale', 1.0)
    dq = Euler([math.radians(a) for a in rot], 'XYZ').to_quaternion()
    # follow poses
    fposes = []
    for fo in follows:
        tgt = objs[fo['to']]
        src = rest_m[fo.get('like', part)]
        H0 = Matrix(fo['rel']) if fo.get('rel') else rest_m[fo['to']].inverted() @ src        # rel: the part's pose in the target's frame, given explicitly (a re-grip)
        tw = tgt.matrix_world
        arm = state.get('arm')
        if fo.get('bone') and arm is not None and fo['bone'] in arm.pose.bones:       # a skinned part (the head) turns by its bone, not its object
            tw = arm.matrix_world @ arm.pose.bones[fo['bone']].matrix @ arm.data.bones[fo['bone']].matrix_local.inverted() @ rest_m[fo['to']]
        hl, hq, hs = H0.decompose()
        rq = Euler([math.radians(a) for a in fo.get('rot', [0, 0, 0])], 'XYZ').to_quaternion()
        # `off` slides the part in the TARGET's axes; `rot` turns it about its OWN centre, in the target's axes
        fp = tw @ Matrix.Translation(Vector(fo.get('off', [0, 0, 0]))) @ Matrix.Translation(hl) @ rq.to_matrix().to_4x4() @ hq.to_matrix().to_4x4()
        if fo.get('capture') is not None:                                  # a hand-over: from `capture` on, hold the part exactly as the follow pose `from` held it then
            ck = '%s#cap%d' % (part, len(fposes))
            src_i = fo.get('from', 0)
            if t >= fo['capture'] and ck not in state:
                state[ck] = tw.inverted() @ fposes[src_i]
            fp = tw @ state[ck] if ck in state else fposes[src_i].copy()
        fposes.append(fp)
    base = None
    if 'anchor' in fc:                                                     # world offsets are measured from the pose at the anchor time
        ak = part + '#anchor'
        if t >= fc['anchor'] and ak not in state and (fposes or fc.get('anchor_follow', 0) == -1):
            gi = fc.get('anchor_follow', 0)
            state[ak] = (rig if gi == -1 else fposes[gi]).copy()
        base = state.get(ak)
        if base is None and t < fc['anchor']:
            base = fposes[fc.get('anchor_follow', 0)] if (fposes and fc.get('anchor_follow', 0) != -1) else rig
    if base is not None:
        bl, bq, bs = base.decompose()
        world = Matrix.LocRotScale(bl + off, dq @ bq, bs)
    else:
        world = Matrix.LocRotScale(loc0 + off, dq @ rot0, scl0)
    poses = [rig, world] + fposes
    loc = Vector((0, 0, 0))
    scl = Vector((0, 0, 0))
    q = None
    acc = 0.0
    for wi, P in zip(w, poses):
        if wi <= 1e-6:
            continue
        l, r, sv = P.decompose()
        loc += l * wi
        scl += sv * wi
        if q is None:
            q = r
            acc = wi
        else:
            if q.dot(r) < 0:
                r = -r
            acc += wi
            q = q.slerp(r, wi / acc)
    bump = _key_at(fc.get('bump', []), t, 'off', None)                       # an extra world-space offset on top of the blended pose (an arc)
    if bump is not None:
        loc = loc + Vector(bump)
    final = Matrix.LocRotScale(loc, q, scl * sc)
    sp = fc.get('spin')                                                      # a turn about a world axis through the part's own centre (a helmet spun on a fingertip)
    if sp:
        deg = _key_at(sp['keys'], t, 'deg', 0.0)
        ax = Vector(sp.get('axis', [0, 0, 1]))
        piv = loc
        if sp.get('in'):                                                     # axis / pivot given in another part's frame (the hand: a helmet balanced on a fingertip turns about the finger)
            ref = objs[sp['in']].matrix_world
            ax = ref.to_3x3() @ ax
            piv = ref @ Vector(sp.get('pivot', [0, 0, 0]))
        R = Quaternion(ax.normalized(), math.radians(deg)).to_matrix().to_4x4()
        final = Matrix.Translation(piv) @ R @ Matrix.Translation(-piv) @ final
    local = factor.inverted() @ final
    l2, q2, s2 = local.decompose()
    pq = state.get(part)
    if pq is not None and q2.dot(pq) < 0:
        q2.negate()
    state[part] = q2
    ob.location, ob.rotation_quaternion, ob.scale = l2, q2, Vector([max(abs(x), 1e-4) * (1 if x >= 0 else -1) for x in s2])
    ob.keyframe_insert('location', frame=f)
    ob.keyframe_insert('rotation_quaternion', frame=f)
    ob.keyframe_insert('scale', frame=f)


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
    for fc in plan.get('free', []):                                   # a `pre` part is posed in world space (arms aim at it): it must not ride a hand
        po = objs.get(fc['part'])
        if po is not None and (fc.get('pre') or fc.get('detach')) and po.parent is not root:
            mw = po.matrix_world.copy()
            po.parent = root
            po.matrix_parent_inverse = root.matrix_world.inverted()
            po.matrix_world = mw
            po['rest'] = list(po.location) + list(po.rotation_euler) + list(po.scale)
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
    free_cfg = plan.get('free', [])
    free_parts = {f['part'] for f in free_cfg}
    live_parts = {f['part'] for f in free_cfg if f.get('live')}          # keyed (or aimed) as usual; the free pose blends from that live pose
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
    # ---- pass 0: a live part's baseline is keyed on every channel first, so that its live pose at frame f is its own motion and not whatever the
    # free pass keyed for it at an earlier frame (an unkeyed channel holds its last key)
    for part in live_parts:
        ob = objs.get(part)
        if ob is None:
            continue
        ob.rotation_mode = 'QUATERNION'
        for f in range(0, N + 1):
            ob.location, ob.rotation_quaternion, ob.scale = loc0[part], q0[part], scl0[part]
            ob.keyframe_insert('location', frame=f)
            ob.keyframe_insert('rotation_quaternion', frame=f)
            ob.keyframe_insert('scale', frame=f)
    # ---- pass A: everything that is not an aimed arm
    for part in set(keys) | {s['part'] for s in shakes}:
        if part not in objs:
            report['missing'].append(part)
    for part, ob in objs.items():
        ch = touched(part)
        if not ch or part in arms or part == prop_role or part in chains or (part in free_parts and part not in live_parts):
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
            pl = plan.get('pivots_local', {}).get(part)
            if (dz is not None or pl is not None) and has_rot:
                R = Qd
                offs = (q0[part] @ Vector(pl)) if pl is not None else Vector((0, 0, dz))
                loc += (R @ (-offs)) + offs                      # rotate about the point `offs` above the origin
            ob.location = loc
            sc_v = scl0[part].copy()
            for i, a in enumerate('xyz'):
                if ('scale_' + a) in ch:
                    sc_v[i] = scl0[part][i] * (1.0 + delta(part, 'scale_' + a, t))
            ob.scale = sc_v
            if has_rot:
                ob.keyframe_insert(data_path='rotation_quaternion', frame=f)
            if has_rot and (dz is not None or pl is not None):         # a turn about a pivot moves the origin: key that location too, or it holds the last frame's
                ob.keyframe_insert(data_path='location', frame=f)
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

    # ---- pass B: arms aimed at moving targets, then the free parts
    if arms or free_cfg:
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
        roll_cfg = plan.get('hand_roll', {})
        for a in set(grips_cfg) | set(roll_cfg):
            h = objs.get(hand_of.get(a))
            if h is not None:
                h.rotation_mode = 'QUATERNION'
        prevq = {a: None for a in arms}
        free_state = {'arm': arm_obj}
        warm = {}
        report['grip_gap_max'] = {}
        for f in range(0, N + 1):
            t = f / fps
            sc.frame_set(f)
            bpy.context.view_layer.update()
            for fc in free_cfg:
                if fc.get('pre'):                                        # a free part the arms aim at (a steering wheel): posed first
                    _pose_free(fc, objs, rest_m, center, f, t, T, free_state)
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
                gw_roll = 0.0
                for ent in aims[a]:
                    w = _weight(ent['w'], t)
                    if a in grips_cfg and ent['target'] == grips_cfg[a]['target']:
                        gw = w
                    elif gw > 0.0:
                        gw *= (1.0 - w)
                    if a in roll_cfg and ent['target'] == roll_cfg[a]['target']:
                        gw_roll = w
                    elif gw_roll > 0.0:
                        gw_roll *= (1.0 - w)
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
                hloc_key = Vector(list(hobj['rest'])[0:3]) if hobj is not None else None
                if a in grips_cfg and gw > 0.01 and hobj is not None:
                    gc = grips_cfg[a]
                    PM = prop.matrix_world
                    G = PM @ Vector(targets[gc['target']]['p'])
                    D = (PM.to_3x3() @ Vector(gc.get('handle_axis', (0, 1, 0)))).normalized()
                    Od = (PM.to_3x3() @ Vector(gc.get('open', (0, 0, -1)))).normalized()
                    Barm = ob.matrix_world @ ob.matrix_basis.inverted()
                    x, Qa_s, Qh_s, hl_s, gap = _solve_grip(Barm, Vector(ob.location), Vector(ob.scale), Q, hobj.matrix_parent_inverse,
                                                           Vector(list(hobj['rest'])[0:3]), Vector(list(hobj['rest'])[6:9]), qh_rest,
                                                           None, G, D, Od, x0=warm.get(a))
                    warm[a] = x
                    if Q.dot(Qa_s) < 0:
                        Qa_s.negate()
                    Q = Q.slerp(Qa_s, min(1.0, gw))
                    if qh_rest.dot(Qh_s) < 0:
                        Qh_s.negate()
                    qh_key = qh_rest.slerp(Qh_s, min(1.0, gw))
                    hloc_key = Vector(list(hobj['rest'])[0:3]).lerp(hl_s, min(1.0, gw))
                    if gw > 0.9:
                        report['grip_gap_max'][a] = max(report['grip_gap_max'].get(a, 0.0), round(gap, 3))
                elif a in roll_cfg and gw_roll > 0.0 and hobj is not None:
                    rv = Vector(roll_cfg[a].get('rotvec_deg', (0.0, roll_cfg[a].get('deg', 0.0), 0.0)))   # hand-local axis * degrees
                    dq = Quaternion(rv.normalized(), math.radians(rv.length) * min(1.0, gw_roll)) if rv.length > 1e-6 else Quaternion((1, 0, 0, 0))
                    hloc_key, qh_key = _hand_basis(Vector(list(hobj['rest'])[0:3]), qh_rest, Vector(list(hobj['rest'])[6:9]), dq)
                else:
                    warm.pop(a, None)
                if prevq[a] is not None and Q.dot(prevq[a]) < 0:
                    Q.negate()
                prevq[a] = Q
                ob.rotation_quaternion = Q
                ob.keyframe_insert('rotation_quaternion', frame=f)
                if hobj is not None and (a in grips_cfg or a in roll_cfg):
                    hobj.rotation_quaternion = qh_key
                    hobj.location = hloc_key
                    hobj.keyframe_insert('rotation_quaternion', frame=f)
                    hobj.keyframe_insert('location', frame=f)
            if free_cfg:
                bpy.context.view_layer.update()                      # the arms and hands now stand where this frame puts them
                for fc in free_cfg:
                    if fc.get('pre'):
                        continue
                    _pose_free(fc, objs, rest_m, center, f, t, T, free_state)
                    bpy.context.view_layer.update()                      # the next free part may hang off this one
        report['parts_keyed'] += sorted(arms) + sorted(free_parts)
    # ---- the whole rig: a held pitch (a wheelie) with wobble, keyed on the root node about the pivot part's origin, standing on z = 0
    rk = plan.get('root')
    if rk:
        P = rest_m[rk['pivot']].translation.copy()
        base = root.matrix_world.copy()
        ax = rk.get('axis', 'X')
        def root_M(f, t):
            th = rk.get('base_deg', 0.0) + (_interp(rk['pitch'], t, T) if rk.get('pitch') else 0.0)
            rl = _interp(rk['roll'], t, T) if rk.get('roll') else 0.0
            return Matrix.Translation(P) @ Matrix.Rotation(math.radians(th), 4, ax) @ Matrix.Rotation(math.radians(rl), 4, 'Y') @ Matrix.Translation(-P) @ base
        M0 = root_M(0, 0.0)
        low = min((M0 @ base.inverted() @ rest_m[n] @ v.co).z for n, o in objs.items() for v in o.data.vertices)
        root.rotation_mode = 'QUATERNION'
        prevq = None
        for f in range(0, N + 1):
            Mf = Matrix.Translation((0, 0, -low)) @ root_M(f, f / fps)
            l, q, s_ = Mf.decompose()
            if prevq is not None and q.dot(prevq) < 0:
                q.negate()
            prevq = q
            root.location, root.rotation_quaternion, root.scale = l, q, s_
            for path in ('location', 'rotation_quaternion', 'scale'):
                root.keyframe_insert(path, frame=f)
        report['parts_keyed'].append('root')
    # name the actions (the exporter merges them into one glTF animation)
    for n, o in objs.items():
        if o.animation_data and o.animation_data.action:
            o.animation_data.action.name = 'idle_' + n
    if arm_obj is not None and arm_obj.animation_data and arm_obj.animation_data.action:
        arm_obj.animation_data.action.name = 'idle_rig'
    sc.frame_set(0)
    return report

def tilt_rig(fig_id, pivot_role, deg, axis='X'):
    """Pitch the whole figure (the root empty, so the exported GLB's root node carries it) about the world `axis` through `pivot_role`'s origin by
    `deg` degrees, then drop it so its lowest vertex is on z = 0. A static pose for the whole rig (a wheelie held at 45 degrees): the plan engine
    only keys parts. Call after apply_plan."""
    coll, objs, root = _rig(fig_id)
    P = objs[pivot_role].matrix_world.translation.copy()
    root.matrix_world = Matrix.Translation(P) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-P) @ root.matrix_world
    bpy.context.view_layer.update()
    low = min((o.matrix_world @ v.co).z for o in objs.values() for v in o.data.vertices)
    root.location.z -= low
    bpy.context.view_layer.update()


_SAVED_SCENE = {}


def restore_scene():
    s = _SAVED_SCENE.pop('s', None)
    if s:
        sc = bpy.context.scene
        sc.render.fps, sc.frame_start, sc.frame_end = s['fps'], s['fs'], s['fe']
        sc.frame_set(s['cur'])
