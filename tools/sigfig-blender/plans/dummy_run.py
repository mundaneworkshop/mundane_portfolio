"""The slate dummy's run, shared by solve_dummy.py (Blender) and make_slate_dummy.py (plain python): the cycle, the steering and the body keys.
Pure functions of time; needs motionlib's sm / ramp / win / pulse / dense in scope (exec or import it first)."""
import math

T = 15.0
FPS = 24
P = 0.75                                   # run cycle (20 per loop)
T_I = 8.0                                  # impact
T_HOME = 13.3                              # first piece called home (they have lain still for 3 s)

def ph(t): return 2 * math.pi * t / P
def S(t): return math.sin(ph(t))
def steer(t):                              # degrees, how far the wheel is turned; 0 from the wall on (the arms always reach for the wheel's home pose)
    return 0.8 * pulse(t, [(0, 0), (0.9, 0), (1.8, 32), (3.0, -32), (4.2, 32), (5.4, -34), (6.5, 30), (7.1, -14), (7.6, 0)])
def brace(t): return 10 * win(t, 7.3, T_I, 0.35)
def torso_x(t): return 6 + 2.0 * math.sin(2 * ph(t)) + brace(t)
def torso_z(t): return -4 * S(t) + 0.14 * steer(t)
def torso_y(t): return -0.18 * steer(t)
def head_x(t): return 2.0 * math.sin(2 * ph(t) + 0.6) - 0.5 * brace(t)
def head_z(t): return -0.2 * steer(t)
def hips_z(t): return 2.6 * abs(S(t))
def leg_l_x(t): return -10 - 55 * S(t)
def leg_r_x(t): return -55 + 55 * S(t)                   # rest is a 45 degree stride back, so this swings -65 .. +45 about the hip

def body_keys():
    return {
        'hips': {'location_z': dense(hips_z, T)},
        'torso': {'rotation_x': dense(torso_x, T, 2), 'rotation_z': dense(torso_z, T, 2), 'rotation_y': dense(torso_y, T, 2)},
        'head': {'rotation_x': dense(head_x, T, 2), 'rotation_z': dense(head_z, T, 2)},
        'leg_l': {'rotation_x': dense(leg_l_x, T)},
        'leg_r': {'rotation_x': dense(leg_r_x, T)},
    }
