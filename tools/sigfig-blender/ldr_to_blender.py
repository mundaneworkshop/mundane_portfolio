"""Studio .io -> rigged Blender sig fig (run INSIDE Blender; see README.md).

    exec(open('<repo>/tools/sigfig-blender/ldr_to_blender.py').read())
    info = build_sigfig('/path/mw-sigfig-biker.io', 'biker')      # builds collection "sigfig-biker"
    export_glb('biker', '/path/out/mw-sigfig-biker.glb')           # after (optionally) idle_anim.apply_idle

A Studio .io is a zip. `model2.ldr` inside is a FLATTENED LDraw file: every part's geometry is inlined, so no
LDraw library is needed. Colours there are Studio colour codes (read from the Studio install's
StudioColorDefinition.txt at run time, so BrickLink's table is not copied into this repo). Printed decals that
Studio stores as textures (parts named bl_*) are not in the .io, so those parts come in untextured.

What it builds: one mesh object per part, named by role (head, torso, hips, arm_l, arm_r, hand_l, hand_r, leg_l,
leg_r; anything else acc_<part> or prop_<part>), each with its ORIGIN AT THE PART'S JOINT (shoulder, hip, neck,
wrist) so rotating it in Blender, or in an animation, pivots correctly. Parented hips > torso > head/arms > hands,
legs under hips, held props under the nearest hand. Feet sit at z = 0, facing -Y (glTF +Z after export).
"""
import bpy, math, os, re, zipfile, json, struct
from mathutils import Matrix, Vector

SCALE = 0.01                      # 1 LDU -> 0.01 units (a minifigure is roughly 1.4 tall)
STUDIO_COLOR_FILE = '/Applications/Studio 2.0/data/StudioColorDefinition.txt'
_FALLBACK = {'11': '#04121C', '1': '#FEFEFE', '3': '#F1CC36', '5': '#C81908', '7': '#0054BE', '9': '#9AA09C',
             '85': '#6B6D67', '86': '#9FA4A8', '90': '#F5D6B2', '88': '#572911', '55': '#587083', '59': '#710D0E',
             '99': '#E5E2DF', '4': '#FD8917', '6': '#24793D', '65': '#DAAB33', '67': '#A4A8B3'}
INHERIT = ('-1', '16')
# LDraw (x right, y down, z away) -> Blender (x right, y = z, z = -y): a proper rotation, front of the figure faces -Y
C3 = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))
C3I = C3.transposed()


