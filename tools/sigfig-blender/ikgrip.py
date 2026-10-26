"""Arm + hand pose solver for the sig fig rigs (run INSIDE Blender after exec()-ing ldr_to_blender.py, on a fresh build_sigfig()).

A minifig arm is one rigid piece turning about the shoulder (rotation_x/y/z keys, an XYZ Euler delta in the parent's frame on top of the imported
pose) and the hand is a peg in the arm that turns ONLY about the pin where it slots in: a twist about the hand-local y axis through HAND_PIN
(hand keys rotation_x/y/z with pivots_local carry that twist; tilting a hand off its arm pulls it out of its socket). So a limb has 4 degrees of
freedom, x = [arm x, y, z, twist] in degrees, and `Limb.keys6(x)` gives the six plan key values. `Limb(fig, 'l'|'r')` replays exactly what
choreo.apply_plan does with them.

    arm = Limb('work', 'l')
    x, err = arm.solve(constraints, x0=None)
    arm.hand_world(x)                                  # 4x4
    arm.keys6(x)                                       # [arm rx, ry, rz, hand rx, ry, rz] for a plan

A constraint is (hand_local_point, world_point, weight). Pose a hand fully with 3-4 non-collinear points (`hand_frame_points`). The arm's joint
limits are soft priors: the solver stays near x0 (the natural pose) unless a constraint pulls it, and `limit` penalises angles past a range.
"""
import bpy, math, numpy as np
from mathutils import Matrix, Vector, Euler, Quaternion

HAND_PIN = Vector((0.0, -0.04, -0.005))
HAND_RING = Vector((0.0, -0.095, 0.009))          # the C clip's centre, hand-local
NARM = 4                                            # arm x, y, z + the hand's twist


class Limb:
    def __init__(self, fig, side):
        coll = bpy.data.collections['sigfig-' + fig]
        objs = {o.get('role'): o for o in coll.all_objects if o.type == 'MESH'}
        a, h = objs['arm_' + side], objs['hand_' + side]
        self.arm, self.hand = a, h
        r = list(a['rest'])
        self.la, self.qa, self.sa = Vector(r[0:3]), Euler(r[3:6], 'XYZ').to_quaternion(), Vector(r[6:9])
        self.F = a.matrix_world @ a.matrix_basis.inverted()                   # what the parent chain does (at rest)
        r = list(h['rest'])
        self.lh, self.qh, self.sh = Vector(r[0:3]), Euler(r[3:6], 'XYZ').to_quaternion(), Vector(r[6:9])
        self.pinv = h.matrix_parent_inverse.copy()
        self.offs = self.qh @ HAND_PIN

    def set_parent(self, F):
        """Replace the parent-chain matrix (e.g. a leaning torso)."""
        self.F = F

    def arm_world(self, x):
        Q = Euler([math.radians(v) for v in x[0:3]], 'XYZ').to_quaternion() @ self.qa
        return self.F @ Matrix.LocRotScale(self.la, Q, self.sa)

    def twist_q(self, theta):
        """The hand's delta rotation (in the arm's frame) for a twist of `theta` degrees about the hand-local y axis."""
        return self.qh @ Quaternion((0, 1, 0), math.radians(theta)) @ self.qh.inverted()

    def keys6(self, x):
        e = self.twist_q(x[3]).to_euler('XYZ')
        return [float(v) for v in x[0:3]] + [math.degrees(e.x), math.degrees(e.y), math.degrees(e.z)]

    def hand_world(self, x):
        Ma = self.arm_world(x)
        Qd = self.twist_q(x[3])
        loc = self.lh + (Qd @ (-self.offs)) + self.offs
        return Ma @ self.pinv @ Matrix.LocRotScale(loc, Qd @ self.qh, self.sh)

    def check_rest(self):
        """Max difference between the replayed rest hand and the real one (should be ~0)."""
        M = self.hand_world([0] * 6)
        return max(abs(M[i][j] - self.hand.matrix_world[i][j]) for i in range(4) for j in range(4))

    def solve(self, cons, x0=None, prior=0.0003, limit=None, restarts=14, seed=1, iters=40, extra=None):
        """Levenberg-Marquardt on the 6 angles. cons: [(hand_local_point, world_point, weight)]. prior: pull toward x0 (metres of miss that one degree costs; 0.0003 = 30 degrees is as bad as 9 mm). limit: {index: (lo, hi)} soft joint limits. Returns (x, worst constraint miss in metres)."""
        x0 = np.zeros(4) if x0 is None else np.array(x0, float)
        pts = [(Vector(p), Vector(w), float(k)) for p, w, k in cons]
        lim = limit or {}

        def resid(x):
            M = self.hand_world(x)
            r = []
            for p, w, k in pts:
                d = (M @ p) - w
                r += [k * d.x / 0.01, k * d.y / 0.01, k * d.z / 0.01]
            r += list(prior * (x - x0) / 0.01)
            if extra is not None:
                r += list(extra(x))
            for i, (lo, hi) in lim.items():
                if x[i] < lo:
                    r.append((lo - x[i]) * 0.3)
                elif x[i] > hi:
                    r.append((x[i] - hi) * 0.3)
            return np.array(r)

        def miss(x):
            M = self.hand_world(x)
            return max(((M @ p) - w).length for p, w, k in pts)

        rng = np.random.default_rng(seed)
        best, bestc = None, 1e18
        starts = [x0.copy()] + [x0 + rng.normal(0, 25.0, 4) for _ in range(restarts)]
        for x in starts:
            lamb = 1e-2
            f = resid(x)
            c = float(f @ f)
            for _ in range(iters):
                J = np.empty((len(f), 4))
                for j in range(4):
                    dx = np.zeros(4); dx[j] = 0.05
                    J[:, j] = (resid(x + dx) - f) / 0.05
                A = J.T @ J + lamb * np.eye(4)
                step = np.linalg.solve(A, -J.T @ f)
                xn = x + step
                fn = resid(xn)
                cn = float(fn @ fn)
                if cn < c:
                    x, f, c = xn, fn, cn
                    lamb = max(lamb * 0.5, 1e-6)
                    if np.abs(step).max() < 1e-3:
                        break
                else:
                    lamb *= 4
                    if lamb > 1e6:
                        break
            if c < bestc:
                best, bestc = x.copy(), c
        return best, miss(best)


