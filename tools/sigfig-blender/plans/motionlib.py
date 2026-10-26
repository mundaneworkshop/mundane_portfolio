"""Small helpers for the plan generators (make_<fig>.py): smooth envelopes and dense key sampling."""
import math

FPS = 24


def sm(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def ramp(t, a, b):
    """0 before a, 1 after b, smooth between."""
    return sm((t - a) / max(1e-6, b - a))


def win(t, a, b, fade=0.3):
    """1 inside [a, b], easing in and out over `fade` seconds."""
    return ramp(t, a, a + fade) * (1 - ramp(t, b - fade, b))


def pulse(t, pts):
    """Smooth piecewise value through [(t, v)], held outside."""
    pts = sorted(pts)
    if t <= pts[0][0]:
        return pts[0][1]
    for (a, va), (b, vb) in zip(pts, pts[1:]):
        if t <= b:
            return va + (vb - va) * sm((t - a) / max(1e-6, b - a))
    return pts[-1][1]


def dense(fn, T, step=1, fps=FPS):
    """Keys [[t, fn(t)]] on every `step`-th frame of a T-second loop (closed by the engine: the value at T equals the value at 0)."""
    n = int(round(T * fps))
    return [[round(i / fps, 4), round(fn(i / fps), 4)] for i in range(0, n, step)]
