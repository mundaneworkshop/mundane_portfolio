"""The slate dummy's run, shared by solve_dummy.py (Blender) and make_slate_dummy.py (plain python): the cycle, the steering and the body keys.
Pure functions of time; needs motionlib's sm / ramp / win / pulse / dense in scope (exec or import it first).

The 20 s story: he runs in place holding the wheel, steering left and right and looking around (0-6 s); the wheel straightens and his right hand honks the horn twice
(6.5 and 7.05 s) while the left stays on the rim; he sees the wall, throws both arms up and shakes his hands in shock (8.4 s on), the wall is hit at T_I = 11 s and he
falls apart, lies still for about 3 s, the pieces snap home (T_HOME on) and he is running again before the loop closes."""
import math

T = 20.0
FPS = 24
CYCLES = 27
P = T / CYCLES                             # run cycle (27 per loop, so the stride is in phase at the seam)
T_I = 11.0                                 # impact
T_HOME = 16.3                              # first piece called home (they have lain still for about 3 s)
T_STRAIGHT = 5.9                           # the wheel is straight from here: the horn is next
T_HONK = (6.6, 7.35)                       # the two horn smashes (the hand comes down on the hub)
T_UP0, T_UP1 = 8.4, 8.75                   # the arms go up
T_SHAKE = 6.3                              # Hz, hands and body shaking in shock

def ph(t): return 2 * math.pi * t / P
def S(t): return math.sin(ph(t))
def steer(t):                              # degrees, how far the wheel is turned; straight from T_STRAIGHT on (the arms always reach for the wheel's home pose)
    return 0.8 * pulse(t, [(0, 0), (0.9, 0), (1.8, 32), (3.0, -32), (4.2, 32), (5.2, -30), (T_STRAIGHT, 0)])

def look(t):                               # head yaw: glances about while he drives
    return pulse(t, [(0, 0), (0.7, 0), (1.5, -34), (2.7, -34), (3.5, 26), (4.5, 26), (5.1, -12), (5.7, 0)])
def look_x(t):                             # and up and down: a check of the mirror, a look at the road
    return pulse(t, [(0, 0), (2.9, 0), (3.3, -12), (3.9, -12), (4.6, 8), (5.1, 8), (5.6, 0)])

def hub_w(t):                              # how much the right hand is on the horn rather than the rim
    return ramp(t, T_STRAIGHT, T_STRAIGHT + 0.4) * (1 - ramp(t, 7.75, 8.15))
def press(t):                              # 0 wound up high above the hub, 1 down on it: a slow wind-up, a fast smash, a beat on it, back up (the VR gamer's smashes)
    return sum(pulse(t, [(a - 0.13, 0), (a, 1), (a + 0.1, 1), (a + 0.38, 0)]) for a in T_HONK)

def up_w(t):                               # the arms thrown up: quick, with overshoot; down again out of sight once he has hit the wall
    if t < T_UP0: return 0.0
    if t < T_I + 0.1: return pulse(t, [(T_UP0, 0), (T_UP0 + 0.22, 1.1), (T_UP1, 1.0)])
    return 1.0 - ramp(t, T_I + 0.1, T_I + 0.5)
def shake(t):                              # the shock: 0 before the arms go up
    return ramp(t, T_UP0 + 0.2, T_UP1 + 0.2) * (1 - ramp(t, T_I + 0.05, T_I + 0.3))
def tremble(t, ph0=0.0): return math.sin(2 * math.pi * T_SHAKE * t + ph0) * shake(t)

def lean_back(t): return 14 * ramp(t, 8.1, 8.7) * (1 - ramp(t, T_I + 0.05, T_I + 0.35))
def torso_x(t): return 6 + 2.0 * math.sin(2 * ph(t)) - lean_back(t) + 6 * press(t)            # leans into each smash
def torso_z(t): return -4 * S(t) + 0.14 * steer(t) + 1.8 * tremble(t)
def torso_y(t): return -0.18 * steer(t)
def head_x(t):                             # a nod tips the head on its neck stud: kept to a few degrees (the swivel, head_z, is the free one)
    return max(-8.0, min(8.0, 1.5 * math.sin(2 * ph(t) + 0.6) + 0.5 * look_x(t) + 5 * win(t, 5.9, 7.7, 0.4)
                         - 7 * win(t, 8.1, T_I + 0.1, 0.35) + 1.5 * tremble(t, 1.0)))
def head_z(t): return -0.2 * steer(t) + look(t) + 3.0 * tremble(t, 2.0)
def hips_z(t): return 2.6 * abs(S(t))
def leg_l_x(t): return -10 - 55 * S(t)
def leg_r_x(t): return -55 + 55 * S(t)                   # rest is a 45 degree stride back, so this swings -65 .. +45 about the hip

def up_dir(side, t):
    """Where the thrown-up arm points (a direction from the shoulder, the figure's axes): straight up, a little out and a little forward, trembling."""
    sx = -1.0 if side == 'r' else 1.0                                  # the figure's right is -x
    out = math.radians(24.0)
    sn = 1.0 if side == 'r' else -1.0
    d = [sx * math.sin(out) + 0.05 * tremble(t, 0.5 * sn), -0.12 + 0.04 * tremble(t, 1.3 + sn), math.cos(out)]
    n = math.sqrt(sum(c * c for c in d))
    return [c / n for c in d]
def hand_osc(side, t):
    """The hands shaking about their pins (degrees of twist)."""
    return 38.0 * math.sin(2 * math.pi * T_SHAKE * 1.07 * t + (0 if side == 'r' else 1.9)) * shake(t)

def body_keys():
    return {
        'hips': {'location_z': dense(hips_z, T)},
        'torso': {'rotation_x': dense(torso_x, T, 2), 'rotation_z': dense(torso_z, T, 1), 'rotation_y': dense(torso_y, T, 2)},
        'head': {'rotation_x': dense(head_x, T, 1), 'rotation_z': dense(head_z, T, 1)},
        'leg_l': {'rotation_x': dense(leg_l_x, T)},
        'leg_r': {'rotation_x': dense(leg_r_x, T)},
    }