def lm(resid, x0, restarts=10, spread=20.0, iters=50, seed=1):
    """Generic Levenberg-Marquardt: minimise |resid(x)|^2 from x0 and a few random restarts around it. Returns (x, cost)."""
    x0 = np.array(x0, float)
    n = len(x0)
    rng = np.random.default_rng(seed)
    best, bestc = None, 1e18
    for k in range(restarts + 1):
        x = x0.copy() if k == 0 else x0 + rng.normal(0, spread, n) * (np.arange(n) < NARM)
        f = resid(x); c = float(f @ f); lamb = 1e-2
        for _ in range(iters):
            J = np.empty((len(f), n))
            for j in range(n):
                dx = np.zeros(n); dx[j] = 0.02 if j >= NARM else 0.05
                J[:, j] = (resid(x + dx) - f) / dx[j]
            step = np.linalg.solve(J.T @ J + lamb * np.eye(n), -J.T @ f)
            xn = x + step; fn = resid(xn); cn = float(fn @ fn)
            if cn < c:
                x, f, c = xn, fn, cn; lamb = max(lamb * 0.5, 1e-6)
                if np.abs(step).max() < 1e-3:
                    break
            else:
                lamb *= 4
                if lamb > 1e6:
                    break
        if c < bestc:
            best, bestc = x.copy(), c
    return best, bestc


def hand_frame_points(M, scale=0.08):
    """Hand-local points whose world positions fix a hand's full pose: the pin side, the ring centre, and one step along local x and z."""
    return [Vector((0, 0, 0)), HAND_RING.copy(), Vector((scale, -0.04, 0)), Vector((0, -0.04, scale))]


def pose_constraints(M_target, w=(1.0, 2.0, 0.7, 0.7)):
    """Constraints that put the hand at the 4x4 world matrix M_target (hand_frame_points mapped through it)."""
    return [(p, M_target @ p, k) for p, k in zip(hand_frame_points(M_target), w)]