# ---------------------------------------------------------------- colours
def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _hex(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


_COLORS = None


def color_table():
    """Studio colour code -> dict(rgb=linear, alpha, kind, name). Falls back to a small palette if Studio is absent."""
    global _COLORS
    if _COLORS is not None:
        return _COLORS
    t = {}
    try:
        with open(STUDIO_COLOR_FILE, encoding='utf-8', errors='replace') as f:
            rows = f.read().splitlines()[1:]
        for r in rows:
            p = r.split('\t')
            if len(p) < 11 or p[0] in t:
                continue
            try:
                a = float(p[9])
            except ValueError:
                a = 1.0
            t[p[0]] = dict(hex=p[8], alpha=a, kind=p[10], name=p[4])
    except OSError:
        for k, h in _FALLBACK.items():
            t[k] = dict(hex=h, alpha=1.0, kind='Solid Colors', name='code ' + k)
    _COLORS = t
    return t


def color_info(code):
    """-> (linear rgb tuple, alpha, metallic?, label) for a Studio code or an LDraw direct colour 0x2RRGGBB."""
    if code.lower().startswith('0x2') and len(code) >= 9:
        rgb = _hex(code[3:9])
        return tuple(_lin(c) for c in rgb), 1.0, False, 'direct_' + code[3:9].upper()
    t = color_table().get(code)
    if not t:
        return (_lin(0.55),) * 3, 1.0, False, 'unknown_' + code
    rgb = _hex(t['hex'])
    return tuple(_lin(c) for c in rgb), t['alpha'], ('Metallic' in t['kind'] or 'Pearl' in t['kind']), re.sub(r'\W+', '_', t['name'])


# ---------------------------------------------------------------- LDraw parsing
def parse_ldr(text):
    secs, cur, st, first = {}, None, None, None
    for raw in text.lstrip('﻿').splitlines():
        l = raw.strip()
        if not l:
            continue
        ty = l[0]
        if ty == '0':
            rest = l[1:].strip()
            if rest.startswith('FILE '):
                name = rest[5:].strip().lower().replace('\\', '/')
                cur = secs.setdefault(name, {'name': name, 'lines': []})
                first = first or name
                st = {'cw': False, 'inv': False}
            elif cur is not None and rest.startswith('PE_TEX_INFO '):
                cur['tex'] = rest.split(None, 1)[1].strip()          # Studio embeds a part's print as a base64 PNG
            elif cur is not None and rest.startswith('BFC'):
                w = rest.split()
                if 'INVERTNEXT' in w:
                    st['inv'] = True
                elif 'CW' in w:
                    st['cw'] = True
                elif 'CCW' in w:
                    st['cw'] = False
            continue
        if cur is None:
            continue
        if ty == '1':
            p = l.split(None, 14)
            if len(p) < 15:
                continue
            v = [float(x) for x in p[2:14]]
            M = Matrix(((v[3], v[4], v[5], v[0]), (v[6], v[7], v[8], v[1]), (v[9], v[10], v[11], v[2]), (0, 0, 0, 1)))
            cur['lines'].append((1, p[1], M, p[14].strip().lower().replace('\\', '/'), st['inv']))
            st['inv'] = False
        elif ty in '34':
            n = 3 if ty == '3' else 4
            p = l.split()
            if len(p) < 2 + 3 * n:
                continue
            v = [Vector((float(p[2 + 3 * i]), float(p[3 + 3 * i]), float(p[4 + 3 * i]))) for i in range(n)]
            uv = None
            if len(p) >= 2 + 5 * n:                              # Studio texture-mapped faces carry one (u, v) per corner after the points
                uv = [(float(p[2 + 3 * n + 2 * i]), float(p[3 + 3 * n + 2 * i])) for i in range(n)]
            if st['cw']:
                v.reverse()
                if uv:
                    uv.reverse()
            cur['lines'].append((n, p[1], v, uv))
    return secs, first


_FLAT = {}
_MISSING = set()
_TEX = {}                          # part file -> base64 PNG of its print
# Studio does not embed the LDraw base primitives it can find in its own library: 48/4-4cyli.dat (high-res cylinder wall),
# 4-4disc.dat (flat cap), 2-4edge.dat (outline). Importing without them silently deleted cylinder walls and caps: the arms'
# round parts, the hand clip's wrist, the neck, headset tubes. They are simple, so they are generated here.
_PRIM = re.compile(r'^(?:(\d+)/)?(\d+)-(\d+)(cyli|disc|edge)\.dat$')


def _synth(name):
    """Triangles for an LDraw cyli / disc / edge primitive (radius 1; the wall runs y 0..1; a disc is a fan at y 0),
    or None when `name` is not one. cyli faces outward and disc faces up (-y), as in the LDraw library; edge is lines only."""
    m = _PRIM.match(name)
    if not m:
        return None
    res = int(m.group(1)) if m.group(1) else 16        # '48/' = high-res (48 per circle), '8/' = low-res, none = standard 16
    frac = int(m.group(2)) / float(int(m.group(3)))
    kind = m.group(4)
    if kind == 'edge':
        return []
    n = max(1, int(round(res * frac)))
    out = []
    for k in range(n):
        a0 = 2 * math.pi * frac * k / n
        a1 = 2 * math.pi * frac * (k + 1) / n
        c0, s0, c1, s1 = math.cos(a0), math.sin(a0), math.cos(a1), math.sin(a1)
        if kind == 'cyli':
            b0, t0, t1, b1 = Vector((c0, 0, s0)), Vector((c0, 1, s0)), Vector((c1, 1, s1)), Vector((c1, 0, s1))
            out.append(('-1', (b0, t0, t1)))
            out.append(('-1', (b0, t1, b1)))
        else:
            out.append(('-1', (Vector((0, 0, 0)), Vector((c0, 0, s0)), Vector((c1, 0, s1)))))
    return out


def flat(secs, name):
    """Triangles of a section in its own space, CCW, as [(colour, (v0, v1, v2))]. Memoised."""
    if name in _FLAT:
        return _FLAT[name]
    _FLAT[name] = []
    out = []
    sec = secs.get(name)
    if not sec:
        syn = _synth(name)
        if syn is None:
            _MISSING.add(name)                          # reported in the summary: nothing is dropped silently any more
        _FLAT[name] = syn or []
        return _FLAT[name]
    if sec:
        for ln in sec['lines']:
            k = ln[0]
            if k == 1:
                _, col, M, ref, inv = ln
                child = flat(secs, ref)
                if not child:
                    continue
                flip = (M.to_3x3().determinant() < 0) != bool(inv)
                for it in child:
                    c, (a, b, d) = it[0], it[1]
                    c2 = col if c in INHERIT else c
                    a, b, d = M @ a, M @ b, M @ d
                    if len(it) > 2:                                # a textured face keeps its (u, v) and which print it belongs to
                        uv = it[2]
                        out.append((c2, (a, d, b) if flip else (a, b, d), [uv[0], uv[2], uv[1]] if flip else uv, it[3]))
                    else:
                        out.append((c2, (a, d, b) if flip else (a, b, d)))
            elif k == 3:
                out.append((ln[1], tuple(ln[2])) if not ln[3] else (ln[1], tuple(ln[2]), ln[3], None))
            else:
                v, uv = ln[2], ln[3]
                if uv:
                    out.append((ln[1], (v[0], v[1], v[2]), [uv[0], uv[1], uv[2]], None))
                    out.append((ln[1], (v[0], v[2], v[3]), [uv[0], uv[2], uv[3]], None))
                else:
                    out.append((ln[1], (v[0], v[1], v[2])))
                    out.append((ln[1], (v[0], v[2], v[3])))
    if sec.get('tex'):                                             # this part owns a print: its UV faces use it
        _TEX[name] = sec['tex']
        out = [(it[0], it[1], it[2], name) if len(it) > 2 and it[3] is None else it for it in out]
    _FLAT[name] = out
    return out


def _clean(ref):
    b = os.path.basename(ref)
    return re.sub(r'^(bl_|-)+', '', b)


def collect_parts(secs, root):
    """Leaf parts with world matrices (LDraw space). Submodels are walked; 970c.. leg assemblies are split into hips + legs."""
    parts, warn = [], []

    def walk(name, M, col, parity, tag):
        for ln in secs[name]['lines']:
            if ln[0] != 1:
                continue
            _, c, Mc, ref, inv = ln
            if ref not in secs:
                warn.append('missing ' + ref)
                continue
            W = M @ Mc
            colr = col if c in INHERIT else c
            par = parity != ((Mc.to_3x3().determinant() < 0) != bool(inv))
            base = os.path.basename(ref)
            if not ref.endswith('.dat'):
                walk(ref, W, colr, par, tag)
            elif re.match(r'^970c', base) and any(l[0] == 1 and l[3].endswith('.dat') for l in secs[ref]['lines']):
                walk(ref, W, colr, par, 'legs')
            else:
                parts.append(dict(file=ref, W=W, color=colr, parity=par, tag=tag))

    walk(root, Matrix.Identity(4), '-1', False, None)
    return parts, warn


# ---------------------------------------------------------------- roles
def classify(parts, overrides=None):
    """Assign body roles from part numbers. `overrides` = {part file stem or number: role} wins over the guess, for figures built from
    custom parts (e.g. the slate dummy's m64a4bc45_* parts) where the number says nothing."""
    overrides = {k.lower().replace('.dat', ''): v for k, v in (overrides or {}).items()}
    torso = next((p for p in parts if re.match(r'^3?973|^973', _clean(p['file']))), None)
    head = next((p for p in parts if re.match(r'^3626', _clean(p['file']))), None)
    tx = torso['W'].translation.x if torso else (head['W'].translation.x if head else 0.0)
    for p in parts:
        n = _clean(p['file'])
        x = p['W'].translation.x
        side = 'r' if x < tx else 'l'            # the figure's right is -X in LDraw (it faces -Z)
        stem = n.lower().replace('.dat', '')
        if stem in overrides:
            p['role'] = overrides[stem]
        elif re.match(r'^3626', n):
            p['role'] = 'head'
        elif re.match(r'^973', n):
            p['role'] = 'torso'
        elif re.match(r'^(3816|971)', n):          # 971 / 972: the older leg numbers (right / left)
            p['role'] = 'leg_r'
        elif re.match(r'^(3817|972)', n):
            p['role'] = 'leg_l'
        elif p['tag'] == 'legs' or re.match(r'^(3815|970)', n):
            p['role'] = 'hips'
        elif re.match(r'^(3818|3819|981|982|3842)', n):
            p['role'] = 'arm_' + side
        elif re.match(r'^(3820|983)', n):
            p['role'] = 'hand_' + side
        else:
            p['role'] = None
    seen = set()
    for p in parts:                                  # one part per body role; a second claimant becomes an accessory
        if p['role'] in PARENT:
            if p['role'] in seen:
                p['role'] = None
            seen.add(p['role'])
    return parts


def assign_extras(parts):
    """Name and parent everything that is not a body part: near the head -> head accessory, near a hand -> held prop,
    near the torso -> torso accessory, otherwise a free prop."""
    by = {p['role']: p for p in parts if p['role']}
    used = set(by)

    def dist(a, b):
        return (a['W'].translation - b['W'].translation).length

    for p in parts:
        if p['role']:
            continue
        n = _clean(p['file']).replace('.dat', '')
        cands = []
        for r in ('head', 'hand_r', 'hand_l', 'torso', 'hips'):
            if r in by:
                cands.append((dist(p, by[r]), r))
        near = sorted(cands)[0] if cands else None
        lim = {'head': 30, 'hand_r': 30, 'hand_l': 30, 'torso': 50, 'hips': 45}
        if near and near[0] <= lim[near[1]]:
            p['parent_role'] = near[1]
            base = 'acc_' + n
        else:
            p['parent_role'] = None
            base = 'prop_' + n
        name, k = base, 2
        while name in used:
            name = '%s_%d' % (base, k)
            k += 1
        used.add(name)
        p['role'] = name
    return parts


PARENT = {'hips': None, 'torso': 'hips', 'leg_l': 'hips', 'leg_r': 'hips', 'head': 'torso', 'arm_l': 'torso',
          'arm_r': 'torso', 'hand_l': 'arm_l', 'hand_r': 'arm_r'}


# ---------------------------------------------------------------- decimation
DEFAULT_TRI_BUDGET = 9000        # a TARGET for the whole figure; in safe mode (default) parts that cannot be thinned safely are skipped, so it may land above it
# how much each part's detail matters when the budget has to be shared (head and hands carry the character)
IMPORTANCE = {'head': 1.7, 'torso': 1.4, 'hand_l': 1.5, 'hand_r': 1.5, 'arm_l': 1.0, 'arm_r': 1.0, 'hips': 0.9,
              'leg_l': 0.9, 'leg_r': 0.9}
MIN_RATIO = {'head': 0.55, 'torso': 0.5, 'hand_l': 0.6, 'hand_r': 0.6}   # never thinner than this; others may go to 0.2
PRINT_MATERIALS = 3              # a part that shows >= this many colours is a printed part (torso, controller face, ...):
SAFE_ACCESSORY_FLOOR = 0.7       # safe mode: hair / helmets / props are never thinned below this fraction
PRINT_FLOOR = 0.92               # collapse decimation eats the edges of flat colour regions, so these are left almost alone


def _tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def _colours(ob):
    return len({p.material_index for p in ob.data.polygons})


BODY_ROLES = ('head', 'torso', 'hips', 'arm_l', 'arm_r', 'hand_l', 'hand_r', 'leg_l', 'leg_r')




def _clean_mesh(ob):
    """Merge coincident points (the importer makes three per triangle). Deliberately NOT dissolving coplanar faces: re-triangulating
    the merged n-gons can bridge across concave notches (the C-shaped hand clip) and show up as missing or wrong planes."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.00005)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def _collapse(ob, ratio):
    """Collapse-decimate one object by `ratio` (1 = untouched). Vertices on open edges and on colour borders get weight 0 in a
    vertex group, so the outline and every print edge stay exactly where they were and only interior geometry is thinned
    (a plain collapse moves those edges, which tears holes in LEGO's open shells)."""
    import bmesh
    if ratio >= 0.995:
        return
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    pinned = set()
    for e in bm.edges:
        fs = e.link_faces
        if len(fs) != 2 or fs[0].material_index != fs[1].material_index:
            pinned.add(e.verts[0].index)
            pinned.add(e.verts[1].index)
    bm.free()
    vg = ob.vertex_groups.new(name='pin')
    free = [i for i in range(len(me.vertices)) if i not in pinned]
    if free:
        vg.add(free, 1.0, 'REPLACE')
    if pinned:
        vg.add(list(pinned), 0.0, 'REPLACE')
    md = ob.modifiers.new('dec', 'DECIMATE')
    md.decimate_type = 'COLLAPSE'
    md.ratio = max(0.02, ratio)
    md.use_collapse_triangulate = True
    md.vertex_group = vg.name
    md.vertex_group_factor = 1.0
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    new = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.remove(md)
    ob.vertex_groups.remove(vg)
    ob.data = new
    bpy.data.meshes.remove(old)
    new.polygons.foreach_set('use_smooth', [False] * len(new.polygons))
    new.update()


def decimate_parts(objs, budget=DEFAULT_TRI_BUDGET, safe=True):
    """Share a triangle budget across the figure's parts. Returns a report; budget None/0 only runs the lossless pass.
    safe=True (default): body parts (head, torso, hips, arms, hands, legs) and multi-colour printed parts stay at full detail,
    because thinning round limbs roughens them; accessories and props (hair, helmets, headsets, bikes) may be thinned to 70%,
    with their outline and colour borders pinned. safe=False also thins body parts (see MIN_RATIO / PRINT_FLOOR)."""
    rep = {'before': {n: _tri_count(o) for n, o in objs.items()}}
    for o in objs.values():
        _clean_mesh(o)
    rep['clean'] = {n: _tri_count(o) for n, o in objs.items()}
    total = sum(rep['clean'].values())
    rep['clean_total'] = total
    if budget and total > budget:
        names = list(objs)
        if safe:
            floor = {n: (1.0 if (n in BODY_ROLES or _colours(objs[n]) >= PRINT_MATERIALS) else SAFE_ACCESSORY_FLOOR) for n in names}
        else:
            floor = {n: (max(MIN_RATIO.get(n, 0.2), PRINT_FLOOR) if _colours(objs[n]) >= PRINT_MATERIALS else MIN_RATIO.get(n, 0.2))
                     for n in names}
        rep['protected'] = sorted(n for n in names if floor[n] >= PRINT_FLOOR)

        def total_at(k):
            return sum(rep['clean'][n] * min(1.0, max(floor[n], k * IMPORTANCE.get(n, 0.8))) for n in names)
        lo, hi = 0.0, 4.0
        for _ in range(40):                                # bisect the global factor so the parts add up to the budget
            mid = (lo + hi) / 2
            if total_at(mid) > budget:
                hi = mid
            else:
                lo = mid
        for n in names:
            r = min(1.0, max(floor[n], lo * IMPORTANCE.get(n, 0.8)))
            _collapse(objs[n], r)
    rep['after'] = {n: _tri_count(o) for n, o in objs.items()}
    rep['total'] = [sum(rep['before'].values()), total, sum(rep['after'].values())]   # raw, after lossless, final
    return rep


# ---------------------------------------------------------------- Blender build
_MATS = {}


def material_for(code):
    rgb, alpha, metal, label = color_info(code)
    key = (code,)
    if key in _MATS and _MATS[key].name in bpy.data.materials:
        return _MATS[key]
    m = bpy.data.materials.new('lego_%s_%s' % (code if not code.lower().startswith('0x') else 'direct', label))
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    if b:
        b.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        b.inputs['Roughness'].default_value = 0.25 if metal else 0.4
        b.inputs['Metallic'].default_value = 0.85 if metal else 0.0
        b.inputs['Alpha'].default_value = alpha
    if alpha < 1.0:
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
    _MATS[key] = m
    return m


_TEXMATS = {}


def _srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def material_for_print(tex_key, code):
    """Principled material whose base colour is the part colour with the embedded print composited on it (glTF cannot mix)."""
    key = (tex_key, code)
    if key in _TEXMATS and _TEXMATS[key].name in bpy.data.materials:
        return _TEXMATS[key]
    import base64, tempfile
    raw = base64.b64decode(_TEX[tex_key] + '=' * (-len(_TEX[tex_key]) % 4))
    tmp = os.path.join(tempfile.gettempdir(), 'sigfig_print_%d.png' % abs(hash(key)))
    with open(tmp, 'wb') as f:
        f.write(raw)
    src = bpy.data.images.load(tmp)
    w, h = src.size
    px = list(src.pixels)                                          # RGBA, sRGB-encoded for an 8-bit PNG
    rgb, alpha, metal, label = color_info(code)
    base = [_srgb(rgb[0]), _srgb(rgb[1]), _srgb(rgb[2])]
    out = []
    for i in range(0, len(px), 4):
        a = px[i + 3]
        out.extend((base[0] * (1 - a) + px[i] * a, base[1] * (1 - a) + px[i + 1] * a, base[2] * (1 - a) + px[i + 2] * a, 1.0))
    img = bpy.data.images.new('print_%s' % os.path.basename(tex_key).replace('.dat', ''), w, h, alpha=False)
    img.pixels = out
    img.pack()
    img.update()
    bpy.data.images.remove(src)
    m = bpy.data.materials.new('lego_print_%s_%s' % (os.path.basename(tex_key).replace('.dat', ''), code))
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    t.interpolation = 'Linear'
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.4
    _TEXMATS[key] = m
    return m


def _mesh_object(name, role, tris, part_color, W, parity, coll):
    """Mesh with the part origin at the object origin; W (LDraw 4x4) becomes the object's world matrix."""
    M3 = W.to_3x3()
    mirror = M3.determinant() < 0
    F = Matrix(((-1, 0, 0), (0, 1, 0), (0, 0, 1)))
    M3b = M3 @ F if mirror else M3                       # keep the object matrix a proper rotation; bake the mirror into the vertices
    flip_wind = parity != False                          # parity already includes determinant sign and INVERTNEXT
    verts, faces, face_codes, face_uv = [], [], [], []
    for it in tris:
        c, (a, b, d) = it[0], it[1]
        uv = it[2] if len(it) > 2 else None
        pts = [a, b, d]
        if mirror:
            pts = [F @ p for p in pts]
        if flip_wind:
            pts = [pts[0], pts[2], pts[1]]
            if uv:
                uv = [uv[0], uv[2], uv[1]]
        i = len(verts)
        verts.extend((C3 @ p) * SCALE for p in pts)
        faces.append((i, i + 1, i + 2))
        face_codes.append((part_color if c in INHERIT else c, it[3] if uv and it[3] in _TEX else None))
        face_uv.append(uv if face_codes[-1][1] else None)
    me = bpy.data.meshes.new(name)
    me.from_pydata([v[:] for v in verts], [], faces)
    codes = sorted(set(face_codes), key=lambda k: (k[0], k[1] or ''))
    for c, tk in codes:
        me.materials.append(material_for(c) if tk is None else material_for_print(tk, c))
    idx = {c: i for i, c in enumerate(codes)}
    me.polygons.foreach_set('material_index', [idx[c] for c in face_codes])
    if any(face_uv):                                               # texture-mapped faces: Studio's v runs bottom-up, like Blender's
        layer = me.uv_layers.new(name='UVMap')
        for fi, uv in enumerate(face_uv):
            for j in range(3):
                layer.data[3 * fi + j].uv = uv[j] if uv else (0.0, 0.0)
    me.polygons.foreach_set('use_smooth', [False] * len(faces))
    me.update()
    me.validate()
    ob = bpy.data.objects.new(name, me)
    ob['role'] = role                                   # the glTF node name; the Blender name is namespaced per figure
    coll.objects.link(ob)
    R = C3 @ M3b @ C3I
    T = (C3 @ W.translation) * SCALE
    mw = R.to_4x4()
    mw.translation = T
    ob.matrix_world = mw
    return ob


def build_sigfig(io_path, fig_id, clear=True, tri_budget=DEFAULT_TRI_BUDGET, roles=None, safe=True):
    """Build the rig from a Studio .io, then run the decimation pass (tri_budget=None/0: lossless clean-up only).
    `roles` = optional {part number or stem: role name} for figures made of custom parts.
    `safe` = see decimate_parts (default True: body parts, open shells and printed parts are never collapsed).
    Returns a summary dict (also stored in the collection's custom properties)."""
    global _FLAT, _MISSING, _TEX
    _FLAT = {}
    _MISSING = set()
    _TEX = {}
    with zipfile.ZipFile(io_path) as z:
        text = z.read('model2.ldr').decode('utf-8-sig', 'replace')
        extra_images = [n for n in z.namelist() if n.lower().endswith(('.png', '.jpg', '.jpeg', '.tga')) and 'thumbnail' not in n.lower()]
    secs, root = parse_ldr(text)
    parts, warn = collect_parts(secs, root)
    classify(parts, roles)
    assign_extras(parts)
    cname = 'sigfig-' + fig_id
    if clear and cname in bpy.data.collections:
        old = bpy.data.collections[cname]
        for ob in list(old.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.collections.remove(old)
    coll = bpy.data.collections.new(cname)
    bpy.context.scene.collection.children.link(coll)
    root_empty = bpy.data.objects.new('sigfig_' + fig_id, None)
    root_empty.empty_display_type = 'PLAIN_AXES'
    coll.objects.link(root_empty)
    objs = {}
    for p in parts:
        tris = flat(secs, p['file'])
        if not tris:
            warn.append('empty ' + p['file'])
            continue
        ob = _mesh_object(fig_id + ':' + p['role'], p['role'], tris, p['color'], p['W'], p['parity'], coll)
        objs[p['role']] = ob
        p['ob'] = ob
        p['tris'] = len(tris)
    bpy.context.view_layer.update()
    dec = decimate_parts(objs, tri_budget, safe)
    for p in parts:
        if p.get('ob'):
            p['tris'] = _tri_count(p['ob'])
    # hierarchy (world transforms preserved)
    summary = []
    for p in parts:
        ob = p.get('ob')
        if not ob:
            continue
        pr = PARENT.get(p['role']) if p['role'] in PARENT else p.get('parent_role')
        while pr and pr not in objs:                   # a missing joint (no hips, no hand): climb to what exists
            pr = PARENT.get(pr)
        par = objs.get(pr) if pr else None
        if p['role'] in ('hips',) or (par is None and p['role'] in PARENT):
            par = root_empty
        elif par is None:
            par = root_empty                           # a free prop
        ob.parent = par
        ob.matrix_parent_inverse = par.matrix_world.inverted()
        summary.append(dict(name=p['role'], part=_clean(p['file']), parent=par.name, tris=p['tris']))
        ob['rest'] = list(ob.location) + list(ob.rotation_euler) + list(ob.scale)   # rest pose, for idle_anim.py
    # feet on the floor, centred on the whole figure
    bpy.context.view_layer.update()
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for ob in objs.values():
        for v in ob.data.vertices:
            w = ob.matrix_world @ v.co
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    root_empty.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()
    prints, print_warn = [], []                                  # every print the .io carries must reach the GLB: audit it
    for p in parts:
        ob = p.get('ob')
        if not ob:
            continue
        tex_mats = [m.name for m in ob.data.materials if m and m.name.startswith('lego_print_')]
        looks_printed = bool(re.search(r'pb\d+|tex|^bl_', os.path.basename(p['file'])))
        multi = _colours(ob) >= PRINT_MATERIALS
        prints.append(dict(role=p['role'], part=_clean(p['file']), textures=tex_mats, colours=_colours(ob)))
        if looks_printed and not tex_mats and not multi:
            print_warn.append('%s (%s) is a printed part but came in as a plain colour: its print is not in the .io as geometry or texture' % (p['role'], _clean(p['file'])))
    unused_tex = [k for k in _TEX if not any(any(m.name.startswith('lego_print_' + os.path.basename(k).replace('.dat', '')) for m in ob.data.materials if m) for ob in objs.values())]
    info = dict(fig=fig_id, prints=prints, print_warnings=print_warn + ['texture %s was in the .io but no face uses it' % k for k in unused_tex] + ['image file in the .io not imported: %s' % n for n in extra_images], decimate=dec, parts=summary, size=[round(hi.x - lo.x, 3), round(hi.y - lo.y, 3), round(hi.z - lo.z, 3)],
                triangles=sum(s['tris'] for s in summary), warnings=sorted(set(warn))[:20], unresolved_refs=sorted(_MISSING)[:20],
                missing_roles=[r for r in ('head', 'torso', 'hips', 'arm_l', 'arm_r', 'leg_l', 'leg_r') if r not in objs])
    coll['sigfig_info'] = json.dumps(info)
    return info


# ---------------------------------------------------------------- export
def _patch_glb(path, anim_name):
    """Make the (single) exported animation carry the Lab/site convention name."""
    with open(path, 'rb') as f:
        data = f.read()
    ln, typ = struct.unpack_from('<II', data, 12)
    js = json.loads(data[20:20 + ln].decode('utf-8'))
    if js.get('animations'):
        js['animations'][0]['name'] = anim_name
        raw = json.dumps(js, separators=(',', ':')).encode('utf-8')
        raw += b' ' * (-len(raw) % 4)
        rest = data[20 + ln:]
        total = 12 + 8 + len(raw) + len(rest)
        data = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(raw), 0x4E4F534A) + raw + rest
        with open(path, 'wb') as f:
            f.write(data)
    return [a.get('name') for a in js.get('animations', [])]


def export_glb(fig_id, out_path, anim_name='idle'):
    """Export just this sig fig as an uncompressed binary glTF. The first animation is renamed to `idle`."""
    coll = bpy.data.collections['sigfig-' + fig_id]
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in coll.all_objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = next(iter(coll.all_objects))
    kw = dict(filepath=out_path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
              export_materials='EXPORT', export_cameras=False, export_lights=False,
              export_draco_mesh_compression_enable=False)
    has_anim = any(o.animation_data and (o.animation_data.action or o.animation_data.nla_tracks) for o in coll.all_objects)
    kw['export_animations'] = bool(has_anim)
    if has_anim:
        kw['export_animation_mode'] = 'ACTIVE_ACTIONS'
        kw['export_force_sampling'] = True
        kw['export_frame_range'] = True
    renamed = []
    try:
        for o in coll.all_objects:                  # glTF node name = Blender name, so use the bare role names for the export only
            if o.get('role') and o.name != o['role']:
                renamed.append((o, o.name))
                o.name = o['role']
        bpy.ops.export_scene.gltf(**kw)
    finally:
        for o, old in renamed:
            o.name = old
    names = _patch_glb(out_path, anim_name) if has_anim else []
    return dict(path=out_path, bytes=os.path.getsize(out_path), animations=names)
