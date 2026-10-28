"""Tiny rigid-body helpers for plan generators (plain python, no Blender): quaternions, XYZ Euler out (Blender's order, R = Rz Ry Rx),
and a ballistic bounce sim for pieces that fly apart and come to rest."""
import math

def qmul(a, b):
    w1, x1, y1, z1 = a; w2, x2, y2, z2 = b
    return (w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
            w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2)

def qaxis(axis, deg):
    n = math.sqrt(sum(c * c for c in axis)); a = math.radians(deg) / 2
    s = math.sin(a) / n
    return (math.cos(a), axis[0] * s, axis[1] * s, axis[2] * s)

def qslerp(a, b, u):
    d = sum(x * y for x, y in zip(a, b))
    if d < 0:
        b = tuple(-x for x in b); d = -d
    if d > 0.9995:
        q = tuple(x + (y - x) * u for x, y in zip(a, b)); n = math.sqrt(sum(c * c for c in q)); return tuple(c / n for c in q)
    th = math.acos(d); s = math.sin(th)
    return tuple((math.sin((1 - u) * th) * x + math.sin(u * th) * y) / s for x, y in zip(a, b))

def qrot(q, v):
    w, x, y, z = q
    # v' = q v q^-1
    t = (2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0]))
    return (v[0] + w * t[0] + (y * t[2] - z * t[1]), v[1] + w * t[1] + (z * t[0] - x * t[2]), v[2] + w * t[2] + (x * t[1] - y * t[0]))

def qeuler_xyz(q):
    """degrees (x, y, z) with R = Rz Ry Rx, the way Blender reads an 'XYZ' Euler."""
    w, x, y, z = q
    r20 = 2 * (x * z - w * y)
    ry = math.asin(max(-1.0, min(1.0, -r20)))
    rx = math.atan2(2 * (y * z + w * x), 1 - 2 * (x * x + y * y))
    rz = math.atan2(2 * (x * y + w * z), 1 - 2 * (y * y + z * z))
    return [math.degrees(rx), math.degrees(ry), math.degrees(rz)]

def fall(p0, v0, floor, t0, t1, fps=24, g=6.0, e=0.38, hold=0.62, sub=20):
    """Ballistic point with bounces on z = floor. Returns {frame: (x, y, z)} for frames t0*fps .. t1*fps; at rest it stays put."""
    p = list(p0); v = list(v0); out = {}
    f0, f1 = int(round(t0 * fps)), int(round(t1 * fps)); dt = 1.0 / fps / sub
    at_rest = False
    for f in range(f0, f1 + 1):
        out[f] = tuple(p)
        if at_rest:
            continue
        for _ in range(sub):
            v[2] -= g * dt
            p[0] += v[0] * dt; p[1] += v[1] * dt; p[2] += v[2] * dt
            if p[2] <= floor:
                p[2] = floor
                if abs(v[2]) < 0.35:
                    v = [0.0, 0.0, 0.0]; at_rest = True; break
                v[2] = -v[2] * e; v[0] *= hold; v[1] *= hold
    return out


def mat3_to_q(m):
    """3x3 rotation (rows) -> (w, x, y, z)."""
    t = m[0][0] + m[1][1] + m[2][2]
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        return (0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s)
    if m[0][0] > m[1][1] and m[0][0] > m[2][2]:
        s = math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2
        return ((m[2][1] - m[1][2]) / s, 0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s)
    if m[1][1] > m[2][2]:
        s = math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2
        return ((m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s)
    s = math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2
    return ((m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s)

def qinv(q): return (q[0], -q[1], -q[2], -q[3])


def euler_xyz_to_q(rx, ry, rz):
    """Blender 'XYZ' Euler (degrees; R = Rz Ry Rx) -> (w, x, y, z)."""
    return qmul(qaxis((0, 0, 1), rz), qmul(qaxis((0, 1, 0), ry), qaxis((1, 0, 0), rx)))
